export const contractAddresses = {
  ZERO_ADDR: "0x0000000000000000000000000000000000000000",
  WETH_ADDR: "0x10e13e6de3bd3a5d2e0361f56a695eb08731e40b",
  USDC_ADDR: "0x83e77C197E744D21810A1f970cD24A246E0932a1",
  CROC_SWAP_ADDR: "0x6c40E8A335bF5956DeBD2FB88D5c98Cc0A760559",
  QUERY_ADDR: "0x21E85d6C75a99B132e08dBDdB3166b2550D9e3b6",
};

export const QUERY_ABI = [
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
