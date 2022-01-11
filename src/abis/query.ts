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
