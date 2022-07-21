import { BigNumber } from "ethers";

export const MIN_TICK = -665454;
export const MAX_TICK = 831818;

export const MAX_SQRT_PRICE: BigNumber = BigNumber.from(
  "21267430153580247136652501917186561138"
).sub(1);

export const MIN_SQRT_PRICE: BigNumber = BigNumber.from("65538").sub(1);

export const MAX_LIQ = BigNumber.from(2).pow(128).sub(1);

type ChainAddress = string;
type ChainId = string;

export interface ChainSpec {
  nodeUrl: string,
  poolIndex: number,
  dexAddr: ChainAddress,
  queryAddr: ChainAddress,
  isTestNet: boolean,
  chainId: ChainId,
  gridSize: number
}

const GOERLI_CHAIN: ChainSpec = {
  nodeUrl: "https://speedy-nodes-nyc.moralis.io/015fffb61180886c9708499e/eth/goerli",
  dexAddr: "0xfafcd1f5530827e7398b6d3c509f450b1b24a209",
  queryAddr: "0x9ea4b2f9b1572ed3ac46b402d9ba9153821033c6",
  poolIndex: 36000,
  isTestNet: true,
  chainId: "0x5",
  gridSize: 64
}

const KOVAN_CHAIN: ChainSpec = {
  nodeUrl: "https://speedy-nodes-nyc.moralis.io/015fffb61180886c9708499e/eth/kovan",
  dexAddr: "0x5d42d6046927dee12b9b4a235be0cecd55d0e0fb",
  queryAddr: "0x3a6e9cff691a473d4d0742e1dfc8ea263a99f6d0",
  poolIndex: 36000,
  isTestNet: true,
  chainId: "0x2a",
  gridSize: 64
}

export const CHAIN_SPECS: {[chainId: string]: ChainSpec} = { 
  "0x5": GOERLI_CHAIN,
  "0x2a": KOVAN_CHAIN,
  "goerli": GOERLI_CHAIN,
  "kovan": KOVAN_CHAIN,
}
