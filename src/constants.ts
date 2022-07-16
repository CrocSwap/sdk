import { BigNumber } from "ethers";

export const contractAddresses = {
  ZERO_ADDR: "0x0000000000000000000000000000000000000000",
  CROC_SWAP_ADDR: "0xfafcd1f5530827e7398b6d3c509f450b1b24a209",
  QUERY_ADDR: "0x9ea4b2f9b1572ed3ac46b402d9ba9153821033c6",
};

export const MIN_TICK = -665454;
export const MAX_TICK = 831818;

export const MAX_SQRT_PRICE: BigNumber = BigNumber.from(
  "21267430153580247136652501917186561138"
).sub(1);

export const MIN_SQRT_PRICE: BigNumber = BigNumber.from("65538").sub(1);

export const MAX_LIQ = BigNumber.from(2).pow(128).sub(1);

export const NODE_URL =
  "https://speedy-nodes-nyc.moralis.io/015fffb61180886c9708499e/eth/goerli";

export const POOL_PRIMARY = 36000;

export const GRID_SIZE_DFLT = 64;
