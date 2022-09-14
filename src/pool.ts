/* eslint-disable prefer-const */
import { CrocContext } from "./context";
import { sortBaseQuoteTokens, decodeCrocPrice, toDisplayPrice, bigNumToFloat, toDisplayQty, fromDisplayPrice, roundForConcLiq, concDepositSkew } from './utils';
import { CrocTokenView, TokenQty } from './tokens';
import { TransactionResponse } from '@ethersproject/providers';
import { WarmPathEncoder } from './encoding/liquidity';
import { BigNumber, ethers } from 'ethers';
import { AddressZero } from '@ethersproject/constants';
import { PoolInitEncoder } from "./encoding/init";
import { CrocSurplusFlags, decodeSurplusFlag, encodeSurplusArg } from "./encoding/flags";

type PriceRange = [number, number]
type TickRange = [number, number]

export class CrocPoolView {

    constructor (quoteToken: string, baseToken: string, context: Promise<CrocContext>) {
        [this.baseToken, this.quoteToken] = 
            sortBaseQuoteTokens(baseToken, quoteToken)
        this.context = context

        this.baseTokenView = new CrocTokenView(context, this.baseToken)
        this.quoteTokenView = new CrocTokenView(context, this.quoteToken)

        this.baseDecimals = this.baseTokenView.decimals
        this.quoteDecimals = this.quoteTokenView.decimals

        this.useTrueBase = this.baseToken === baseToken
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
            !this.useTrueBase)
    }

    async fromDisplayPrice (dispPrice: number): Promise<number> {
        return fromDisplayPrice(dispPrice, await this.baseDecimals, await this.quoteDecimals, 
            !this.useTrueBase)
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
        return this.mintRange(qty, this.useTrueBase, range, limits, opts)
    }

    async mintRangeQuote (qty: TokenQty, range: TickRange, limits: PriceRange, opts?: CrocLpOpts): 
        Promise<TransactionResponse> {
        return this.mintRange(qty, !this.useTrueBase, range, limits, opts)
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
        limits: PriceRange, opts?: CrocLpOpts): Promise<TransactionResponse> {
        let msgVal = this.msgValAmbient(qty, isQtyBase, limits, opts)
        let weiQty = this.normQty(qty, isQtyBase)
        let [lowerBound, upperBound] = await this.transformLimits(limits)

        const calldata = (await this.makeEncoder()).encodeMintAmbient(
            await weiQty, isQtyBase, lowerBound, upperBound, this.maskSurplusFlag(opts))

        return (await this.context).dex.userCmd(LIQ_PATH, calldata, { value: await msgVal })
    }

    private async transformLimits (limits: PriceRange): Promise<PriceRange> {
        let left = this.fromDisplayPrice(limits[0])
        let right = this.fromDisplayPrice(limits[1])
        return (await left < await right) ?
            [await left, await right] :
            [await right, await left]
    }

    private async mintRange (qty: TokenQty, isQtyBase: boolean, 
        range: TickRange, limits: PriceRange, opts?: CrocLpOpts): Promise<TransactionResponse> {
        let msgVal = this.msgValRange(qty, isQtyBase, range, limits, opts)
        let weiQty = this.normQty(qty, isQtyBase)
        let [lowerBound, upperBound] = await this.transformLimits(limits)
        
        const calldata = (await this.makeEncoder()).encodeMintConc(range[0], range[1],
            await weiQty, isQtyBase, lowerBound, upperBound, this.maskSurplusFlag(opts))
        
        return (await this.context).dex.userCmd(LIQ_PATH, calldata, { value: await msgVal})
    }

    private maskSurplusFlag (opts?: CrocLpOpts): number {
        if (!opts || opts.surplus === undefined) { return this.maskSurplusFlag({surplus: false})}
        return encodeSurplusArg(opts.surplus, this.useTrueBase)
    }

    private async msgValAmbient (qty: TokenQty, isQtyBase: boolean, limits: PriceRange,
        opts?: CrocLpOpts): Promise<BigNumber> {
        if (!this.needsAttachedVal(opts)) { return BigNumber.from(0) }
        let ethQty = isQtyBase ? qty :
            this.ethForAmbientQuote(qty, limits)
        return this.normEth(await ethQty)
    }

    private async msgValRange (qty: TokenQty, isQtyBase: boolean, range: TickRange, 
        limits: PriceRange, opts?: CrocLpOpts): Promise<BigNumber> {
        if (!this.needsAttachedVal(opts)) { return BigNumber.from(0) }
        let ethQty = isQtyBase ? qty :
            this.ethForRangeQuote(qty, range, limits)
        return this.normEth(await ethQty)
    }

    private needsAttachedVal (opts?: CrocLpOpts): boolean {
        if (this.baseToken === ethers.constants.AddressZero) {
            let flags = this.maskSurplusFlag(opts)
            return !(decodeSurplusFlag(flags)[0])
        }
        return false
    }

    private async ethForAmbientQuote (quoteQty: TokenQty, limits: PriceRange): Promise<TokenQty> {
        const weiEth = this.calcEthInQuote(quoteQty, limits)
        return toDisplayQty(await weiEth, await this.baseDecimals)
    }

    private async calcEthInQuote (quoteQty: TokenQty, limits: PriceRange, 
        precAdj: number = 1.001): Promise<number> {
        const weiQty = await this.normQty(quoteQty, false);
        const [, boundPrice] = await this.transformLimits(limits)
        return Math.round(bigNumToFloat(weiQty) * boundPrice * precAdj)            
    }

    private async ethForRangeQuote (quoteQty: TokenQty, range: TickRange, limits: PriceRange): 
        Promise<TokenQty> {        
        const [, boundPrice] = await this.transformLimits(limits)
        const lowerPrice = Math.pow(1.0001, range[0])
        const upperPrice = Math.pow(1.0001, range[1])

        let ambiQty = this.calcEthInQuote(quoteQty, limits)
        let skew = concDepositSkew(boundPrice, lowerPrice, upperPrice)
        let concQty = ambiQty.then(aq => Math.ceil(aq / skew))
        return toDisplayQty(await concQty, await this.baseDecimals)
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

    readonly baseToken: string
    readonly quoteToken: string
    readonly baseTokenView: CrocTokenView
    readonly quoteTokenView: CrocTokenView
    readonly baseDecimals: Promise<number>
    readonly quoteDecimals: Promise<number>
    readonly useTrueBase: boolean
    readonly context: Promise<CrocContext>
}

export interface CrocLpOpts {
    surplus?: CrocSurplusFlags
}

const COLD_PATH = 0;
const LIQ_PATH = 2;

