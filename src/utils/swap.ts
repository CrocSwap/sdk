const FLOAT_PRECISION = 10000000000;
const Q_64 = BigInt(2) ** BigInt(64);
// const Q_48 = BigInt(2) ** BigInt(48);

export const MIN_TICK = -665454;
export const MAX_TICK = 831818;

export function toSqrtPrice(price: number): bigint {
  const sqrtFixed = Math.round(Math.sqrt(price) * FLOAT_PRECISION);
  return (BigInt(sqrtFixed) * Q_64) / BigInt(FLOAT_PRECISION);
}

export function fromSqrtPrice(val: bigint): bigint {
  const root = (val * BigInt(FLOAT_PRECISION)) / Q_64 / BigInt(FLOAT_PRECISION);
  return root * root;
}

export function maxSqrtPrice(): bigint {
  return BigInt("21267430153580247136652501917186561138") - BigInt(1);
}

export function minSqrtPrice(): bigint {
  return BigInt("65538");
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

export function scaleQty(qty: number, tokenDecimals: number): bigint {
  const scaledQty = qty * Math.pow(10, tokenDecimals);
  // console.log('scaledQty: ' + scaledQty);
  const scaledQtyRoundedDown = Math.floor(scaledQty);
  // console.log('rounded qty: ' + scaledQtyRoundedDown);
  return BigInt(scaledQtyRoundedDown);
}

export function unscaleQty(qty: number, tokenDecimals: number): number {
  const unscaledQty = qty * Math.pow(10, -1 * tokenDecimals);
  // console.log('scaledQty: ' + scaledQty);
  // console.log('rounded qty: ' + scaledQtyRoundedDown);
  return unscaledQty;
}
