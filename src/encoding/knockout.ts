import { encodeAbiParameters } from "viem";

export class KnockoutEncoder {
    constructor(base: string, quote: string, poolIdx: number) {
        this.base = base;
        this.quote = quote;
        this.poolIdx = poolIdx;
    }

    private base: string;
    private quote: string;
    private poolIdx: number;

    encodeKnockoutMint (qty: bigint, lowerTick:number, upperTick: number,
        isBid: boolean, useSurplusFlags: number): string {
        const MINT_SUBCMD = 91
        const suppArgs = encodeAbiParameters([{type: "uint128", name: "qty"}, {type: "bool", name: "insideMid"}], [qty, false])
        return this.encodeCommonArgs(MINT_SUBCMD, lowerTick, upperTick, isBid, useSurplusFlags, suppArgs)
    }

    encodeKnockoutBurnQty (qty: bigint, lowerTick:number, upperTick: number,
        isBid: boolean, useSurplusFlags: number): string {
        const BURN_SUBCMD = 92
        const suppArgs = encodeAbiParameters([{type: "uint128", name: "qty"}, {type: "bool", name: "inLiqQty"}, {type: "bool", name: "insideMid"}], [qty, false, false])
        return this.encodeCommonArgs(BURN_SUBCMD, lowerTick, upperTick, isBid, useSurplusFlags, suppArgs)
    }

    encodeKnockoutBurnLiq (liq: bigint, lowerTick:number, upperTick: number,
        isBid: boolean, useSurplusFlags: number): string {
        const BURN_SUBCMD = 92
        const suppArgs = encodeAbiParameters([{type: "uint128", name: "qty"}, {type: "bool", name: "inLiqQty"}, {type: "bool", name: "insideMid"}], [liq, true, true])
        return this.encodeCommonArgs(BURN_SUBCMD, lowerTick, upperTick, isBid, useSurplusFlags, suppArgs)
    }

    encodeKnockoutRecover (pivotTime: number, lowerTick:number, upperTick: number,
        isBid: boolean, useSurplusFlags: number): string {
        const BURN_SUBCMD = 94
        const suppArgs = encodeAbiParameters([{type: "uint32", name: "pivotTime"}], [pivotTime])
        return this.encodeCommonArgs(BURN_SUBCMD, lowerTick, upperTick, isBid, useSurplusFlags, suppArgs)
    }

    private encodeCommonArgs (subcmd: number, lowerTick:number, upperTick: number,
        isBid: boolean, useSurplusFlags: number, suppArgs: string): string {
        return encodeAbiParameters(KNOCKOUT_ARG_TYPES,
            [subcmd, this.base, this.quote, this.poolIdx,
                lowerTick, upperTick, isBid,
                useSurplusFlags, suppArgs])
    }
}

const KNOCKOUT_ARG_TYPES = [
    {type: "uint8", name: "subCmd"},
    {type: "address", name: "baseToken"},
    {type: "address", name: "quoteToken"},
    {type: "uint24", name: "poolIdx"},
    {type: "int24", name: "lowerTick"},
    {type: "int24", name: "upperTick"},
    {type: "bool", name: "isBid"},
    {type: "uint8", name: "reserveFlags"},
    {type: "bytes", name: "suppArgs"},
  ];
