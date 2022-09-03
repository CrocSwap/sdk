import { CrocContext } from "./context";
import { sortBaseQuoteTokens, decodeCrocPrice, toDisplayPrice, bigNumToFloat, toDisplayQty, fromDisplayPrice, roundForConcLiq } from './utils';
import { CrocTokenView, TokenQty } from './tokens';
import { TransactionResponse } from '@ethersproject/providers';
import { WarmPathEncoder } from './encoding/liquidity';
import { BigNumber } from 'ethers';
import { AddressZero } from '@ethersproject/constants';
import { PoolInitEncoder } from "./encoding/init";
import { CrocSurplusFlags, encodeSurplusArg } from "./encoding/flags";

type PriceRange = [number, number]
type TickRange = [number, number]

export class CrocPoolView {

    constructor (tokenTop: string, tokenBottom: string, context: Promise<CrocContext>) {
        [this.baseToken, this.quoteToken] = 
            sortBaseQuoteTokens(tokenTop, tokenBottom)
        this.context = context

        this.baseTokenView = new CrocTokenView(context, this.baseToken)
        this.quoteTokenView = new CrocTokenView(context, this.quoteToken)

        this.baseDecimals = this.baseTokenView.decimals
        this.quoteDecimals = this.quoteTokenView.decimals

        this.invertedDisplay = this.baseToken === tokenTop
    }

    async isInit(): Promise<boolean> {
        return this.spotPrice()
            .then(p => p > 0)
    }

    async spotPrice(): Promise<number> {
        let sqrtPrice = (await this.context).query.queryPrice
            (this.baseToken, this.quoteToken, (await this.context).chain.poolIndex)
        return decodeCrocPrice(await sqrtPrice)
    }

    async displayPrice(): Promise<number> {
        let spotPrice = this.spotPrice()
        return this.toDisplayPrice(await spotPrice)
    }

    async spotTick(): Promise<number> {
        return (await this.context).query.queryCurveTick
            (this.baseToken, this.quoteToken, (await this.context).chain.poolIndex)
    }

    async toDisplayPrice (spotPrice: number): Promise<number> {
        return toDisplayPrice(spotPrice, await this.baseDecimals, await this.quoteDecimals,
            this.invertedDisplay)
    }

    async fromDisplayPrice (dispPrice: number): Promise<number> {
        return fromDisplayPrice(dispPrice, await this.baseDecimals, await this.quoteDecimals, 
            this.invertedDisplay)
    }

    async initPool (initPrice: number): Promise<TransactionResponse> {
        // Very small amount of ETH in economic terms but more than sufficient for min init burn
        const ETH_INIT_BURN = BigNumber.from(10).pow(12)
        let txArgs = this.baseToken === AddressZero ? { value: ETH_INIT_BURN } : { }
        
        let encoder = new PoolInitEncoder(this.baseToken, this.quoteToken, 
            (await this.context).chain.poolIndex)
        let spotPrice = this.fromDisplayPrice(initPrice)
        let calldata = encoder.encodeInitialize(await spotPrice)
        
        return (await this.context).dex.userCmd(COLD_PATH, calldata, txArgs)       
    }

    async mintAmbientLeft (qty: TokenQty, limits: PriceRange, opts?: CrocLpOpts): 
        Promise<TransactionResponse> {
        return this.invertedDisplay ? 
            this.mintAmbientBase(qty, limits, opts) :
            this.mintAmbientQuote(qty, limits, opts)
    }

    async mintAmbientRight (qty: TokenQty, limits: PriceRange, opts?: CrocLpOpts): 
        Promise<TransactionResponse> {
        return this.invertedDisplay ? 
            this.mintAmbientQuote(qty, limits, opts) :
            this.mintAmbientBase(qty, limits, opts)
    }

    async mintAmbientBase (qty: TokenQty, limits: PriceRange, _opts?: CrocLpOpts): 
        Promise<TransactionResponse> {
        if (this.baseToken === AddressZero) {
            return this.mintAmbient(qty, true, limits, qty)
        } else {
            return this.mintAmbient(qty, true, limits)
        }
    }

    async mintAmbientQuote (qty: TokenQty, limits: PriceRange, _opts?: CrocLpOpts): 
        Promise<TransactionResponse> {
        if (this.baseToken === AddressZero) {
            let etherQty = this.ethForAmbientQuote(qty, limits)
            return this.mintAmbient(qty, false, limits, await etherQty)
        } else {
            return this.mintAmbient(qty, false, limits)
        }
    }

    async mintRangeRight (qty: TokenQty, range: TickRange, limits: PriceRange, opts?: CrocLpOpts): 
        Promise<TransactionResponse> {
        return this.invertedDisplay ? 
            this.mintRangeQuote(qty, range, limits, opts) :
            this.mintRangeBase(qty, range, limits, opts)
    }

    async mintRangeLeft (qty: TokenQty, range: TickRange, limits: PriceRange, opts?: CrocLpOpts): 
        Promise<TransactionResponse> {
        return this.invertedDisplay ? 
            this.mintRangeBase(qty, range, limits, opts) :
            this.mintRangeQuote(qty, range, limits, opts)
    }

    async mintRangeBase (qty: TokenQty, range: TickRange, limits: PriceRange, _opts?: CrocLpOpts): 
        Promise<TransactionResponse> {
        if (this.baseToken === AddressZero) {
            return this.mintRange(qty, true, range, limits, qty)
        } else {
            return this.mintRange(qty, true, range, limits)
        }
    }

    async mintRangeQuote (qty: TokenQty, range: TickRange, limits: PriceRange, _opts?: CrocLpOpts): 
        Promise<TransactionResponse> {
        if (this.baseToken === AddressZero) {
            let etherQty = this.ethForRangeQuote(qty, range, limits)
            return this.mintRange(qty, false, range, limits, await etherQty)
        } else {
            return this.mintRange(qty, false, range, limits)
        }
    }

    async burnAmbientLiq (liq: BigNumber, limits: PriceRange, opts?: CrocLpOpts): 
        Promise<TransactionResponse> {
        let [lowerBound, upperBound] = await this.transformLimits(limits)
        const calldata = (await this.makeEncoder()).encodeBurnAmbient
            (liq, lowerBound, upperBound, this.maskSurplusFlag(opts))
        return (await this.context).dex.userCmd(LIQ_PATH, calldata)
    }

    async burnAmbientAll (limits: PriceRange, opts?: CrocLpOpts): Promise<TransactionResponse> {
        let [lowerBound, upperBound] = await this.transformLimits(limits)
        const calldata = (await this.makeEncoder()).encodeBurnAmbientAll
            (lowerBound, upperBound, this.maskSurplusFlag(opts))
        return (await this.context).dex.userCmd(LIQ_PATH, calldata)
    }

    async burnRangeLiq (liq: BigNumber, range: TickRange, limits: PriceRange, opts?: CrocLpOpts): 
        Promise<TransactionResponse> {
        let [lowerBound, upperBound] = await this.transformLimits(limits)
        let roundLotLiq = roundForConcLiq(liq)
        const calldata = (await this.makeEncoder()).encodeBurnConc
            (range[0], range[1], roundLotLiq, lowerBound, upperBound, this.maskSurplusFlag(opts))

        return (await this.context).dex.userCmd(LIQ_PATH, calldata)
    }

    async harvestRange (range: TickRange, limits: PriceRange, opts?: CrocLpOpts): 
        Promise<TransactionResponse> {
        let [lowerBound, upperBound] = await this.transformLimits(limits)
        const calldata = (await this.makeEncoder()).encodeHarvestConc
            (range[0], range[1], lowerBound, upperBound, this.maskSurplusFlag(opts))

        return (await this.context).dex.userCmd(LIQ_PATH, calldata)
    }

    private async mintAmbient (qty: TokenQty, isQtyBase: boolean, 
        limits: PriceRange, val?: TokenQty): Promise<TransactionResponse> {
        let weiQty = this.normQty(qty, isQtyBase)
        let txArgs = val ? { value: await this.normEth(val) } : { }
        let [lowerBound, upperBound] = await this.transformLimits(limits)

        const calldata = (await this.makeEncoder()).encodeMintAmbient(
            await weiQty, isQtyBase, lowerBound, upperBound, 0x0)

        return (await this.context).dex.userCmd(LIQ_PATH, calldata, txArgs)
    }

    private async transformLimits (limits: PriceRange): Promise<PriceRange> {
        let left = this.fromDisplayPrice(limits[0])
        let right = this.fromDisplayPrice(limits[1])
        return (await left < await right) ?
            [await left, await right] :
            [await right, await left]
    }

    private async mintRange (qty: TokenQty, isQtyBase: boolean, 
        range: TickRange, limits: PriceRange, val?: TokenQty): Promise<TransactionResponse> {
        let weiQty = this.normQty(qty, isQtyBase)
        let txArgs = val ? { value: await this.normEth(val) } : { }
        let [lowerBound, upperBound] = await this.transformLimits(limits)

        const calldata = (await this.makeEncoder()).encodeMintConc(range[0], range[1],
            await weiQty, isQtyBase, lowerBound, upperBound, 0x0)
        
        return (await this.context).dex.userCmd(LIQ_PATH, calldata, txArgs)
    }

    private maskSurplusFlag (opts?: CrocLpOpts): number {
        if (!opts || opts.surplus === undefined) { return this.maskSurplusFlag({surplus: false})}
        return encodeSurplusArg(opts.surplus, !this.invertedDisplay)
    }

    private async ethForAmbientQuote (quoteQty: TokenQty, limits: PriceRange): Promise<TokenQty> {
        const PRECISION_ADJ = 1.001
        const weiQty = await this.normQty(quoteQty, false);
        const [, boundPrice] = await this.transformLimits(limits)
        const weiEth = Math.round(bigNumToFloat(weiQty) * boundPrice * PRECISION_ADJ)
        return toDisplayQty(weiEth, await this.baseDecimals)
    }

    private async normEth (ethQty: TokenQty): Promise<BigNumber> {
        return this.normQty(ethQty, true) // ETH is always on base side
    }

    private async normQty (qty: TokenQty, isBase: boolean): Promise<BigNumber> {
        let token = isBase ? this.baseTokenView : this.quoteTokenView
        return token.normQty(qty)
    }

    private async makeEncoder(): Promise<WarmPathEncoder> {
        return new WarmPathEncoder(this.baseToken, this.quoteToken, (await this.context).chain.poolIndex)
    }

    private async ethForRangeQuote (_quoteQty: TokenQty, _range: TickRange, _limits: PriceRange): 
        Promise<TokenQty> {
        return 0 // Placeholder for now... Implement this calculation
    }

    readonly baseToken: string
    readonly quoteToken: string
    readonly baseTokenView: CrocTokenView
    readonly quoteTokenView: CrocTokenView
    readonly baseDecimals: Promise<number>
    readonly quoteDecimals: Promise<number>
    readonly invertedDisplay: boolean
    readonly context: Promise<CrocContext>
}

export interface CrocLpOpts {
    surplus?: CrocSurplusFlags
}

const COLD_PATH = 0;
const LIQ_PATH = 2;

