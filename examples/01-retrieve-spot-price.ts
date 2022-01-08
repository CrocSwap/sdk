// import { bar, getPrice } from '@crocswap-libs/sdk';
import lib = require("../dist/tsc/index.js");

// await foo();
// await bar();
async function fetchPairPrice() {
  const pairPrice = (await lib.getPairPrice()).toString();
  console.log("current spot price for USDC <-> WBTC: " + pairPrice);
}

fetchPairPrice();
