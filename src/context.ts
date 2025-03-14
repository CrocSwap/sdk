import { Contract, ethers, JsonRpcProvider, Provider, Signer, ZeroAddress } from "ethers";
import { CROC_ABI, ERC20_ABI, QUERY_ABI } from "./abis";
import { ERC20_READ_ABI } from "./abis/erc20.read";
import { IMPACT_ABI } from "./abis/impact";
import { CHAIN_SPECS, ChainSpec } from "./constants";

export interface CrocContext {
  provider: Provider;
  actor: Provider | Signer;
  dex: Contract;
  router?: Contract;
  routerBypass?: Contract;
  query: Contract;
  slipQuery: Contract;
  erc20Read: Contract;
  erc20Write: Contract;
  chain: ChainSpec;
  senderAddr?: string
}

export type ChainIdentifier = number | string;
export type ConnectArg = Provider | Signer | ChainIdentifier;

export async function connectCroc(
  providerOrChainId: ConnectArg,
  signer?: Signer
): Promise<CrocContext> {
  const [provider, maybeSigner] = await buildProvider(providerOrChainId, signer);
  return setupProvider(provider, maybeSigner);
}

async function buildProvider(
  arg: ConnectArg,
  signer?: Signer
): Promise<[Provider, Signer | undefined]> {
  if (typeof arg === "number" || typeof arg == "string") {
    const context = lookupChain(arg);
    return buildProvider(new JsonRpcProvider(context.nodeUrl), signer);
  } else if ("getNetwork" in arg) {
    return [arg, signer];
  } else {
    const chainId = Number((await arg.provider?.getNetwork())?.chainId);
    return buildProvider(chainId, signer);
  }
}

async function setupProvider(
  provider: Provider,
  signer?: Signer
): Promise<CrocContext> {
  const actor = await determineActor(provider, signer);
  const chainId = await getChain(provider);
  let cntx = inflateContracts(chainId, provider, actor);
  return await attachSenderAddr(cntx, actor)
}

async function attachSenderAddr (cntx: CrocContext,
  actor: Provider | Signer): Promise<CrocContext> {
  if ('getAddress' in actor) {
    try {
      cntx.senderAddr = await actor.getAddress()
    } catch (e) {
      console.warn("Failed to get signer address:", e)
     }
  }
  return cntx
}

async function determineActor(
  provider: Provider,
  signer?: Signer
): Promise<Signer | Provider> {
  if (signer) {
    try {
      return signer.connect(provider)
    } catch {
      return signer
    }
  } else if ("getSigner" in provider) {
    try {
      let signer = await ((provider as ethers.JsonRpcProvider).getSigner());
      return signer
    } catch {
      return provider
    }
  } else {
    return provider;
  }
}

async function getChain(provider: Provider): Promise<number> {
  if ("chainId" in provider) {
    return (provider as any).chainId as number;
  } else if ("getNetwork" in provider) {
    return provider.getNetwork().then((n) => Number(n.chainId));
  } else {
    throw new Error("Invalid provider");
  }
}

function inflateContracts(
  chainId: number,
  provider: Provider,
  actor: Provider | Signer,
  addr?: string
): CrocContext {
  const context = lookupChain(chainId);
  return {
    provider: provider,
    actor: actor,
    dex: new Contract(context.addrs.dex, CROC_ABI, actor),
    router: context.addrs.router ? new Contract(context.addrs.router || ZeroAddress, CROC_ABI, actor) : undefined,
    routerBypass: context.addrs.routerBypass ? new Contract(context.addrs.routerBypass || ZeroAddress, CROC_ABI, actor) : undefined,
    query: new Contract(context.addrs.query, QUERY_ABI, provider),
    slipQuery: new Contract(context.addrs.impact, IMPACT_ABI, provider),
    erc20Write: new Contract(ZeroAddress, ERC20_ABI, actor),
    erc20Read: new Contract(ZeroAddress, ERC20_READ_ABI, provider),
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

export async function ensureChain(cntx: CrocContext) {
  const walletNetwork = await cntx.actor.provider?.getNetwork()
  if (!walletNetwork) {
      throw new Error('No network selected in the wallet')
  }
  const contextNetwork = cntx.chain
  if (walletNetwork.chainId !== BigInt(contextNetwork.chainId)) {
      throw new Error(`Wrong chain selected in the wallet: expected ${contextNetwork.displayName} (${contextNetwork.chainId}) but got ${walletNetwork.name} (0x${Number(walletNetwork.chainId).toString(16)})`)
  }
}
