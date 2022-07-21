import { CrocContext } from "./context";
import { sortBaseQuoteTokens, decodeCrocPrice, toDisplayPrice, bigNumToFloat, toDisplayQty } from './utils';
import { CrocTokenView, TokenQty } from './tokens';
import { TransactionResponse } from '@ethersproject/providers';
import { WarmPathEncoder } from './encoding/liquidity';
import { BigNumber } from 'ethers';
import { AddressZero } from '@ethersproject/constants';

type PriceRange = [number, number]
type TickRange = [number, number]

export class CrocPoolView {

    constructor (tokenA: string, tokenB: string, context: Promise<CrocContext>) {
        console.log([tokenA, tokenB]);
        [this.baseToken, this.quoteToken] = 
            sortBaseQuoteTokens(tokenA, tokenB)
        this.context = context

        this.baseDecimals = new CrocTokenView(context, this.baseToken).decimals
        this.quoteDecimals = new CrocTokenView(context, this.quoteToken).decimals

        this.invertedDisplay = this.baseToken === tokenB
    }

    async spotPrice(): Promise<number> {
        let sqrtPrice = (await this.context).query.queryPrice
            (this.baseToken, this.quoteToken, (await this.context).chain.chainId)
        console.log((await this.context).dex.address)
        console.log(await sqrtPrice)
        console.log((await this.context).chain.nodeUrl)
        return decodeCrocPrice(await sqrtPrice)
    }

    async displayPrice(): Promise<number> {
        let spotPrice = this.spotPrice()
        return toDisplayPrice(await spotPrice, await this.baseDecimals, 
            await this.quoteDecimals, this.invertedDisplay)
    }

    async mintAmbientBase (qty: TokenQty, limits: PriceRange): Promise<TransactionResponse> {
        if (this.baseToken === AddressZero) {
            return this.mintAmbient(qty, true, limits, qty)
        } else {
            return this.mintAmbient(qty, true, limits)
        }
    }

    async mintAmbientQuote (qty: TokenQty, limits: PriceRange): Promise<TransactionResponse> {
        if (this.baseToken === AddressZero) {
            let etherQty = this.ethForAmbientQuote(qty, limits)
            return this.mintAmbient(qty, false, limits, await etherQty)
        } else {
            return this.mintAmbient(qty, false, limits)
        }
    }

    async mintRangeBase (qty: TokenQty, range: TickRange, limits: PriceRange): Promise<TransactionResponse> {
        if (this.baseToken === AddressZero) {
            return this.mintRange(qty, true, range, limits, qty)
        } else {
            return this.mintRange(qty, true, range, limits)
        }
    }

    async mintRangeQuote (qty: TokenQty, range: TickRange, limits: PriceRange): Promise<TransactionResponse> {
        if (this.baseToken === AddressZero) {
            let etherQty = this.ethForRangeQuote(qty, range, limits)
            return this.mintRange(qty, false, range, limits, await etherQty)
        } else {
            return this.mintRange(qty, false, range, limits)
        }
    }

    private async mintAmbient (qty: TokenQty, isQtyBase: boolean, 
        limits: PriceRange, val?: TokenQty): Promise<TransactionResponse> {
        let weiQty = await this.normQty(qty, isQtyBase)
        let txArgs = val ? { value: await this.normQty(val, isQtyBase) } : { }
        const args = (await this.makeEncoder()).encodeMintAmbient(
            weiQty, isQtyBase, limits[0], limits[1], false)
        return (await this.context).dex.userCmd(LIQ_PATH, args, txArgs)
    }

    private async mintRange (qty: TokenQty, isQtyBase: boolean, 
        range: TickRange, limits: PriceRange, val?: TokenQty): Promise<TransactionResponse> {
        let weiQty = await this.normQty(qty, isQtyBase)
        let txArgs = val ? { value: await this.normQty(val, isQtyBase) } : { }
        const args = (await this.makeEncoder()).encodeMintConc(range[0], range[1],
            weiQty, isQtyBase, limits[0], limits[1], false)
        return (await this.context).dex.userCmd(LIQ_PATH, args, txArgs)
    }

    private async ethForAmbientQuote (quoteQty: TokenQty, limits: PriceRange): Promise<TokenQty> {
        const PRECISION_ADJ = 1.001
        let weiQty = await this.normQty(quoteQty, false)
        let weiEth = Math.round(bigNumToFloat(weiQty) * limits[1] * PRECISION_ADJ)
        return toDisplayQty(weiEth, await this.baseDecimals)
    }

    private async normQty (qty: TokenQty, isBase: boolean): Promise<BigNumber> {
        let token = new CrocTokenView(this.context, isBase ? this.baseToken : this.quoteToken)
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
    readonly baseDecimals: Promise<number>
    readonly quoteDecimals: Promise<number>
    readonly invertedDisplay: boolean
    readonly context: Promise<CrocContext>
}


const LIQ_PATH = 2;