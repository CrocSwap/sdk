import { BigNumber, ethers } from "ethers";
import { MAX_LIQ } from './constants';
import { bigNumToFloat, floatToBigNum } from './utils';

type Address = string;
type PoolType = number

/* Converts a fixed base token collateral amount to pool liquidity units. This conversion only applies
 * to the current pool price. If price moves the ratio between token collateral and liquidity will also
 * change. Note that this function will only work when token qty or liquidity is less than 2^64

 * @param price The current (non-display) price ratio in the pool.
 * @param qty The quantity (in non-display wei) of base token to convert
 * @return The amount of virtual liquidity (in sqrt(X*Y)) supported by this base token quantity. */
export function liquidityForBaseQty (price: number, qty: BigNumber): BigNumber {
    return floatToBigNum(Math.floor(bigNumToFloat(qty) / price))
}

/* Converts a fixed quote token collateral amount to pool liquidity units. This conversion only applies
 * to the current pool price. If price moves the ratio between token collateral and liquidity will also
 * change. Note that this function will only work when token qty or liquidity is less than 2^64
 * 
 * @param price The current (non-display) price ratio in the pool.
 * @param qty The quantity (in non-display wei) of quote token to convert
 * @return The amount of virtual liquidity (in sqrt(X*Y)) supported by this quote token quantity. */
export function liquidityForQuoteQty (price: number, qty: BigNumber): BigNumber {
    return floatToBigNum(Math.floor(bigNumToFloat(qty) * price))
}

export class WarmPathEncoder {

    constructor (base: Address, quote: Address, poolIdx: PoolType) {
        this.base = base
        this.quote = quote
        this.poolIdx = poolIdx
        this.abiCoder = new ethers.utils.AbiCoder()
    }

    private base: Address
    private quote: Address
    private poolIdx: PoolType;
    private abiCoder: ethers.utils.AbiCoder;

    private readonly MINT_CONCENTRATED: number = 1;
    private readonly BURN_CONCENTRATED: number = 2;
    private readonly MINT_AMBIENT: number = 3;
    private readonly BURN_AMBIENT: number = 4;


    encodeMintConc (lowerTick: number, upperTick: number, liq: BigNumber, limitLow: BigNumber, limitHigh: BigNumber,
        useSurplus: boolean) {
        return this.encodeWarmPath(this.MINT_CONCENTRATED, lowerTick, upperTick, liq, limitLow, limitHigh, useSurplus)
    }

    encodeBurnConc (lowerTick: number, upperTick: number, liq: BigNumber, limitLow: BigNumber, limitHigh: BigNumber,
        useSurplus: boolean) {
        return this.encodeWarmPath(this.BURN_CONCENTRATED, lowerTick, upperTick, liq, limitLow, limitHigh, useSurplus)
    }

    encodeBurnConcAll (lowerTick: number, upperTick: number, limitLow: BigNumber, limitHigh: BigNumber,
        useSurplus: boolean) {
        return this.encodeWarmPath(this.BURN_CONCENTRATED, lowerTick, upperTick, MAX_LIQ, limitLow, limitHigh, useSurplus)
    }

    encodeMintAmbient (liq: BigNumber, limitLow: BigNumber, limitHigh: BigNumber, useSurplus: boolean) {
        return this.encodeWarmPath(this.MINT_AMBIENT, 0, 0, liq, limitLow, limitHigh, useSurplus)
    }

    encodeBurnAmbient (liq: BigNumber, limitLow: BigNumber, limitHigh: BigNumber, useSurplus: boolean) {
        return this.encodeWarmPath(this.BURN_AMBIENT, 0, 0, liq, limitLow, limitHigh, useSurplus)
    }

    encodeBurnAmbientAll (limitLow: BigNumber, limitHigh: BigNumber, useSurplus: boolean) {
        return this.encodeWarmPath(this.BURN_AMBIENT, 0, 0, MAX_LIQ, limitLow, limitHigh, useSurplus)
    }

    private encodeWarmPath (callCode: number, lowerTick: number, upperTick: number, liq: BigNumber, 
        limitLow: BigNumber, limitHigh: BigNumber, useSurplus: boolean): string {
        return this.abiCoder.encode(
            [ "uint8", "address", "address", "uint24", "int24", "int24", "uint128", "uint128", "uint128", "bool" ], 
            [ callCode, this.base, this.quote, this.poolIdx, lowerTick, upperTick, liq, limitLow, limitHigh, useSurplus  ]);
    }
}
    
