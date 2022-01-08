import { ethers } from "ethers";
const NODE_URL =
  "https://speedy-nodes-nyc.moralis.io/015fffb61180886c9708499e/eth/ropsten";
const provider = new ethers.providers.JsonRpcProvider(NODE_URL);

export const getGasPrice = async (): Promise<number> => {
  const gasPriceInWei = await provider.getBlockNumber();
  // const gasPrice = web3.utils.fromWei(gasPriceInWei, "gwei");
  console.log("gas price in wei: " + gasPriceInWei);
  return gasPriceInWei;
};
