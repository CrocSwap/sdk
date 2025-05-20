import { Contract, Signer, TransactionResponse, Typed } from "ethers";
import { TEMPEST_VAULT_ABI } from "../abis/external/TempestVaultAbi";
import { CrocContext, ensureChain } from "../context";
import { CrocTokenView, TokenQty } from "../tokens";

export type TempestStrategy = 'rswEth' | 'symetricAmbient'

/* @notice Class for interacting with a specific Tempest pair vault. */
export class TempestVault {
    constructor (vaultToken: CrocTokenView, token1: CrocTokenView, strategy: TempestStrategy, context: Promise<CrocContext>) {
        this.vaultAddr = vaultToken.tokenAddr
        this.token1 = token1
        this.vaultToken = vaultToken
        this.strategy = strategy
        this.vaultWrite = context.then(c => new Contract(this.vaultAddr, TEMPEST_VAULT_ABI, c.actor));
        this.vaultRead = context.then(c => new Contract(this.vaultAddr, TEMPEST_VAULT_ABI, c.provider));
        this.context = context
    }

    /* @notice Sends a transaction to zap and deposit token1 into the vault
     * @param qty The quantity of token1 to deposit */
    async depositZap (qty: TokenQty): Promise<TransactionResponse> {
        let owner = ((await this.context).actor as Signer).getAddress()
        let weiQty = this.token1.normQty(qty);
        let txArgs = {};
        if (this.token1.isNativeEth) {
            txArgs = { value: await weiQty };
        }
        await ensureChain(await this.context)
        switch (this.strategy) {
            case 'symetricAmbient':
                return (await this.vaultWrite).deposit(await weiQty, owner, Typed.bool(true), txArgs)
            case 'rswEth':
                return (await this.vaultWrite).deposit(await weiQty, owner, Typed.bytes('0x'), txArgs)
        }
    }

    /* @notice Sends a transaction to redeem shares in vault position back into token1
     * @param vaultTokenQty The quantity of vault tokens to withdraw
     * @param minToken1Qty The minimum quantity of token1 to receive */
    async redeemZap (vaultQty: TokenQty, minToken1Qty: TokenQty): Promise<TransactionResponse> {
        let owner = ((await this.context).actor as Signer).getAddress()
        let weiQty = this.vaultToken.normQty(vaultQty);
        let minWeiQty = this.token1.normQty(minToken1Qty);
        await ensureChain(await this.context)
        switch (this.strategy) {
            case 'symetricAmbient':
                return (await this.vaultWrite).redeem(await weiQty, owner, owner, Typed.uint256(await minWeiQty), Typed.bool(true))
            case 'rswEth':
                return (await this.vaultWrite).redeem(await weiQty, owner, owner, Typed.bytes('0x'))
        }
    }

    /* @notice Retrieves the min deposit quantity in token1 for the Tempest vault */
    async minDeposit(): Promise<bigint> {
        if (!this.minDepositCache) {
            this.minDepositCache = (await this.vaultRead).minimumDeposit();
        }
        return this.minDepositCache
    }

    /* @notice Queries the vault token balance of a wallet */
    async balanceVault (wallet: string): Promise<bigint> {
        return this.vaultToken.wallet(wallet)
    }

    /* @notice Queries the implied token1 balance based on the share to asset conversion. */
    async balanceToken1 (wallet: string): Promise<bigint> {
        let balance = await this.balanceVault(wallet);
        if (balance === BigInt(0))
            return BigInt(0)
        return (await this.vaultRead).convertToAssets(balance)
    }

    /* @notice Returns the conversion rate between vault tokens and token1 collateral. */
    async queryConversionRate(): Promise<number> {
        let denom = 1000000
        let numer = await (await this.vaultRead).convertToShares(denom)
        return denom / Number(numer)
    }

    /* @notice Checks a wallet's token approval for the vault's token1. */
    async allowance(wallet: string): Promise<bigint> {
        return this.token1.allowance(wallet, this.vaultAddr);
    }

    /* @notice Sends transaction to approve token1 on the vault contract */
    async approve (approveQty?: TokenQty): Promise<TransactionResponse | undefined> {
        return this.token1.approveAddr(this.vaultAddr, approveQty);
    }


    private vaultAddr: string;
    private token1: CrocTokenView;
    private vaultToken: CrocTokenView;
    private strategy: TempestStrategy
    private vaultWrite: Promise<Contract>;
    private vaultRead: Promise<Contract>;
    private minDepositCache: Promise<bigint> | undefined
    private context: Promise<CrocContext>
}
