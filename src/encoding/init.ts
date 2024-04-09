import { encodeAbiParameters } from "viem";
import { encodeCrocPrice } from "../utils/price";

type Address = string;
type PoolType = number;

export class PoolInitEncoder {

  constructor (baseToken: Address, quoteToken: Address, poolIdx: PoolType) {
    this.baseToken = baseToken
    this.quoteToken = quoteToken
    this.poolIdx = poolIdx
  }

  encodeInitialize (initPrice: number): string {
    const crocPrice = encodeCrocPrice(initPrice)
    const POOL_INIT_TYPES = [{type: "uint8", name: "subCmd"},
      {type: "address", name: "baseToken"},
      {type: "address", name: "quoteToken"},
      {type: "uint256", name: "poolIdx"},]
    return encodeAbiParameters(POOL_INIT_TYPES,
      [71, this.baseToken, this.quoteToken, this.poolIdx, crocPrice])
  }

  private baseToken: Address
  private quoteToken: Address
  private poolIdx: PoolType
}
