import { BigNumber } from "ethers";

export const contractAddresses = {
  ZERO_ADDR: "0x0000000000000000000000000000000000000000",
  CROC_SWAP_ADDR: "0xB6Ff2e53408f38A5a363586746d1dB306AF5caa4",
  QUERY_ADDR: "0x3F6B274529dDe713CF7703129f219e38dC0D83b5",
};

export const MIN_TICK = -665454;
export const MAX_TICK = 831818;

export const MAX_SQRT_PRICE: BigNumber =
  BigNumber.from("21267430153580247136652501917186561138").sub(1);

export const MIN_SQRT_PRICE: BigNumber =
  BigNumber.from("65538").sub(1);

export const MAX_LIQ = BigNumber.from(2).pow(128)

export const NODE_URL =
    "https://speedy-nodes-nyc.moralis.io/015fffb61180886c9708499e/eth/ropsten";

export const POOL_PRIMARY = 35000