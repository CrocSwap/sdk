import { BytesLike, ethers } from 'ethers';

export class OrderDirective {

    constructor (openToken: string) {
        this.open = simpleSettle(openToken)
        this.hops = []
    }

    encodeBytes(): BytesLike {
        let schema = encodeWord(LONG_FORM_SCHEMA_TYPE)
        let open = encodeSettlement(this.open)
        let hops = listEncoding(this.hops, encodeHop)
        return ethers.concat([schema, open, hops])
    }

    appendHop (nextToken: string): HopDirective {
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
            liquidity: liq < 0 ? -liq : liq}
        const pool = ((this.hops.at(-1) as HopDirective).pools.at(-1) as PoolDirective)
        pool.passive.concentrated.push(range)
        return range
    }

    appendAmbientMint (liq: bigint): AmbientDirective {
        const pool = ((this.hops.at(-1) as HopDirective).pools.at(-1) as PoolDirective)
        pool.passive.ambient = {
            isAdd: true,
            rollType: 0,
            liquidity: liq < 0 ? -liq : liq
        }
        return pool.passive.ambient
    }

    appendRangeBurn (lowTick: number, highTick: number, liq: bigint): ConcentratedDirective {
        let range = this.appendRangeMint(lowTick, highTick, liq)
        range.isAdd = false
        return range
    }

    open: SettlementDirective
    hops: HopDirective[]
}

const LONG_FORM_SCHEMA_TYPE = 1

function simpleSettle (token: string): SettlementDirective {
    return { token: token, limitQty: BigInt(2) ** BigInt(125),
        dustThresh: BigInt(0), useSurplus: false }
}

export interface OrderDirective {
    open: SettlementDirective
    hops: HopDirective[]
}

export interface SettlementDirective {
    token: string
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


function encodeSettlement (dir: SettlementDirective): BytesLike {
    let token = encodeToken(dir.token)
    let limit = encodeSigned(dir.limitQty)
    let dust = encodeFull(dir.dustThresh)
    let reserveFlag = encodeWord(dir.useSurplus ? 1 : 0)
    return ethers.concat([token, limit, dust, reserveFlag])
}

function encodeHop (hop: HopDirective): BytesLike {
    let pools = listEncoding(hop.pools, encodePool)
    let settle = encodeSettlement(hop.settlement)
    let improve = encodeImprove(hop.improve)
    return ethers.concat([pools, settle, improve])
}

function encodeImprove (improve: ImproveDirective): BytesLike {
    let abiCoder = new ethers.AbiCoder()
    return abiCoder.encode(["bool", "bool"], [improve.isEnabled, improve.useBaseSide])
}

function encodeChain (chain: ChainingDirective): BytesLike {
    let abiCoder = new ethers.AbiCoder()
    return abiCoder.encode(["bool", "bool", "bool"], [chain.rollExit, chain.swapDefer, chain.offsetSurplus])
}

function encodePool (pool: PoolDirective): BytesLike {
    let poolIdx = encodeFull(pool.poolIdx)
    let passive = encodePassive(pool.passive)
    let swap = encodeSwap(pool.swap)
    let chain = encodeChain(pool.chain)
    return ethers.concat([poolIdx, passive, swap, chain])
}

function encodeSwap (swap: SwapDirective): BytesLike {
    let abiCoder = new ethers.AbiCoder()
    return abiCoder.encode(["bool", "bool", "uint8", "uint128", "uint128"],
        [swap.isBuy, swap.inBaseQty, swap.rollType ? swap.rollType : 0, swap.qty, swap.limitPrice])
}

function encodePassive (passive: PassiveDirective): BytesLike {
    let ambAdd = encodeBool(passive.ambient.isAdd)
    let rollType = encodeWord(passive.ambient.rollType ? passive.ambient.rollType : 0)
    let ambLiq = encodeFull(passive.ambient.liquidity)
    let conc = listEncoding(passive.concentrated, encodeConc)
    return ethers.concat([ambAdd, rollType, ambLiq, conc])
}

function encodeConc (conc: ConcentratedDirective): BytesLike {
    let openTick = encodeJsSigned(conc.lowTick)
    let closeTick = encodeJsSigned(conc.highTick)
    let isRelTick = encodeBool(conc.isRelTick)
    let isAdd = encodeBool(conc.isAdd)
    let rollType = encodeWord(conc.rollType ? conc.rollType : 0)
    let liq = encodeFull(conc.liquidity)
    return ethers.concat([openTick, closeTick, isRelTick, isAdd, rollType, liq])
}

function listEncoding<T> (elems: T[], encoderFn: (x: T) => BytesLike): BytesLike {
    let count = encodeWord(elems.length)
    let vals = elems.map(encoderFn)
    return ethers.concat([count].concat(vals))
}

function encodeToken (tokenAddr: BytesLike): BytesLike {
    return ethers.zeroPadValue(tokenAddr, 32)
}

function encodeFull (val: bigint): BytesLike {
    let abiCoder = new ethers.AbiCoder()
    return abiCoder.encode(["uint256"], [val]);
}

function encodeSigned (val: bigint): BytesLike {
    let abiCoder = new ethers.AbiCoder()
    return abiCoder.encode(["int256"], [val]);
}

function encodeJsNum (val: number): BytesLike {
    return encodeFull(BigInt(val))
}

function encodeJsSigned (val: number): BytesLike {
    return encodeSigned(BigInt(val))
}

function encodeWord (val: number): BytesLike {
    return encodeJsNum(val)
}

function encodeBool (flag: boolean): BytesLike {
    return encodeWord(flag ? 1 : 0)
}

