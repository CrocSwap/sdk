import { TransactionResponse, ethers } from "ethers";
import { CrocContext, ensureChain } from '../context';
import { CrocPoolView } from '../pool';
import { decodeCrocPrice, getUnsignedRawTransaction } from '../utils';
import { CrocEthView, CrocTokenView, sortBaseQuoteViews, TokenQty } from '../tokens';
import { CrocSurplusFlags, decodeSurplusFlag, encodeSurplusArg } from "../encoding/flags";
import { MAX_SQRT_PRICE, MIN_SQRT_PRICE } from "../constants";
import { CrocSlotReader } from "../slots";
import { GAS_PADDING } from "../utils";
import { CrocSmartSwapRoute } from "./smartSwapRoute";
import { CrocSmartSwapRouter } from "./routers";

/* Describes the predicted impact of a given swap.
 * @property sellQty The total quantity of tokens predicted to be sold by the swapper to the dex.
 * @property buyQty The total quantity of tokens predicted to be bought by the swapper from the dex.
 * @property finalPrice The final price of the pool after the swap. *Note* this is not the same as the
 *                      realized swap price. Only present in direct swaps.
 * @property percentChange The percent change in the pool price after the swap. Note this is not the same
 *                         as the swapper's slippage against the pool. Only present in direct swaps.
 * @property routes The possible routes for the swap, including the direct route (always in the first one)
 *                  and any multihop routes.
 * @property chosenRoute The index of the chosen route in the routes array. This is the route that will be
 *                       executed when calling the `swap` method and `calcImpacts` sets it to the route with
 *                       the best input/output.
 */
export interface CrocSmartSwapImpact {
  sellQty: string,
  buyQty: string,
  finalPrice?: number,
  percentChange?: number
  routes: CrocSmartSwapRoute[]
  chosenRoute: number
}

/* Options for execution of a smart swap plan. */
export interface CrocSmartSwapExecOpts {
  settlement?: { fromSurplus: boolean, toSurplus: boolean }
  slippage?: number
  disableMultihop?: boolean
  gasEst?: bigint
}

export class CrocSmartSwapPlan {

  constructor(fromToken: CrocTokenView, toToken: CrocTokenView, qty: TokenQty, fixedOutput: boolean,
    context: Promise<CrocContext>, opts: CrocSmartSwapExecOpts = DFLT_SMART_SWAP_ARGS) {
    console.log('CrocSmartSwapPlan constructor', fromToken, toToken, qty, fixedOutput, context, opts)
    this.fromToken = fromToken
    this.toToken = toToken
    this.fixedOutput = fixedOutput

    this.poolView = new CrocPoolView(this.baseToken, this.quoteToken, context)
    this.qty = fixedOutput ? toToken.normQty(qty) : fromToken.normQty(qty)
    this.opts = opts

    this.context = context
    this.routers = new Map()
    this.callType = ""
  }

  withRouter(router: CrocSmartSwapRouter): CrocSmartSwapPlan {
    this.routers.set(router.type, router)
    return this
  }

  async swap(lastImpact: CrocSmartSwapImpact, opts: CrocSmartSwapExecOpts = {}): Promise<TransactionResponse> {
    await ensureChain(await this.context);
    const joinedOpts = this.getOpts(opts)
    let callArgs = Object.assign({ chainId: (await this.context).chain.chainId }, joinedOpts)
    try {
      const gasEst = await this.estimateGas(lastImpact, joinedOpts)
      callArgs = Object.assign({ gasEst: gasEst }, callArgs)
    } catch (e) {
      console.log("Failed to estimate gas, using default gas estimate", e)
    }
    return this.sendTx(lastImpact, Object.assign({}, callArgs))
  }

  async simulate(impact: CrocSmartSwapImpact, opts: CrocSmartSwapExecOpts = {}): Promise<TransactionResponse> {
    return this.callStatic(impact, this.getOpts(opts))
  }

  private async sendTx(impact: CrocSmartSwapImpact, opts: CrocSmartSwapExecOpts): Promise<TransactionResponse> {
    return this.hotPathCall(await this.txBase(), 'send', impact, opts)
  }

  private async callStatic(impact: CrocSmartSwapImpact, opts: CrocSmartSwapExecOpts): Promise<TransactionResponse> {
    return this.hotPathCall(await this.txBase(), 'staticCall', impact, opts)
  }

  async estimateGas(impact: CrocSmartSwapImpact, opts: CrocSmartSwapExecOpts = {}): Promise<bigint> {
    return this.hotPathCall(await this.txBase(), 'estimateGas', impact, opts)
  }

  private async txBase() {
    if (this.callType === "router") {
      let router = (await this.context).router
      if (!router) { throw new Error("Router not available on network") }
      return router

    } else if (this.callType === "bypass" && (await this.context).routerBypass) {
      let router = (await this.context).routerBypass
      if (!router) { throw new Error("Router not available on network") }
      return router || (await this.context).dex

    } else {
      return (await this.context).dex
    }
  }

  private async hotPathCall(contract: ethers.Contract, callType: 'send' | 'staticCall' | 'estimateGas' | 'populateTransaction', impact: CrocSmartSwapImpact, opts: CrocSmartSwapExecOpts) {
    const reader = new CrocSlotReader(this.context)
    if (this.callType === "router") {
      return this.swapCall(contract, callType, impact, opts)
    } else if (this.callType === "bypass") {
      return this.swapCall(contract, callType, impact, opts)
    } else if (this.callType === "proxy" || (await this.context).chain.proxyPaths.dfltColdSwap) {
      return this.userCmdCall(contract, callType, impact, opts)
    } else {
      return (await reader.isHotPathOpen() && impact.routes[impact.chosenRoute].isDirect) ?
        this.swapCall(contract, callType, impact, opts) : this.userCmdCall(contract, callType, impact, opts)
    }
  }

  private async swapCall(contract: ethers.Contract, callType: 'send' | 'staticCall' | 'estimateGas' | 'populateTransaction', impact: CrocSmartSwapImpact, opts: CrocSmartSwapExecOpts) {
    const TIP = 0
    const surplusFlags = this.maskSurplusArgs(opts)

    return contract.swap[callType](this.baseToken.tokenAddr, this.quoteToken.tokenAddr, (await this.context).chain.poolIndex,
      this.isBuy, this.fixedOutput, await this.qty, TIP,
      await this.calcLimitPrice(), await this.calcSlipQty(impact), surplusFlags,
      await this.buildTxArgs(impact, surplusFlags, opts.gasEst),)
  }

  private async userCmdCall(contract: ethers.Contract, callType: 'send' | 'staticCall' | 'estimateGas' | 'populateTransaction', impact: CrocSmartSwapImpact, opts: CrocSmartSwapExecOpts) {
    console.log('userCmdCall', callType, opts)
    const TIP = 0
    const surplusFlags = this.maskSurplusArgs(opts)

    const txArgs = await this.buildTxArgs(impact, surplusFlags, opts.gasEst)
    console.log('txArgs', txArgs)
    if (impact.chosenRoute == 0) {
      const HOT_PROXY_IDX = 1
      let abi = new ethers.AbiCoder()
      let cmd = abi.encode(["address", "address", "uint256", "bool", "bool", "uint128", "uint16", "uint128", "uint128", "uint8"],
        [this.baseToken.tokenAddr, this.quoteToken.tokenAddr, (await this.context).chain.poolIndex,
        this.isBuy, this.inBaseQty, await this.qty, TIP,
        await this.calcLimitPrice(), await this.calcSlipQty(impact), surplusFlags])
      return contract.userCmd[callType](HOT_PROXY_IDX, cmd, txArgs)

    } else {
      const dir = impact.routes[impact.chosenRoute].formatDirective(opts)
      const cmd = dir.encodeBytes()
      return contract.userCmd[callType]((await this.context).chain.proxyPaths.long, cmd, txArgs)
    }
  }

  async calcImpacts(maxRoutes?: number): Promise<CrocSmartSwapImpact> {
    console.log('calcImpacts')
    const TIP = 0
    const limitPrice = this.isBuy ? MAX_SQRT_PRICE : MIN_SQRT_PRICE

    interface ImpactCall {
      route?: CrocSmartSwapRoute
      call: Promise<[bigint, bigint, bigint]>
    }

    let calls: ImpactCall[] = [
      {
        call: (await this.context).slipQuery.calcImpact.staticCall
          (this.baseToken.tokenAddr, this.quoteToken.tokenAddr, (await this.context).chain.poolIndex,
            this.isBuy, this.fixedOutput != this.isBuy, await this.qty, TIP, limitPrice).then(
              (impact) => {
                if (this.isBuy) {
                  return [impact[0], impact[1], impact[2]]
                } else {
                  return [impact[1], impact[0], impact[2]]
                }
              })
      }];

    const multiImpactContract = (await this.context).multiImpact
    if (!this.opts.disableMultihop && multiImpactContract) {
      // Query routes from every router and add them to the calls list
      for (const router of this.routers.values()) {
        let routes = await router.suggestRoutes(this.fromToken.tokenAddr, this.toToken.tokenAddr, await this.qty, this.fixedOutput, this.opts.slippage || DFLT_SMART_SWAP_ARGS.slippage)
        for (const route of routes.slice(0, ((maxRoutes || 99999) - 1))) {
          try {
            let call
            if (route.paths.length == 1) // a simpler call when there's only one path
              call = multiImpactContract.calcMultiHopImpact.staticCall(route.paths[0].hops, route.paths[0].qty, route.paths[0].isFixedOutput)
            else
              call = multiImpactContract.calcMultiPathImpact.staticCall(route.paths)

            calls.push({
              route,
              call: call.then(
                (impact) => {
                  route.applyImpact(route.paths.length == 1 ? [impact] : impact)
                  const inputFlows = route.inputFlows
                  const outputFlows = route.outputFlows
                  if (inputFlows.size != 1 || outputFlows.size != 1)
                    throw new Error("Multi-token input or output is not supported")

                  const inputFlow = inputFlows.get(this.fromToken.tokenAddr.toLowerCase())
                  const outputFlow = outputFlows.get(this.toToken.tokenAddr.toLowerCase())
                  if (inputFlow === undefined || outputFlow === undefined)
                    throw new Error("Transacted tokens not in input or output")

                  if ((inputFlow > BigInt(0) && outputFlow > BigInt(0)) || (inputFlow < BigInt(0) && outputFlow < BigInt(0)))
                    throw new Error("Invalid input/output flows")

                  return [inputFlow, outputFlow, BigInt(0)] as [bigint, bigint, bigint]
                }).catch(
                  (_) => {
                    // console.error("Failed to calculate impact for route:", route, e)
                    return [BigInt(0), BigInt(0), BigInt(0)] as [bigint, bigint, bigint]
                  }
                )
            })
          } catch (e) {
            console.error("Failed create route impact call:", e)
          }
        }
      }
    }

    let dedupCalls = calls.filter((c, i) => calls.findIndex((c2) => c2.call === c.call) === i)
    calls = dedupCalls

    let impactResults = []
    try {
      impactResults = await Promise.allSettled(calls.map(async (c) => c.call))
      console.log('impacts results', impactResults)
    } catch (e) {
      console.error("Failed to calculate impact:", e)
      throw e
    }


    // Find the route with the best return
    let maxReturn = 0;
    // let maxReturn = impactResults.slice(1).some(i => i.status == 'fulfilled' && i.value[0] > BigInt(0)) ? 1 : 0 // TODO: disable forced multihop
    for (let i = 1; i < impactResults.length; i++) {
      const impactResult = impactResults[i]
      const maxImpactResult = impactResults[maxReturn]
      if (impactResult.status == 'rejected' || (impactResult.status == 'fulfilled' && impactResult.value[0] == BigInt(0)))
        continue

      const side = this.fixedOutput ? 0 : 1
      if (maxImpactResult.status == 'rejected' || impactResult.value[side] < maxImpactResult.value[side])
        maxReturn = i
    }
    console.log('impacts maxReturn', maxReturn)

    // Fill in the route object for the direct swap to inform the UI
    calls[0].route = new CrocSmartSwapRoute([{
      hops: [{ token: this.fromToken.tokenAddr, poolIdx: (await this.context).chain.poolIndex },
      { token: this.toToken.tokenAddr, poolIdx: (await this.context).chain.poolIndex }],
      qty: await this.qty,
      inputFlow: impactResults[0].status == 'fulfilled' ? impactResults[0].value[0] : BigInt(0),
      outputFlow: impactResults[0].status == 'fulfilled' ? impactResults[0].value[1] : BigInt(0),
      isFixedOutput: this.fixedOutput,
    }])

    const maxReturnRoute = impactResults[maxReturn]
    const ret = {
      sellQty: await this.fromToken.toDisplay(maxReturnRoute.status == 'fulfilled' ? maxReturnRoute.value[0] : BigInt(0)),
      buyQty: await this.toToken.toDisplay(maxReturnRoute.status == 'fulfilled' ? -maxReturnRoute.value[1] : BigInt(0)),
      routes: calls.map((c) => c.route as CrocSmartSwapRoute),
      chosenRoute: maxReturn
    } as CrocSmartSwapImpact

    // If direct swap is chosen, fill in its specific fields.
    if (maxReturn == 0 && impactResults[0].status == 'fulfilled') {
      const spotPrice = decodeCrocPrice(impactResults[0].value[2])
      const startPrice = await this.poolView.displayPrice()
      const finalPrice = await this.poolView.toDisplayPrice(spotPrice)
      ret.finalPrice = finalPrice
      ret.percentChange = (finalPrice - startPrice) / startPrice
    }
    return ret
  }

  private maskSurplusArgs(args?: CrocSmartSwapExecOpts): number {
    return encodeSurplusArg(this.maskSurplusFlags(args))
  }

  private maskSurplusFlags(args?: CrocSmartSwapExecOpts): CrocSurplusFlags {
    if (!args || !args.settlement) {
      return [false, false]
    } else if (typeof args.settlement === "boolean") {
      return [args.settlement, args.settlement]
    } else {
      return this.isBuy ?
        [args.settlement.toSurplus, args.settlement.fromSurplus] :
        [args.settlement.fromSurplus, args.settlement.toSurplus]
    }
  }

  private async buildTxArgs(impact: CrocSmartSwapImpact, surplusArg: number, gasEst?: bigint) {
    const txArgs = await this.attachEthMsg(impact, surplusArg)

    if (gasEst) {
      Object.assign(txArgs, { gasLimit: gasEst + GAS_PADDING });
    }

    return txArgs
  }

  private async attachEthMsg(impact: CrocSmartSwapImpact, surplusEncoded: number): Promise<object> {
    // Only need msg.val if one token is native ETH (will always be base side)
    if (!this.fromToken.isNativeEth) {
      return {}
    }

    // Calculate the maximum amount of ETH we'll need. If on the floating side
    // account for potential slippage. (Contract will refund unused ETH)
    const val = !this.fixedOutput ? this.qty : this.calcSlipQty(impact)

    if (decodeSurplusFlag(surplusEncoded)[0]) {
      // If using surplus calculate the amount of ETH not covered by the surplus
      // collateral.
      const needed = new CrocEthView(this.context).msgValOverSurplus(await val)
      return { value: await needed }

    } else {
      // Othwerise we need to send the entire balance in msg.val
      return { value: await val }
    }
  }

  async calcSlipQty(impact: CrocSmartSwapImpact): Promise<bigint> {
    const slippage = this.opts.slippage || DFLT_SMART_SWAP_ARGS.slippage
    const slipQty = this.fixedOutput ?
      parseFloat((impact).sellQty) * (1 + (slippage ? slippage : slippage)) :
      parseFloat((impact).buyQty) * (1 - (slippage ? slippage : slippage))

    return this.fixedOutput ?
      this.fromToken.roundQty(slipQty) :
      this.toToken.roundQty(slipQty)
  }

  async calcLimitPrice(): Promise<bigint> {
    return this.isBuy ? MAX_SQRT_PRICE : MIN_SQRT_PRICE
  }

  forceProxy(): CrocSmartSwapPlan {
    this.callType = "proxy"
    return this
  }

  useRouter(): CrocSmartSwapPlan {
    this.callType = "router"
    return this
  }

  useBypass(): CrocSmartSwapPlan {
    this.callType = "bypass"
    return this
  }


  /*
   * Utility function to generate a "signed" raw transaction for a swap, used for L1 gas estimation on
   * L2's like Scroll.
   * Extra 0xFF...F is appended to the unsigned raw transaction to simulate the signature and other
   * missing fields.
   */
  async getFauxRawTx(impact: CrocSmartSwapImpact, opts: CrocSmartSwapExecOpts = {}): Promise<`0x${string}`> {
    const unsignedTx = await this.hotPathCall(await this.txBase(), 'populateTransaction', impact, opts)
    const f = getUnsignedRawTransaction(unsignedTx) + "f".repeat(160) as `0x${string}`
    return f
  }

  getOpts(overrideOpts: CrocSmartSwapExecOpts): CrocSmartSwapExecOpts {
    return Object.assign({}, this.opts, overrideOpts)
  }

  // Methods used for direct swaps only:

  get baseToken(): CrocTokenView {
    return sortBaseQuoteViews(this.fromToken, this.toToken)[0]
  }

  get quoteToken(): CrocTokenView {
    return sortBaseQuoteViews(this.fromToken, this.toToken)[1]
  }

  get isBuy(): boolean {
    return this.fromToken === this.baseToken
  }

  get inBaseQty(): boolean {
    return this.fixedOutput ? this.toToken === this.baseToken : this.fromToken === this.baseToken
  }


  readonly fromToken: CrocTokenView
  readonly toToken: CrocTokenView
  readonly qty: Promise<bigint>
  readonly fixedOutput: boolean
  readonly opts: CrocSmartSwapExecOpts
  readonly poolView: CrocPoolView
  readonly context: Promise<CrocContext>
  private routers: Map<string, CrocSmartSwapRouter>
  private callType: string
}

// Default slippage is set to 1%. User should evaluate this carefully for low liquidity
// pools of when swapping large amounts.
const DFLT_SMART_SWAP_ARGS = {
  slippage: 0.01,
  disableMultihop: false,
}
