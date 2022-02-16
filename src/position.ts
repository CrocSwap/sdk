import { POOL_PRIMARY, contractAddresses } from "./constants";
import { BytesLike, ethers, BigNumber } from 'ethers';
import { JsonRpcProvider } from '@ethersproject/providers';
import { isTradeWarmCall, decodeWarmPathCall } from './liquidity';
import { bigNumToFloat } from './utils/math';

export interface AmbientClaim {  
    owner: string,
    baseToken: string,
    quoteToken: string,
    poolType: number
    ambientSeeds: BigNumber
    lpType: "ambient"
}

export interface RangeClaim {  
    owner: string,
    baseToken: string,
    quoteToken: string,
    poolType: number,
    lowerTick: number,
    upperTick: number,
    concLiq: BigNumber,
    feeMileage: number,
    lpType: "range"
}

type Hash = string

export async function queryClaim (posHash: Hash, txHash: Hash, provider: JsonRpcProvider): 
    Promise<AmbientClaim | RangeClaim | undefined> {
    const txn = await provider.getTransaction(txHash)
    const callData = txn.data
    if (!isTradeWarmCall(callData)) { return undefined }
    let args = decodeWarmPathCall(callData)
    let slot = provider.getStorageAt(contractAddresses.CROC_SWAP_ADDR, posHash)

    if (args.isAmbient) {
        const seeds = extractAmbientSeeds(await slot)
        return { lpType: "ambient", owner: txn.from,
            baseToken: args.base, quoteToken: args.quote,
            poolType: args.poolIdx, ambientSeeds: seeds }

    } else {
        const liq = extractConcLiq(await slot)
        const mileage = extractFeeMileage(await slot)
        return { lpType: "range", owner: txn.from,
            baseToken: args.base, quoteToken: args.quote, poolType: args.poolIdx, 
            lowerTick: args.lowerTick, upperTick: args.upperTick,
            concLiq: liq, feeMileage: mileage }
    }
}

function extractAmbientSeeds (stored: BytesLike): BigNumber {
    let val = BigNumber.from(stored)
    const bitmask = BigNumber.from(2).pow(128).sub(1)
    return val.and(bitmask)
}

function extractConcLiq (stored: BytesLike): BigNumber {
    let val = BigNumber.from(stored)
    const bitmask = BigNumber.from(2).pow(128).sub(1)
    return val.and(bitmask)
}

function extractFeeMileage (stored: BytesLike): number {
    let val = BigNumber.from(stored)
    const constPoint = val.shr(128)
    const bitmask = BigNumber.from(2).pow(64).sub(1)
    return bigNumToFloat(constPoint.and(bitmask)) / (2 ** 48)
}

/* Determines the EVM storage slot for a given ambient liquidity postion. Can be used
 * to uniquely identify LP positions.
 * 
 * @param owner The owner of the ambient LP (usually msg.sender)
 * @param base The address of the base token in the pool
 * @param quote The address of the quote token in the pool
 * @param poolType The pool type index number
 * @return The EVM slot hash that the position is stored at in the contract.  */
export function ambientPosSlot (owner: string,  base: string, quote: string,
    poolType: number = POOL_PRIMARY): BytesLike {
    const encoder = new ethers.utils.AbiCoder()
    const poolHash = ethers.utils.keccak256(encoder.encode
        (["address", "address", "uint256"], [base, quote, poolType]))
        
    const posKey = ethers.utils.keccak256(encoder.encode(["address", "bytes32"], [owner, poolHash]))
    return ethers.utils.solidityKeccak256(["bytes32", "uint256"], [posKey, AMBIENT_POS_SLOT])
}

/* Determines the EVM storage slot for a given ambient liquidity postion. Can be used
 * to uniquely identify LP positions.
 * 
 * @param owner The owner of the ambient LP (usually msg.sender)
 * @param base The address of the base token in the pool
 * @param quote The address of the quote token in the pool
 * @param poolType The pool type index number
 * @return The EVM slot hash that the position is stored at in the contract.  */
export function concPosSlot (owner: string,  base: string, quote: string, 
    lowerTick: number, upperTick: number,
    poolType: number = POOL_PRIMARY): BytesLike {
    const encoder = new ethers.utils.AbiCoder()
    const poolHash = ethers.utils.keccak256(encoder.encode
        (["address", "address", "uint256"], [base, quote, poolType]))

    const addrBytes = encoder.encode(["address"], [owner])
    const posKey = ethers.utils.solidityKeccak256(["bytes32", "bytes32", "int24", "int24"], 
        [addrBytes, poolHash, lowerTick, upperTick])
    return ethers.utils.solidityKeccak256(["bytes32", "uint256"], 
        [posKey, CONC_POS_SLOT])
}

// Based on the slots of the current contract layout
const AMBIENT_POS_SLOT = 14
const CONC_POS_SLOT = 13
