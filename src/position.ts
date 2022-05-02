import { POOL_PRIMARY, contractAddresses } from "./constants";
import { BytesLike, ethers, BigNumber, Contract } from 'ethers';
import { JsonRpcProvider } from '@ethersproject/providers';
import { isTradeWarmCall, decodeWarmPathCall, baseTokenForConcLiq, quoteTokenForConcLiq, baseVirtualReserves, quoteVirtualReserves } from './liquidity';
import { bigNumToFloat, fromFixedGrowth, floatToBigNum } from './utils/math';
import { tickToPrice } from './utils';
import { decodeCrocPrice } from './utils/price';
import { QUERY_ABI } from './abis/query';

export interface AmbientClaim {  
    owner: string,
    baseToken: string,
    quoteToken: string,
    poolType: number,
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

export type AmbientLiqPos = AmbientClaim & {
    poolPrice: number,
    ambientLiq: BigNumber,
    baseQty: BigNumber,
    quoteQty: BigNumber,
    accumBaseFees: BigNumber,
    accumQuoteFees: BigNumber
}

export type RangeLiqPos = RangeClaim & {
    poolPrice: number,
    lowerPrice: number,
    upperPrice: number,
    ambientLiq: BigNumber,
    baseQty: BigNumber,
    quoteQty: BigNumber,
    accumBaseFees: BigNumber,
    accumQuoteFees: BigNumber
}

export type LiqPos = AmbientLiqPos | RangeLiqPos

type Hash = string

export interface LPAnchor {
    tx: string,
    pos: string
}

export async function queryPosAnchors (anchors: LPAnchor[], provider: JsonRpcProvider): 
    Promise<LiqPos[]> {
    let posCandMap: Map<string, string[]> = new Map()
    
    anchors.forEach(a => { 
        let entry = posCandMap.get(a.pos)
        if (entry === undefined) {
            entry = new Array()
            posCandMap.set(a.pos, entry)
        }
        entry.push(a.tx)
    })

    let lps = Array.from(posCandMap.entries()).map(async ([pos, txs],) => {
        for (let i = 0; i < txs.length; ++i) {
            let lp = queryPos(pos, txs[i], provider)
            if ((await lp) !== undefined) { return lp }
        }
        return undefined
    })

    return (await Promise.all(lps))
        .filter(lp => lp !== undefined) as LiqPos[]
}

export async function queryPos (posHash: Hash, txHash: Hash, provider: JsonRpcProvider):
    Promise<AmbientLiqPos | RangeLiqPos | undefined> {
    let claim = await queryClaim(posHash, txHash, provider)
    if (claim === undefined) { 
        return undefined 
    } else if (claim.lpType === "ambient") {
        return joinAmbientPos(claim, provider)
    } else {
        return joinConcPos(claim, provider)
    }
}

async function joinConcPos (claim: RangeClaim, provider: JsonRpcProvider): Promise<RangeLiqPos> {
    let queryContract = new Contract(contractAddresses.QUERY_ADDR, QUERY_ABI, provider)
    let curve = queryContract.queryCurve(claim.baseToken, claim.quoteToken, claim.poolType);
    let price = decodeCrocPrice((await curve).priceRoot_)

    let lowerPrice = tickToPrice(claim.lowerTick)
    let upperPrice = tickToPrice(claim.upperTick)
    const baseQty = baseTokenForConcLiq(price, claim.concLiq, lowerPrice, upperPrice)
    const quoteQty = quoteTokenForConcLiq(price, claim.concLiq, lowerPrice, upperPrice)

    return Object.assign({ poolPrice: price, lowerPrice: lowerPrice, upperPrice: upperPrice,
        ambientLiq: BigNumber.from(0), baseQty: baseQty, quoteQty: quoteQty,
        accumBaseFees: BigNumber.from(0), accumQuoteFees: BigNumber.from(0)
    }, claim)
}

async function joinAmbientPos (claim: AmbientClaim, provider: JsonRpcProvider): Promise<AmbientLiqPos> {
    let queryContract = new Contract(contractAddresses.QUERY_ADDR, QUERY_ABI, provider)
    let curve = await queryContract.queryCurve(claim.baseToken, claim.quoteToken, claim.poolType);
    let price = decodeCrocPrice(curve.priceRoot_)
    let ambiGrowth = fromFixedGrowth(curve.seedDeflator_)
    let liq = floatToBigNum(bigNumToFloat(claim.ambientSeeds) * ambiGrowth)
    return Object.assign({ poolPrice: price,
        ambientLiq: liq, baseQty: baseVirtualReserves(price, liq), 
        quoteQty: quoteVirtualReserves(price, liq),
        accumBaseFees: BigNumber.from(0), accumQuoteFees: BigNumber.from(0)
    }, claim)
}


export async function queryClaim (posHash: Hash, txHash: Hash, provider: JsonRpcProvider): 
    Promise<AmbientClaim | RangeClaim | undefined> {
    const txn = await provider.getTransaction(txHash)
    if (!txn) { return undefined }

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
        
    const posKey = ethers.utils.solidityKeccak256(["address", "bytes32"], [owner, poolHash])
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

    const posKey = ethers.utils.solidityKeccak256(["address", "bytes32", "int24", "int24"], 
        [owner, poolHash, lowerTick, upperTick])
    return ethers.utils.solidityKeccak256(["bytes32", "uint256"], 
        [posKey, CONC_POS_SLOT])
}

// Based on the slots of the current contract layout
const AMBIENT_POS_SLOT = 65550
const CONC_POS_SLOT = 65549
