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
  gridSize: number,
  blockExplorer?: string,
  displayName: string,
  logoUrl?: string
}

const ETHERUM_LOGO = 
  "https://d33wubrfki0l68.cloudfront.net/fcd4ecd90386aeb50a235ddc4f0063cfbb8a7b66/4295e/static/bfc04ac72981166c740b189463e1f74c/40129/eth-diamond-black-white.jpg"

const GOERLI_CHAIN: ChainSpec = {
  nodeUrl: "https://speedy-nodes-nyc.moralis.io/015fffb61180886c9708499e/eth/goerli",
  dexAddr: "0xfafcd1f5530827e7398b6d3c509f450b1b24a209",
  queryAddr: "0x93a4baFDd49dB0e06f3F3f9FddC1A67792F47518",
  poolIndex: 36000,
  isTestNet: true,
  chainId: "0x5",
  gridSize: 64,
  blockExplorer: "https://goerli.etherscan.io/",
  displayName: "Goerli",
  logoUrl: ETHERUM_LOGO
}

const KOVAN_CHAIN: ChainSpec = {
  nodeUrl: "https://speedy-nodes-nyc.moralis.io/015fffb61180886c9708499e/eth/kovan",
  dexAddr: "0x5d42d6046927dee12b9b4a235be0cecd55d0e0fb",
  queryAddr: "0x3a6e9cff691a473d4d0742e1dfc8ea263a99f6d0",
  poolIndex: 36000,
  isTestNet: true,
  chainId: "0x2a",
  gridSize: 64,
  blockExplorer: "https://kovan.etherscan.io/",
  displayName: "Kovan",
  logoUrl: ETHERUM_LOGO
}


const LOCAL_FORK_CHAIN: ChainSpec = {
  nodeUrl: "http://127.0.0.1:8545",
  dexAddr: "0xfafcd1f5530827e7398b6d3c509f450b1b24a209",
  queryAddr: "0x93a4baFDd49dB0e06f3F3f9FddC1A67792F47518",
  poolIndex: 36000,
  isTestNet: true,
  chainId: "0x7a69",
  gridSize: 64,
  displayName: "Local Fork"
}

export const CHAIN_SPECS: {[chainId: string]: ChainSpec} = { 
  "0x5": GOERLI_CHAIN,
  "0x7a69": LOCAL_FORK_CHAIN,
  "0x2a": KOVAN_CHAIN,
  "goerli": GOERLI_CHAIN,
  "kovan": KOVAN_CHAIN,
  "local": LOCAL_FORK_CHAIN
}
