import { BigNumber } from "ethers";

type ChainAddress = string;
type ChainId = string;

export interface ChainSpec {
  nodeUrl: string;
  wsUrl?: string,
  poolIndex: number;
  addrs: {
    dex: ChainAddress;
    query: ChainAddress;
    impact: ChainAddress
  }
  isTestNet: boolean;
  chainId: ChainId;
  gridSize: number;
  proxyPaths: {
    cold: number,
    liq: number,
    long: number
  }
  blockExplorer?: string;
  displayName: string;
  logoUrl?: string;
}

const ETHERUM_LOGO =
  "https://d33wubrfki0l68.cloudfront.net/fcd4ecd90386aeb50a235ddc4f0063cfbb8a7b66/4295e/static/bfc04ac72981166c740b189463e1f74c/40129/eth-diamond-black-white.jpg";

const DFLT_SDK_INFURA_KEY = '360ea5fda45b4a22883de8522ebd639e'

const GOERLI_CHAIN: ChainSpec = {
  nodeUrl: "https://goerli.infura.io/v3/" + DFLT_SDK_INFURA_KEY, 
  wsUrl: "wss://goerli.infura.io/ws/v3/" + DFLT_SDK_INFURA_KEY, 
  addrs: {
    dex: "0xfafcd1f5530827e7398b6d3c509f450b1b24a209",
    query: "0x93a4baFDd49dB0e06f3F3f9FddC1A67792F47518",
    impact: "0x142BE02F2A3A27ecD6e2f18a43c2C234F372C831"
  },
  poolIndex: 36000,
  isTestNet: true,
  chainId: "0x5",
  gridSize: 64,
  proxyPaths: {
    cold: 0,
    long: 4,
    liq: 2
  },
  blockExplorer: "https://goerli.etherscan.io/",
  displayName: "Görli",
  logoUrl: ETHERUM_LOGO,
};

const ARB_GOERLI_CHAIN: ChainSpec = {
  nodeUrl: "https://goerli-rollup.arbitrum.io/rpc",
  addrs: {
    dex: "0x9EA4B2f9b1572eD3aC46b402d9Ba9153821033C6",
    query: "0x6291Aa5812FF75412Cf3F3258447139653A9a209",
    impact: "0x5afc7599A4b659C5c628fBC212012B68F3b5D41C"
  },
  poolIndex: 36000,
  isTestNet: true,
  chainId: "0x66EED",
  gridSize: 16,
  proxyPaths: {
    cold: 3,
    long: 4,
    liq: 2
  },
  blockExplorer: "https://goerli.arbiscan.io",
  displayName: "Arbitrum Görli",
  logoUrl: ETHERUM_LOGO,
};

const LOCAL_FORK_CHAIN: ChainSpec = Object.assign({}, GOERLI_CHAIN, {
  nodeUrl: "http://127.0.0.1:8545",
  chainId: "0x7a69",
  displayName: "Local Fork"
});

export const CHAIN_SPECS: { [chainId: string]: ChainSpec } = {
  "0x5": GOERLI_CHAIN,
  "0x7a69": LOCAL_FORK_CHAIN,
  "0x66eed": ARB_GOERLI_CHAIN,
  "goerli": GOERLI_CHAIN,
  "arbtest": ARB_GOERLI_CHAIN,
  "arbgoerli": ARB_GOERLI_CHAIN,
  "local": LOCAL_FORK_CHAIN,
};

export const MIN_TICK = -665454;
export const MAX_TICK = 831818;
export const MAX_SQRT_PRICE: BigNumber = BigNumber.from(
  "21267430153580247136652501917186561138").sub(1);
export const MIN_SQRT_PRICE: BigNumber = BigNumber.from("65538").sub(1);
export const MAX_LIQ = BigNumber.from(2).pow(128).sub(1);
