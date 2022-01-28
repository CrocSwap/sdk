// import { sum } from "../index";
import { fromDisplayQty } from "../utils/token";
import { toDisplayQty } from "../utils/token";
import { encodeCrocPrice, pinTickUpper, pinTickLower, calcRangeTilt } from "../utils";
import { BigNumber } from "ethers";

test("1 is 1?", () => {
  expect(1).toBe(1);
});

test("scaleQty integer as string", () => {
  const scaledQty = fromDisplayQty("1", 18).toString();
  expect(scaledQty).toBe("1000000000000000000");
});

test("scaledQty float as string", () => {
  const scaledQty = fromDisplayQty(".1", 18).toString();
  expect(scaledQty).toBe("100000000000000000");
});
test("throws error on scaledQty longer than decimals", () => {
  expect(() => {
    fromDisplayQty("1.1234567", 6);
  }).toThrowError();
});

test("unscaleQty integer as string", () => {
  const unscaledQty = toDisplayQty("100", 2).toString();
  expect(unscaledQty).toBe("1.0");
});

test("throws error on unscaleQty float as string", () => {
  expect(() => {
    toDisplayQty("100.1", 2).toString();
  }).toThrowError();
});

test("encode croc price", () => {
  const price = encodeCrocPrice(625)
  expect(price.eq(BigNumber.from(25).mul(BigNumber.from(2).pow(64))))
});

test("encode croc price oversized", () => {
  const price = encodeCrocPrice(625 * 2 ** 40)
  expect(price.eq(BigNumber.from(25 * 2 ** 20).mul(BigNumber.from(2).pow(64))))
});

test("pin tick upper", () => {
  expect(pinTickUpper(5943, 50)).toBe(86950)
  expect(pinTickUpper(0.042, 50)).toBe(-31700)
});

test("pin tick lower", () => {
  expect(pinTickLower(5943, 50)).toBe(86900)
  expect(pinTickLower(0.042, 50)).toBe(-31750)
});

test("range collateral tilt", () => {
  expect(calcRangeTilt(0.9, -5000, -3000)).toBe(Infinity)
  expect(calcRangeTilt(0.9, 3000, 5000)).toBe(0)
  expect(calcRangeTilt(0.9, -5000, 5000)).toBe(0.9)
});
