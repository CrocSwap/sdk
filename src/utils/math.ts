export function toFixedNumber(num: number, digits: number, base?: number) {
  const pow = Math.pow(base || 10, digits);
  return Math.round(num * pow) / pow;
}

export function bigIntToFloat (val: bigint): number {
  return val < BigInt(Number.MAX_SAFE_INTEGER - 1)
    ? Number(val)
    : parseFloat(val.toString());
}

export function floatToBigInt (x: number): bigint {
  let floatPrice = x
  let scale = 0;

  const PRECISION_BITS = 16;
  while (floatPrice > Number.MAX_SAFE_INTEGER) {
    floatPrice = floatPrice / (2 ** PRECISION_BITS);
    scale = scale + PRECISION_BITS;
  }

  const pinPrice = Math.round(floatPrice);
  const mult = BigInt(2) ** BigInt(scale)
  return BigInt(pinPrice) * mult;
}

export function truncateRightBits(x: bigint, bits: number): bigint {
  const mult = BigInt(2) ** BigInt(bits)
  return x / mult * mult
}

export function fromFixedGrowth (x: bigint): number {
  return 1 + bigIntToFloat(x) / (2 ** 48)
}
