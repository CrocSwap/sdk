import { BigNumber } from "ethers";
import { sortBaseQuoteTokens } from "./utils/token";
import { TransactionResponse } from '@ethersproject/providers';
import { CrocContext } from './context';
import { CrocTokenView, TokenQty } from './tokens';
import { AddressZero } from '@ethersproject/constants';
import { KnockoutEncoder } from "./encoding/knockout";
import { ChainSpec } from "./constants";
import { CrocSurplusFlags, decodeSurplusFlag, encodeSurplusArg } from "./encoding/flags";
import { baseTokenForQuoteConc, bigNumToFloat, floatToBigNum, quoteTokenForBaseConc, roundForConcLiq } from "./utils";


export class CrocKnockoutHandle {

  constructor (sellToken: string, buyToken: string, qty: TokenQty, inSellQty: boolean,
    knockoutTick: number, context: Promise<CrocContext>) {
    [this.baseToken, this.quoteToken] = sortBaseQuoteTokens(sellToken, buyToken)
    this.sellBase = (this.baseToken === sellToken)
    this.qtyInBase = this.sellBase

    const tokenView = new CrocTokenView(context,
      this.qtyInBase ? this.baseToken : this.quoteToken)
    const specQty = tokenView.normQty(qty)

    this.qty = inSellQty ? specQty : 
      calcSellQty(specQty, !this.sellBase, knockoutTick, context)

    this.knockoutTick = knockoutTick
    this.context = context
  }

  async mint (opts?: CrocKnockoutOpts): Promise<TransactionResponse> {
    let chain = (await this.context).chain
    let encoder = new KnockoutEncoder(this.baseToken, this.quoteToken, chain.poolIndex)
    let [lowerTick, upperTick] = this.tickRange(chain)
    let surplus = this.maskSurplusFlags(opts)

    let cmd = encoder.encodeKnockoutMint(await this.qty, lowerTick, upperTick, 
      this.sellBase, surplus);
    return (await this.context).dex.userCmd(KNOCKOUT_PATH, cmd, { value: this.msgVal(surplus), gasLimit: 1000000 })
  }

  async burn (opts?: CrocKnockoutOpts): Promise<TransactionResponse> {
    let chain = (await this.context).chain
    let encoder = new KnockoutEncoder(this.baseToken, this.quoteToken, chain.poolIndex)
    let [lowerTick, upperTick] = this.tickRange(chain)
    let surplus = this.maskSurplusFlags(opts)

    let cmd = encoder.encodeKnockoutBurnQty(await this.qty, lowerTick, upperTick, 
      this.sellBase, surplus);
    return (await this.context).dex.userCmd(KNOCKOUT_PATH, cmd)
  }

  async burnLiq (liq: BigNumber, opts?: CrocKnockoutOpts): Promise<TransactionResponse> {
    let chain = (await this.context).chain
    let encoder = new KnockoutEncoder(this.baseToken, this.quoteToken, chain.poolIndex)
    let [lowerTick, upperTick] = this.tickRange(chain)
    let surplus = this.maskSurplusFlags(opts)

    let cmd = encoder.encodeKnockoutBurnLiq(roundForConcLiq(liq), lowerTick, upperTick, 
      this.sellBase, surplus);
    return (await this.context).dex.userCmd(KNOCKOUT_PATH, cmd)
  }

  async recoverPost (pivotTime: number, opts?: CrocKnockoutOpts): Promise<TransactionResponse> {
    let chain = (await this.context).chain
    let encoder = new KnockoutEncoder(this.baseToken, this.quoteToken, chain.poolIndex)
    let [lowerTick, upperTick] = this.tickRange(chain)
    let surplus = this.maskSurplusFlags(opts)

    let cmd = encoder.encodeKnockoutRecover(pivotTime, lowerTick, upperTick, 
      this.sellBase, surplus);
    return (await this.context).dex.userCmd(KNOCKOUT_PATH, cmd)
  }

  async willMintFail(): Promise<boolean> {
    let gridSize = this.context.then(c => c.chain.gridSize)
    let marketTick = this.context.then(c => c.query.queryCurveTick
      (this.baseToken, this.quoteToken, c.chain.poolIndex))
    return this.sellBase ?
      (this.knockoutTick + await gridSize >= await marketTick) :
      (this.knockoutTick - await gridSize <= await marketTick)
  }


  private maskSurplusFlags (opts?: CrocKnockoutOpts): number {
    if (!opts || !opts.surplus) { return encodeSurplusArg(false) }
    else { 
      return encodeSurplusArg(opts.surplus) }
  }

  private async msgVal (surplusFlags: number): Promise<BigNumber> {
    const useSurp = decodeSurplusFlag(surplusFlags)[0]
    if (this.baseToken == AddressZero && this.sellBase && !useSurp) {
      return this.qty
    } else {
      return BigNumber.from(0)
    }
  }

  private tickRange (chain: ChainSpec): [number, number] {
    return tickRange(chain, this.knockoutTick, this.sellBase)
  }

  readonly baseToken: string
  readonly quoteToken: string
  readonly qty: Promise<BigNumber>
  readonly sellBase: boolean
  readonly qtyInBase: boolean
  readonly knockoutTick: number
  readonly context: Promise<CrocContext>
}

export interface CrocKnockoutOpts {
  surplus?: CrocSurplusFlags
}

const KNOCKOUT_PATH = 7

async function calcSellQty (buyQty: Promise<BigNumber>, isQtyInBase: boolean, knockoutTick: number,
  context: Promise<CrocContext>): Promise<BigNumber> {
  let sellQty = calcSellFloat(bigNumToFloat(await buyQty), isQtyInBase, knockoutTick, context)
  return sellQty.then(floatToBigNum)
}

async function calcSellFloat (buyQty: number, isQtyInBase: boolean, knockoutTick: number,
  context: Promise<CrocContext>): Promise<number> {
  const [lowerTick, upperTick] = tickRange((await context).chain, knockoutTick, !isQtyInBase)
  const lowerPrice = Math.pow(1.0001, lowerTick)
  const upperPrice = Math.pow(1.0001, upperTick)

  return isQtyInBase ? 
    baseTokenForQuoteConc(buyQty, lowerPrice, upperPrice) :
    quoteTokenForBaseConc(buyQty, lowerPrice, upperPrice)
}

function tickRange (chain: ChainSpec, knockoutTick: number, sellBase: boolean): [number, number] {
  return sellBase ? 
      [knockoutTick, knockoutTick + chain.gridSize] :
      [knockoutTick - chain.gridSize, knockoutTick]
}