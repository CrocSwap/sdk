import { ZeroAddress } from "ethers";
import { describe, expect, it } from "vitest";
import {
  getBaseTokenAddress,
  getQuoteTokenAddress,
  sortBaseQuoteTokens,
} from "../utils/token";

describe("Token Address Utility Functions", () => {
  it("getQuoteTokenAddress returns correct address when ETH compared with Dai on Kovan", () => {
    const daiKovanAddress = "0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa";
    const quoteAddress = getQuoteTokenAddress(ZeroAddress, daiKovanAddress);
    expect(quoteAddress).toBe(daiKovanAddress);
  });

  it("getBaseTokenAddress returns correct address when ETH compared with Dai on Kovan", () => {
    const daiKovanAddress = "0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa";
    const baseAddress = getBaseTokenAddress(ZeroAddress, daiKovanAddress);
    expect(baseAddress).toBe(ZeroAddress);
  });

  it("sortBaseQuoteTokens returns correct address array when ETH compared with Dai on Kovan when already correctly sorted", () => {
    const daiKovanAddress = "0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa";
    const addressArray = sortBaseQuoteTokens(ZeroAddress, daiKovanAddress);
    expect(addressArray).toStrictEqual([ZeroAddress, daiKovanAddress]);
  });

  it("sortBaseQuoteTokens returns correct address array when ETH compared with Dai on Kovan when NOT already correctly sorted", () => {
    const daiKovanAddress = "0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa";
    const addressArray = sortBaseQuoteTokens(daiKovanAddress, ZeroAddress);
    expect(addressArray).toStrictEqual([ZeroAddress, daiKovanAddress]);
  });
});
