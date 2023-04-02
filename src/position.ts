import { CrocPoolView } from './pool';

type Address = string
type BlockTag = number | string

export class CrocPositionView {
    constructor (pool: CrocPoolView, owner: Address) {
        this.pool = pool
        this.owner = owner
    }

    async queryRangePos (lowerTick: number, upperTick: number, block?: BlockTag) {
        let blockArg = toCallArg(block)
        let context = await this.pool.context
        return context.query.queryRangePosition(this.owner, 
            this.pool.baseToken, this.pool.quoteToken, 
            context.chain.poolIndex, lowerTick, upperTick, blockArg)
    }

    async queryAmbient (block?: BlockTag) {
        let blockArg = toCallArg(block)
        let context = await this.pool.context
        return context.query.queryAmbientPosition(this.owner, 
            this.pool.baseToken, this.pool.quoteToken, context.chain.poolIndex, blockArg)
    }

    async queryRewards (lowerTick: number, upperTick: number, block?: BlockTag) {
        let blockArg = toCallArg(block)
        let context = await this.pool.context
        return (await context.query.queryConcRewards(this.owner, 
            this.pool.baseToken, this.pool.quoteToken, 
            context.chain.poolIndex, lowerTick, upperTick, blockArg))
    }

    readonly owner: Address
    readonly pool: CrocPoolView
}

function toCallArg (block?: BlockTag): { blockTag?: BlockTag } {
    return block ? { blockTag: block } : {}
}