import { BigNumber } from "ethers";

import {
  sortBaseQuoteTokens,
} from "./utils/token";
import { TransactionResponse } from '@ethersproject/providers';
import { CrocContext } from './context';
import { CrocPoolView } from './pool';
import { decodeCrocPrice } from './utils';
import { TokenQty } from './tokens';
import { AddressZero } from '@ethersproject/constants';
import { CrocSurplusFlags, decodeSurplusFlag, encodeSurplusArg } from "./encoding/flags";
import { MAX_SQRT_PRICE, MIN_SQRT_PRICE } from "./constants";

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
    this.priceSlippage = slippage * PRICE_SLIP_MULT
    this.context = context

    this.impact = this.calcImpact()
  }


  async swap (args: CrocSwapOpts = { }): Promise<TransactionResponse> {
    const TIP = 0
    const surplusFlags = this.maskSurplusArgs(args.surplus)

    const gasEst = (await this.context).dex.estimateGas.swap
      (this.baseToken, this.quoteToken, (await this.context).chain.poolIndex,
      this.sellBase, this.qtyInBase, await this.qty, TIP, 
      await this.calcLimitPrice(), await this.calcSlipQty(), surplusFlags,
      await this.buildTxArgs(surplusFlags))

    return (await this.context).dex.swap
      (this.baseToken, this.quoteToken, (await this.context).chain.poolIndex,
      this.sellBase, this.qtyInBase, await this.qty, TIP, 
      await this.calcLimitPrice(), await this.calcSlipQty(), surplusFlags,
      await this.buildTxArgs(surplusFlags, await gasEst))
  }


  async calcImpact(): Promise<CrocImpact> {
    const TIP = 0
    const limitPrice = this.sellBase ? MAX_SQRT_PRICE : MIN_SQRT_PRICE
    const impact = await (await this.context).slipQuery.calcImpact
      (this.baseToken, this.quoteToken, (await this.context).chain.poolIndex,
      this.sellBase, this.qtyInBase, await this.qty, TIP, limitPrice);

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
    if (!args) { return this.maskSurplusArgs([false, false]); }
    return encodeSurplusArg(args, !this.sellBase)
  }

  private async buildTxArgs (surplusArg: number, gasEst?: BigNumber) {
    let txArgs = {}

    if (this.needsAttachedEth(surplusArg)) {
      const val = this.qtyInBase ? this.qty : this.calcSlipQty()
      Object.assign(txArgs, {value: await val})
    }

    if (gasEst) {
      const GAS_PADDING = 15000
      Object.assign(txArgs, { gasLimit: gasEst.add(GAS_PADDING)})
    }

    return txArgs
  }

  private needsAttachedEth (surplusEncoded: number): boolean {
    return this.sellBase &&
    (this.baseToken === AddressZero) &&
    !(decodeSurplusFlag(surplusEncoded)[0])
  }

  async calcSlipQty(): Promise<BigNumber> {
    const qtyIsBuy = (this.sellBase === this.qtyInBase)

    const slipQty = !qtyIsBuy ?
      parseFloat((await this.impact).sellQty) * (1 + this.slippage) :
      parseFloat((await this.impact).buyQty) * (1 - this.slippage)

    return !this.qtyInBase ? 
      this.poolView.baseTokenView.roundQty(slipQty) : 
      this.poolView.quoteTokenView.roundQty(slipQty)
  }

  async calcLimitPrice(): Promise<BigNumber> {
    return this.sellBase ? MAX_SQRT_PRICE : MIN_SQRT_PRICE
  }

  readonly baseToken: string
  readonly quoteToken: string
  readonly qty: Promise<BigNumber>
  readonly sellBase: boolean
  readonly qtyInBase: boolean
  readonly slippage: number
  readonly priceSlippage: number
  readonly poolView: CrocPoolView
  readonly context: Promise<CrocContext>
  readonly impact: Promise<CrocImpact>
}

// Price slippage limit multiplies normal slippage tolerance by amount that should
// be reasonable (300%)
const PRICE_SLIP_MULT = 3.0
