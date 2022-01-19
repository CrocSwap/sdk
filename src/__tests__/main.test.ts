// import { sum } from "../index";
import { scaleQty } from "../index";

test("1 is 1?", () => {
  expect(1).toBe(1);
});

test("scaledQty", () => {
  const scaledQty = scaleQty("1", 18).toString();
  expect(scaledQty).toBe("1000000000000000000");
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
