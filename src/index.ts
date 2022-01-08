import { ethers } from "ethers";

const NODE_URL =
  "https://speedy-nodes-nyc.moralis.io/015fffb61180886c9708499e/eth/ropsten";
const provider = new ethers.providers.JsonRpcProvider(NODE_URL);

export const getBlockNumber = async (): Promise<number> => {
  const blockNumber = await provider.getBlockNumber();
  console.log("current block number: " + blockNumber);
  return blockNumber;
};

export function doubleNumber(a: number): number {
  return a * 2;
}

export const zero = 0;

export function sumNumbers(a: number, b: number): number {
  return a + b;
}

export const sum = (a: number, b: number): number => {
  return a + b;
};

export const name = "Ben";

export * from "./constants";
export * from "./utils";

// export const fetchData = () => {
//   return "peanut butter";
// };
