// import { sum } from "../index";
import { fromDisplayQty } from "../utils/token";
import { toDisplayQty } from "../utils/token";

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
  // expect(unscaledQty).toBe("1.1");
});
// console.log("bignum: " + scaledQty);
// console.log("string: " + scaledQty.toString());

// test("adds 1 + 2 to equal 3", () => {
//   expect(sum(1, 2)).toBe(3);
// });

// test("adding positive numbers is not zero", () => {
//   for (let a = 1; a < 10; a++) {
//     for (let b = 1; b < 10; b++) {
//       expect(a + b).not.toBe(0);
//     }
//   }
// });
