import { BigNumber, ethers, Contract } from "ethers";
import { MIN_TICK, MAX_TICK, NODE_URL, contractAddresses, QUERY_ABI } from "..";
import {
  getTokenDecimals,
  getQuoteTokenAddress,
  getBaseTokenAddress,
} from "./token";
import { POOL_PRIMARY, GRID_SIZE_DFLT } from "../constants";
import { JsonRpcProvider } from "@ethersproject/providers";

type Tick = number;

export async function getSpotPrice(
  baseTokenAddress: string,
  quoteTokenAddress: string,
  pool: number = POOL_PRIMARY,
  providerArg?: JsonRpcProvider
): Promise<number> {
  const provider = providerArg
    ? providerArg
    : new ethers.providers.JsonRpcProvider(NODE_URL);

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
  poolIdx: number = POOL_PRIMARY,
  currentProvider?: JsonRpcProvider
): Promise<number> {
  const poolBase = getBaseTokenAddress(baseTokenAddress, quoteTokenAddress);
  const poolQuote = getQuoteTokenAddress(baseTokenAddress, quoteTokenAddress);
  const isInverted = poolQuote === baseTokenAddress;

  const price = getSpotPrice(poolBase, poolQuote, poolIdx, currentProvider);
  return toDisplayPrice(
    await price,
    await getTokenDecimals(baseTokenAddress, currentProvider),
    await getTokenDecimals(quoteTokenAddress, currentProvider),
    isInverted
  );
}

export function encodeCrocPrice(price: number): BigNumber {
  let floatPrice = Math.sqrt(price) * 2 ** 64;
  let scale = 0;

  const PRECISION_BITS = 16;
  while (floatPrice > Number.MAX_SAFE_INTEGER) {
    floatPrice = floatPrice / 2 ** PRECISION_BITS;
    scale = scale + PRECISION_BITS;
  }

  const pinPrice = Math.round(floatPrice);
  const bnSeed = BigNumber.from(pinPrice);

  return bnSeed.mul(BigNumber.from(2).pow(scale));
}

export function decodeCrocPrice(val: BigNumber) {
  const x = val.lt(Number.MAX_SAFE_INTEGER - 1)
    ? val.toNumber()
    : parseFloat(val.toString());
  const sq = x / 2 ** 64;
  return sq * sq;
}

export function toDisplayPrice(
  price: number,
  baseDecimals: number,
  quoteDecimals: number,
  isInverted = false
): number {
  if (isInverted) {
    return (1 / price) * Math.pow(10, baseDecimals - quoteDecimals);
  } else {
    return price * Math.pow(10, quoteDecimals - baseDecimals);
  }
}

export function fromDisplayPrice(
  price: number,
  baseDecimals: number,
  quoteDecimals: number,
  isInverted = false
): number {
  if (isInverted) {
    return (1 / price) * Math.pow(10, quoteDecimals - baseDecimals);
  } else {
    return price * Math.pow(10, baseDecimals - quoteDecimals);
  }
}

export function pinTickLower(
  price: number,
  nTicksGrid: number = GRID_SIZE_DFLT
): Tick {
  const priceInTicks = Math.log(price) / Math.log(1.0001);
  const tickGrid = Math.floor(priceInTicks / nTicksGrid) * nTicksGrid;
  const horizon = Math.floor(MIN_TICK / nTicksGrid) * nTicksGrid;
  return Math.max(tickGrid, horizon);
}

export function pinTickUpper(
  price: number,
  nTicksGrid: number = GRID_SIZE_DFLT
): Tick {
  const priceInTicks = Math.log(price) / Math.log(1.0001);
  const tickGrid = Math.ceil(priceInTicks / nTicksGrid) * nTicksGrid;
  const horizon = Math.ceil(MAX_TICK / nTicksGrid) * nTicksGrid;
  return Math.min(tickGrid, horizon);
}

export function tickToPrice(tick: Tick): number {
  return Math.pow(1.0001, tick);
}

/* Returns the ratio of quote to base tokens necessary to support the collateral for a given
 * range order over the specified ticks. If no quote token collateral is required returns 0
 * if no base token collateral is required returns Infinity */
export function calcRangeTilt(
  mktPrice: number,
  lowerTick: Tick,
  upperTick: Tick
): number {
  const lowerPrice = tickToPrice(lowerTick);
  const upperPrice = tickToPrice(upperTick);

  if (mktPrice > upperPrice) {
    return Infinity;
  } else if (mktPrice < lowerPrice) {
    return 0;
  } else {
    const basePartial = Math.sqrt(lowerPrice / mktPrice);
    const quotePartial = Math.sqrt(mktPrice / upperPrice);
    return quotePartial / basePartial;
  }
}
