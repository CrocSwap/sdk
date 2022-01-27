import { BigNumber, ethers, Contract } from 'ethers';
import { MIN_TICK, MAX_TICK, NODE_URL, contractAddresses, QUERY_ABI } from '..';
  
type Tick = number

export async function getSpotPrice(
    baseTokenAddress: string,
    quoteTokenAddress: string,
    pool: number): Promise<number> {
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
  
export function encodeCrocPrice (price: number): BigNumber {
    const floatPrice = Math.sqrt(price) * (2 ** 64)
    return BigNumber.from(Math.round(floatPrice))
}
  
export function decodeCrocPrice (val: BigNumber) {
    let x = val.toNumber()
    let sq = x / (2 ** 64) 
    return sq*sq
}
  
export function toDisplayPrice(
    price: number,
    baseDecimals: number,
    quoteDecimals: number
  ): number {
    return price * Math.pow(10, baseDecimals - quoteDecimals);
}
  
export function fromDisplayPrice(
    price: number,
    baseDecimals: number,
    quoteDecimals: number
  ): number {
    return price * Math.pow(10, quoteDecimals - baseDecimals);
}

export function pinTickLower (price: number, nTicksGrid: number): Tick {
    const priceInTicks = Math.log(price) / Math.log(1.0001)
    const tickGrid = Math.floor(priceInTicks / nTicksGrid) * nTicksGrid
    return Math.max(tickGrid, MIN_TICK)
}

export function pinTickUpper (price: number, nTicksGrid: number): Tick {
    const priceInTicks = Math.log(price) / Math.log(1.0001)
    const tickGrid = Math.ceil(priceInTicks / nTicksGrid) * nTicksGrid
    return Math.min(tickGrid, MAX_TICK)
}

export function tickToPrice (tick: Tick): number {
    return Math.pow(1.0001, tick)
}