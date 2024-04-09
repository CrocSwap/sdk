import { decodeAbiParameters, encodeAbiParameters, hexToBytes } from "viem";
import { MAX_LIQ } from "../constants";
import { encodeCrocPrice } from "../utils/price";
import { AddressZero } from "../utils";

type Address = string;
type PoolType = number;

export class WarmPathEncoder {
  constructor(base: Address, quote: Address, poolIdx: PoolType) {
    this.base = base;
    this.quote = quote;
    this.poolIdx = poolIdx;
  }

  private base: Address;
  private quote: Address;
  private poolIdx: PoolType;

  encodeMintConc(
    lowerTick: number,
    upperTick: number,
    qty: bigint,
    qtyIsBase: boolean,
    limitLow: number,
    limitHigh: number,
    useSurplus: number
  ) {
    return this.encodeWarmPath(
      qtyIsBase ? MINT_CONC_BASE : MINT_CONC_QUOTE,
      lowerTick,
      upperTick,
      qty,
      limitLow,
      limitHigh,
      useSurplus
    );
  }

  encodeBurnConc(
    lowerTick: number,
    upperTick: number,
    liq: bigint,
    limitLow: number,
    limitHigh: number,
    useSurplus: number
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

  encodeHarvestConc(
    lowerTick: number,
    upperTick: number,
    limitLow: number,
    limitHigh: number,
    useSurplus: number
  ) {
    return this.encodeWarmPath(
      HARVEST_CONCENTRATED,
      lowerTick,
      upperTick,
      BigInt(0),
      limitLow,
      limitHigh,
      useSurplus
    );
  }

  encodeMintAmbient(
    qty: bigint,
    qtyIsBase: boolean,
    limitLow: number,
    limitHigh: number,
    useSurplus: number
  ) {
    return this.encodeWarmPath(
      qtyIsBase ? MINT_AMBIENT_BASE : MINT_AMBIENT_QUOTE,
      0,
      0,
      qty,
      limitLow,
      limitHigh,
      useSurplus
    );
  }

  encodeBurnAmbient(
    liq: bigint,
    limitLow: number,
    limitHigh: number,
    useSurplus: number
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
    useSurplus: number
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
    qty: bigint,
    limitLow: number,
    limitHigh: number,
    useSurplus: number
  ): string {
    return encodeAbiParameters(WARM_ARG_TYPES, [
      callCode,
      this.base,
      this.quote,
      this.poolIdx,
      lowerTick,
      upperTick,
      qty,
      encodeCrocPrice(limitLow),
      encodeCrocPrice(limitHigh),
      useSurplus,
      AddressZero,
    ]);
  }
}

const MINT_CONCENTRATED: number = 1;
const MINT_CONC_BASE: number = 11;
const MINT_CONC_QUOTE: number = 12
const BURN_CONCENTRATED: number = 2;
const MINT_AMBIENT: number = 3;
const MINT_AMBIENT_BASE: number = 31;
const MINT_AMBIENT_QUOTE: number = 32;
const BURN_AMBIENT: number = 4;
const HARVEST_CONCENTRATED: number = 5


const WARM_ARG_TYPES = [
  { type: "uint8", name: "callType" },
  { type: "address", name: "base" },
  { type: "address", name: "quote" },
  { type: "uint24", name: "poolIdx" },
  { type: "int24", name: "lowerTick" },
  { type: "int24", name: "upperTick" },
  { type: "uint128", name: "qty" },
  { type: "uint128", name: "limitLow" },
  { type: "uint128", name: "limitHigh" },
  { type: "uint8", name: "useSurplus" },
  { type: "address", name: "depositVault"}
];

export function isTradeWarmCall(txData: string): boolean {
  const USER_CMD_METHOD = "0xa15112f9";
  const LIQ_PATH = 2

  if (txData.slice(0, 10) === USER_CMD_METHOD) {
    const result = decodeAbiParameters(
      [{ type: "uint16", name: "cmd" }, { type: "bytes", name: "data" }],
      hexToBytes(txData.slice(10) as any) // TODO: fix typing
    );
    return result[0] == LIQ_PATH;
  }
  return false;
}

interface WarmPathArgs {
  isMint: boolean;
  isAmbient: boolean;
  base: string;
  quote: string;
  poolIdx: number;
  lowerTick: number;
  upperTick: number;
  qty: bigint;
}

// TODO: fix typing mess
export function decodeWarmPathCall(txData: string): WarmPathArgs {
  const argData = "0x" + txData.slice(10 + 192);
  const result = decodeAbiParameters(WARM_ARG_TYPES, hexToBytes(argData as any));
  return {
    isMint: [MINT_AMBIENT, MINT_CONCENTRATED].includes(result[0] as number),
    isAmbient: [MINT_AMBIENT, BURN_AMBIENT].includes(result[0] as number),
    base: result[1] as Address,
    quote: result[2] as Address,
    poolIdx: result[3] as number,
    lowerTick: result[4] as number,
    upperTick: result[5] as number,
    qty: result[6] as bigint,
  };
}
