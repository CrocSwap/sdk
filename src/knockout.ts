import { BigNumber } from "ethers";

import {
  sortBaseQuoteTokens,
} from "./utils/token";
import { TransactionResponse } from '@ethersproject/providers';
import { CrocContext } from './context';
import { CrocTokenView, TokenQty } from './tokens';
import { AddressZero } from '@ethersproject/constants';
import { KnockoutEncoder } from "./encoding/knockout";
import { ChainSpec } from "./constants";

export class CrocKnockoutHandle {
  constructor (sellToken: string, buyToken: string, qty: TokenQty,
    knockoutTick: number, context: Promise<CrocContext>) {
    [this.baseToken, this.quoteToken] = sortBaseQuoteTokens(sellToken, buyToken)
    this.sellBase = (this.baseToken === sellToken)
    this.qtyInBase = this.sellBase

    const tokenView = new CrocTokenView(context,
      this.qtyInBase ? this.baseToken : this.quoteToken)
    this.qty = tokenView.normQty(qty)

    this.knockoutTick = knockoutTick
    this.context = context
  }

  async mint(): Promise<TransactionResponse> {
    let chain = (await this.context).chain
    let encoder = new KnockoutEncoder(this.baseToken, this.quoteToken, chain.poolIndex)
    let [lowerTick, upperTick] = this.tickRange(chain)
    let cmd = encoder.encodeKnockoutMint(await this.qty, lowerTick, upperTick, 
      this.sellBase, false);
    return (await this.context).dex.userCmd(KNOCKOUT_PATH, cmd, await this.buildTxArgs())
  }

  async willFail(): Promise<boolean> {
    let gridSize = this.context.then(c => c.chain.gridSize)
    let marketTick = this.context.then(c => c.query.queryCurveTick
      (this.baseToken, this.quoteToken, c.chain.poolIndex))
    return this.sellBase ?
      (this.knockoutTick + await gridSize >= await marketTick) :
      (this.knockoutTick - await gridSize <= await marketTick)
  }

  private async buildTxArgs() {
    if (this.baseToken == AddressZero && this.sellBase) {
      return { value: await this.qty, gasLimit: 6000000 }
    } else {
      return { gasLimit: 6000000 }
    }
  }

  private tickRange (chain: ChainSpec): [number, number] {
    return this.sellBase ? 
      [this.knockoutTick, this.knockoutTick + chain.gridSize] :
      [this.knockoutTick - chain.gridSize, this.knockoutTick]
  }

  readonly baseToken: string
  readonly quoteToken: string
  readonly qty: Promise<BigNumber>
  readonly sellBase: boolean
  readonly qtyInBase: boolean
  readonly knockoutTick: number
  readonly context: Promise<CrocContext>
}

const KNOCKOUT_PATH = 7