import { TransactionResponse } from "ethers";
import { OrderDirective } from "../encoding/longform";
import { CrocPoolView } from "../pool";
import {  tickToPrice } from "../utils";
import { baseTokenForConcLiq, liquidityForBaseConc, liquidityForQuoteConc, quoteTokenForConcLiq } from "../utils/liquidity";
import { GAS_PADDING } from "../utils";
import { ensureChain } from "../context";

interface EditPositionTarget {
    mint: TickRange
    burn: TickRange
    liquidity: bigint
}

type TickRange = [number, number]

export interface CrocEditPositionOpts {
}

export class CrocEditPosition {
    constructor(pool: CrocPoolView, target: EditPositionTarget, opts: CrocEditPositionOpts = {}) {
        this.pool = pool;
        this.burnRange = target.burn;
        this.mintRange = target.mint;
        this.liquidity = target.liquidity;
        this.spotPrice = this.pool.spotPrice();
        this.spotTick = this.pool.spotTick();
    }

    async edit(): Promise<TransactionResponse> {
        const directive = await this.formatDirective();
        const cntx = await this.pool.context;
        const path = cntx.chain.proxyPaths.long;
        await ensureChain(cntx);
        const gasEst = await cntx.dex.userCmd.estimateGas(path, directive.encodeBytes());
        return cntx.dex.userCmd(path, directive.encodeBytes(), { gasLimit: gasEst + GAS_PADDING, chainId: cntx.chain.chainId });
    }

    async simStatic() {
        const directive = await this.formatDirective();
        const path = (await this.pool.context).chain.proxyPaths.long;
        return (await this.pool.context).dex.userCmd.staticCall(path, directive.encodeBytes());
    }

    async currentCollateral(): Promise<[bigint, bigint]> {
        const baseAmount = baseTokenForConcLiq(await this.spotPrice, this.liquidity,
            tickToPrice(this.burnRange[0]), tickToPrice(this.burnRange[1]));
        const quoteAmount = quoteTokenForConcLiq(await this.spotPrice, this.liquidity,
            tickToPrice(this.burnRange[0]), tickToPrice(this.burnRange[1]));
        return [baseAmount, quoteAmount];
    }

    async targetLiquidityViaBase(baseAmount: bigint): Promise<bigint> {
        return liquidityForBaseConc(await this.spotPrice, baseAmount,
            tickToPrice(this.mintRange[0]), tickToPrice(this.mintRange[1]));
    }

    async targetLiquidityViaQuote(quoteAmount: bigint): Promise<bigint> {
        return liquidityForQuoteConc(await this.spotPrice, quoteAmount,
            tickToPrice(this.mintRange[0]), tickToPrice(this.mintRange[1]));
    }

    async targetMintParams(): Promise<[bigint, number]> {
        const [currentBase, currentQuote] = await this.currentCollateral();
        const liquidityViaBase = await this.targetLiquidityViaBase(currentBase);
        const liquidityViaQuote = await this.targetLiquidityViaQuote(currentQuote);
        return liquidityViaBase < liquidityViaQuote ? [liquidityViaBase, 4] : [liquidityViaQuote, 5];
    }

    private async formatDirective(): Promise<OrderDirective> {
        const directive = new OrderDirective(this.pool.baseToken.tokenAddr);
        directive.appendHop(this.pool.quoteToken.tokenAddr);
        directive.appendPool((await this.pool.context).chain.poolIndex);
        
        directive.appendRangeBurn(this.burnRange[0], this.burnRange[1], this.liquidity);
        
        const [mintLiquidity, mintRollType] = await this.targetMintParams();

        const mint = directive.appendRangeMint(this.mintRange[0], this.mintRange[1], mintLiquidity);
        mint.rollType = mintRollType;

        directive.open.limitQty = BigInt(0)
        directive.hops[0].settlement.limitQty = BigInt(0)
        return directive;
    }

    pool: CrocPoolView;
    burnRange: TickRange;
    mintRange: TickRange;
    liquidity: bigint;
    spotPrice: Promise<number>;
    spotTick: Promise<number>;
}
