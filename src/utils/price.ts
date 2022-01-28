import { BigNumber, ethers, Contract } from 'ethers';
import { MIN_TICK, MAX_TICK, NODE_URL, contractAddresses, QUERY_ABI } from '..';
import { getTokenDecimals, getQuoteTokenAddress, getBaseTokenAddress } from './token';
import { POOL_PRIMARY } from '../constants';

type Tick = number

export async function getSpotPrice(
    baseTokenAddress: string,
    quoteTokenAddress: string,
    pool: number = POOL_PRIMARY): Promise<number> {
    const provider = new ethers.providers.JsonRpcProvider(NODE_URL);
  
    const queryAddress = contractAddresses["QUERY_ADDR"];
    const queryContract = new Contract(queryAddress, QUERY_ABI, provider);
  
    const price = await queryContract.queryPrice(
      baseTokenAddress,
      quoteTokenAddress,
      pool
    );
  
    return decodeCrocPrice(price);
}

export async function getSpotPriceDisplay(
    baseTokenAddress: string,
    quoteTokenAddress: string,
    poolIdx: number = POOL_PRIMARY): Promise<number> {
    const poolBase = getBaseTokenAddress(baseTokenAddress, quoteTokenAddress)
    const poolQuote = getQuoteTokenAddress(baseTokenAddress, quoteTokenAddress)
    const isInverted = (poolQuote === baseTokenAddress)

    let price = getSpotPrice(poolBase, poolQuote, poolIdx)    
    return toDisplayPrice(await price, await getTokenDecimals(baseTokenAddress), 
        await getTokenDecimals(quoteTokenAddress), isInverted)
}
  
export function encodeCrocPrice (price: number): BigNumber {
    let floatPrice = Math.sqrt(price) * (2 ** 64)
    let scale = 0

    const PRECISION_BITS = 16
    while (floatPrice > Number.MAX_SAFE_INTEGER) {
        floatPrice = floatPrice / (2 ** PRECISION_BITS)
        scale = scale + PRECISION_BITS
    }

    const pinPrice = Math.round(floatPrice)
    const bnSeed = BigNumber.from(pinPrice)

    return bnSeed.mul(BigNumber.from(2).pow(scale))
}
  
export function decodeCrocPrice (val: BigNumber) {
    const x = val.lt(Number.MAX_SAFE_INTEGER-1) ? 
        val.toNumber() : parseFloat(val.toString())
    const sq = x / (2 ** 64) 
    return sq*sq
}
  
export function toDisplayPrice(
    price: number, baseDecimals: number, quoteDecimals: number,
    isInverted: boolean = false): number {
    if (isInverted) {
        return (1/price) * Math.pow(10, baseDecimals - quoteDecimals);
    } else {
        return price * Math.pow(10, quoteDecimals - baseDecimals);
    }
}
  
export function fromDisplayPrice(price: number, baseDecimals: number, quoteDecimals: number,
    isInverted: boolean = false): number {
    if (isInverted) {
        return (1/price) * Math.pow(10, quoteDecimals - baseDecimals);
    } else {
        return price * Math.pow(10, baseDecimals - quoteDecimals);
    }
}

export function pinTickLower (price: number, nTicksGrid: number): Tick {
    const priceInTicks = Math.log(price) / Math.log(1.0001)
    const tickGrid = Math.floor(priceInTicks / nTicksGrid) * nTicksGrid
    const horizon = Math.floor(MIN_TICK / nTicksGrid) * nTicksGrid
    return Math.max(tickGrid, horizon)
}

export function pinTickUpper (price: number, nTicksGrid: number): Tick {
    const priceInTicks = Math.log(price) / Math.log(1.0001)
    const tickGrid = Math.ceil(priceInTicks / nTicksGrid) * nTicksGrid
    const horizon = Math.ceil(MAX_TICK / nTicksGrid) * nTicksGrid
    return Math.min(tickGrid, horizon)
}

export function tickToPrice (tick: Tick): number {
    return Math.pow(1.0001, tick)
}