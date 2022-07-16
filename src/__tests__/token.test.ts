import {
  getQuoteTokenAddress,
  getBaseTokenAddress,
  sortBaseQuoteTokens,
} from "../utils/token";
import { contractAddresses } from "../constants";

test("getQuoteTokenAddress returns correct address when ETH compared with Dai on Kovan", () => {
  const daiKovanAddress = "0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa";
  const quoteAddress = getQuoteTokenAddress(
    contractAddresses.ZERO_ADDR,
    daiKovanAddress
  );
  expect(quoteAddress).toBe(daiKovanAddress);
});

test("getBaseTokenAddress returns correct address when ETH compared with Dai on Kovan", () => {
  const daiKovanAddress = "0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa";
  const quoteAddress = getBaseTokenAddress(
    contractAddresses.ZERO_ADDR,
    daiKovanAddress
  );
  expect(quoteAddress).toBe(contractAddresses.ZERO_ADDR);
});

test("sortBaseQuoteTokens returns correct address array when ETH compared with Dai on Kovan when already correctly sorted", () => {
  const daiKovanAddress = "0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa";
  const addressArray = sortBaseQuoteTokens(
    contractAddresses.ZERO_ADDR,
    daiKovanAddress
  );
  expect(addressArray).toStrictEqual([
    contractAddresses.ZERO_ADDR,
    daiKovanAddress,
  ]);
});

test("sortBaseQuoteTokens returns correct address array when ETH compared with Dai on Kovan when NOT already correctly sorted", () => {
  const daiKovanAddress = "0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa";
  const addressArray = sortBaseQuoteTokens(
    daiKovanAddress,
    contractAddresses.ZERO_ADDR
  );
  expect(addressArray).toStrictEqual([
    contractAddresses.ZERO_ADDR,
    daiKovanAddress,
  ]);
});
