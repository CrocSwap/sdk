import { BigNumber } from "ethers";

import {
  sortBaseQuoteTokens,
} from "./utils/token";
import { TransactionResponse } from '@ethersproject/providers';
import { CrocContext } from './context';
import { CrocPoolView } from './pool';
import { bigNumToFloat, floatToBigNum, encodeCrocPrice, decodeCrocPrice } from './utils';
import { TokenQty } from './tokens';
import { AddressZero } from '@ethersproject/constants';
import { CrocSurplusFlags, decodeSurplusFlag, encodeSurplusArg } from "./encoding/flags";

export interface CrocImpact {
  sellQty: string,
  buyQty: string,
  finalPrice: number,
  percentChange: number
}

export interface CrocSwapOpts {
  surplus?: CrocSurplusFlags
}


export class CrocSwapPlan {

  constructor (sellToken: string, buyToken: string, qty: TokenQty, qtyIsBuy: boolean,
    slippage: number, context: Promise<CrocContext>) {
    [this.baseToken, this.quoteToken] = sortBaseQuoteTokens(sellToken, buyToken)
    this.sellBase = (this.baseToken === sellToken)
    this.qtyInBase = (this.sellBase !== qtyIsBuy)

    this.poolView = new CrocPoolView(this.baseToken, this.quoteToken, context)
    const tokenView = this.qtyInBase ? this.poolView.baseTokenView : this.poolView.quoteTokenView
    this.qty = tokenView.normQty(qty)
    
    this.slippage = slippage
    this.context = context
  }


  async swap (args: CrocSwapOpts = { }): Promise<TransactionResponse> {
    const TIP = 0
    const surplusFlags = this.maskSurplusArgs(args.surplus)
    return (await this.context).dex.swap
      (this.baseToken, this.quoteToken, (await this.context).chain.poolIndex,
      this.sellBase, this.qtyInBase, await this.qty, TIP, 
      await this.calcLimitPrice(), await this.calcSlipQty(), surplusFlags,
      await this.buildTxArgs(surplusFlags))
  }


  async calcImpact(): Promise<CrocImpact> {
    const TIP = 0
    const impact = await (await this.context).slipQuery.calcImpact
      (this.baseToken, this.quoteToken, (await this.context).chain.poolIndex,
      this.sellBase, this.qtyInBase, await this.qty, TIP, await this.calcLimitPrice());

    const baseQty = this.poolView.baseTokenView.toDisplay(impact.baseFlow.abs())
    const quoteQty = this.poolView.quoteTokenView.toDisplay(impact.quoteFlow.abs())
    const spotPrice = decodeCrocPrice(impact.finalPrice)

    const startPrice = this.poolView.displayPrice()
    const finalPrice = this.poolView.toDisplayPrice(spotPrice)

    return {
      sellQty: this.sellBase ? await baseQty : await quoteQty,
      buyQty: this.sellBase ? await quoteQty : await baseQty,
      finalPrice: await finalPrice,
      percentChange: (await finalPrice - await startPrice) / await startPrice
    }
  }


  private maskSurplusArgs (args?: CrocSurplusFlags): number {
    if (!args) { return this.maskSurplusArgs(false); }
    return encodeSurplusArg(args, !this.sellBase)
  }

  private async buildTxArgs (surplusArg: number) {
    if (this.needsAttachedEth(surplusArg)) {
      const val = this.qtyInBase ? this.qty : this.calcSlipQty()
      return { value: await val }
    } else {
      return { }
    }
  }

  private needsAttachedEth (surplusEncoded: number): boolean {
    return this.sellBase &&
    (this.baseToken === AddressZero) &&
    !(decodeSurplusFlag(surplusEncoded)[0])
  }

  private async calcSlipQty(): Promise<BigNumber> {
    const qty = bigNumToFloat(await this.qty)
    const spotPrice = await this.fetchSpotPrice()
    const priceMult = this.qtyInBase ? 1/spotPrice : spotPrice
    const qtyIsBuy = (this.sellBase === this.qtyInBase)
    const slipMult = qtyIsBuy ? (1 - this.slippage) : (1 + this.slippage)
    return floatToBigNum(qty * priceMult * slipMult)
  }

  private async calcLimitPrice(): Promise<BigNumber> {
    const PREC_ADJ = 1.01
    const spotPrice = await this.fetchSpotPrice()
    const slipPrec = this.slippage * PREC_ADJ
    const limitPrice = spotPrice * (this.sellBase ? (1 + slipPrec) : (1 - slipPrec))
    console.log({limitPrice})
    return encodeCrocPrice(limitPrice)
  }

  private async fetchSpotPrice(): Promise<number> {
    return this.poolView.spotPrice()
  }

  readonly baseToken: string
  readonly quoteToken: string
  readonly qty: Promise<BigNumber>
  readonly sellBase: boolean
  readonly qtyInBase: boolean
  readonly slippage: number
  readonly poolView: CrocPoolView
  readonly context: Promise<CrocContext>
}
