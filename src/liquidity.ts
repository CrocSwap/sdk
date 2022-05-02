import { BigNumber, ethers, Signer } from "ethers";
import { MAX_LIQ, contractAddresses, POOL_PRIMARY } from "./constants";
import {
  bigNumToFloat,
  floatToBigNum,
  fromDisplayQty,
  tickToPrice,
  truncateRightBits,
  getTokenDecimals,
  // pinTickLower,
  pinTickUpper,
  // fromDisplayPrice,
} from "./utils";
import { encodeCrocPrice } from "./utils/price"
import { CROC_ABI } from "./abis";
import { parseEther } from "ethers/lib/utils";
import { AddressZero } from '@ethersproject/constants';

type Address = string;
type PoolType = number;

const LIQ_PATH = 2

/* Converts a fixed base token collateral amount to pool liquidity units. This conversion only applies
 * to the current pool price. If price moves the ratio between token collateral and liquidity will also
 * change. Note that this function will only work when token qty or liquidity is less than 2^64

 * @param price The current (non-display) price ratio in the pool.
 * @param qty The quantity (in non-display wei) of base token to convert
 * @return The amount of virtual liquidity (in sqrt(X*Y)) supported by this base token quantity. */
export function liquidityForBaseQty(
  price: number,
  qty: BigNumber,
  mult: number = 1.0
): BigNumber {
  return floatToBigNum(
    Math.floor((bigNumToFloat(qty) / Math.sqrt(price)) * mult)
  );
}

/* Converts a fixed quote token collateral amount to pool liquidity units. This conversion only applies
 * to the current pool price. If price moves the ratio between token collateral and liquidity will also
 * change. Note that this function will only work when token qty or liquidity is less than 2^64
 *
 * @param price The current (non-display) price ratio in the pool.
 * @param qty The quantity (in non-display wei) of quote token to convert
 * @return The amount of virtual liquidity (in sqrt(X*Y)) supported by this quote token quantity. */
export function liquidityForQuoteQty(
  price: number,
  qty: BigNumber,
  mult = 1.0
): BigNumber {
  return floatToBigNum(
    Math.floor(bigNumToFloat(qty) * Math.sqrt(price) * mult)
  );
}

export function baseVirtualReserves(
  price: number,
  liq: BigNumber,
  mult: number = 1.0
): BigNumber {
  return floatToBigNum(bigNumToFloat(liq) * Math.sqrt(price) * mult);
}

export function quoteVirtualReserves(
  price: number,
  liq: BigNumber,
  mult: number = 1.0
): BigNumber {
  return floatToBigNum((bigNumToFloat(liq) / Math.sqrt(price)) * mult);
}

/* Converts a fixed amount of base token deposits to liquidity for a concentrated range order
 *
 * @param price The current (non-display) price ratio in the pool.
 * @param qty The quantity (in non-display wei) of base token to convert
 * @param lower The lower boundary price of the range order
 * @param upper The upper boundary price of the range order
 * @return The amount of virtual liquidity (in sqrt(X*Y)) supported by this base token quantity. */
export function liquidityForBaseConc(
  price: number,
  qty: BigNumber,
  lower: number,
  upper: number
): BigNumber {
  const concFactor = baseConcFactor(price, lower, upper);
  return liquidityForBaseQty(price, qty, concFactor);
}

/* Converts a fixed amount of quote token deposits to liquidity for a concentrated range order
 *
 * @param price The current (non-display) price ratio in the pool.
 * @param qty The quantity (in non-display wei) of base token to convert
 * @param lower The lower boundary price of the range order
 * @param upper The upper boudnary price of the range order
 * @return The amount of virtual liquidity (in sqrt(X*Y)) supported by this quote token quantity. */
export function liquidityForQuoteConc(
  price: number,
  qty: BigNumber,
  lower: number,
  upper: number
): BigNumber {
  const concFactor = quoteConcFactor(price, lower, upper);
  return liquidityForQuoteQty(price, qty, concFactor);
}

export function baseTokenForConcLiq(
  price: number,
  liq: BigNumber,
  lower: number,
  upper: number
): BigNumber {
  const concFactor = baseConcFactor(price, lower, upper);
  return baseVirtualReserves(price, liq, 1 / concFactor);
}

export function quoteTokenForConcLiq(
  price: number,
  liq: BigNumber,
  lower: number,
  upper: number
): BigNumber {
  const concFactor = quoteConcFactor(price, lower, upper);
  return quoteVirtualReserves(price, liq, 1 / concFactor);
}

/* Calculates the concentration leverage factor for the base token given the range relative to
 * the current price in the pool.
 *
 * @param price The current price of the pool
 * @param lower The lower price boundary of the range order
 * @param upper The upper price boundary of the range order
 * @return The fraction of base tokens needed relative to an ambient position with the same
 *         liquidity */
export function baseConcFactor(
  price: number,
  lower: number,
  upper: number
): number {
  if (price < lower) {
    return Infinity;
  } else if (price > upper) {
    return Math.sqrt(price) / (Math.sqrt(upper) - Math.sqrt(lower));
  } else {
    return 1 / (1 - Math.sqrt(lower) / Math.sqrt(price));
  }
}

/* Calculates the concentration leverage factor for the quote token given the range relative to
 * the current price in the pool.
 *
 * @param price The current price of the pool
 * @param lower The lower price boundary of the range order
 * @param upper The upper price boundary of the range order
 * @return The fraction of quote tokens needed relative to an ambient position with the same
 *         liquidity */
export function quoteConcFactor(
  price: number,
  lower: number,
  upper: number
): number {
  return baseConcFactor(1 / price, 1 / upper, 1 / lower);
}

/* Calculates the deposit ratio multiplier for a concentrated liquidity range order.
 *
 * @param price The current price of the pool
 * @param lower The lower price boundary of the range order
 * @param upper The upper price boundary of the range order
 * @return The ratio of base to quote token deposit amounts for this concentrated range
 *         order *relative* to full-range ambient deposit ratio. */
export function concDepositSkew(
  price: number,
  lower: number,
  upper: number
): number {
  const base = baseConcFactor(price, lower, upper);
  const quote = quoteConcFactor(price, lower, upper);
  return base / quote;
}

export function roundForConcLiq(liq: BigNumber): BigNumber {
  const CONC_LOTS_BITS = 10;
  return truncateRightBits(liq, CONC_LOTS_BITS);
}

export class WarmPathEncoder {
  constructor(base: Address, quote: Address, poolIdx: PoolType) {
    this.base = base;
    this.quote = quote;
    this.poolIdx = poolIdx;
    this.abiCoder = new ethers.utils.AbiCoder();
  }

  private base: Address;
  private quote: Address;
  private poolIdx: PoolType;
  private abiCoder: ethers.utils.AbiCoder;

  encodeMintConc(
    lowerTick: number,
    upperTick: number,
    liq: BigNumber,
    limitLow: number,
    limitHigh: number,
    useSurplus: boolean
  ) {
    return this.encodeWarmPath(
      MINT_CONCENTRATED,
      lowerTick,
      upperTick,
      liq,
      limitLow,
      limitHigh,
      useSurplus
    );
  }

  encodeBurnConc(
    lowerTick: number,
    upperTick: number,
    liq: BigNumber,
    limitLow: number,
    limitHigh: number,
    useSurplus: boolean
  ) {
    return this.encodeWarmPath(
      BURN_CONCENTRATED,
      lowerTick,
      upperTick,
      liq,
      limitLow,
      limitHigh,
      useSurplus
    );
  }

  encodeBurnConcAll(
    lowerTick: number,
    upperTick: number,
    limitLow: number,
    limitHigh: number,
    useSurplus: boolean
  ) {
    return this.encodeWarmPath(
      BURN_CONCENTRATED,
      lowerTick,
      upperTick,
      MAX_LIQ,
      limitLow,
      limitHigh,
      useSurplus
    );
  }

  encodeMintAmbient(
    liq: BigNumber,
    limitLow: number,
    limitHigh: number,
    useSurplus: boolean
  ) {
    return this.encodeWarmPath(
      MINT_AMBIENT,
      0,
      0,
      liq,
      limitLow,
      limitHigh,
      useSurplus
    );
  }

  encodeBurnAmbient(
    liq: BigNumber,
    limitLow: number,
    limitHigh: number,
    useSurplus: boolean
  ) {
    return this.encodeWarmPath(
      BURN_AMBIENT,
      0,
      0,
      liq,
      limitLow,
      limitHigh,
      useSurplus
    );
  }

  encodeBurnAmbientAll(
    limitLow: number,
    limitHigh: number,
    useSurplus: boolean
  ) {
    return this.encodeWarmPath(
      BURN_AMBIENT,
      0,
      0,
      MAX_LIQ,
      limitLow,
      limitHigh,
      useSurplus
    );
  }

  private encodeWarmPath(
    callCode: number,
    lowerTick: number,
    upperTick: number,
    qty: BigNumber,
    limitLow: number,
    limitHigh: number,
    useSurplus: boolean
  ): string {
  
    return this.abiCoder.encode(WARM_ARG_TYPES, [
      callCode,
      this.base,
      this.quote,
      this.poolIdx,
      lowerTick,
      upperTick,
      qty,
      encodeCrocPrice(limitLow),
      encodeCrocPrice(limitHigh),
      (useSurplus ? (2 + 1) : 0),
      AddressZero
    ]);
  }
}

const MINT_CONCENTRATED: number = 1;
const BURN_CONCENTRATED: number = 2;
const MINT_AMBIENT: number = 3;
const BURN_AMBIENT: number = 4;

const WARM_ARG_TYPES = [
  "uint8", // Type call
  "address", // Base
  "address", // Quote
  "uint24", // Pool Index
  "int24", // Lower Tick
  "int24", // Upper Tick
  "uint128", // Liquidity
  "uint128", // Lower limit
  "uint128", // Upper limit
  "uint8", // reserve flags
  "address", // deposit vault
];

export function isTradeWarmCall(txData: string): boolean {
  const USER_CMD_METHOD = "0xa15112f9";
  const encoder = new ethers.utils.AbiCoder();
  if (txData.slice(0, 10) === USER_CMD_METHOD) {
    const result = encoder.decode(["uint16", "bytes"], "0x".concat(txData.slice(10)))
    return result[0] == LIQ_PATH
  }  
  return false;
}

interface WarmPathArgs {
  isMint: boolean,
  isAmbient: boolean,
  base: string;
  quote: string;
  poolIdx: number;
  lowerTick: number;
  upperTick: number;
  qty: BigNumber;
}

export function decodeWarmPathCall(txData: string): WarmPathArgs {
  const argData = "0x".concat(txData.slice(10 + 192));
  const encoder = new ethers.utils.AbiCoder();
  const result = encoder.decode(WARM_ARG_TYPES, argData);
  return {
    isMint: [MINT_AMBIENT, MINT_CONCENTRATED].includes(result[0]),
    isAmbient: [MINT_AMBIENT, BURN_AMBIENT].includes(result[0]),
    base: result[1],
    quote: result[2],
    poolIdx: result[3],
    lowerTick: result[4],
    upperTick: result[5],
    qty: result[6],
  };
}

export async function sendAmbientMint(
  baseTokenAddress: string,
  quoteTokenAddress: string,
  liquidity: BigNumber,
  limitLow: number,
  limitHigh: number,
  ethValue: number,
  signer: Signer
) {
  const crocContract = new ethers.Contract(
    contractAddresses["CROC_SWAP_ADDR"],
    CROC_ABI,
    signer
  );
  const warmPathEncoder = new WarmPathEncoder(
    baseTokenAddress,
    quoteTokenAddress,
    POOL_PRIMARY
  );

  const args = warmPathEncoder.encodeMintAmbient(
    liquidity,
    limitLow,
    limitHigh,
    false
  );

  let tx;
  // if baseToken = ETH
  if (baseTokenAddress === contractAddresses.ZERO_ADDR) {
    const fixedEthValue = (ethValue * 1.01).toFixed(18);

    tx = await crocContract.userCmd(LIQ_PATH, args, {
      value: parseEther(fixedEthValue.toString()),
      gasLimit: 1000000
    });
  } else {
    tx = await crocContract.userCmd(LIQ_PATH, args)
  }

  return tx;
}

export async function burnAmbientPartial(
  baseTokenAddress: string,
  quoteTokenAddress: string,
  liquidity: BigNumber,
  limitLow: number,
  limitHigh: number,
  signer: Signer
) {
  const crocContract = new ethers.Contract(
    contractAddresses["CROC_SWAP_ADDR"],
    CROC_ABI,
    signer
  );
  const warmPathEncoder = new WarmPathEncoder(
    baseTokenAddress,
    quoteTokenAddress,
    POOL_PRIMARY
  );

  const args = warmPathEncoder.encodeBurnAmbient(
    liquidity,
    limitLow,
    limitHigh,
    false
  );

  // if baseToken = ETH
  const tx = await crocContract.userCmd(LIQ_PATH, args, {
     gasLimit: 1000000,
  });

  return tx;
}

export async function burnAmbientAll(
  baseTokenAddress: string,
  quoteTokenAddress: string,
  limitLow: number,
  limitHigh: number,
  signer: Signer
) {
  const crocContract = new ethers.Contract(
    contractAddresses["CROC_SWAP_ADDR"],
    CROC_ABI,
    signer
  );
  const warmPathEncoder = new WarmPathEncoder(
    baseTokenAddress,
    quoteTokenAddress,
    POOL_PRIMARY
  );

  const args = warmPathEncoder.encodeBurnAmbientAll(limitLow, limitHigh, false);

  // if baseToken = ETH
  const tx = await crocContract.userCmd(LIQ_PATH, args, {
    // gasLimit: 1000000,
  });

  return tx;
}

export async function sendConcMint(
  baseTokenAddress: string,
  quoteTokenAddress: string,
  // poolPrice: number,
  poolWeiPrice: number,
  tickLower: number,
  tickHigher: number,
  tokenQty: string,
  qtyIsBase: boolean,
  limitLow: number,
  limitHigh: number,
  ethValue: number,
  signer: Signer
) {
  // console.log({ poolPrice });
  // console.log({ tickLower });
  // console.log({ tickHigher });
  // console.log({ tokenQty });
  // console.log({ limitLow });
  // console.log({ limitHigh });
  // console.log({ qtyIsBase });

  // const poolPriceTickLower = pinTickLower(poolWeiPrice);
  const poolPriceTickUpper = pinTickUpper(poolWeiPrice);

  // const positionLow = tickHigher < poolPriceTickLower;
  const positionHigh = tickLower > poolPriceTickUpper;

  const crocContract = new ethers.Contract(
    contractAddresses["CROC_SWAP_ADDR"],
    CROC_ABI,
    signer
  );
  const warmPathEncoder = new WarmPathEncoder(
    baseTokenAddress,
    quoteTokenAddress,
    POOL_PRIMARY
  );

  // const limitLowWei = fromDisplayQty(limitLow.toString(), 18);
  // const limitHighWei = fromDisplayQty(limitLow.toString(), 18);

  // console.log({ baseTokenDecimals });

  let liqForBaseConc, tokenDecimals, tokenQtyWei;

  if (qtyIsBase) {
    tokenDecimals = await getTokenDecimals(baseTokenAddress);
    tokenQtyWei = fromDisplayQty(tokenQty, tokenDecimals);
    liqForBaseConc = liquidityForBaseConc(
      poolWeiPrice,
      tokenQtyWei,
      tickToPrice(tickLower),
      tickToPrice(tickHigher)
    );
  } else {
    tokenDecimals = await getTokenDecimals(quoteTokenAddress);
    tokenQtyWei = fromDisplayQty(tokenQty, tokenDecimals);
    liqForBaseConc = liquidityForQuoteConc(
      poolWeiPrice,
      tokenQtyWei,
      tickToPrice(tickLower),
      tickToPrice(tickHigher)
    );
  }

  // console.log("liqForBaseConc: " + liqForBaseConc.toString());

  const sizedLiq = roundForConcLiq(liqForBaseConc);

  // const skew = concDepositSkew(poolWeiPrice, limitLowWei, limitHighWei);

  // console.log({ skew });

  const args = warmPathEncoder.encodeMintConc(
    tickLower,
    tickHigher,
    sizedLiq,
    limitLow,
    limitHigh,
    false
  );

  let tx;
  // if baseToken = ETH
  if (baseTokenAddress === contractAddresses.ZERO_ADDR && !positionHigh) {
    const fixedEthValue = (ethValue * 1.01).toFixed(18);
    const etherToSend = parseEther(fixedEthValue.toString());

    tx = await crocContract.userCmd(LIQ_PATH, args, {
      value: etherToSend,
      // gasLimit: 1000000,
    });
  } else {
    tx = await crocContract.userCmd(LIQ_PATH, args, {
      // gasLimit: 1000000,
    });
  }

  return tx;
}

export async function burnConcAll(
  baseTokenAddress: string,
  quoteTokenAddress: string,
  lowerTick: number,
  upperTick: number,
  limitLow: number,
  limitHigh: number,
  signer: Signer
) {
  const crocContract = new ethers.Contract(
    contractAddresses["CROC_SWAP_ADDR"],
    CROC_ABI,
    signer
  );
  const warmPathEncoder = new WarmPathEncoder(
    baseTokenAddress,
    quoteTokenAddress,
    POOL_PRIMARY
  );

  const args = warmPathEncoder.encodeBurnConcAll(
    lowerTick,
    upperTick,
    limitLow,
    limitHigh,
    false
  );

  // if baseToken = ETH
  const tx = await crocContract.userCmd(LIQ_PATH, args, {
    // gasLimit: 1000000,
  });

  return tx;
}
export async function burnConcPartial(
  baseTokenAddress: string,
  quoteTokenAddress: string,
  lowerTick: number,
  upperTick: number,
  liquidity: BigNumber,
  limitLow: number,
  limitHigh: number,
  signer: Signer
) {
  const crocContract = new ethers.Contract(
    contractAddresses["CROC_SWAP_ADDR"],
    CROC_ABI,
    signer
  );
  const warmPathEncoder = new WarmPathEncoder(
    baseTokenAddress,
    quoteTokenAddress,
    POOL_PRIMARY
  );

  const args = warmPathEncoder.encodeBurnConc(
    lowerTick,
    upperTick,
    liquidity,
    limitLow,
    limitHigh,
    false
  );

  // if baseToken = ETH
  const tx = await crocContract.userCmd(LIQ_PATH, args, {
    // gasLimit: 1000000,
  });

  return tx;
}
