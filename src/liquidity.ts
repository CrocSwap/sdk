import { BigNumber, ethers, Signer } from "ethers";
import { MAX_LIQ, contractAddresses } from "./constants";
import {
  bigNumToFloat,
  floatToBigNum,
  encodeCrocPrice,
  fromDisplayQty,
  tickToPrice,
  truncateRightBits,
  getTokenDecimals,
  // fromDisplayPrice,
} from "./utils";
import { CROC_ABI } from "./abis";
import { parseEther } from "ethers/lib/utils";

type Address = string;
type PoolType = number;

/* Converts a fixed base token collateral amount to pool liquidity units. This conversion only applies
 * to the current pool price. If price moves the ratio between token collateral and liquidity will also
 * change. Note that this function will only work when token qty or liquidity is less than 2^64

 * @param price The current (non-display) price ratio in the pool.
 * @param qty The quantity (in non-display wei) of base token to convert
 * @return The amount of virtual liquidity (in sqrt(X*Y)) supported by this base token quantity. */
export function liquidityForBaseQty(
  price: number,
  qty: BigNumber,
  mult = 1.0
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

  private readonly MINT_CONCENTRATED: number = 1;
  private readonly BURN_CONCENTRATED: number = 2;
  private readonly MINT_AMBIENT: number = 3;
  private readonly BURN_AMBIENT: number = 4;

  encodeMintConc(
    lowerTick: number,
    upperTick: number,
    liq: BigNumber,
    limitLow: number,
    limitHigh: number,
    useSurplus: boolean
  ) {
    return this.encodeWarmPath(
      this.MINT_CONCENTRATED,
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
      this.BURN_CONCENTRATED,
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
      this.BURN_CONCENTRATED,
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
      this.MINT_AMBIENT,
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
      this.BURN_AMBIENT,
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
      this.BURN_AMBIENT,
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
    liq: BigNumber,
    limitLow: number,
    limitHigh: number,
    useSurplus: boolean
  ): string {
    return this.abiCoder.encode(
      [
        "uint8",
        "address",
        "address",
        "uint24",
        "int24",
        "int24",
        "uint128",
        "uint128",
        "uint128",
        "bool",
      ],
      [
        callCode,
        this.base,
        this.quote,
        this.poolIdx,
        lowerTick,
        upperTick,
        liq,
        encodeCrocPrice(limitLow),
        encodeCrocPrice(limitHigh),
        useSurplus,
      ]
    );
  }
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
    35000
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
    tx = await crocContract.tradeWarm(args, {
      value: parseEther(ethValue.toString()),
      gasLimit: 1000000,
    });
  } else {
    tx = await crocContract.tradeWarm(args, {
      gasLimit: 1000000,
    });
  }

  return tx;
}

export async function sendConcMint(
  baseTokenAddress: string,
  quoteTokenAddress: string,
  poolPrice: number,
  poolWeiPrice: number,
  tickLower: number,
  tickHigher: number,
  tokenQty: string,
  limitLow: number,
  limitHigh: number,
  ethValue: number,
  signer: Signer
) {
  console.log({ poolPrice });
  console.log({ tickLower });
  console.log({ tickHigher });
  console.log({ tokenQty });
  console.log({ limitLow });
  console.log({ limitHigh });

  const crocContract = new ethers.Contract(
    contractAddresses["CROC_SWAP_ADDR"],
    CROC_ABI,
    signer
  );
  const warmPathEncoder = new WarmPathEncoder(
    baseTokenAddress,
    quoteTokenAddress,
    35000
  );

  // const limitLowWei = fromDisplayQty(limitLow.toString(), 18);
  // const limitHighWei = fromDisplayQty(limitLow.toString(), 18);

  const baseTokenDecimals = await getTokenDecimals(baseTokenAddress);

  // console.log({ baseTokenDecimals });

  const tokenQtyWei = fromDisplayQty(tokenQty, baseTokenDecimals);

  const liqForBaseConc = liquidityForBaseConc(
    poolWeiPrice,
    tokenQtyWei,
    tickToPrice(tickLower),
    tickToPrice(tickHigher)
  );
  console.log("liqForBaseConc: " + liqForBaseConc.toString());

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
  if (baseTokenAddress === contractAddresses.ZERO_ADDR) {
    const etherToSend = parseEther((ethValue * 1.01).toString());

    tx = await crocContract.tradeWarm(args, {
      value: etherToSend,
      gasLimit: 1000000,
    });
  } else {
    tx = await crocContract.tradeWarm(args, {
      gasLimit: 1000000,
    });
  }

  return tx;
}
