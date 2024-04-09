import { WalletClient, PublicClient, getContract, Address, createPublicClient, http } from "viem";
import { ChainSpec, CHAIN_SPECS } from "./constants";
import { CROC_ABI, QUERY_ABI } from "./abis";
import { IMPACT_ABI } from "./abis/impact";

export interface CrocContext {
  publicClient: PublicClient;
  walletClient?: WalletClient;
  dex: any;
  router?: any;
  routerBypass?: any;
  query: any;
  slipQuery: any;
  // erc20Read: any;
  // erc20Write: any;
  chain: ChainSpec;
  senderAddr?: string
}

export type ChainIdentifier = number | string;
export type ConnectArg = PublicClient | ChainIdentifier;

export async function connectCroc(
  providerOrChainId: ConnectArg,
  signer?: WalletClient
): Promise<CrocContext> {
  const [provider, maybeWalletClient] = await buildPublicClient(providerOrChainId, signer);
  return setupPublicClient(provider, maybeWalletClient);
}

async function buildPublicClient(
  arg: ConnectArg,
  signer?: WalletClient
): Promise<any> { // TODO: fix any
  if (typeof arg === "number" || typeof arg == "string") {
    const context = lookupChain(arg);
    // console.warn("crocsdk is creating a public client from scratch")
    const p = createPublicClient({
      chain: context.viemChain,
      transport: http(context.nodeUrl),
      batch: {
          multicall: true,
      }
    });
    return [p, signer]
  } else if ("estimateGas" in arg) {
    return [arg, signer];
  }
}

async function setupPublicClient(
  publicClient: PublicClient,
  walletClient?: WalletClient
): Promise<CrocContext> {
  // const actor = determineActor(provider, signer);
  const chainId = await getChain(publicClient);
  const cntx = inflateContracts(chainId, publicClient, walletClient);
  cntx.senderAddr = walletClient?.account?.address
  // return await attachSenderAddr(cntx, actor)
  return cntx
}

// async function attachSenderAddr (cntx: CrocContext,
//   actor: PublicClient | WalletClient): Promise<CrocContext> {
//   try {
//     cntx.senderAddr = (actor.account?.address)
//   } catch (e) { }
//   return cntx
// }

// function determineActor(
//   provider: PublicClient,
//   signer?: WalletClient
// ): WalletClient | PublicClient {
//   if (signer) {
//     try {
//       return signer.connect(provider)
//     } catch {
//       return signer
//     }
//   } else if ("getWalletClient" in provider) {
//     try {
//       let signer = (provider as ethers.providers.Web3PublicClient).getWalletClient();
//       return signer
//     } catch {
//       return provider
//     }
//   } else {
//     return provider;
//   }
// }

// TODO: types here
async function getChain(provider: PublicClient): Promise<number> {
  if ("chainId" in provider) {
    return (provider as any).chainId as number;
  } else if ("chain" in provider) {
    return provider.chain?.id as number;
  } else {
    throw new Error("Invalid provider");
  }
}

function inflateContracts(
  chainId: number,
  publicClient: PublicClient,
  walletClient?: WalletClient,
  addr?: string
): CrocContext {
  const context = lookupChain(chainId);
  const actor = walletClient ? walletClient : publicClient;
  return {
    publicClient,
    walletClient,
    dex: getContract({address: context.addrs.dex as Address, abi: CROC_ABI, client: actor}),
    router: context.addrs.router ? getContract({address: context.addrs.router as Address, abi: CROC_ABI, client: actor}): undefined,
    routerBypass: context.addrs.routerBypass ? getContract({address: context.addrs.routerBypass as Address, abi: CROC_ABI, client: actor}) : undefined,
    query: getContract({address: context.addrs.query as Address, abi: QUERY_ABI, client: actor}),
    slipQuery: getContract({address: context.addrs.impact as Address, abi: IMPACT_ABI, client: actor}),
    // erc20Write: getContract({address: AddressZero as Address, abi: ERC20_ABI, client: actor}),
    // erc20Read: getContract({address: AddressZero as Address, abi: ERC20_READ_ABI, client: actor}),
    chain: context,
    senderAddr: addr
  };
}

export function lookupChain(chainId: number | string): ChainSpec {
  if (typeof chainId === "number") {
    return lookupChain("0x" + chainId.toString(16));
  } else {
    const context = CHAIN_SPECS[chainId.toLowerCase()];
    if (!context) {
      throw new Error("Unsupported chain ID: " + chainId);
    }
    return context;
  }
}
