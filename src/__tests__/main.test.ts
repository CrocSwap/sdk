// import { sum } from "../index";
import { fromDisplayQty } from "../utils/token";
import { toDisplayQty } from "../utils/token";
import {
  // fromDisplayPrice,
  encodeCrocPrice,
  pinTickUpper,
  pinTickLower,
  calcRangeTilt,
} from "../utils";
import { BigNumber } from "ethers";
import { liquidityForBaseQty, liquidityForQuoteQty, baseConcFactor, quoteConcFactor, concDepositSkew, liquidityForBaseConc, liquidityForQuoteConc } from "../liquidity";
import { ambientPosSlot } from "../position";
import { contractAddresses } from "../constants";

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
  const price = encodeCrocPrice(625);
  expect(price.eq(BigNumber.from(25).mul(BigNumber.from(2).pow(64))));
});

test("encode croc price oversized", () => {
  const price = encodeCrocPrice(625 * 2 ** 40);
  expect(price.eq(BigNumber.from(25 * 2 ** 20).mul(BigNumber.from(2).pow(64))));
});

test("pin tick upper", () => {
  expect(pinTickUpper(5943, 50)).toBe(86950);
  expect(pinTickUpper(0.042, 50)).toBe(-31700);
});

test("pin tick lower", () => {
  expect(pinTickLower(5943, 50)).toBe(86900);
  expect(pinTickLower(0.042, 50)).toBe(-31750);
});

test("range collateral tilt", () => {
  expect(calcRangeTilt(0.9, -5000, -3000)).toBe(Infinity);
  expect(calcRangeTilt(0.9, 3000, 5000)).toBe(0);
  expect(calcRangeTilt(0.9, -5000, 5000)).toBe(0.9);
});

test("base conc factor", () => {
  expect(baseConcFactor(25.0, 9.0, 100.0)).toBe(0.4)
  expect(baseConcFactor(1.0, 9.0, 100.0)).toBe(0)
  expect(baseConcFactor(400.0, 9.0, 100.0)).toBe(0.35)
})

test("quote conc factor", () => {
  expect(quoteConcFactor(25.0, 9.0, 64.0)).toBe(0.375)
  expect(quoteConcFactor(1.0, 16.0, 100.0)).toBe(0.15)
  expect(quoteConcFactor(400.0, 9.0, 100.0)).toBe(0)
})

test("conc deposit skew", () => {
  expect(concDepositSkew(25.0, 9.0, 100.0)).toBe(0.8)
  expect(concDepositSkew(1.0, 16.0, 100.0)).toBe(0)
  expect(concDepositSkew(400.0, 9.0, 100.0)).toBe(Infinity)
})

test("liquidity quote tokens", () => {
  expect(liquidityForQuoteQty(0.01 ** 2, BigNumber.from(10000)).toNumber()).toBe(100)
  // Rounds down
  expect(liquidityForQuoteQty(0.01075 ** 2, BigNumber.from(9998)).toNumber()).toBe(107)
});

test("liquidity base tokens", () => {
  expect(liquidityForBaseQty(0.01 ** 2, BigNumber.from(50)).toNumber()).toBe(5000)
  // Rounds down
  expect(liquidityForBaseQty(109 ** 2, BigNumber.from(9999)).toNumber()).toBe(91)
});

test("liquidity quote concentrated", () => {
  expect(liquidityForQuoteConc(0.01 ** 2, BigNumber.from(10000), 0.005 ** 2, 0.02 ** 2).toNumber()).toBe(50)
  expect(liquidityForQuoteConc(0.01 ** 2, BigNumber.from(10000), 0.015 ** 2, 0.02 ** 2).toNumber()).toBe(16)
  expect(liquidityForQuoteConc(0.01 ** 2, BigNumber.from(10000), 0.001 ** 2, 0.005 ** 2).toNumber()).toBe(0)
});

test("liquidity base concentrated", () => {
  expect(liquidityForBaseConc(0.01 ** 2, BigNumber.from(50), 0.005 ** 2, 0.02 ** 2).toNumber()).toBe(2500)
  expect(liquidityForBaseConc(0.01 ** 2, BigNumber.from(50), 0.015 ** 2, 0.02 ** 2).toNumber()).toBe(0)
  expect(liquidityForBaseConc(0.01 ** 2, BigNumber.from(50), 0.001 ** 2, 0.005 ** 2).toNumber()).toBe(2000)
});

test("liquidity quote tokens", () => {
  expect(liquidityForBaseQty(0.01 ** 2, BigNumber.from(50)).toNumber()).toBe(5000)
  // Rounds down
  expect(liquidityForBaseQty(109 ** 2, BigNumber.from(9999)).toNumber()).toBe(91)
});

test("liquidity wild number", () => {
  expect((liquidityForBaseQty(0.004567483987661575, 
    BigNumber.from(1000000000000000))).toString()).toBe("14796584656896000")
  expect((liquidityForBaseQty(3572831664.789597, 
    BigNumber.from(1000000000000000))).toString()).toBe("16729914544")    
});

test("ambient slot", () => {
  const owner = "0x01e650abfc761c6a0fc60f62a4e4b3832bb1178b"
  const token = "0x07865c6E87B9F70255377e024ace6630C1Eaa37F"
  const slot = "0x83143c5d6e1dadd337e7d8618d6c0bf50bdfd154f08c7f9310dda845cf77ad53"
  expect(ambientPosSlot(owner, contractAddresses.ZERO_ADDR, token)).toBe(slot)
});
