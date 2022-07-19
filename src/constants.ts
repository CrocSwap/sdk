import { BigNumber } from "ethers";

type ChainAddress = string;

export interface ChainContext {
  nodeUrl: string,
  poolIndex: number,
  dexAddr: ChainAddress,
  queryAddr: ChainAddress
}

export interface ChainContexts {
  [chain: number]: ChainContext
} 

const GOERLI_CHAIN: ChainContext = {
  nodeUrl: "https://speedy-nodes-nyc.moralis.io/015fffb61180886c9708499e/eth/goerli",
  dexAddr: "0xfafcd1f5530827e7398b6d3c509f450b1b24a209",
  queryAddr: "0x9ea4b2f9b1572ed3ac46b402d9ba9153821033c6",
  poolIndex: 36000,
}

const KOVAN_CHAIN: ChainContext = {
  nodeUrl: "https://speedy-nodes-nyc.moralis.io/015fffb61180886c9708499e/eth/kovan",
  dexAddr: "0x5d42d6046927dee12b9b4a235be0cecd55d0e0fb",
  queryAddr: "0x3a6e9cff691a473d4d0742e1dfc8ea263a99f6d0",
  poolIndex: 36000,
}

export const CHAIN_CONTEXTS: ChainContexts = { 
  5: GOERLI_CHAIN,
  42: KOVAN_CHAIN
}

export const MIN_TICK = -665454;
export const MAX_TICK = 831818;

export const MAX_SQRT_PRICE: BigNumber = BigNumber.from(
  "21267430153580247136652501917186561138"
).sub(1);

export const MIN_SQRT_PRICE: BigNumber = BigNumber.from("65538").sub(1);

export const MAX_LIQ = BigNumber.from(2).pow(128).sub(1);

export const GRID_SIZE_DFLT = 64;
