import { BigNumber } from "ethers";

const FLOAT_PRECISION = 10000000000;
const Q_64 = BigNumber.from(2).pow(64);
//const Q_48 = BigNumber.from(2).pow(48)

export const MIN_TICK = -665454;
export const MAX_TICK = 831818;

export function toSqrtPrice(price: number) {
  const sqrtFixed = Math.round(Math.sqrt(price) * FLOAT_PRECISION);
  return BigNumber.from(sqrtFixed).mul(Q_64).div(FLOAT_PRECISION);
}

export function fromSqrtPrice(val: BigNumber) {
  const root = val.mul(FLOAT_PRECISION).div(Q_64).toNumber() / FLOAT_PRECISION;
  return root * root;
}

export function maxSqrtPrice(): BigNumber {
  return BigNumber.from("21267430153580247136652501917186561138").sub(1);
}

export function minSqrtPrice(): BigNumber {
  return BigNumber.from("65538");
}

export function scalePrice(
  price: number,
  baseDecimals: number,
  quoteDecimals: number
): number {
  return price * Math.pow(10, baseDecimals - quoteDecimals);
  // return price * Math.pow(10, quoteDecimals - baseDecimals);
}

export function unscalePrice(
  price: number,
  baseDecimals: number,
  quoteDecimals: number
): number {
  return price * Math.pow(10, quoteDecimals - baseDecimals);
}

export function scaleQty(qty: number, tokenDecimals: number): BigNumber {
  const scaledQty = qty * Math.pow(10, tokenDecimals);
  // console.log('scaledQty: ' + scaledQty);
  const scaledQtyRoundedDown = Math.floor(scaledQty);
  // console.log('rounded qty: ' + scaledQtyRoundedDown);
  return BigNumber.from(scaledQtyRoundedDown);
}

export function unscaleQty(qty: number, tokenDecimals: number): number {
  const unscaledQty = qty * Math.pow(10, -1 * tokenDecimals);
  // console.log('scaledQty: ' + scaledQty);
  // console.log('rounded qty: ' + scaledQtyRoundedDown);
  return unscaledQty;
}
