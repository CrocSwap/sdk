import { Address, encodeAbiParameters } from 'viem';
import { CrocContext } from './context';
import { CrocPoolView } from './pool';
import { decodeCrocPrice, getUnsignedRawTransaction } from './utils';
import { CrocEthView, CrocTokenView, sortBaseQuoteViews, TokenQty } from './tokens';
import { CrocSurplusFlags, decodeSurplusFlag, encodeSurplusArg } from "./encoding/flags";
import { MAX_SQRT_PRICE, MIN_SQRT_PRICE } from "./constants";
import { CrocSlotReader } from "./slots";
import { GAS_PADDING, AddressZero } from "./utils";

/* Describes the predicted impact of a given swap.
 * @property sellQty The total quantity of tokens predicted to be sold by the swapper to the dex.
  * @property buyQty The total quantity of tokens predicted to be bought by the swapper from the dex.
  * @property finalPrice The final price of the pool after the swap. *Note* this is not the same as the
  *                      realized swap price.
  * @property percentChange The percent change in the pool price after the swap. Note this is not the same
  *                         as the swapper's slippage against the pool.
  */
export interface CrocImpact {
  sellQty: string,
  buyQty: string,
  finalPrice: number,
  percentChange: number
}

/* Options for the */
export interface CrocSwapExecOpts {
  settlement?: boolean |
    { buyDexSurplus: boolean, sellDexSurplus: boolean }
  gasEst?: bigint
}

export interface CrocSwapPlanOpts {
  slippage?: number
}

export class CrocSwapPlan {

  constructor (sellToken: CrocTokenView, buyToken: CrocTokenView, qty: TokenQty, qtyIsBuy: boolean,
    context: Promise<CrocContext>, opts: CrocSwapPlanOpts = DFLT_SWAP_ARGS) {
    [this.baseToken, this.quoteToken] = sortBaseQuoteViews(sellToken, buyToken)
    this.sellBase = (this.baseToken === sellToken)
    this.qtyInBase = (this.sellBase !== qtyIsBuy)

    this.poolView = new CrocPoolView(this.baseToken, this.quoteToken, context)
    const tokenView = this.qtyInBase ? this.baseToken : this.quoteToken
    this.qty = tokenView.normQty(qty)

    this.slippage = opts.slippage || DFLT_SWAP_ARGS.slippage
    this.priceSlippage = this.slippage * PRICE_SLIP_MULT
    this.context = context

    this.impact = this.calcImpact()
    this.callType = ""
  }

  async swap (args: CrocSwapExecOpts = { }): Promise<any> { // TODO: fix any
    const gasEst = await this.estimateGas(args)
    const callArgs = Object.assign({gasEst: gasEst }, args)
    return this.sendTx(Object.assign({}, args, callArgs))
  }

  async simulate (args: CrocSwapExecOpts = { }): Promise<any> {
    const gasEst = await this.estimateGas(args)
    const callArgs = Object.assign({gasEst: gasEst }, args)
    return this.callStatic(Object.assign({}, args, callArgs))
  }

  private async sendTx (args: CrocSwapExecOpts): Promise<any> {
    const base = await this.txBase()
    return this.hotPathCall(base.write, args)
  }

  private async callStatic (args: CrocSwapExecOpts): Promise<any> {
    const base = await this.txBase()
    return this.hotPathCall(base.simulate, args)
  }

  async estimateGas (args: CrocSwapExecOpts = { }): Promise<bigint> {
    const base = await this.txBase()
    return this.hotPathCall(base.estimateGas, args)
  }

  private async txBase() {
    if (this.callType === "router") {
      const router = (await this.context).router
      if (!router) { throw new Error("Router not available on network") }
      console.log('returning router', router)
      return router

    } else if (this.callType === "bypass" && (await this.context).routerBypass) {
      const router = (await this.context).routerBypass
      if (!router) { throw new Error("Router not available on network") }
      console.log('returning router or dex', router, (await this.context).dex)
      return router || (await this.context).dex

    } else {
      console.log('returning dex', (await this.context).dex)
      return (await this.context).dex
    }
  }

  private async hotPathCall (base: { [name: string]: any; }, args: CrocSwapExecOpts) { // TODO: fix generics
    const reader = new CrocSlotReader(this.context)
    if (this.callType === "router") {
      return this.swapCall(base, args)
    } else if (this.callType === "bypass") {
      return this.swapCall(base, args)
    } else if (this.callType === "proxy" || (await this.context).chain.proxyPaths.dfltColdSwap) {
      return this.userCmdCall(base, args)
    } else {
      return await reader.isHotPathOpen() ?
        this.swapCall(base, args) : this.userCmdCall(base, args)
    }
  }

  private async swapCall (base: { [name: string]: any; }, args: CrocSwapExecOpts) {
    const TIP = 0
    const surplusFlags = this.maskSurplusArgs(args)

    console.log(base)
    return base.swap
      ([this.baseToken.tokenAddr, this.quoteToken.tokenAddr, (await this.context).chain.poolIndex,
      this.sellBase, this.qtyInBase, await this.qty, TIP,
      await this.calcLimitPrice(), await this.calcSlipQty(), surplusFlags],
      await this.buildTxArgs(surplusFlags, args.gasEst), )
  }

  private async userCmdCall (base: { [name: string]: any; }, args: CrocSwapExecOpts) {
    const TIP = 0
    const surplusFlags = this.maskSurplusArgs(args)

    const HOT_PROXY_IDX = 1

    const cmd = encodeAbiParameters([{ type: "address", name: "baseToken" },
      { type: "address", name: "quoteToken" },
      { type: "uint256", name: "poolIndex" },
      { type: "bool", name: "sellBase" },
      { type: "bool", name: "qtyInBase" },
      { type: "uint128", name: "qty" },
      { type: "uint16", name: "tip" },
      { type: "uint128", name: "limitPrice" },
      { type: "uint128", name: "minOut" },
      { type: "uint8", name: "surplusFlags" }],
      [this.baseToken.tokenAddr as Address, this.quoteToken.tokenAddr as Address, BigInt((await this.context).chain.poolIndex),
       this.sellBase, this.qtyInBase, await this.qty, TIP,
       await this.calcLimitPrice(), await this.calcSlipQty(), surplusFlags])

    return base.userCmd([HOT_PROXY_IDX, cmd], await this.buildTxArgs(surplusFlags, args.gasEst))
  }

  /**
   * Utility function to generate a "signed" raw transaction for a swap, used for L1 gas estimation on L2's like Scroll.
   * Extra 0xFF...F is appended to the unsigned raw transaction to simulate the signature and other missing fields.
   *
   * Note: This function is only intended for L1 gas estimation, and does not generate valid signed transactions.
   */
  async getFauxRawTx (args: CrocSwapExecOpts = { }): Promise<`0x${string}`> {
    const TIP = 0
    const surplusFlags = this.maskSurplusArgs(args)

    const unsignedTx = await (await this.context).dex.populateTransaction.swap
      (this.baseToken.tokenAddr, this.quoteToken.tokenAddr, (await this.context).chain.poolIndex,
      this.sellBase, this.qtyInBase, await this.qty, TIP,
      await this.calcLimitPrice(), await this.calcSlipQty(), surplusFlags,
      await this.buildTxArgs(surplusFlags))

    // append 160 'f's to the end of the raw transaction to simulate the signature and other missing fields
    return getUnsignedRawTransaction(unsignedTx) + "f".repeat(160) as `0x${string}`
  }

  async calcImpact(): Promise<CrocImpact> {
    const TIP = 0
    const limitPrice = this.sellBase ? MAX_SQRT_PRICE : MIN_SQRT_PRICE

    const impact = await (await this.context).slipQuery.read.calcImpact
      ([this.baseToken.tokenAddr, this.quoteToken.tokenAddr, (await this.context).chain.poolIndex,
      this.sellBase, this.qtyInBase, await this.qty, TIP, limitPrice]);
    console.log('impact', impact)

    const baseQty = this.baseToken.toDisplay(impact[0] < 0 ? -impact[0] : impact[0])
    const quoteQty = this.quoteToken.toDisplay(impact[1] < 0 ? -impact[1] : impact[1])
    const spotPrice = decodeCrocPrice(impact[2])

    const startPrice = this.poolView.displayPrice()
    const finalPrice = this.poolView.toDisplayPrice(spotPrice)

    return {
      sellQty: this.sellBase ? await baseQty : await quoteQty,
      buyQty: this.sellBase ? await quoteQty : await baseQty,
      finalPrice: await finalPrice,
      percentChange: (await finalPrice - await startPrice) / await startPrice
    }
  }

  private maskSurplusArgs (args?: CrocSwapExecOpts): number {
    return encodeSurplusArg(this.maskSurplusFlags(args))
  }

  private maskSurplusFlags (args?: CrocSwapExecOpts): CrocSurplusFlags {
    if (!args || !args.settlement) {
      return [false, false]
    } else if (typeof args.settlement === "boolean") {
      return [args.settlement, args.settlement]
    } else {
      return this.sellBase ?
        [args.settlement.sellDexSurplus, args.settlement.buyDexSurplus] :
        [args.settlement.buyDexSurplus, args.settlement.sellDexSurplus]
    }
  }

  private async buildTxArgs (surplusArg: number, gasEst?: bigint) {
    const txArgs = await this.attachEthMsg(surplusArg)

    if (gasEst) {
      Object.assign(txArgs, { gasLimit: gasEst + GAS_PADDING})
    }

    return txArgs
  }

  private async attachEthMsg (surplusEncoded: number): Promise<object> {
    // Only need msg.val if one token is native ETH (will always be base side)
    if (!this.sellBase || this.baseToken.tokenAddr !== AddressZero) { return { }}

    // Calculate the maximum amount of ETH we'll need. If on the floating side
    // account for potential slippage. (Contract will refund unused ETH)
    const val = this.qtyInBase ? this.qty : this.calcSlipQty()

    if (decodeSurplusFlag(surplusEncoded)[0]) {
      // If using surplus calculate the amount of ETH not covered by the surplus
      // collateral.
      const needed = new CrocEthView(this.context).msgValOverSurplus(await val)
      return { value: needed }

    } else {
      // Othwerise we need to send the entire balance in msg.val
      return { value: await val}
    }
  }

  async calcSlipQty(): Promise<bigint> {
    const qtyIsBuy = (this.sellBase === this.qtyInBase)

    const slipQty = !qtyIsBuy ?
      parseFloat((await this.impact).sellQty) * (1 + this.slippage) :
      parseFloat((await this.impact).buyQty) * (1 - this.slippage)

    return !this.qtyInBase ?
      this.baseToken.roundQty(slipQty) :
      this.quoteToken.roundQty(slipQty)
  }

  async calcLimitPrice(): Promise<bigint> {
    return this.sellBase ? MAX_SQRT_PRICE : MIN_SQRT_PRICE
  }

  forceProxy(): CrocSwapPlan {
    this.callType = "proxy"
    return this
  }

  useRouter(): CrocSwapPlan {
    this.callType = "router"
    return this
  }

  useBypass(): CrocSwapPlan {
    this.callType = "bypass"
    return this
  }

  readonly baseToken: CrocTokenView
  readonly quoteToken: CrocTokenView
  readonly qty: Promise<bigint>
  readonly sellBase: boolean
  readonly qtyInBase: boolean
  readonly slippage: number
  readonly priceSlippage: number
  readonly poolView: CrocPoolView
  readonly context: Promise<CrocContext>
  readonly impact: Promise<CrocImpact>
  private callType: string
}

// Price slippage limit multiplies normal slippage tolerance by amount that should
// be reasonable (300%)
const PRICE_SLIP_MULT = 3.0

// Default slippage is set to 1%. User should evaluate this carefully for low liquidity
// pools of when swapping large amounts.
const DFLT_SWAP_ARGS = {
  slippage: 0.01
}
