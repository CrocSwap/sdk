import { CrocContext } from "./context";
import { decodeCrocPrice, toDisplayPrice, bigIntToFloat, toDisplayQty, fromDisplayPrice, roundForConcLiq, concDepositSkew, pinTickLower, pinTickUpper, neighborTicks, pinTickOutside, tickToPrice, concBaseSlippagePrice, concQuoteSlippagePrice } from './utils';
import { CrocEthView, CrocTokenView, sortBaseQuoteViews, TokenQty } from './tokens';
import { TransactionResponse } from 'ethers';
import { WarmPathEncoder } from './encoding/liquidity';
import { ZeroAddress } from 'ethers';
import { PoolInitEncoder } from "./encoding/init";
import { CrocSurplusFlags, decodeSurplusFlag, encodeSurplusArg } from "./encoding/flags";
import { GAS_PADDING } from "./utils";

type PriceRange = [number, number]
type TickRange = [number, number]
type BlockTag = number | string

export class CrocPoolView {

    constructor (quoteToken: CrocTokenView, baseToken: CrocTokenView, context: Promise<CrocContext>) {
        [this.baseToken, this.quoteToken] =
            sortBaseQuoteViews(baseToken, quoteToken)
        this.context = context

        this.baseDecimals = this.baseToken.decimals
        this.quoteDecimals = this.quoteToken.decimals

        this.useTrueBase = this.baseToken.tokenAddr === baseToken.tokenAddr
    }

    /* Checks to see if a canonical pool has been initialized for this pair. */
    async isInit(): Promise<boolean> {
        return this.spotPrice()
            .then(p => p > 0)
    }

    async spotPrice (block?: BlockTag): Promise<number> {
        let txArgs = block ? { blockTag: block } : {}
        let sqrtPrice = (await this.context).query.queryPrice.staticCall
            (this.baseToken.tokenAddr, this.quoteToken.tokenAddr,
                (await this.context).chain.poolIndex, txArgs)
        return decodeCrocPrice(await sqrtPrice)
    }

    async displayPrice (block?: BlockTag): Promise<number> {
        let spotPrice = this.spotPrice(block)
        return this.toDisplayPrice(await spotPrice)
    }

    async spotTick (block?: BlockTag): Promise<number> {
        let txArgs = block ? { blockTag: block } : {}
        return (await this.context).query.queryCurveTick.staticCall
            (this.baseToken.tokenAddr, this.quoteToken.tokenAddr,
                (await this.context).chain.poolIndex, txArgs).then(Number)
    }

    async xykLiquidity (block?: BlockTag): Promise<TokenQty> {
        let txArgs = block ? { blockTag: block } : {}
        return (await this.context).query.queryLiquidity.staticCall
            (this.baseToken.tokenAddr, this.quoteToken.tokenAddr,
                (await this.context).chain.poolIndex, txArgs)
    }

    async curveState (block?: BlockTag): Promise<{priceRoot_: bigint, ambientSeeds_: bigint, concLiq_: bigint, seedDeflator_: bigint, concGrowth_: bigint}> {
        let txArgs = block ? { blockTag: block } : {}
        return (await this.context).query.queryCurve.staticCall
            (this.baseToken.tokenAddr, this.quoteToken.tokenAddr,
                (await this.context).chain.poolIndex, txArgs)
    }

    async cumAmbientGrowth (block?: BlockTag): Promise<number> {
        const seedDeflator = (await this.curveState(block)).seedDeflator_
        return bigIntToFloat(seedDeflator) / Math.pow(2, 48)
    }

    async toDisplayPrice (spotPrice: number | bigint): Promise<number> {
        return toDisplayPrice(spotPrice, await this.baseDecimals, await this.quoteDecimals,
            !this.useTrueBase)
    }

    async fromDisplayPrice (dispPrice: number): Promise<number> {
        return fromDisplayPrice(dispPrice, await this.baseDecimals, await this.quoteDecimals,
            !this.useTrueBase)
    }

    async displayToPinTick (dispPrice: number): Promise<[number, number]> {
        const spotPrice = await this.fromDisplayPrice(dispPrice)
        const gridSize = (await this.context).chain.gridSize
        return [pinTickLower(spotPrice, gridSize), pinTickUpper(spotPrice, gridSize)]
    }

    async displayToNeighborTicks (dispPrice: number, nNeighbors: number = 3):
        Promise<{below: number[], above: number[]}> {
        const spotPrice = await this.fromDisplayPrice(dispPrice)
        const gridSize = (await this.context).chain.gridSize
        return neighborTicks(spotPrice, gridSize, nNeighbors)
    }

    async displayToNeighborTickPrices (dispPrice: number, nNeighbors: number = 3):
        Promise<{below: number[], above: number[]}> {
        const ticks = await this.displayToNeighborTicks(dispPrice, nNeighbors)
        const toPriceFn = (tick: number) => this.toDisplayPrice(tickToPrice(tick))

        const belowPrices = Promise.all(ticks.below.map(toPriceFn))
        const abovePrices = Promise.all(ticks.above.map(toPriceFn))

        return this.useTrueBase ?
            { below: await belowPrices, above: await abovePrices } :
            { below: await abovePrices, above: await belowPrices }
    }

    async displayToOutsidePin (dispPrice: number):
        Promise<{ tick: number, price: number, isTickBelow: boolean, isPriceBelow: boolean }> {
        const spotPrice = this.fromDisplayPrice(dispPrice)
        const gridSize = (await this.context).chain.gridSize

        const pinTick = pinTickOutside(await spotPrice, await this.spotPrice(), gridSize)
        const pinPrice = this.toDisplayPrice(tickToPrice(pinTick.tick))

        return Object.assign(pinTick, { price: await pinPrice,
            isPriceBelow: (await pinPrice) < dispPrice })
    }

    async initPool (initPrice: number): Promise<TransactionResponse> {
        // Very small amount of ETH in economic terms but more than sufficient for min init burn
        const ETH_INIT_BURN = BigInt(10) ** BigInt(12)
        let txArgs = this.baseToken.tokenAddr === ZeroAddress ? { value: ETH_INIT_BURN } : { }

        let encoder = new PoolInitEncoder(this.baseToken.tokenAddr, this.quoteToken.tokenAddr,
            (await this.context).chain.poolIndex)
        let spotPrice = this.fromDisplayPrice(initPrice)
        let calldata = encoder.encodeInitialize(await spotPrice)

        let cntx = await this.context
        const gasEst = await cntx.dex.userCmd.estimateGas(cntx.chain.proxyPaths.cold, calldata, txArgs)
        Object.assign(txArgs, { gasLimit: gasEst + GAS_PADDING})
        return cntx.dex.userCmd(cntx.chain.proxyPaths.cold, calldata, txArgs)
    }

    async mintAmbientBase (qty: TokenQty, limits: PriceRange, opts?: CrocLpOpts):
        Promise<TransactionResponse> {
        return this.mintAmbient(qty, this.useTrueBase, limits, opts)
    }

    async mintAmbientQuote (qty: TokenQty, limits: PriceRange, opts?: CrocLpOpts):
        Promise<TransactionResponse> {
        return this.mintAmbient(qty, !this.useTrueBase, limits, opts)
    }

    async mintRangeBase (qty: TokenQty, range: TickRange, limits: PriceRange, opts?: CrocLpOpts):
        Promise<TransactionResponse> {
        return this.mintRange(qty, this.useTrueBase, range, await limits, opts)
    }

    async mintRangeQuote (qty: TokenQty, range: TickRange, limits: PriceRange, opts?: CrocLpOpts):
        Promise<TransactionResponse> {
        return this.mintRange(qty, !this.useTrueBase, range, await limits, opts)
    }

    async burnAmbientLiq (liq: bigint, limits: PriceRange, opts?: CrocLpOpts):
        Promise<TransactionResponse> {
        let [lowerBound, upperBound] = await this.transformLimits(limits)
        const calldata = (await this.makeEncoder()).encodeBurnAmbient
            (liq, lowerBound, upperBound, this.maskSurplusFlag(opts))
        return this.sendCmd(calldata)
    }

    async burnAmbientAll (limits: PriceRange, opts?: CrocLpOpts): Promise<TransactionResponse> {
        let [lowerBound, upperBound] = await this.transformLimits(limits)
        const calldata = (await this.makeEncoder()).encodeBurnAmbientAll
            (lowerBound, upperBound, this.maskSurplusFlag(opts))
        return this.sendCmd(calldata)
    }

    async burnRangeLiq (liq: bigint, range: TickRange, limits: PriceRange, opts?: CrocLpOpts):
        Promise<TransactionResponse> {
        let [lowerBound, upperBound] = await this.transformLimits(limits)
        let roundLotLiq = roundForConcLiq(liq)
        const calldata = (await this.makeEncoder()).encodeBurnConc
            (range[0], range[1], roundLotLiq, lowerBound, upperBound, this.maskSurplusFlag(opts))
        return this.sendCmd(calldata)
    }

    async harvestRange (range: TickRange, limits: PriceRange, opts?: CrocLpOpts):
        Promise<TransactionResponse> {
        let [lowerBound, upperBound] = await this.transformLimits(limits)
        const calldata = (await this.makeEncoder()).encodeHarvestConc
            (range[0], range[1], lowerBound, upperBound, this.maskSurplusFlag(opts))
        return this.sendCmd(calldata)
    }

    private async sendCmd (calldata: string, txArgs?: { value?: bigint }):
        Promise<TransactionResponse> {
        let cntx = await this.context
        if (txArgs === undefined) { txArgs = {} }
        const gasEst = await cntx.dex.userCmd.estimateGas(cntx.chain.proxyPaths.liq, calldata, txArgs)
        Object.assign(txArgs, { gasLimit: gasEst + GAS_PADDING})
        return cntx.dex.userCmd(cntx.chain.proxyPaths.liq, calldata, txArgs);
    }

    private async mintAmbient (qty: TokenQty, isQtyBase: boolean,
        limits: PriceRange, opts?: CrocLpOpts): Promise<TransactionResponse> {
        let msgVal = this.msgValAmbient(qty, isQtyBase, limits, opts)
        let weiQty = this.normQty(qty, isQtyBase)
        let [lowerBound, upperBound] = await this.transformLimits(limits)

        const calldata = (await this.makeEncoder()).encodeMintAmbient(
            await weiQty, isQtyBase, lowerBound, upperBound, this.maskSurplusFlag(opts))
        return this.sendCmd(calldata, {value: await msgVal})
    }

    private async boundLimits (range: TickRange, limits: PriceRange, isQtyBase: boolean,
        floatingSlippage: number = 0.1): Promise<PriceRange> {
        let spotPrice = this.spotPrice()
        const [lowerPrice, upperPrice] = this.rangeToPrice(range)
        const [boundLower, boundUpper] = await this.transformLimits(limits)
        const BOUND_PREC = 1.0001

        let [amplifyLower, amplifyUpper] = [boundLower, boundUpper]

        if (upperPrice < await spotPrice) {
            amplifyLower = upperPrice*BOUND_PREC
        } else if (lowerPrice > await spotPrice) {
            amplifyUpper = lowerPrice/BOUND_PREC
        } else {
            if (isQtyBase) {
                amplifyLower = concBaseSlippagePrice(await spotPrice, upperPrice, floatingSlippage)
            } else {
                amplifyUpper = concQuoteSlippagePrice(await spotPrice, lowerPrice, floatingSlippage)
            }
        }

        return this.untransformLimits(
                [Math.max(amplifyLower, boundLower), Math.min(amplifyUpper, boundUpper)])
    }

    private rangeToPrice (range: TickRange): PriceRange {
        const lowerPrice = Math.pow(1.0001, range[0])
        const upperPrice = Math.pow(1.0001, range[1])
        return [lowerPrice, upperPrice]
    }

    private async transformLimits (limits: PriceRange): Promise<PriceRange> {
        let left = this.fromDisplayPrice(limits[0])
        let right = this.fromDisplayPrice(limits[1])
        return (await left < await right) ?
            [await left, await right] :
            [await right, await left]
    }

    private async untransformLimits (limits: PriceRange): Promise<PriceRange> {
        let left = this.toDisplayPrice(limits[0])
        let right = this.toDisplayPrice(limits[1])
        return (await left < await right) ?
            [await left, await right] :
            [await right, await left]
    }

    private async mintRange (qty: TokenQty, isQtyBase: boolean,
        range: TickRange, limits: PriceRange, opts?: CrocLpOpts): Promise<TransactionResponse> {
        const saneLimits = await this.boundLimits(range, limits, isQtyBase, opts?.floatingSlippage)

        let msgVal = this.msgValRange(qty, isQtyBase, range, await saneLimits, opts)
        let weiQty = this.normQty(qty, isQtyBase)
        let [lowerBound, upperBound] = await this.transformLimits(await saneLimits)

        const calldata = (await this.makeEncoder()).encodeMintConc(range[0], range[1],
            await weiQty, isQtyBase, lowerBound, upperBound, this.maskSurplusFlag(opts))
        return this.sendCmd(calldata, { value: await msgVal })
    }

    private maskSurplusFlag (opts?: CrocLpOpts): number {
        if (!opts || opts.surplus === undefined) { return this.maskSurplusFlag({surplus: false})}
        return encodeSurplusArg(opts.surplus, this.useTrueBase)
    }

    private async msgValAmbient (qty: TokenQty, isQtyBase: boolean, limits: PriceRange,
        opts?: CrocLpOpts): Promise<bigint> {
        let ethQty = isQtyBase ? qty :
            this.ethForAmbientQuote(qty, limits)
        return this.ethToAttach(await ethQty, opts)
    }

    private async msgValRange (qty: TokenQty, isQtyBase: boolean, range: TickRange,
        limits: PriceRange, opts?: CrocLpOpts): Promise<bigint> {
        let ethQty = isQtyBase ? qty :
            this.ethForRangeQuote(qty, range, limits)
        return this.ethToAttach(await ethQty, opts)
    }

    private async ethToAttach (neededQty: TokenQty, opts?: CrocLpOpts): Promise<bigint> {
        if (this.baseToken.tokenAddr !== ZeroAddress) { return BigInt(0) }

        const ethQty = await this.normEth(neededQty)
        let useSurplus = decodeSurplusFlag(this.maskSurplusFlag(opts))[0]

        if (useSurplus) {
            return new CrocEthView(this.context).msgValOverSurplus(ethQty)
        } else {
            return ethQty
        }
    }

    private async ethForAmbientQuote (quoteQty: TokenQty, limits: PriceRange): Promise<TokenQty> {
        const weiEth = this.calcEthInQuote(quoteQty, limits)
        return toDisplayQty(await weiEth, await this.baseDecimals)
    }

    private async calcEthInQuote (quoteQty: TokenQty, limits: PriceRange,
        precAdj: number = 1.001): Promise<number> {
        const weiQty = await this.normQty(quoteQty, false);
        const [, boundPrice] = await this.transformLimits(limits)
        return Math.round(bigIntToFloat(weiQty) * boundPrice * precAdj)
    }

    private async ethForRangeQuote (quoteQty: TokenQty, range: TickRange,
        limits: PriceRange): Promise<TokenQty> {
        const spotPrice = await this.spotPrice() ;
        const [lowerPrice, upperPrice] = this.rangeToPrice(range)

        let skew = concDepositSkew( spotPrice , lowerPrice, upperPrice)
        let ambiQty = this.calcEthInQuote(quoteQty, limits)
        let concQty = ambiQty.then(aq => Math.ceil(aq * skew))

        return toDisplayQty(await concQty, await this.baseDecimals)
    }

    private async normEth (ethQty: TokenQty): Promise<bigint> {
        return this.normQty(ethQty, true) // ETH is always on base side
    }

    private async normQty (qty: TokenQty, isBase: boolean): Promise<bigint> {
        let token = isBase ? this.baseToken : this.quoteToken
        return token.normQty(qty)
    }

    private async makeEncoder(): Promise<WarmPathEncoder> {
        return new WarmPathEncoder(this.baseToken.tokenAddr, this.quoteToken.tokenAddr,
            (await this.context).chain.poolIndex)
    }

    readonly baseToken: CrocTokenView
    readonly quoteToken: CrocTokenView
    readonly baseDecimals: Promise<number>
    readonly quoteDecimals: Promise<number>
    readonly useTrueBase: boolean
    readonly context: Promise<CrocContext>
}

export interface CrocLpOpts {
    surplus?: CrocSurplusFlags
    floatingSlippage?: number
}
