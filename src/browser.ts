/**
 * This file is the entrypoint of browser builds.
 * The code executes when loaded in a browser.
 */
import { getGasPrice } from "./main";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).getGasPrice = getGasPrice; // instead of casting window to any, you can extend the Window interface: https://stackoverflow.com/a/43513740/5433572

console.log(
  'Method "getGasPrice" was added to the window object. You can try it yourself by just entering "await getGasPrice()"'
);
