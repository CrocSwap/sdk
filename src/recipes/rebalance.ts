import { TransactionResponse } from "@ethersproject/abstract-provider";
import { BigNumber } from "ethers";
import { MIN_SQRT_PRICE } from "../constants";
import { OrderDirective } from "../encoding/longform";
import { CrocPoolView } from "../pool";


export class Rebalance {

    constructor (pool: CrocPoolView) {
        this.pool = pool
    }

    async rebal (burnRange: TickRange, mintRange: TickRange): Promise<TransactionResponse> {
        
        const priceTick = await this.pool.spotTick()
        const [openToken, closeToken] = priceTick >= burnRange[1] ?
            [this.pool.baseToken, this.pool.quoteToken] :
            [this.pool.quoteToken, this.pool.baseToken]
        
        console.log(openToken)
        let directive = new OrderDirective(openToken)
        directive.appendHop(closeToken)
        let pool = directive.appendPool((await this.pool.context).chain.poolIndex)

        const TEST_LIQUIDITY = BigNumber.from(10).pow(15).mul(2048)

        directive.appendRangeBurn(burnRange[0], burnRange[1], TEST_LIQUIDITY)

        pool.chain.swapDefer = true
        pool.swap.isBuy = false
        pool.swap.inBaseQty = false
        pool.swap.rollType = 4
        pool.swap.qty = BigNumber.from(5100)
        pool.swap.limitPrice = MIN_SQRT_PRICE
        
        directive.appendPool((await this.pool.context).chain.poolIndex)
        let mint = directive.appendRangeMint(mintRange[0], mintRange[1], 0)
        mint.rollType = 5
        console.log([burnRange, mintRange])

        console.log(directive.hops[0].pools)

        console.log("B")
        return (await this.pool.context).dex.userCmd(LONG_PATH, directive.encodeBytes(), {gasLimit: 1000000})
    }

    pool: CrocPoolView
}

type TickRange = [number, number]

const LONG_PATH = 4;