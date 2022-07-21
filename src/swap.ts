import { BigNumber } from "ethers";

import {
  sortBaseQuoteTokens,
} from "./utils/token";
import { TransactionResponse } from '@ethersproject/providers';
import { CrocContext } from './context';
import { CrocPoolView } from './pool';
import { bigNumToFloat, floatToBigNum, encodeCrocPrice } from './utils';
import { CrocTokenView, TokenQty } from './tokens';
import { AddressZero } from '@ethersproject/constants';

export class CrocSwapPlan {

  constructor (sellToken: string, buyToken: string, qty: TokenQty, qtyIsBuy: boolean,
    slippage: number, context: Promise<CrocContext>) {
    [this.baseToken, this.quoteToken] = sortBaseQuoteTokens(sellToken, buyToken)
    this.sellBase = (this.baseToken === sellToken)
    this.qtyInBase = (this.sellBase !== qtyIsBuy)

    const tokenView = new CrocTokenView(context,
      this.qtyInBase ? this.baseToken : this.quoteToken)
    this.qty = tokenView.normQty(qty)
    
    this.slippage = slippage
    this.context = context
  }

  async swap(): Promise<TransactionResponse> {
    const TIP = 0
    const SURPLUS_FLAGS = 0
    return (await this.context).dex.swap
      (this.baseToken, this.quoteToken, (await this.context).chain.poolIndex,
      this.sellBase, this.qtyInBase, await this.qty, TIP, 
      await this.calcLimitPrice(), await this.calcSlipQty(), SURPLUS_FLAGS,
      await this.buildTxArgs())
  }

  private async buildTxArgs() {
    if (this.baseToken == AddressZero && this.sellBase) {
      let val = this.qtyInBase ? this.qty : this.calcSlipQty()
      return await { value: val }
    } else {
      return { }
    }
  }

  private async calcSlipQty(): Promise<BigNumber> {
    let qty = bigNumToFloat(await this.qty)
    let spotPrice = await this.fetchSpotPrice()
    let priceMult = this.qtyInBase ? 1/spotPrice : spotPrice
    let qtyIsBuy = (this.sellBase === this.qtyInBase)
    let slipMult = qtyIsBuy ? (1 - this.slippage) : (1 + this.slippage)
    return floatToBigNum(qty * priceMult * slipMult)
  }

  private async calcLimitPrice(): Promise<BigNumber> {
    const PREC_ADJ = 1.5
    let spotPrice = await this.fetchSpotPrice()
    let slipPrec = this.slippage * PREC_ADJ
    let limitPrice = spotPrice * (this.sellBase ? (1 + slipPrec) : (1 - slipPrec))
    return encodeCrocPrice(limitPrice)
  }

  private async fetchSpotPrice(): Promise<number> {
    let pool = new CrocPoolView(this.baseToken, this.quoteToken, this.context)
    return pool.spotPrice()
  }

  readonly baseToken: string
  readonly quoteToken: string
  readonly qty: Promise<BigNumber>
  readonly sellBase: boolean
  readonly qtyInBase: boolean
  readonly slippage: number
  readonly context: Promise<CrocContext>
}
