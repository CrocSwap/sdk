/* eslint-disable @typescript-eslint/no-unused-vars */
import { CrocContext } from "./context";
import { MAX_LIQ } from "./constants";
import { toDisplayQty, fromDisplayQty } from "./utils/token";
import { BlockTag } from "./position";
import { GAS_PADDING, AddressZero } from "./utils";
import { Address, encodeAbiParameters, maxUint256, getContract } from "viem";
import { ERC20_ABI } from "./abis";

/* Type representing specified token quantities. This type can either represent the raw non-decimalized
 * on-chain value in wei, if passed as a BigNuber. Or it can represent the decimalized value if passed
 * as a string or Javascript float. */
export type TokenQty = bigint | string | number;

/* General top-level class for interacting with specific ERC20 tokens. Handles functionality for
 * approval, getting token balances both in wallet and on dex, and display/decimalization. */
export class CrocTokenView {

  /* Creates a new CrocTokenView for specificied token address.
   *
   * @param context The CrocContext environment context. Specific to a given chain.
   * @param tokenAddr The address of the token contract. Use zero address for native ETH token. */
  constructor(context: Promise<CrocContext>, tokenAddr: Address) {
    this.context = context;
    this.tokenAddr = tokenAddr;
    this.isNativeEth = tokenAddr == AddressZero;
    if (this.isNativeEth) {
      this.decimals = Promise.resolve(18);
    } else {
      this.decimals = this.resolve().then((c) =>
      { console.log(c);
      return c.read.decimals()});
    }
  }

  /* Sends a signed transaction to approve the CrocSwap contract for the ERC20 token contract.
   *
   * @param approveQty Optional arugment to specify the quantity to approve. Defaults to 2^120
   *                   if unspecified. */
  async approve (approveQty?: TokenQty): Promise<any | undefined> {
    return this.approveAddr((await this.context).dex.address, approveQty)
  }

  async approveRouter (approveQty?: TokenQty): Promise<any | undefined> {
    const router = (await this.context).router
    return router && this.approveAddr(router.address, approveQty)
  }

  private async approveAddr (addr: string, approveQty?: TokenQty): Promise<any | undefined> {
    if (this.isNativeEth) {
      return undefined;
    }

    const weiQty = approveQty ? await this.normQty(approveQty) : maxUint256;
    // const weiQty = BigInt(0);

    // We want to hardcode the gas limit, so we can manually pad it from the estimated
    // transaction. The default value is low gas calldata, but Metamask and other wallets
    // will often ask users to change the approval amount. Without the padding, approval
    // transactions can run out of gas.
    const gasEst = (await this.resolve()).estimateGas.approve([
      addr,
      weiQty],
      {addr: (await this.context).walletClient?.account?.address}
    );

    return await (await this.resolve()).write.approve(
      [addr, weiQty], { gasLimit: (await gasEst) + BigInt(15000)}
    );
  }

  async approveBypassRouter(): Promise<any | undefined> {
    const router = (await this.context).router
    if (!router) {
      return undefined
    }

    const MANY_CALLS = 1000000000
    const HOT_PROXY_IDX = 1
    const COLD_PROXY_IDX = 3
    const cmd = encodeAbiParameters([
      {type: "uint8", name: "subCmd"},
      {type: "address", name: "addr"},
      {type: "uint32", name: "nCalls"},
      {type: "uint16[]", name: "proxyIdxs"}],
      [72, router.address, MANY_CALLS, [HOT_PROXY_IDX]])
    return (await this.context).dex.write.userCmd([COLD_PROXY_IDX, cmd])
  }

  async wallet (address: string, block: bigint | undefined = undefined): Promise<bigint> {
    if (this.isNativeEth) {
      return (await this.context).publicClient.getBalance({address: address as Address, blockNumber: block});
    } else {
      return (await this.resolve()).read.balanceOf([address], {blockNumber: block});
    }
  }

  async walletDisplay (address: string, block: bigint | undefined = undefined): Promise<string> {
    const balance = this.wallet(address, block);
    return toDisplayQty(await balance, await this.decimals);
  }

  async balance (address: string, block: BlockTag = "latest"): Promise<bigint> {
    return (await this.context).query.read.querySurplus([address, this.tokenAddr], {blockTag: block})
  }

  async balanceDisplay (address: string, block: BlockTag = "latest"): Promise<string> {
    const balance = this.balance(address, block);
    return toDisplayQty(await balance, await this.decimals);
  }

  async allowance(address: string): Promise<bigint> {
    // return BigInt(0);
    if (this.isNativeEth) {
      return MAX_LIQ;
    }
    return (await this.resolve()).read.allowance(
      [address,
      (await this.context).dex.address]
    );
  }

  async roundQty (qty: TokenQty): Promise<bigint> {
    if (typeof qty === "number" || typeof qty === "string") {
      return this.normQty(this.truncFraction(qty, await this.decimals))
    } else {
      return qty;
    }
  }

  private truncFraction (qty: string | number, decimals: number): number {
    if (typeof(qty) === "number") {
      const exp = Math.pow(10, decimals)
      return Math.floor(qty * exp) / exp
    } else {
      return this.truncFraction(parseFloat(qty), decimals)
    }
  }

  async normQty(qty: TokenQty): Promise<bigint> {
    if (typeof qty === "number" || typeof qty === "string") {
      return fromDisplayQty(qty.toString(), await this.decimals);
    } else {
      return qty;
    }
  }

  async toDisplay(qty: TokenQty): Promise<string> {
    if (typeof qty === "number" || typeof qty === "string") {
      return qty.toString();
    } else {
      return toDisplayQty(qty, await this.decimals);
    }
  }

  private async resolve(): Promise<any> {
    return getContract({ address: this.tokenAddr, abi: ERC20_ABI, client: {wallet: (await this.context).walletClient, public: (await this.context).publicClient}})
  }

  async deposit (qty: TokenQty, recv: string): Promise<any> {
    return this.surplusOp(73, qty, recv, this.isNativeEth)
  }

  async withdraw (qty: TokenQty, recv: string): Promise<any> {
    return this.surplusOp(74, qty, recv)
  }

  async transfer (qty: TokenQty, recv: string): Promise<any> {
    return this.surplusOp(75, qty, recv)
  }

  private async surplusOp (subCode: number, qty: TokenQty, recv: string,
    useMsgVal: boolean = false): Promise<any> {
      const weiQty = this.normQty(qty)
      const cmd = encodeAbiParameters([{type: "uint8", name: "subCmd"},
        {type: "address", name: "recv"},
        {type: "uint256", name: "weiQty"},
        {type: "address", name: "tokenAddr"}],
        [subCode, recv as Address, await weiQty, this.tokenAddr as Address])

      const txArgs = useMsgVal ? { value: await weiQty } : { }
      const cntx = await this.context
      const gasEst = await cntx.dex.estimateGas.userCmd([cntx.chain.proxyPaths.cold, cmd], txArgs)
      Object.assign(txArgs, { gasLimit: gasEst + GAS_PADDING})
      return cntx.dex.write.userCmd([cntx.chain.proxyPaths.cold, cmd], txArgs)

  }

  // readonly contract: any; // TODO: fix any
  readonly tokenAddr: Address;
  readonly context: Promise<CrocContext>;
  readonly decimals: Promise<number>;
  readonly isNativeEth: boolean;
}

export class CrocEthView extends CrocTokenView {
  constructor (context: Promise<CrocContext>) {
    super(context, AddressZero)
  }

  /* Returns the amount needed to attach to msg.value when spending
   * ETH from surplus collateral. (I.e. the difference between the
   * two, or 0 if surplus collateral is sufficient) */
  async msgValOverSurplus (ethNeeded: bigint): Promise<bigint> {
    const sender = (await this.context).senderAddr

    if (!sender) {
      console.warn("No sender address known, returning 0")
      return BigInt(0)
    }

    const ethView = new CrocTokenView(this.context, AddressZero)
    const surpBal = await ethView.balance(sender)

    const hasEnough = surpBal > ethNeeded
    return hasEnough ? BigInt(0) :
      ethNeeded - surpBal
  }
}

export function sortBaseQuoteViews (tokenA: CrocTokenView, tokenB: CrocTokenView):
  [CrocTokenView, CrocTokenView] {
  return tokenA.tokenAddr.toLowerCase() < tokenB.tokenAddr.toLowerCase() ?
    [tokenA, tokenB] : [tokenB, tokenA]
}
