import { ConnectArg, CrocContext, connectCroc } from './context';
import { CrocPoolView } from './pool';
import { AddressZero } from '@ethersproject/constants';
import { TokenQty, CrocTokenView } from './tokens';
import { CrocSwapPlan } from './swap';
import { Signer } from 'ethers';
import { CrocKnockoutHandle } from './knockout';

export class CrocEnv {
    constructor (conn: ConnectArg, signer?: Signer) {
        this.context = connectCroc(conn, signer)        
    }

    buy (token: string, qty: TokenQty): BuyPrefix {
        return new BuyPrefix(token, qty, this.context)
    }

    buyEth (qty: TokenQty): BuyPrefix {
        return new BuyPrefix(AddressZero, qty, this.context)
    }

    sell (token: string, qty: TokenQty): SellPrefix {
        return new SellPrefix(token, qty, this.context)
    }

    sellEth (qty: TokenQty): SellPrefix {
        return new SellPrefix(AddressZero, qty, this.context)
    }

    pool (tokenA: string, tokenB: string): CrocPoolView {
        return new CrocPoolView(tokenA, tokenB, this.context)
    }

    poolEth (token: string): CrocPoolView {
        return new CrocPoolView(token, AddressZero, this.context)
    }

    poolEthQuote (token: string): CrocPoolView {
        return new CrocPoolView(AddressZero, token, this.context)
    }

    token (token: string): CrocTokenView {
        return new CrocTokenView(this.context, token)
    }

    tokenEth(): CrocTokenView {
        return new CrocTokenView(this.context, AddressZero)
    }

    readonly context: Promise<CrocContext>
}

interface SwapArgs {
    slippage: number
}

const DFLT_SWAP_ARGS: SwapArgs = {
    slippage: 0.01
}

class BuyPrefix {
    constructor (token: string, qty: TokenQty, context: Promise<CrocContext>) {
        this.token = token
        this.qty = qty
        this.context = context
    }

    with (token: string, args: SwapArgs = DFLT_SWAP_ARGS): CrocSwapPlan {
        return new CrocSwapPlan(token, this.token, this.qty, true, args.slippage, this.context)
    }

    withEth (args: SwapArgs = DFLT_SWAP_ARGS): CrocSwapPlan {
        return this.with(AddressZero, args)
    }

    atLimit (token: string, tick: number): CrocKnockoutHandle {
        return new CrocKnockoutHandle(token, this.token, this.qty, false, tick, this.context)
    }

    readonly token: string
    readonly qty: TokenQty
    readonly context: Promise<CrocContext>
}

class SellPrefix {
    constructor (token: string, qty: TokenQty, context: Promise<CrocContext>) {
        this.token = token
        this.qty = qty
        this.context = context
    }

    for (token: string, args: SwapArgs = DFLT_SWAP_ARGS): CrocSwapPlan {
        return new CrocSwapPlan(this.token, token, this.qty, false, args.slippage, this.context)
    }

    forEth (args: SwapArgs = DFLT_SWAP_ARGS): CrocSwapPlan {
        return this.for(AddressZero, args)
    }

    atLimit (token: string, tick: number): CrocKnockoutHandle {
        return new CrocKnockoutHandle(this.token, token, this.qty, true, tick, this.context)
    }

    readonly token: string
    readonly qty: TokenQty
    readonly context: Promise<CrocContext>
}