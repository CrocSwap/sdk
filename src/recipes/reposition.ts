import { TransactionResponse } from "ethers";
import { ensureChain } from "../context";
import { OrderDirective, PoolDirective } from "../encoding/longform";
import { CrocPoolView } from "../pool";
import { CrocSwapPlan } from "../swap";
import { CrocTokenView } from "../tokens";
import { encodeCrocPrice, GAS_PADDING, tickToPrice } from "../utils";
import { baseTokenForConcLiq, concDepositBalance, quoteTokenForConcLiq } from "../utils/liquidity";


interface RepositionTarget {
    mint: TickRange | AmbientRange
    burn: TickRange
    liquidity: bigint
}

type AmbientRange = "ambient"

export interface CrocRepositionOpts {
    impact?: number
}

export class CrocReposition {

    constructor (pool: CrocPoolView, target: RepositionTarget, opts: CrocRepositionOpts = { }) {
        this.pool = pool
        this.burnRange = target.burn
        this.mintRange = target.mint
        this.liquidity = target.liquidity
        this.spotPrice = this.pool.spotPrice()
        this.spotTick = this.pool.spotTick()
        this.impact = opts?.impact || DEFAULT_REBAL_SLIPPAGE
    }

    async rebal(): Promise<TransactionResponse> {
        const directive = await this.formatDirective()
        const cntx = await this.pool.context
        const path = cntx.chain.proxyPaths.long
        await ensureChain(cntx)
        const gasEst = await cntx.dex.userCmd.estimateGas(path, directive.encodeBytes())
        return cntx.dex.userCmd(path, directive.encodeBytes(), { gasLimit: gasEst + GAS_PADDING, chainId: cntx.chain.chainId })
    }

    async simStatic() {
        const directive = await this.formatDirective()
        const path = (await this.pool.context).chain.proxyPaths.long
        return (await this.pool.context).dex.userCmd.staticCall(path, directive.encodeBytes())
    }

    async balancePercent(): Promise<number> {
        if (this.mintRange === "ambient") {
            return 0.5 // Ambient positions are 50/50 balance

        } else {
            const baseQuoteBal =
                concDepositBalance(await this.spotPrice,
                    tickToPrice(this.mintRange[0]), tickToPrice(this.mintRange[1]))
            return await this.isBaseOutOfRange() ?
                (1.0 - baseQuoteBal) : baseQuoteBal
        }
    }

    async currentCollateral(): Promise<bigint> {
        const tokenFn = await this.isBaseOutOfRange() ? baseTokenForConcLiq : quoteTokenForConcLiq
        return tokenFn(await this.spotPrice, this.liquidity,
            tickToPrice(this.burnRange[0]),
            tickToPrice(this.burnRange[1]))
    }

    async convertCollateral(): Promise<bigint> {
        const balance = await this.swapFraction()
        const collat = await this.currentCollateral()
        return collat * balance / BigInt(10000)
    }

    async postBalance(): Promise<[number, number]> {
        const outside = this.mintInput().then(parseFloat)
        const inside = this.swapOutput().then(parseFloat)
        return await this.isBaseOutOfRange() ?
            [await outside, await inside] :
            [await inside, await outside]
    }

    async mintInput(): Promise<string> {
        const collat = (await this.currentCollateral()) - (await this.convertCollateral())
        const pool = this.pool
        return await this.isBaseOutOfRange() ?
            pool.baseToken.toDisplay(collat) :
            pool.quoteToken.toDisplay(collat)
    }

    async swapOutput(): Promise<string> {
        const [sellToken, buyToken] = await this.pivotTokens()

        const swap = new CrocSwapPlan(sellToken, buyToken, await this.convertCollateral(),
            false, this.pool.context, { slippage: this.impact })
        const impact = await swap.calcImpact()
        return impact.buyQty
    }

    private async isBaseOutOfRange(): Promise<boolean> {
        const spot = await this.spotTick
        if (spot >= this.burnRange[1]) {
            return true
        } else if (spot < this.burnRange[0]) {
            return false
        } else {
            throw new Error("Rebalance position not out of range")
        }
    }

    private async pivotTokens(): Promise<[CrocTokenView, CrocTokenView]> {
        return await this.isBaseOutOfRange() ?
            [this.pool.baseToken, this.pool.quoteToken] :
            [this.pool.quoteToken, this.pool.baseToken]
    }

    private async formatDirective(): Promise<OrderDirective> {
        const [openToken, closeToken] = await this.pivotTokens()

        const directive = new OrderDirective(openToken.tokenAddr)
        directive.appendHop(closeToken.tokenAddr)
        const pool = directive.appendPool((await this.pool.context).chain.poolIndex)

        directive.appendRangeBurn(this.burnRange[0], this.burnRange[1], this.liquidity)
        await this.setupSwap(pool)

        directive.appendPool((await this.pool.context).chain.poolIndex)

        if (this.mintRange === "ambient") {
            const mint = directive.appendAmbientMint(BigInt(0))
            mint.rollType = 5
        } else {
            const mint = directive.appendRangeMint(this.mintRange[0], this.mintRange[1], BigInt(0))
            mint.rollType = 5
        }

        directive.open.limitQty = BigInt(0)
        directive.hops[0].settlement.limitQty = BigInt(0)
        return directive
    }

    private async setupSwap (pool: PoolDirective) {
        pool.chain.swapDefer = true
        pool.swap.rollType = 4
        pool.swap.qty = await this.swapFraction()

        const sellBase = await this.isBaseOutOfRange()
        pool.swap.isBuy = sellBase
        pool.swap.inBaseQty = sellBase

        const priceMult = sellBase ? (1 + this.impact) : (1 - this.impact)
        pool.swap.limitPrice = encodeCrocPrice((await this.spotPrice) * priceMult)
    }

    private async swapFraction(): Promise<bigint> {
        const swapProp = await this.balancePercent() + this.impact
        return BigInt(Math.floor(Math.min(swapProp, 1.0) * 10000))
    }

    pool: CrocPoolView
    burnRange: TickRange
    mintRange: TickRange | AmbientRange
    liquidity: bigint
    spotPrice: Promise<number>
    spotTick: Promise<number>
    impact: number
}


type TickRange = [number, number]

const DEFAULT_REBAL_SLIPPAGE = .02
