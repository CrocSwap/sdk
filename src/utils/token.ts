import { ethers, BigNumber } from "ethers";

export function getBaseTokenAddress(token1: string, token2: string): string {
  let baseTokenAddress = "";

  if (!!token1 && !!token2) {
    const token1BigNum = BigNumber.from(token1);
    const token2BigNum = BigNumber.from(token2);
    // On-chain base token is always the smaller of the two
    baseTokenAddress = token1BigNum.lt(token2BigNum) ? token1 : token2;
  }
  return baseTokenAddress;
}

export function getQuoteTokenAddress(token1: string, token2: string): string {
  let quoteTokenAddress = "";

  if (!!token1 && !!token2) {
    const token1BigNum = BigNumber.from(token1);
    const token2BigNum = BigNumber.from(token2);
    // On-chain quote token is always the larger of the two
    quoteTokenAddress = token1BigNum.gt(token2BigNum) ? token1 : token2;
  }
  return quoteTokenAddress;
}

export function sortBaseQuoteTokens(
  token1: string,
  token2: string
): [string, string] {
  return [
    getBaseTokenAddress(token1, token2),
    getQuoteTokenAddress(token1, token2),
  ];
}

export function fromDisplayQty(qty: string, tokenDecimals: number): BigNumber {
  const bigQtyScaled = ethers.utils.parseUnits(qty, tokenDecimals);
  return bigQtyScaled;
}

// Above this, Javascript string will use scientific notation, which BigNumber
// can't parse
const MAX_SAFE_BIGNUM = 1e20

export function toDisplayQty(
  qty: string | number | BigNumber,
  tokenDecimals: number
): string {
  if (typeof(qty) === "number" && qty > MAX_SAFE_BIGNUM) {
    return toDisplayQty(qty / Math.pow(10, tokenDecimals), 1)
    
  } else if (typeof(qty) === "string" && parseFloat(qty) > MAX_SAFE_BIGNUM) {
    return toDisplayQty(parseFloat(qty), tokenDecimals)
  
  } else {
    const bigQtyUnscaled = ethers.utils.formatUnits(qty.toString(), tokenDecimals);
    return bigQtyUnscaled;
  }
}
