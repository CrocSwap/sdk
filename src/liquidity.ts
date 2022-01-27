import { BigNumber, ethers } from "ethers";
import { MAX_LIQ } from './constants';

type Address = string;
type PoolType = number



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

    private MINT_CONCENTRATED: number = 1;
    private BURN_CONCENTRATED: number = 2;
    private MINT_AMBIENT: number = 3;
    private BURN_AMBIENT: number = 4;


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
    
