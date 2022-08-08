import { Provider, JsonRpcProvider } from "@ethersproject/providers";
import { Contract, ethers, Signer } from "ethers";
import { ChainSpec, CHAIN_SPECS } from "./constants";
import { CROC_ABI, QUERY_ABI, ERC20_ABI } from "./abis";
import { AddressZero } from "@ethersproject/constants";

export interface CrocContext {
  provider: Provider;
  dex: Contract;
  query: Contract;
  erc20: Contract;
  chain: ChainSpec;
}

export type ChainIdentifier = number | string;
export type ConnectArg = Provider | Signer | ChainIdentifier;

export async function connectCroc(
  providerOrChainId: ConnectArg,
  signer?: Signer
): Promise<CrocContext> {
  let [provider, maybeSigner] = await buildProvider(providerOrChainId, signer);
  return setupProvider(provider, maybeSigner);
}

async function buildProvider(
  arg: ConnectArg,
  signer?: Signer
): Promise<[Provider, Signer | undefined]> {
  if (typeof arg === "number" || typeof arg == "string") {
    let context = lookupChain(arg);
    return buildProvider(new JsonRpcProvider(context.nodeUrl), signer);
  } else if ("getNetwork" in arg) {
    return [arg, signer];
  } else {
    let chainId = await arg.getChainId();
    return buildProvider(chainId, signer);
  }
}

async function setupProvider(
  provider: Provider,
  signer?: Signer
): Promise<CrocContext> {
  let actor = determineActor(provider, signer);
  let chainId = await getChain(provider);
  return inflateContracts(chainId, provider, actor);
}

function determineActor(
  provider: Provider,
  signer?: Signer
): Signer | Provider {
  if (signer) {
    return signer.connect(provider);
  } else if ("getSigner" in provider) {
    return (provider as ethers.providers.Web3Provider).getSigner(
      "0x946FDB6AF17EC1497975D0BB5C915A5D38BA327A"
    ); //arbitrary account
  } else {
    return provider;
  }
}

async function getChain(provider: Provider): Promise<number> {
  if ("chainId" in provider) {
    return (provider as any).chainId as number;
  } else if ("getNetwork" in provider) {
    return provider.getNetwork().then((n) => n.chainId);
  } else {
    throw new Error("Invalid provider");
  }
}

function inflateContracts(
  chainId: number,
  provider: Provider,
  actor: Provider | Signer
): CrocContext {
  let context = lookupChain(chainId);
  return {
    provider: provider,
    dex: new Contract(context.dexAddr, CROC_ABI, actor),
    query: new Contract(context.queryAddr, QUERY_ABI, actor),
    erc20: new Contract(AddressZero, ERC20_ABI, actor),
    chain: context,
  };
}

export function lookupChain(chainId: number | string): ChainSpec {
  if (typeof chainId === "number") {
    return lookupChain("0x" + chainId.toString(16));
  } else {
    let context = CHAIN_SPECS[chainId];
    if (!context) {
      throw new Error("Unsupported chain ID: " + chainId);
    }
    return context;
  }
}
