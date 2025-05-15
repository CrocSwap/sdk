type ChainAddress = string;
type ChainId = string;

export const MIN_TICK = -665454;
export const MAX_TICK = 831818;
export const MAX_SQRT_PRICE: bigint = BigInt(
  "21267430153580247136652501917186561138") - BigInt(1);
export const MIN_SQRT_PRICE: bigint = BigInt("65538") - BigInt(1);
export const MAX_LIQ = BigInt(2) ** BigInt(128) - BigInt(1);


export interface ChainSpec {
  nodeUrl: string;
  poolIndex: number;
  addrs: {
    dex: ChainAddress;
    query: ChainAddress;
    impact: ChainAddress;
    router?: ChainAddress
    routerBypass?: ChainAddress
  }
  isTestNet: boolean;
  chainId: ChainId;
  gridSize: number;
  proxyPaths: {
    cold: number,
    liq: number,
    long: number,
    dfltColdSwap?: boolean
  }
  blockExplorer?: string;
  displayName: string;
}

const MAINNET_CHAIN: ChainSpec = {
  nodeUrl: "https://ethereum-rpc.publicnode.com" ,
  addrs: {
    dex: "0xAaAaAAAaA24eEeb8d57D431224f73832bC34f688",
    query: "0xc2e1f740E11294C64adE66f69a1271C5B32004c8",
    impact: "0x3e3EDd3eD7621891E574E5d7f47b1f30A994c0D0",
    router: "0x533E164ded63f4c55E83E1f409BDf2BaC5278035",
    routerBypass: "0xa3e58B0cB05447398358B6C59E4B2465342EFEd2"
  },
  poolIndex: 420,
  isTestNet: false,
  chainId: "0x1",
  gridSize: 16,
  proxyPaths: {
    cold: 3,
    long: 4,
    liq: 2,
    dfltColdSwap: true
  },
  blockExplorer: "https://etherscan.io/",
  displayName: "Ethereum",
};

const SEPOLIA_CHAIN: ChainSpec = {
  nodeUrl: "https://ethereum-sepolia-rpc.publicnode.com",
  addrs: {
    dex: "0xFb8A46E7963E6397DBB4B2E1c0B3f0464fb5BDFF",
    query: "0xDB182F4687708D0F5798c77b4d02ad3425f4B672",
    impact: "0x80aEB76D091ecbEd3c609c0B794fC1A09B9cB8F4",
    router: "0x168dB7Ad649D9f7918028F709C5e2F245af284A4",
    routerBypass: "0xBC3d1Bb2d8A59eb25DA1E527bF0cA62B44346EE1"
  },
  poolIndex: 36000,
  isTestNet: true,
  chainId: "0xaa36a7",
  gridSize: 16,
  proxyPaths: {
    cold: 3,
    long: 4,
    liq: 2
  },
  blockExplorer: "https://sepolia.etherscan.io/",
  displayName: "Sepolia",
};

const BLAST_CHAIN: ChainSpec = {
  nodeUrl: "https://rpc.ankr.com/blast",
  addrs: {
    dex: "0xaAaaaAAAFfe404EE9433EEf0094b6382D81fb958",
    query: "0xA3BD3bE19012De72190c885FB270beb93e36a8A7",
    impact: "0x6A699AB45ADce02891E6115b81Dfb46CAa5efDb9",
    router: "0xaab17419F062bB28CdBE82f9FC05E7C47C3F6194",
    routerBypass: "0xd83eF4d0e968A96329aC297bBf049CDdaC7E0362"
  },
  poolIndex: 420,
  isTestNet: false,
  chainId: "0x13e31",
  gridSize: 4,
  proxyPaths: {
    cold: 3,
    long: 130,
    liq: 128,
    dfltColdSwap: true
  },
  blockExplorer: "https://blastscan.io/",
  displayName: "Blast",
};

const ZIRCUIT_CHAIN: ChainSpec = {
  nodeUrl: "https://rpc.ankr.com/blast",
  addrs: {
    dex: "0xaAaaaAAAFfe404EE9433EEf0094b6382D81fb958",
    query: "0xA3BD3bE19012De72190c885FB270beb93e36a8A7",
    impact: "0x6A699AB45ADce02891E6115b81Dfb46CAa5efDb9",
    router: "0xaab17419F062bB28CdBE82f9FC05E7C47C3F6194",
    routerBypass: "0xd83eF4d0e968A96329aC297bBf049CDdaC7E0362"
  },
  poolIndex: 420,
  isTestNet: false,
  chainId: "0x13e31",
  gridSize: 4,
  proxyPaths: {
    cold: 3,
    long: 130,
    liq: 128,
    dfltColdSwap: true
  },
  blockExplorer: "https://blastscan.io/",
  displayName: "Zircuit",
};

const BLAST_SEPOLIA_CHAIN: ChainSpec = {
  nodeUrl: "https://sepolia.blast.io",
  addrs: {
    dex: "0xf65976C7f25b6320c7CD81b1db10cEe97F2bb7AC",
    query: "0x7757BAEC9c492691eAE235c6f01FB99AaA622975",
    impact: "0x5D42d6046927DEE12b9b4a235be0ceCd55D0E0fb",
    router: "0xdCB3b5ec9170beF68E9fff21F0EDD622F72f1899",
    routerBypass: "0x3A6E9cff691a473D4D0742E1dFc8Ea263a99F6d0"
  },
  poolIndex: 36000,
  isTestNet: true,
  chainId: "0xa0c71fd",
  gridSize: 1,
  proxyPaths: {
    cold: 3,
    long: 130,
    liq: 128,
    dfltColdSwap: true
  },
  blockExplorer: "https://testnet.blastscan.io/",
  displayName: "Blast Sepolia",
};

const SCROLL_SEPOLIA_CHAIN: ChainSpec = {
  nodeUrl: "https://sepolia-rpc.scroll.io",
  addrs: {
    dex: "0xaaAAAaa6612bd88cD409cb0D70C99556C87A0E8c",
    query: "0x43eC1302FE3587862e15B2D52AD9653575FD79e9",
    impact: "0x9B28970D51A231741416D8D3e5281d9c51a50892",
    router: "0x323172539B1B0D9eDDFFBd0318C4d6Ab45292843",
    routerBypass: "0xb2aE163293C82DCF36b0cE704591eDC2f9E2608D"
  },
  poolIndex: 36000,
  isTestNet: true,
  chainId: "0x8274f",
  gridSize: 1,
  proxyPaths: {
    cold: 3,
    long: 130,
    liq: 128
  },
  blockExplorer: "https://sepolia.scrollscan.dev/",
  displayName: "Scroll Sepolia",
};

const SWELL_SEPOLIA_CHAIN: ChainSpec = {
  nodeUrl: "https://swell-testnet.alt.technology",
  addrs: {
    dex: "0x4c722A53Cf9EB5373c655E1dD2dA95AcC10152D1",
    query: "0x1C74Dd2DF010657510715244DA10ba19D1F3D2B7",
    impact: "0x70a6a0C905af5737aD73Ceba4e6158e995031d4B",
  },
  poolIndex: 36000,
  isTestNet: true,
  chainId: "0x784",
  gridSize: 1,
  proxyPaths: {
    cold: 3,
    long: 130,
    liq: 128
  },
  blockExplorer: "https://swell-testnet-explorer.alt.technology/",
  displayName: "Swell Sepolia",
};

const SWELL_CHAIN: ChainSpec = {
  nodeUrl: "https://swell-mainnet.alt.technology",
  addrs: {
    dex: "0xaAAaAaaa82812F0a1f274016514ba2cA933bF24D",
    query: "0xaab17419F062bB28CdBE82f9FC05E7C47C3F6194",
    impact: "0xd83eF4d0e968A96329aC297bBf049CDdaC7E0362",
  },
  poolIndex: 420,
  isTestNet: false,
  chainId: "0x783",
  gridSize: 4,
  proxyPaths: {
    cold: 3,
    long: 130,
    liq: 128
  },
  blockExplorer: "https://swellchainscan.io/",
  displayName: "Swell",
};

const PLUME_LEGACY_CHAIN: ChainSpec = {
  nodeUrl: "https://rpc.plumenetwork.xyz",
  addrs: {
    dex: "0xAaAaAAAA81a99d2a05eE428eC7a1d8A3C2237D85",
    query: "0xA3BD3bE19012De72190c885FB270beb93e36a8A7",
    impact: "0x6A699AB45ADce02891E6115b81Dfb46CAa5efDb9",
  },
  poolIndex: 420,
  isTestNet: false,
  chainId: "0x18231",
  gridSize: 4,
  proxyPaths: {
    cold: 3,
    long: 130,
    liq: 128
  },
  blockExplorer: "https://explorer.plumenetwork.xyz/",
  displayName: "Plume",
};

const PLUME_CHAIN: ChainSpec = {
  nodeUrl: "https://rpc.plume.org",
  addrs: {
    dex: "0xAaAaAAAA81a99d2a05eE428eC7a1d8A3C2237D85",
    query: "0x62223e90605845Cf5CC6DAE6E0de4CDA130d6DDf",
    impact: "0xc2c301759B5e0C385a38e678014868A33E2F3ae3",
  },
  poolIndex: 420,
  isTestNet: false,
  chainId: "0x18232",
  gridSize: 4,
  proxyPaths: {
    cold: 3,
    long: 130,
    liq: 128
  },
  blockExplorer: "https://explorer.plume.org/",
  displayName: "Plume",
};

const BASE_SEPOLIA_CHAIN: ChainSpec = {
  nodeUrl: "https://sepolia.base.org",
  addrs: {
    dex: "0xD553d97EfD5faAB29Dc92CC87d5259ff59278176",
    query: "0x70a6a0C905af5737aD73Ceba4e6158e995031d4B",
    impact: "0x3108E20b0Da8b267DaA13f538964940C6eBaCCB2",
  },
  poolIndex: 36000,
  isTestNet: true,
  chainId: "0x14a34",
  gridSize: 1,
  proxyPaths: {
    cold: 3,
    long: 130,
    liq: 128
  },
  blockExplorer: "https://sepolia.basescan.org/",
  displayName: "Base Sepolia",
};


const SCROLL_CHAIN: ChainSpec = {
  nodeUrl: "https://rpc.scroll.io",
  addrs: {
    dex: "0xaaaaAAAACB71BF2C8CaE522EA5fa455571A74106",
    query: "0x62223e90605845Cf5CC6DAE6E0de4CDA130d6DDf",
    impact: "0xc2c301759B5e0C385a38e678014868A33E2F3ae3",
    router: "0xfB5f26851E03449A0403Ca945eBB4201415fd1fc",
    routerBypass: "0xED5535C6237f72BD9b4fDEAa3b6D8d9998b4C4e4",
  },
  poolIndex: 420,
  isTestNet: false,
  chainId: "0x82750",
  gridSize: 4,
  proxyPaths: {
    cold: 3,
    long: 130,
    liq: 128,
    dfltColdSwap: true
  },
  blockExplorer: "https://scrollscan.com/",
  displayName: "Scroll",
};

const MONAD_TESTNET_CHAIN: ChainSpec = {
  nodeUrl: "https://testnet-rpc.monad.xyz/",
  addrs: {
    dex: "0x88B96aF200c8a9c35442C8AC6cd3D22695AaE4F0",
    query: "0x1C74Dd2DF010657510715244DA10ba19D1F3D2B7",
    impact: "0x70a6a0C905af5737aD73Ceba4e6158e995031d4B",
    router: "0x3108E20b0Da8b267DaA13f538964940C6eBaCCB2",
    routerBypass: "0x8415bFC3b1ff76B804Ab8a6810a1810f9df32483",
  },
  poolIndex: 36000,
  isTestNet: true,
  chainId: "0x279f",
  gridSize: 1,
  proxyPaths: {
    cold: 3,
    long: 130,
    liq: 128,
    dfltColdSwap: true
  },
  blockExplorer: "https://testnet.monadexplorer.com/",
  displayName: "Monad Testnet",
};

export const CHAIN_SPECS: { [chainId: string]: ChainSpec } = {
  "0x1": MAINNET_CHAIN,
  "0xaa36a7": SEPOLIA_CHAIN,
  "0x8274f": SCROLL_SEPOLIA_CHAIN,
  "0x82750": SCROLL_CHAIN,
  "0xa0c71fd": BLAST_SEPOLIA_CHAIN,
  "0x13e31": BLAST_CHAIN,
  "0x784": SWELL_SEPOLIA_CHAIN,
  "0x783": SWELL_CHAIN,
  "0x14a34": BASE_SEPOLIA_CHAIN,
  "0x18231": PLUME_LEGACY_CHAIN,
  "0x18232": PLUME_CHAIN,
  "0x279f": MONAD_TESTNET_CHAIN,
  "sepolia": SEPOLIA_CHAIN,
  "ethereum": MAINNET_CHAIN,
  "mainnet": MAINNET_CHAIN,
  "scrolltest": SCROLL_SEPOLIA_CHAIN,
  "scroll": SCROLL_CHAIN,
  "scrollsepolia": SCROLL_SEPOLIA_CHAIN,
  "blast": BLAST_CHAIN,
  "blastSepolia": BLAST_SEPOLIA_CHAIN,
  "swellSepolia": SWELL_SEPOLIA_CHAIN,
  "baseSepolia": BASE_SEPOLIA_CHAIN,
  "swell": SWELL_CHAIN,
  "plume": PLUME_CHAIN,
  "plumeLegacy": PLUME_LEGACY_CHAIN,
  "zircuit": ZIRCUIT_CHAIN,
  "monadTestnet": MONAD_TESTNET_CHAIN
};
