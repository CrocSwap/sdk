import { Contract, TransactionResponse } from "ethers";
import { CrocContext } from "../context";
import { TEMPEST_VAULT_ABI } from "../abis/external/TempestVaultAbi";
import { CrocTokenView, TokenQty } from "../tokens";


/* @notice Class for interacting with a specific Tempest pair vault. */
export class TempestVault {
    constructor (vaultAddr: string, token1: string, context: CrocContext) {
        this.vaultAddr = vaultAddr;
        this.token1 = new CrocTokenView(Promise.resolve(context), token1);
        this.vaultToken = new CrocTokenView(Promise.resolve(context), vaultAddr);
        this.vault = new Contract(vaultAddr, TEMPEST_VAULT_ABI, context.actor);
    }

    async minDeposit(): Promise<bigint> {
        if (!this.minDepositCache) {
            this.minDepositCache = this.vault.minimumDeposit();
        }
        return this.minDepositCache
    }

    /* @notice Queries the vault token balance of a wallet */
    async balanceVault (wallet: string): Promise<bigint> {
        return this.vaultToken.wallet(wallet)
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
    private vault: Contract;
    private minDepositCache: Promise<bigint> | undefined
}
