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
  nodeUrl: string;
  wsUrl?: string,
  poolIndex: number;
  dexAddr: ChainAddress;
  queryAddr: ChainAddress;
  impactAddr: ChainAddress;
  isTestNet: boolean;
  chainId: ChainId;
  gridSize: number;
  blockExplorer?: string;
  displayName: string;
  logoUrl?: string;
}

const ETHERUM_LOGO =
  "https://d33wubrfki0l68.cloudfront.net/fcd4ecd90386aeb50a235ddc4f0063cfbb8a7b66/4295e/static/bfc04ac72981166c740b189463e1f74c/40129/eth-diamond-black-white.jpg";

const GOERLI_CHAIN: ChainSpec = {
  nodeUrl: "https://goerli.infura.io/v3/170b7b65781c422d82a94b8b289ca605",
  // nodeUrl: "https://goerli.infura.io/v3/cbb2856ea8804fc5ba59be0a2e8a9f88",
  // nodeUrl: "https://goerli.infura.io/v3/e0aa879e36fc4c9e91b826ad961a36fd",
  // nodeUrl: "https://goerli.infura.io/v3/4a162c75bd514925890174ca13cdb6a2",
  wsUrl: "wss://goerli.infura.io/ws/v3/170b7b65781c422d82a94b8b289ca605",
  // wsUrl: "wss://goerli.infura.io/ws/v3/cbb2856ea8804fc5ba59be0a2e8a9f88",
  // wsUrl: "wss://goerli.infura.io/ws/v3/e0aa879e36fc4c9e91b826ad961a36fd",
  // wsUrl: "wss://goerli.infura.io/ws/v3/4a162c75bd514925890174ca13cdb6a2",
  dexAddr: "0xfafcd1f5530827e7398b6d3c509f450b1b24a209",
  queryAddr: "0x93a4baFDd49dB0e06f3F3f9FddC1A67792F47518",
  impactAddr: "0x142BE02F2A3A27ecD6e2f18a43c2C234F372C831",
  poolIndex: 36000,
  isTestNet: true,
  chainId: "0x5",
  gridSize: 64,
  blockExplorer: "https://goerli.etherscan.io/",
  displayName: "Görli",
  logoUrl: ETHERUM_LOGO,
};

const LOCAL_FORK_CHAIN: ChainSpec = {
  nodeUrl: "http://127.0.0.1:8545",
  dexAddr: "0xfafcd1f5530827e7398b6d3c509f450b1b24a209",
  queryAddr: "0x93a4baFDd49dB0e06f3F3f9FddC1A67792F47518",
  impactAddr: "0x2979EeEcf2FE0D1ad2E7f3D9E84a6Ee92d23Ee68",
  poolIndex: 36000,
  isTestNet: true,
  chainId: "0x7a69",
  gridSize: 64,
  displayName: "Local Fork",
};

export const CHAIN_SPECS: { [chainId: string]: ChainSpec } = {
  "0x5": GOERLI_CHAIN,
  "0x7a69": LOCAL_FORK_CHAIN,
  goerli: GOERLI_CHAIN,
  local: LOCAL_FORK_CHAIN,
};
