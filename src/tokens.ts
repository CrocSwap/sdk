import { CrocContext } from "./context";
import { Contract, BigNumber } from "ethers";
import { TransactionResponse } from "@ethersproject/providers";
import { AddressZero } from "@ethersproject/constants";
import { MAX_LIQ } from "./constants";
import { toDisplayQty, fromDisplayQty } from "./utils/token";

// Convention where token quantities can be repesented either as BigNumbers, indicating that it's
// the full wei value. *OR* can be represented as strings/numbers, indicating that the quantity
// represents a decimal norm'ed value. E.g. 1 ETH could either be 1.0, "1.0" or BigNumber(10).pow(10)
export type TokenQty = BigNumber | string | number;

export class CrocTokenView {
  constructor(context: Promise<CrocContext>, tokenAddr: string) {
    this.context = context;
    this.tokenAddr = tokenAddr;
    this.isNativeEth = tokenAddr == AddressZero;
    if (this.isNativeEth) {
      this.decimals = Promise.resolve(18);
    } else {
      this.decimals = this.resolve().then((c) => c.decimals());
    }
  }

  async approve(): Promise<TransactionResponse | undefined> {
    if (this.isNativeEth) {
      return undefined;
    }
    const weiQty = BigNumber.from(2).pow(96); // Lots of 0 bytes in calldata to save gas
    return (await this.resolve()).approve(
      (await this.context).dex.address,
      weiQty
    );
  }

  async balance(address: string): Promise<BigNumber> {
    if (this.isNativeEth) {
      // console.dir({type: "Balance", providerEnv: (await this.context).provider,
      //     balFn: (await this.context).provider.getBalance})
      return (await this.context).provider.getBalance(address);
    } else {
      return (await this.resolve()).balanceOf(address);
    }
  }

  async balanceDisplay(address: string): Promise<string> {
    let balance = this.balance(address);
    return toDisplayQty(await balance, await this.decimals);
  }

  async allowance(address: string): Promise<BigNumber> {
    if (this.isNativeEth) {
      return MAX_LIQ;
    }
    return (await this.resolve()).allowance(
      address,
      (await this.context).dex.address
    );
  }

  async normQty(qty: TokenQty): Promise<BigNumber> {
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

  private async resolve(): Promise<Contract> {
    return (await this.context).erc20.attach(this.tokenAddr);
  }

  readonly tokenAddr: string;
  readonly context: Promise<CrocContext>;
  readonly decimals: Promise<number>;
  readonly isNativeEth: boolean;
}
