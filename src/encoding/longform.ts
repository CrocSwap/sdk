import { encodeAbiParameters, concatBytes, ByteArray, toBytes, pad, Address } from "viem"

export class OrderDirective {

    constructor (openToken: Address) {
        this.open = simpleSettle(openToken)
        this.hops = []
    }

    encodeBytes(): ByteArray {
        const schema = encodeWord(LONG_FORM_SCHEMA_TYPE)
        const open = encodeSettlement(this.open)
        const hops = listEncoding(this.hops, encodeHop)
        return concatBytes([schema, open, hops])
    }

    appendHop (nextToken: Address): HopDirective {
        const hop = { settlement: simpleSettle(nextToken),
            pools: [],
            improve: { isEnabled: false, useBaseSide: false } }
        this.hops.push(hop)
        return hop
    }

    appendPool (poolIdx: number): PoolDirective {
        const pool = {
            poolIdx: BigInt(poolIdx),
            passive: {
                ambient: { isAdd: false, rollType: 0, liquidity: BigInt(0) },
                concentrated: []
            },
            swap: {
                isBuy: false,
                inBaseQty: false,
                rollType: 0,
                qty: BigInt(0),
                limitPrice: BigInt(0)
            },
            chain: { rollExit: false, swapDefer: false, offsetSurplus: false}
        };
        (this.hops.at(-1) as HopDirective).pools.push(pool)
        return pool
    }

    appendRangeMint (lowTick: number, highTick: number, liq: bigint): ConcentratedDirective {
        const range = { lowTick: lowTick, highTick: highTick,
            isRelTick: false,
            isAdd: true,
            rollType: 0,
            liquidity: liq < 0 ? -liq : BigInt(liq)}
        const pool = ((this.hops.at(-1) as HopDirective).pools.at(-1) as PoolDirective)
        pool.passive.concentrated.push(range)
        return range
    }

    appendAmbientMint (liq: bigint): AmbientDirective {
        const pool = ((this.hops.at(-1) as HopDirective).pools.at(-1) as PoolDirective)
        pool.passive.ambient = {
            isAdd: true,
            rollType: 0,
            liquidity: liq < 0 ? -liq : BigInt(liq)
        }
        return pool.passive.ambient
    }

    appendRangeBurn (lowTick: number, highTick: number, liq: bigint): ConcentratedDirective {
        const range = this.appendRangeMint(lowTick, highTick, liq)
        range.isAdd = false
        return range
    }

    open: SettlementDirective
    hops: HopDirective[]
}

const LONG_FORM_SCHEMA_TYPE = 1

function simpleSettle (token: Address): SettlementDirective {
    return { token: token, limitQty: BigInt(2) ** BigInt(125),
        dustThresh: BigInt(0), useSurplus: false }
}

export interface OrderDirective {
    open: SettlementDirective
    hops: HopDirective[]
}

export interface SettlementDirective {
    token: Address
    limitQty: bigint,
    dustThresh: bigint,
    useSurplus: boolean
}

export interface ImproveDirective {
    isEnabled: boolean,
    useBaseSide: boolean
}

export interface ChainingDirective {
    rollExit: boolean,
    swapDefer: boolean,
    offsetSurplus: boolean
}

export interface HopDirective {
    pools: PoolDirective[]
    settlement: SettlementDirective
    improve: ImproveDirective
}

export interface PoolDirective {
    poolIdx: bigint
    passive: PassiveDirective,
    swap: SwapDirective
    chain: ChainingDirective
}

export interface SwapDirective {
    isBuy: boolean,
    inBaseQty: boolean,
    qty: bigint,
    rollType?: number,
    limitPrice: bigint
}

export interface PassiveDirective {
    ambient: AmbientDirective
    concentrated: ConcentratedDirective[]
}

export interface AmbientDirective {
    isAdd: boolean,
    rollType?: number,
    liquidity: bigint
}

export interface ConcentratedDirective {
    lowTick: number,
    highTick: number,
    isRelTick: boolean,
    isAdd: boolean,
    rollType?: number,
    liquidity: bigint
}


function encodeSettlement (dir: SettlementDirective): ByteArray {
    const token = encodeToken(dir.token)
    const limit = encodeSigned(dir.limitQty)
    const dust = encodeFull(dir.dustThresh)
    const reserveFlag = encodeWord(dir.useSurplus ? 1 : 0)
    return concatBytes([token, limit, dust, reserveFlag])
}

function encodeHop (hop: HopDirective): ByteArray {
    const pools = listEncoding(hop.pools, encodePool)
    const settle = encodeSettlement(hop.settlement)
    const improve = encodeImprove(hop.improve)
    return concatBytes([pools, settle, improve])
}

function encodeImprove (improve: ImproveDirective): ByteArray {
    return toBytes(encodeAbiParameters([{type: "bool"}, {type: "bool"}], [improve.isEnabled, improve.useBaseSide]))
}

function encodeChain (chain: ChainingDirective): ByteArray {
    return toBytes(encodeAbiParameters([{type: "bool"}, {type: "bool"}, {type: "bool"}], [chain.rollExit, chain.swapDefer, chain.offsetSurplus]))
}

function encodePool (pool: PoolDirective): ByteArray {
    const poolIdx = encodeFull(pool.poolIdx)
    const passive = encodePassive(pool.passive)
    const swap = encodeSwap(pool.swap)
    const chain = encodeChain(pool.chain)
    return concatBytes([poolIdx, passive, swap, chain])
}

function encodeSwap (swap: SwapDirective): ByteArray {
    // return toBytes(encodeAbiParameters(["bool", "bool", "uint8", "uint128", "uint128"],
    return toBytes(encodeAbiParameters([{type: "bool", name: "isBuy"},
        {type: "bool", name: "inBaseQty"},
        {type: "uint8", name: "rollType"},
        {type: "uint128", name: "qty"},
        {type: "uint128", name: "limitPrice"}],
        [swap.isBuy, swap.inBaseQty, swap.rollType ? swap.rollType : 0, swap.qty, swap.limitPrice]))
}

function encodePassive (passive: PassiveDirective): ByteArray {
    const ambAdd = encodeBool(passive.ambient.isAdd)
    const rollType = encodeWord(passive.ambient.rollType ? passive.ambient.rollType : 0)
    const ambLiq = encodeFull(passive.ambient.liquidity)
    const conc = listEncoding(passive.concentrated, encodeConc)
    return concatBytes([ambAdd, rollType, ambLiq, conc])
}

function encodeConc (conc: ConcentratedDirective): ByteArray {
    const openTick = encodeJsSigned(conc.lowTick)
    const closeTick = encodeJsSigned(conc.highTick)
    const isRelTick = encodeBool(conc.isRelTick)
    const isAdd = encodeBool(conc.isAdd)
    const rollType = encodeWord(conc.rollType ? conc.rollType : 0)
    const liq = encodeFull(conc.liquidity)
    return concatBytes([openTick, closeTick, isRelTick, isAdd, rollType, liq])
}

function listEncoding<T> (elems: T[], encoderFn: (x: T) => ByteArray): ByteArray {
    const count = encodeWord(elems.length)
    const vals = elems.map(encoderFn)
    return concatBytes([count].concat(vals))
}

function encodeToken (tokenAddr: Address): ByteArray {
    return toBytes(pad(tokenAddr, {size: 32}))
}

function encodeFull (val: bigint): ByteArray {
    return toBytes(encodeAbiParameters([{type: "uint256"}], [val]));
}

function encodeSigned (val: bigint): ByteArray {
    return toBytes(encodeAbiParameters([{type: "int256"}], [val]));
}

function encodeJsNum (val: number): ByteArray {
    return encodeFull(BigInt(val))
}

function encodeJsSigned (val: number): ByteArray {
    return encodeSigned(BigInt(val))
}

function encodeWord (val: number): ByteArray {
    return encodeJsNum(val)
}

function encodeBool (flag: boolean): ByteArray {
    return encodeWord(flag ? 1 : 0)
}

