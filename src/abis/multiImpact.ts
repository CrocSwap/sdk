
export const MULTI_IMPACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "dex",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "poolIdx",
            "type": "uint256"
          }
        ],
        "internalType": "struct CrocMultiImpact.SwapHop[]",
        "name": "hops",
        "type": "tuple[]"
      },
      {
        "internalType": "uint128",
        "name": "qty",
        "type": "uint128"
      },
      {
        "internalType": "bool",
        "name": "isReverse",
        "type": "bool"
      }
    ],
    "name": "calcMultiHopImpact",
    "outputs": [
      {
        "internalType": "int128",
        "name": "inputFlow",
        "type": "int128"
      },
      {
        "internalType": "int128",
        "name": "outputFlow",
        "type": "int128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "poolIdx",
                "type": "uint256"
              }
            ],
            "internalType": "struct CrocMultiImpact.SwapHop[]",
            "name": "hops",
            "type": "tuple[]"
          },
          {
            "internalType": "uint128",
            "name": "qty",
            "type": "uint128"
          },
          {
            "internalType": "bool",
            "name": "isFixedOutput",
            "type": "bool"
          }
        ],
        "internalType": "struct CrocMultiImpact.SwapPath[]",
        "name": "paths",
        "type": "tuple[]"
      }
    ],
    "name": "calcMultiPathImpact",
    "outputs": [
      {
        "components": [
          {
            "internalType": "int128",
            "name": "inputFlow",
            "type": "int128"
          },
          {
            "internalType": "int128",
            "name": "outputFlow",
            "type": "int128"
          }
        ],
        "internalType": "struct CrocMultiImpact.SwapPathOutput[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "dex_",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]
