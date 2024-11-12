import { Contract, Signer, TransactionResponse } from "ethers";
import { CrocContext } from "../context";
import { CrocTokenView, TokenQty } from "../tokens";
import { TEMPEST_VAULT_ABI } from "../abis/external/TempestVaultAbi";


/* @notice Class for interacting with a specific Tempest pair vault. */
export class TempestVault {
    constructor (vaultToken: CrocTokenView, token1: CrocTokenView, context: Promise<CrocContext>) {
        this.vaultAddr = vaultToken.tokenAddr
        this.token1 = token1
        this.vaultToken = vaultToken
        this.vault = context.then(c => new Contract(this.vaultAddr, TEMPEST_VAULT_ABI, c.actor));
        this.context = context
    }

    /* @notice Sends a transaction to zap and deposit token1 into the vault
     * @param qty The quantity of token1 to deposit */
    async depositZap (qty: TokenQty): Promise<TransactionResponse> {
        let owner = ((await this.context).actor as Signer).getAddress()
        let weiQty = this.token1.normQty(qty);
        return (await this.vault).deposit(await weiQty, owner, true)
    }

    /* @notice Sends a transaction to redeem shares in vault position back into token1
     * @param vaultTokenQty The quantity of vault tokens to withdraw
     * @param minToken1Qty The minimum quantity of token1 to receive */
    async redeemZap (vaultQty: TokenQty, minToken1Qty: TokenQty): Promise<TransactionResponse> {
        let owner = ((await this.context).actor as Signer).getAddress()
        let weiQty = this.vaultToken.normQty(vaultQty);
        let minWeiQty = this.token1.normQty(minToken1Qty);
        return (await this.vault).redeem(await weiQty, owner, owner, await minWeiQty, true)
    }

    /* @notice Retrieves the min deposit quantity in token1 for the Tempest vault */
    async minDeposit(): Promise<bigint> {
        if (!this.minDepositCache) {
            this.minDepositCache = (await this.vault).minimumDeposit();
        }
        return this.minDepositCache
    }

    /* @notice Queries the vault token balance of a wallet */
    async balanceVault (wallet: string): Promise<bigint> {
        return (await this.vaultToken).wallet(wallet)
    }

    /* @notice Queries the implied token1 balance based on the share to asset conversion. */
    async balanceToken1 (wallet: string): Promise<bigint> {
        let balance = await this.balanceVault(wallet);
        return (await this.vault).convertToAssets(balance)
    }

    /* @notice Returns the conversion rate between vault tokens and token1 collateral. */
    async queryConversionRate(): Promise<number> {
        let denom = 1000000
        let numer = await (await this.vault).convertToShares(denom)
        return denom / Number(numer)
    }

    /* @notice Checks a wallet's token approval for the vault's token1. */ 
    async allowance(wallet: string): Promise<bigint> {
        return (await this.token1).allowance(wallet, await this.vaultAddr);
    }

    /* @notice Sends transaction to approve token1 on the vault contract */
    async approve (approveQty?: TokenQty): Promise<TransactionResponse | undefined> {
        return (await this.token1).approveAddr(await this.vaultAddr, approveQty);
    }


    private vaultAddr: string;
    private token1: CrocTokenView;
    private vaultToken: CrocTokenView;
    private vault: Promise<Contract>;
    private minDepositCache: Promise<bigint> | undefined
    private context: Promise<CrocContext>
}
