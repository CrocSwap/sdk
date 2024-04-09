import { CrocContext } from './context';
import { Address, PublicClient, numberToHex } from 'viem';

export class CrocSlotReader {
    constructor (context: Promise<CrocContext>) {
        this.provider = context.then(p => p.publicClient)
        this.dex = context.then(c => c.dex.address)
    }

    async isHotPathOpen(): Promise<boolean> {
        const STATE_SLOT = 0;
        const HOT_OPEN_OFFSET = 22;

        const hotShiftBits = BigInt(8 * (32 - HOT_OPEN_OFFSET));
        const slot = await this.readSlot(STATE_SLOT);
        const slotVal = BigInt(slot);

        return (slotVal << hotShiftBits) >> BigInt(255) > BigInt(0);
    }

    async readSlot (slot: number): Promise<string> {
        return (await this.provider).getStorageAt({address: await this.dex as Address, slot: numberToHex(slot)}) as Promise<string>
    }

    async proxyContract (proxyIdx: number): Promise<string> {
        const PROXY_SLOT_OFFSET = 1

        const slotVal = await this.readSlot(PROXY_SLOT_OFFSET + proxyIdx)
        return "0x" + slotVal.slice(26)
    }

    readonly provider: Promise<PublicClient>
    readonly dex: Promise<string>
}
