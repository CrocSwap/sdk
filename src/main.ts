import { ethers } from "ethers";
// import QUERY_ABI from "../../abis/query.json";

const NODE_URL =
  "https://speedy-nodes-nyc.moralis.io/015fffb61180886c9708499e/eth/ropsten";
const provider = new ethers.providers.JsonRpcProvider(NODE_URL);

const contractAddresses = {
  ZERO_ADDR: "0x0000000000000000000000000000000000000000",
  WETH_ADDR: "0x10e13e6de3bd3a5d2e0361f56a695eb08731e40b",
  USDC_ADDR: "0x83e77C197E744D21810A1f970cD24A246E0932a1",
  CROC_SWAP_ADDR: "0x6c40E8A335bF5956DeBD2FB88D5c98Cc0A760559",
  QUERY_ADDR: "0x21E85d6C75a99B132e08dBDdB3166b2550D9e3b6",
};

const QUERY_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "dex",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "dex_",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "base",
        type: "address",
      },
      {
        internalType: "address",
        name: "quote",
        type: "address",
      },
      {
        internalType: "uint24",
        name: "poolIdx",
        type: "uint24",
      },
    ],
    name: "queryCurve",
    outputs: [
      {
        components: [
          {
            internalType: "uint128",
            name: "priceRoot_",
            type: "uint128",
          },
          {
            components: [
              {
                internalType: "uint128",
                name: "ambientSeed_",
                type: "uint128",
              },
              {
                internalType: "uint128",
                name: "concentrated_",
                type: "uint128",
              },
            ],
            internalType: "struct CurveMath.CurveLiquidity",
            name: "liq_",
            type: "tuple",
          },
          {
            components: [
              {
                internalType: "uint64",
                name: "ambientGrowth_",
                type: "uint64",
              },
              {
                internalType: "uint64",
                name: "concTokenGrowth_",
                type: "uint64",
              },
            ],
            internalType: "struct CurveMath.CurveFeeAccum",
            name: "accum_",
            type: "tuple",
          },
        ],
        internalType: "struct CurveMath.CurveState",
        name: "curve",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "base",
        type: "address",
      },
      {
        internalType: "address",
        name: "quote",
        type: "address",
      },
      {
        internalType: "uint24",
        name: "poolIdx",
        type: "uint24",
      },
    ],
    name: "queryLiquidity",
    outputs: [
      {
        internalType: "uint128",
        name: "",
        type: "uint128",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "base",
        type: "address",
      },
      {
        internalType: "address",
        name: "quote",
        type: "address",
      },
      {
        internalType: "uint24",
        name: "poolIdx",
        type: "uint24",
      },
    ],
    name: "queryPrice",
    outputs: [
      {
        internalType: "uint128",
        name: "",
        type: "uint128",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "router",
        type: "address",
      },
      {
        internalType: "address",
        name: "origin",
        type: "address",
      },
    ],
    name: "queryRouterApproved",
    outputs: [
      {
        internalType: "bool",
        name: "burn",
        type: "bool",
      },
      {
        internalType: "bool",
        name: "debit",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
    ],
    name: "querySurplus",
    outputs: [
      {
        internalType: "uint128",
        name: "",
        type: "uint128",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const crocQueryContract = new ethers.Contract(
  contractAddresses["QUERY_ADDR"],
  QUERY_ABI,
  provider
);

export const bar = async (): Promise<boolean> => {
  const gasPriceInWei = await provider.getBlockNumber();
  const blockNumber = await provider.getBlockNumber();
  // const gasPrice = web3.utils.fromWei(gasPriceInWei, "gwei");

  console.log("gas price: " + gasPriceInWei);
  console.log("current block number: " + blockNumber);
  return true;
};
export const getPrice = async (): Promise<number> => {
  const price = await crocQueryContract.queryPrice(
    // baseTokenAddress,
    // quoteTokenAddress,
    "0x1440186D311F764Ce7e3C2164E2Dff4cf1826A97", // mkr
    "0x83e77c197e744d21810a1f970cd24a246e0932a1", // usdc
    // "0xccea4dfe9f0dbccf6357b935846bf67778167d99", // wbtc
    // POOL_IDX

    35000
  );
  console.log(`spot price: ${price}`);
  return price;
};

export const delayMillis = (delayMs: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, delayMs));

export const greet = (name: string): string => `Hello ${name}`;

export const foo = async (): Promise<boolean> => {
  console.log(greet("World"));
  await delayMillis(1000);
  console.log("done");
  return true;
};
