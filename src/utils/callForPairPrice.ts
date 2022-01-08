import { ethers } from "ethers";

import { contractAddresses } from "../constants";
import { QUERY_ABI } from "../constants";

let price;
export const getPairPrice = async (): Promise<ethers.BigNumberish> => {
  const NODE_URL =
    "https://speedy-nodes-nyc.moralis.io/015fffb61180886c9708499e/eth/ropsten";
  const provider = new ethers.providers.JsonRpcProvider(NODE_URL);

  const crocQueryContract = new ethers.Contract(
    contractAddresses["QUERY_ADDR"],
    QUERY_ABI,
    provider
  );
  price = await crocQueryContract.queryPrice(
    // baseTokenAddress,
    // quoteTokenAddress,
    "0x1440186D311F764Ce7e3C2164E2Dff4cf1826A97", // mkr
    "0x83e77c197e744d21810a1f970cd24a246e0932a1", // usdc
    // "0xccea4dfe9f0dbccf6357b935846bf67778167d99", // wbtc
    // POOL_IDX

    35000
  );
  // console.log(`spot price: ${price}`);
  // console.log("from bignumber: " + ethers.BigNumber.from(price));
  // console.log("json: " + JSON.stringify(price));
  return ethers.BigNumber.from(price);
};

// getPairPrice();
