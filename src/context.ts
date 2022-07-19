import { Provider, JsonRpcProvider } from "@ethersproject/providers";
import { Contract, Signer, Wallet } from 'ethers';
import { CHAIN_CONTEXTS, ChainContext } from './constants';
import { CROC_ABI, QUERY_ABI, ERC20_ABI } from './abis';
import { AddressZero } from '@ethersproject/constants';

export interface CrocContext {
    provider: Provider,
    dex: Contract,
    query: Contract,
    erc20: Contract,
    poolIndex: number
}

export type ChainIdentifier = number
export type ConnectArg = Provider | Wallet | JsonRpcProvider | ChainIdentifier

export async function connectCroc (providerOrChainId: ConnectArg, signer?: Signer): Promise<CrocContext> {
    let [provider, actor] = buildProvider(providerOrChainId)
    return setupProvider(provider, actor, signer)
}

function buildProvider (arg: ConnectArg): [Provider, Provider | Signer] {
    if (typeof(arg) === "number") {
        let context = getContext(arg)
        return buildProvider(new JsonRpcProvider(context.nodeUrl))
    } else if ("provider" in arg) {
        return [arg.provider, arg]
    } else {
        return [arg, arg]
    }
}

async function setupProvider (provider: Provider, actor: Provider | Signer, 
    signer?: Signer): Promise<CrocContext> {
    if (signer) { 
        actor = signer.connect(provider)
    }
    
    let chainId = await getChain(provider)
    return inflateContracts(chainId, provider, actor)
}

function getChain (provider: Provider): Promise<number> {
    if (!("getNetwork" in provider)) { throw new Error("Invalid provider") }
    return provider.getNetwork().then(n => n.chainId)
}

function inflateContracts (chainId: number, provider: Provider, actor: Provider | Signer): CrocContext {
    let context = getContext(chainId)
    return { provider: provider, 
        dex: new Contract(context.dexAddr, CROC_ABI, actor),
        query: new Contract(context.queryAddr, QUERY_ABI, actor),
        erc20: new Contract(AddressZero, ERC20_ABI, actor),
        poolIndex: context.poolIndex
    }
}

function getContext (chainId: number): ChainContext {
    let context = CHAIN_CONTEXTS[chainId]
    if (!context) { throw new Error("Unsupported chain ID: " + chainId) }
    return context
}