
import { ZeroAddress } from "ethers";
import { OrderDirective } from "../encoding/longform";
import { CrocSmartSwapExecOpts } from "./smartSwap";

/* A single hop in a swap path, represents the destination token and pool.
 *
 * @property tokenAddr Destination token of the swap (or the starting token if
 *                     it's the first hop).
 * @property poolIdx Pool where the swap will be taking place. */
export interface CrocSmartSwapHop {
    token: string
    poolIdx: number
}

/* A single path in a swap route, a series of hops with one input and one output.
 *
 * @property hops Swaps in the path starting with the input token and ending
 *                with the output token.
 * @property inputFlow The quantity of the input token required by the path.
 * @property outputFlow The quantity of the output token produced by the path.
 * @property isFixedOutput Controls whether the output or the input quantity is fixed.
 * @property useInputSurplus Whether to use the exchange balance for the input side.
 * @property useOutputSurplus Whether to use the exchange balance for the output side.
 * @property limitQtyOverride Overrides the minimum quantity for the flows in the path,
 *                            which would be used instead of standard slippage. */
export interface CrocSmartSwapPath {
    hops: CrocSmartSwapHop[]
    qty: bigint
    inputFlow: bigint
    outputFlow: bigint
    isFixedOutput: boolean
    useInputSurplus?: boolean
    useOutputSurplus?: boolean
    limitQtyOverride?: bigint
}

/* Represents a multihop swap. Can have one path (if there's one input and
 * one output), or multiple paths. */
export class CrocSmartSwapRoute {
    constructor (paths: CrocSmartSwapPath[]) {
        this.paths = paths
    }

    public get isDirect(): boolean {
        return this.paths.length == 1 && this.paths[0].hops.length == 2
    }

    /* The map of input tokens to the sum of their flows across all paths in the route. */
    public get inputFlows(): Map<string, bigint> {
        const tokenFlows = new Map<string, bigint>()
        for (const path of this.paths) {
            const token = path.hops[0].token.toLowerCase()
            tokenFlows.set(token, (tokenFlows.get(token) || BigInt(0)) + path.inputFlow)
        }
        return tokenFlows
    }

    /* The map of output tokens to the sum of their flows across all paths in the route. */
    public get outputFlows(): Map<string, bigint> {
        const tokenFlows = new Map<string, bigint>()
        for (const path of this.paths) {
            const token = path.hops[path.hops.length - 1].token.toLowerCase()
            tokenFlows.set(token, (tokenFlows.get(token) || BigInt(0)) + path.outputFlow)
        }
        return tokenFlows
    }

    public formatDirective(args: CrocSmartSwapExecOpts): OrderDirective {
        const order = new OrderDirective(ZeroAddress)
        let prevSettlement = order.open
        for (let p = 0; p < this.paths.length; p++) {
            const path = this.paths[p]
            // Copy the hops array to not overwrite it if it's reversed
            let hops = path.hops.slice()
            if (path.isFixedOutput)
                hops = hops.reverse()
            prevSettlement.token = hops[0].token
            prevSettlement.useSurplus = (path.isFixedOutput ? (path.useOutputSurplus || args.settlement?.toSurplus) : (path.useInputSurplus || args.settlement?.fromSurplus)) || false

            let prevToken = hops[0].token
            for (let h = 1; h < hops.length; h++) {
                const hopDir = order.appendHop(hops[h].token)
                // If last hop, set surplus flag for input/output and limitQty to act as minOut or maxIn
                if (h == hops.length - 1) {
                    hopDir.settlement.useSurplus = (path.isFixedOutput ? (path.useInputSurplus || args.settlement?.fromSurplus) : (path.useOutputSurplus || args.settlement?.toSurplus)) || false
                    if (path.limitQtyOverride) {
                        hopDir.settlement.limitQty = path.limitQtyOverride
                    } else if (args.slippage !== undefined) {
                        const mul = 10000000000
                        const slip = BigInt(Math.round(args.slippage * mul))

                        hopDir.settlement.limitQty = path.isFixedOutput ?
                            path.inputFlow + ((path.inputFlow * slip) / BigInt(mul)) :
                            path.outputFlow - ((path.outputFlow * slip) / BigInt(mul))
                    }
                } else {
                    // Intermediate hops should always use surplus
                    hopDir.settlement.useSurplus = true
                }
                const poolDir = order.appendPool(hops[h].poolIdx)

                if (h == 1) {
                    poolDir.swap.qty = path.isFixedOutput ? (path.outputFlow < BigInt(0) ? -path.outputFlow : path.outputFlow) : path.inputFlow
                } else {
                    // Enable fractional roll to use 100% of the previous hop as qty
                    poolDir.swap.rollType = ROLL_FRAC_TYPE
                    poolDir.swap.qty = BigInt(10000)
                }

                // Swap direction needs to be inverted based on isFixedOutput
                poolDir.swap.isBuy = Boolean((prevToken < hops[h].token) !== path.isFixedOutput)
                poolDir.swap.inBaseQty = Boolean(prevToken < hops[h].token)
                poolDir.swap.limitPrice = poolDir.swap.isBuy ? BigInt("21267430153580247136652501917186561137") : BigInt("65538")
                prevToken = hops[h].token
            }

            // If there is more than one path, append a new hop for the next path
            if (p < this.paths.length - 1) {
                const hop_switch = order.appendHop(ZeroAddress)
                prevSettlement = hop_switch.settlement
            }
        }

        return order
    }

    public applyImpact(pathImpacts: [bigint, bigint, bigint][]) {
        for (let i = 0; i < this.paths.length; i++) {
            const path = this.paths[i]
            const impact = pathImpacts[i]
            path.inputFlow = impact[0]
            path.outputFlow = impact[1]
        }
    }

    paths: CrocSmartSwapPath[]
}

export const ROLL_FRAC_TYPE = 4
