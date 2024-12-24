import { describe, expect, it } from "vitest";
import {
  baseConcFactor,
  calcRangeTilt,
  concDepositSkew,
  fromDisplayPrice,
  pinTickLower,
  pinTickUpper,
  quoteConcFactor,
  toDisplayPrice
} from "../utils";
import { fromDisplayQty, toDisplayQty } from "../utils/token";

describe("Utility Functions Tests", () => {
  it("1 is 1?", () => {
    expect(1).toBe(1);
  });

  it("scaleQty integer as string", () => {
    const scaledQty = fromDisplayQty("1", 18).toString();
    expect(scaledQty).toBe("1000000000000000000");
  });

  it("scaledQty float as string", () => {
    const scaledQty = fromDisplayQty(".1", 18).toString();
    expect(scaledQty).toBe("100000000000000000");
  });

  // it("throws error on scaledQty longer than decimals", () => {
  //   expect(() => {
  //     fromDisplayQty("1.1234567", 6);
  //   }).toThrowError();
  // });

  it("unscaleQty integer as string", () => {
    const unscaledQty = toDisplayQty("100", 2).toString();
    expect(unscaledQty).toBe("1.0");
  });

  it("throws error on unscaleQty float as string", () => {
    expect(() => {
      toDisplayQty("100.1", 2).toString();
    }).toThrowError();
  });

  it("to display price", () => {
    expect(toDisplayPrice(1500, 18, 18, false)).toBeCloseTo(1500, 0.0001);
    expect(toDisplayPrice(2000, 18, 18, true)).toBeCloseTo(0.0005, 0.0001);
    expect(toDisplayPrice(20, 6, 10, false)).toBeCloseTo(200000, 0.0001);
    expect(toDisplayPrice(20, 6, 10, true)).toBeCloseTo(0.000005, 0.0001);
  });

  it("from display price", () => {
    expect(fromDisplayPrice(toDisplayPrice(1500, 18, 18, false), 18, 18, false)).toBeCloseTo(1500, 0.0001);
    expect(fromDisplayPrice(toDisplayPrice(2000, 18, 18, true), 18, 18, true)).toBeCloseTo(2000, 0.0001);
    expect(fromDisplayPrice(toDisplayPrice(20, 10, 6, false), 10, 6, false)).toBeCloseTo(20, 0.0001);
    expect(fromDisplayPrice(toDisplayPrice(20, 10, 6, true), 10, 6, true)).toBeCloseTo(20, 0.0001);
  });

  it("pin tick upper", () => {
    expect(pinTickUpper(5943, 50)).toBe(86950);
    expect(pinTickUpper(0.042, 50)).toBe(-31700);
  });

  it("pin tick lower", () => {
    expect(pinTickLower(5943, 50)).toBe(86900);
    expect(pinTickLower(0.042, 50)).toBe(-31750);
  });

  it("range collateral tilt", () => {
    expect(calcRangeTilt(0.9, -5000, -3000)).toBe(Infinity);
    expect(calcRangeTilt(0.9, 3000, 5000)).toBe(0);
    expect(calcRangeTilt(0.9, -5000, 5000)).toBe(0.9);
  });

  it("base conc factor", () => {
    expect(baseConcFactor(25.0, 9.0, 100.0)).toBe(2.5);
    expect(baseConcFactor(1.0, 9.0, 100.0)).toBe(Infinity);
    expect(baseConcFactor(400.0, 9.0, 100.0)).toBe(1 / 0.35);
  });

  it("quote conc factor", () => {
    expect(quoteConcFactor(25.0, 9.0, 64.0)).toBe(1 / 0.375);
    expect(quoteConcFactor(1.0, 16.0, 100.0)).toBe(1 / 0.15);
    expect(quoteConcFactor(400.0, 9.0, 100.0)).toBe(Infinity);
  });

  it("conc deposit skew", () => {
    expect(concDepositSkew(25.0, 9.0, 100.0)).toBe(0.8);
    expect(concDepositSkew(1.0, 16.0, 100.0)).toBe(0);
    expect(concDepositSkew(400.0, 9.0, 100.0)).toBe(Infinity);
  });

  // it("liquidity quote tokens", () => {
  //   expect(liquidityForQuoteQty(0.01 ** 2, BigInt(10000))).toBe(100);
  //   expect(liquidityForQuoteQty(0.01075 ** 2, BigInt(9998))).toBe(107);
  // });

  // it("liquidity base tokens", () => {
  //   expect(liquidityForBaseQty(0.01 ** 2, BigInt(50))).toBe(5000);
  //   expect(liquidityForBaseQty(109 ** 2, BigInt(9999))).toBe(91);
  // });

  // it("truncate right bits", () => {
  //   expect(truncateRightBits(BigInt(48024845023), 10)).toBe(48024844288);
  // });
});
