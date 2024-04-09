import { toHex } from 'viem';
import { CrocContext } from './context';
import { CrocTokenView, sortBaseQuoteViews } from './tokens';

type Address = string
export type BlockTag = number | string

export class CrocPositionView {
    constructor (base: CrocTokenView, quote: CrocTokenView, owner: Address, context: Promise<CrocContext>) {
        [this.baseToken, this.quoteToken] =
            sortBaseQuoteViews(base, quote)
        this.owner = owner
        this.context = context
    }

    async queryRangePos (lowerTick: number, upperTick: number, block?: BlockTag): Promise<{liq: bigint, fee: bigint, timestamp: bigint, atomic: boolean}> {
        const blockArg = toCallArg(block)
        const context = await this.context
        return context.query.read.queryRangePosition([this.owner,
            this.baseToken.tokenAddr, this.quoteToken.tokenAddr,
            context.chain.poolIndex, lowerTick, upperTick], blockArg).then((resp: any[]) => ({ liq: resp[0], fee: resp[1], timestamp: resp[2], atomic: resp[3] }))
    }

    async queryAmbient (block?: BlockTag): Promise<{seeds: bigint, timestamp: bigint}> {
        const blockArg = toCallArg(block)
        const context = await this.context
        return context.query.read.queryAmbientPosition([this.owner,
            this.baseToken.tokenAddr, this.quoteToken.tokenAddr,
            context.chain.poolIndex], blockArg).then((resp: any[]) => ({ seeds: resp[0], timestamp: resp[1] }))
    }

    async queryAmbientPos (block?: BlockTag): Promise<{liq: bigint, baseQty: bigint, quoteQty: bigint}> {
        const blockArg = toCallArg(block)
        const context = await this.context
        return context.query.read.queryAmbientTokens([this.owner,
            this.baseToken.tokenAddr, this.quoteToken.tokenAddr,
            context.chain.poolIndex], blockArg).then((resp: any[]) => ({ liq: resp[0], baseQty: resp[1], quoteQty: resp[2] }))
    }

    async queryKnockoutLivePos (isBid: boolean, lowerTick: number, upperTick: number, block?: BlockTag): Promise<{liq: bigint, baseQty: bigint, quoteQty: bigint, knockedOut: boolean}> {
        const blockArg = toCallArg(block)
        const context = await this.context
        const pivotTick = isBid ? lowerTick : upperTick

        const pivotTime = (await context.query.queryKnockoutPivot(
            this.baseToken.tokenAddr, this.quoteToken.tokenAddr,
            context.chain.poolIndex, isBid, pivotTick, blockArg))[1]

        return context.query.read.queryKnockoutTokens([this.owner,
                this.baseToken.tokenAddr, this.quoteToken.tokenAddr,
                context.chain.poolIndex, pivotTime, isBid, lowerTick, upperTick], blockArg).then((resp: any[]) => ({ liq: resp[0], baseQty: resp[1], quoteQty: resp[2], knockedOut: resp[3] }))
    }

    async queryRewards (lowerTick: number, upperTick: number, block?: BlockTag): Promise<{liqRewards: bigint, baseRewards: bigint, quoteRewards: bigint}> {
        const blockArg = toCallArg(block)
        const context = await this.context
        return (await context.query.read.queryConcRewards([this.owner,
            this.baseToken.tokenAddr, this.quoteToken.tokenAddr,
            context.chain.poolIndex, lowerTick, upperTick], blockArg)).then((resp: any[]) => ({ liqRewards: resp[0], baseRewards: resp[1], quoteRewards: resp[2] }))
    }

    readonly owner: Address
    readonly baseToken: CrocTokenView
    readonly quoteToken: CrocTokenView
    readonly context: Promise<CrocContext>
}

function toCallArg (block?: BlockTag): { blockTag?: BlockTag } {
    return block ? { blockTag: toHex(block) } : {}
}
