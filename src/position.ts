import { CrocPoolView } from './pool';

type Address = string

export class CrocPositionView {
    constructor (pool: CrocPoolView, owner: Address) {
        this.pool = pool
        this.owner = owner
    }

    async queryRangePos (lowerTick: number, upperTick: number) {
        let context = await this.pool.context
        return (await context.query.queryRangePosition(this.owner, 
            this.pool.baseToken, this.pool.quoteToken, 
            context.chain.poolIndex, lowerTick, upperTick))
    }

    async queryAmbient() {
        let context = await this.pool.context
        return (await context.query.queryAmbientPosition(this.owner, 
            this.pool.baseToken, this.pool.quoteToken, context.chain.poolIndex))
    }

    async queryRewards (lowerTick: number, upperTick: number) {
        let context = await this.pool.context
        return (await context.query.queryConcRewards(this.owner, 
            this.pool.baseToken, this.pool.quoteToken, 
            context.chain.poolIndex, lowerTick, upperTick))
    }

    readonly owner: Address
    readonly pool: CrocPoolView
}
