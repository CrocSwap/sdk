import { BytesLike, BigNumber } from 'ethers';
import { baseTokenForConcLiq, quoteTokenForConcLiq, 
    baseVirtualReserves, quoteVirtualReserves } from './utils/liquidity';
import { isTradeWarmCall, decodeWarmPathCall } from './encoding/liquidity'
import { bigNumToFloat, fromFixedGrowth, floatToBigNum } from './utils/math';
import { tickToPrice } from './utils';
import { decodeCrocPrice } from './utils/price';
import { CrocContext } from './context';

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

export class CrocPositionView {
    constructor (context: Promise<CrocContext>) {
        this.context = context
    }

    readonly context: Promise<CrocContext>

    async queryPosAnchors (anchors: LPAnchor[]): Promise<LiqPos[]> {
        const posCandMap: Map<string, string[]> = new Map()
    
        anchors.forEach(a => { 
            let entry = posCandMap.get(a.pos)
            if (entry === undefined) {
                entry = []
                posCandMap.set(a.pos, entry)
            }
        entry.push(a.tx)
        })

        const lps = Array.from(posCandMap.entries()).map(async ([pos, txs],) => {
            for (let i = 0; i < txs.length; ++i) {
                const lp = this.queryPos(pos, txs[i])
                if ((await lp) !== undefined) { return lp }
            }
            return undefined
        })

        return (await Promise.all(lps))
            .filter(lp => lp !== undefined) as LiqPos[]
    }

    async queryPos (posHash: Hash, txHash: Hash): Promise<AmbientLiqPos | RangeLiqPos | undefined> {
        const claim = await this.queryClaim(posHash, txHash)
        if (claim === undefined) { 
            return undefined 
        } else if (claim.lpType === "ambient") {
            return this.joinAmbientPos(claim)
        } else {
            return this.joinConcPos(claim)
        }
    }

    private async joinConcPos (claim: RangeClaim): Promise<RangeLiqPos> {
        const curve = (await this.context).query.queryCurve
            (claim.baseToken, claim.quoteToken, claim.poolType);
        const price = decodeCrocPrice((await curve).priceRoot_)

        const lowerPrice = tickToPrice(claim.lowerTick)
        const upperPrice = tickToPrice(claim.upperTick)
        const baseQty = baseTokenForConcLiq(price, claim.concLiq, lowerPrice, upperPrice)
        const quoteQty = quoteTokenForConcLiq(price, claim.concLiq, lowerPrice, upperPrice)

        return Object.assign({ poolPrice: price, lowerPrice: lowerPrice, upperPrice: upperPrice,
            ambientLiq: BigNumber.from(0), baseQty: baseQty, quoteQty: quoteQty,
                accumBaseFees: BigNumber.from(0), accumQuoteFees: BigNumber.from(0)
        }, claim)
    }

    private async joinAmbientPos (claim: AmbientClaim): Promise<AmbientLiqPos> {
        const curve = (await this.context).query.queryCurve
            (claim.baseToken, claim.quoteToken, claim.poolType);
        const price = decodeCrocPrice(curve.priceRoot_)
        const ambiGrowth = fromFixedGrowth(curve.seedDeflator_)
        const liq = floatToBigNum(bigNumToFloat(claim.ambientSeeds) * ambiGrowth)
        return Object.assign({ poolPrice: price,
            ambientLiq: liq, baseQty: baseVirtualReserves(price, liq), 
            quoteQty: quoteVirtualReserves(price, liq),
            accumBaseFees: BigNumber.from(0), accumQuoteFees: BigNumber.from(0)
        }, claim)
    }


    private async queryClaim (posHash: Hash, txHash: Hash): Promise<AmbientClaim | RangeClaim | undefined> {
        const txn = await (await this.context).provider.getTransaction(txHash)
        if (!txn) { return undefined }

        const callData = txn.data
        if (!isTradeWarmCall(callData)) { return undefined }
        const args = decodeWarmPathCall(callData)
        const slot = (await this.context).provider.getStorageAt(
            (await this.context).dex.address, posHash)

        if (args.isAmbient) {
            const seeds = this.extractAmbientSeeds(await slot)
            return { lpType: "ambient", owner: txn.from,
                baseToken: args.base, quoteToken: args.quote,
                poolType: args.poolIdx, ambientSeeds: seeds }

        } else {
            const liq = this.extractConcLiq(await slot)
            const mileage = this.extractFeeMileage(await slot)
            return { lpType: "range", owner: txn.from,
                baseToken: args.base, quoteToken: args.quote, poolType: args.poolIdx, 
                lowerTick: args.lowerTick, upperTick: args.upperTick,
                concLiq: liq, feeMileage: mileage }
        }
    }

    private extractAmbientSeeds (stored: BytesLike): BigNumber {
        const val = BigNumber.from(stored)
        const bitmask = BigNumber.from(2).pow(128).sub(1)
        return val.and(bitmask)
    }

    private extractConcLiq (stored: BytesLike): BigNumber {
        const val = BigNumber.from(stored)
        const bitmask = BigNumber.from(2).pow(128).sub(1)
        return val.and(bitmask)
    }

    private extractFeeMileage (stored: BytesLike): number {
        const val = BigNumber.from(stored)
        const constPoint = val.shr(128)
        const bitmask = BigNumber.from(2).pow(64).sub(1)
        return bigNumToFloat(constPoint.and(bitmask)) / (2 ** 48)
    }
}
