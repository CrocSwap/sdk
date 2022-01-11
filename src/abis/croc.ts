export const CROC_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "authority",
        type: "address",
      },
      {
        internalType: "address",
        name: "coldPath",
        type: "address",
      },
      {
        internalType: "address",
        name: "warmPath",
        type: "address",
      },
      {
        internalType: "address",
        name: "longPath",
        type: "address",
      },
      {
        internalType: "address",
        name: "microPath",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    name: "agents_",
    outputs: [
      {
        internalType: "bool",
        name: "burn_",
        type: "bool",
      },
      {
        internalType: "bool",
        name: "debit_",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    name: "ambPositions_",
    outputs: [
      {
        internalType: "uint128",
        name: "seeds_",
        type: "uint128",
      },
      {
        internalType: "uint32",
        name: "timestamp_",
        type: "uint32",
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
        internalType: "bool",
        name: "forDebit",
        type: "bool",
      },
      {
        internalType: "bool",
        name: "forBurn",
        type: "bool",
      },
    ],
    name: "approveRouter",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "recv",
        type: "address",
      },
      {
        internalType: "int128",
        name: "value",
        type: "int128",
      },
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
    ],
    name: "collect",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    name: "curves_",
    outputs: [
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
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "feesAccum_",
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
        name: "",
        type: "address",
      },
    ],
    name: "improves_",
    outputs: [
      {
        internalType: "bool",
        name: "inBase_",
        type: "bool",
      },
      {
        internalType: "uint128",
        name: "unitCollateral_",
        type: "uint128",
      },
      {
        internalType: "uint16",
        name: "awayTicks_",
        type: "uint16",
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
      {
        internalType: "uint128",
        name: "price",
        type: "uint128",
      },
    ],
    name: "initPool",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    name: "levels_",
    outputs: [
      {
        internalType: "uint96",
        name: "bidLots_",
        type: "uint96",
      },
      {
        internalType: "uint96",
        name: "askLots_",
        type: "uint96",
      },
      {
        internalType: "uint64",
        name: "feeOdometer_",
        type: "uint64",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    name: "mezzanine_",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "newPoolLiq_",
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
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    name: "pools_",
    outputs: [
      {
        internalType: "uint24",
        name: "feeRate_",
        type: "uint24",
      },
      {
        internalType: "uint8",
        name: "protocolTake_",
        type: "uint8",
      },
      {
        internalType: "uint16",
        name: "tickSize_",
        type: "uint16",
      },
      {
        internalType: "uint8",
        name: "priceOracle_",
        type: "uint8",
      },
      {
        internalType: "address",
        name: "permitOracle_",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    name: "positions_",
    outputs: [
      {
        internalType: "uint128",
        name: "liquidity_",
        type: "uint128",
      },
      {
        internalType: "uint64",
        name: "feeMileage_",
        type: "uint64",
      },
      {
        internalType: "uint32",
        name: "timestamp_",
        type: "uint32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "input",
        type: "bytes",
      },
    ],
    name: "protocolCmd",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "reEntrantLocked_",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    name: "surplusCollateral_",
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
      {
        internalType: "bool",
        name: "isBuy",
        type: "bool",
      },
      {
        internalType: "bool",
        name: "inBaseQty",
        type: "bool",
      },
      {
        internalType: "uint128",
        name: "qty",
        type: "uint128",
      },
      {
        internalType: "uint128",
        name: "limitPrice",
        type: "uint128",
      },
      {
        internalType: "bool",
        name: "useSurplus",
        type: "bool",
      },
    ],
    name: "swap",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint24",
        name: "",
        type: "uint24",
      },
    ],
    name: "templates_",
    outputs: [
      {
        internalType: "uint24",
        name: "feeRate_",
        type: "uint24",
      },
      {
        internalType: "uint8",
        name: "protocolTake_",
        type: "uint8",
      },
      {
        internalType: "uint16",
        name: "tickSize_",
        type: "uint16",
      },
      {
        internalType: "uint8",
        name: "priceOracle_",
        type: "uint8",
      },
      {
        internalType: "address",
        name: "permitOracle_",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    name: "terminus_",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "input",
        type: "bytes",
      },
    ],
    name: "trade",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "input",
        type: "bytes",
      },
    ],
    name: "tradeWarm",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
];
