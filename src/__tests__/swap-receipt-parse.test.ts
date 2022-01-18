import { parseWeb3TxReceipt, parseEthersTxReceipt } from "..";

import { BigNumber } from "ethers";

const testWeb3Receipt = {
  blockHash:
    "0x671bc2d6d650f6227dd0e0af6688c681ec1031d5e5efa3cfaf7e493086372373",
  blockNumber: 11807868,
  contractAddress: null,
  cumulativeGasUsed: 2620852,
  effectiveGasPrice: "0x1e49ffec4",
  from: "0xd825d73cdd050ecbebc0b3a8d9c5952d1f64722e",
  gasUsed: 105925,
  logsBloom:
    "0x00000000000000000000000000000000000000100000000000080000000000000000000000000000000000000000100000000800000000400000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000004000000000000000000004000000000000000000000080000000000000000000400000000000000000000000002000000000000000000002000000000000000000000000002000000000000000000000000000000000008000000000000000000000000000000000000",
  status: true,
  to: "0x6c40e8a335bf5956debd2fb88d5c98cc0a760559",
  transactionHash:
    "0xd79eac4bdca7883ebd26e7ebe739d2c656fba2fab9abb11b5099ebafb5d4d4f2",
  transactionIndex: 11,
  type: "0x2",
  events: {
    "0": {
      address: "0x83e77C197E744D21810A1f970cD24A246E0932a1",
      blockHash:
        "0x671bc2d6d650f6227dd0e0af6688c681ec1031d5e5efa3cfaf7e493086372373",
      blockNumber: 11807868,
      logIndex: 17,
      removed: false,
      transactionHash:
        "0xd79eac4bdca7883ebd26e7ebe739d2c656fba2fab9abb11b5099ebafb5d4d4f2",
      transactionIndex: 11,
      id: "log_d574c848",
      returnValues: {},
      signature: null,
      raw: {
        data: "0x00000000000000000000000000000000000000000000000000000000000f4240",
        topics: [
          "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
          "0x000000000000000000000000d825d73cdd050ecbebc0b3a8d9c5952d1f64722e",
          "0x0000000000000000000000006c40e8a335bf5956debd2fb88d5c98cc0a760559",
        ],
      },
    },
    "1": {
      address: "0xccea4Dfe9F0dBCCf6357b935846bF67778167D99",
      blockHash:
        "0x671bc2d6d650f6227dd0e0af6688c681ec1031d5e5efa3cfaf7e493086372373",
      blockNumber: 11807868,
      logIndex: 18,
      removed: false,
      transactionHash:
        "0xd79eac4bdca7883ebd26e7ebe739d2c656fba2fab9abb11b5099ebafb5d4d4f2",
      transactionIndex: 11,
      id: "log_bd8d3c43",
      returnValues: {},
      signature: null,
      raw: {
        data: "0x00000000000000000000000000000000000000000000000000000000000007a6",
        topics: [
          "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
          "0x0000000000000000000000006c40e8a335bf5956debd2fb88d5c98cc0a760559",
          "0x000000000000000000000000d825d73cdd050ecbebc0b3a8d9c5952d1f64722e",
        ],
      },
    },
  },
};

const testEthersReceipt = {
  to: "0x6c40E8A335bF5956DeBD2FB88D5c98Cc0A760559",
  from: "0xd825D73CDD050ecbEBC0B3a8D9C5952d1F64722e",
  contractAddress: null,
  transactionIndex: 38,
  gasUsed: BigNumber.from("0x019e7d"),
  logsBloom:
    "0x00000000000000000000000000000000000000100000000000080000000000000000000000000000000000000000100000000800000000400000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000004000000000000000000004000000000000000000000080000000000000000000400000000000000000000000002000000000000000000002000000000000000000000000002000000000000000000000000000000000008000000000000000000000000000000000000",
  blockHash:
    "0x3d4243b55a35efe9cd33247a31506162889b72ea13e19bf2a12e3297f27fb9cf",
  transactionHash:
    "0xe98e392e186379489a119feaa8d19573e946c756b1df480c05fd088d3851d888",
  logs: [
    {
      transactionIndex: 38,
      blockNumber: 11838227,
      transactionHash:
        "0xe98e392e186379489a119feaa8d19573e946c756b1df480c05fd088d3851d888",
      address: "0x83e77C197E744D21810A1f970cD24A246E0932a1",
      topics: [
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
        "0x0000000000000000000000006c40e8a335bf5956debd2fb88d5c98cc0a760559",
        "0x000000000000000000000000d825d73cdd050ecbebc0b3a8d9c5952d1f64722e",
      ],
      data: "0x00000000000000000000000000000000000000000000000000000000001e8480",
      logIndex: 28,
      blockHash:
        "0x3d4243b55a35efe9cd33247a31506162889b72ea13e19bf2a12e3297f27fb9cf",
    },
    {
      transactionIndex: 38,
      blockNumber: 11838227,
      transactionHash:
        "0xe98e392e186379489a119feaa8d19573e946c756b1df480c05fd088d3851d888",
      address: "0xccea4Dfe9F0dBCCf6357b935846bF67778167D99",
      topics: [
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
        "0x000000000000000000000000d825d73cdd050ecbebc0b3a8d9c5952d1f64722e",
        "0x0000000000000000000000006c40e8a335bf5956debd2fb88d5c98cc0a760559",
      ],
      data: "0x0000000000000000000000000000000000000000000000000000000000000fc5",
      logIndex: 29,
      blockHash:
        "0x3d4243b55a35efe9cd33247a31506162889b72ea13e19bf2a12e3297f27fb9cf",
    },
  ],
  blockNumber: 11838227,
  confirmations: 1,
  cumulativeGasUsed: BigNumber.from("0x1bb486"),

  effectiveGasPrice: BigNumber.from("0x024093f083"),
  status: 1,
  type: 2,
  byzantium: true,
  events: [
    {
      transactionIndex: 38,
      blockNumber: 11838227,
      transactionHash:
        "0xe98e392e186379489a119feaa8d19573e946c756b1df480c05fd088d3851d888",
      address: "0x83e77C197E744D21810A1f970cD24A246E0932a1",
      topics: [
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
        "0x0000000000000000000000006c40e8a335bf5956debd2fb88d5c98cc0a760559",
        "0x000000000000000000000000d825d73cdd050ecbebc0b3a8d9c5952d1f64722e",
      ],
      data: "0x00000000000000000000000000000000000000000000000000000000001e8480",
      logIndex: 28,
      blockHash:
        "0x3d4243b55a35efe9cd33247a31506162889b72ea13e19bf2a12e3297f27fb9cf",
    },
    {
      transactionIndex: 38,
      blockNumber: 11838227,
      transactionHash:
        "0xe98e392e186379489a119feaa8d19573e946c756b1df480c05fd088d3851d888",
      address: "0xccea4Dfe9F0dBCCf6357b935846bF67778167D99",
      topics: [
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
        "0x000000000000000000000000d825d73cdd050ecbebc0b3a8d9c5952d1f64722e",
        "0x0000000000000000000000006c40e8a335bf5956debd2fb88d5c98cc0a760559",
      ],
      data: "0x0000000000000000000000000000000000000000000000000000000000000fc5",
      logIndex: 29,
      blockHash:
        "0x3d4243b55a35efe9cd33247a31506162889b72ea13e19bf2a12e3297f27fb9cf",
    },
  ],
};

type parsedReceipt = {
  blockNumber: number;
  timestamp: number;
  transactionHash: string;
  gasUsed: number;
  gasCostInEther: number;
  gasPriceInGwei: number;
  status: boolean;
  buyAddress: string;
  sellAddress: string;
  sellSymbol: string;
  buyQtyUnscaled: number;
  buySymbol: string;
  sellQtyUnscaled: number;
  moreExpensiveSymbol: string;
  lessExpensiveSymbol: string;
  readableConversionRate: number;
  conversionRateString: string;
};

beforeAll(async () => {
  await callParseEthersTxReceipt();
  await callParseWeb3TxReceipt();
});

let parsedWeb3Receipt: parsedReceipt;
let parsedEthersReceipt: parsedReceipt;
async function callParseWeb3TxReceipt() {
  parsedWeb3Receipt = await parseWeb3TxReceipt(testWeb3Receipt);
  console.log({ parsedWeb3Receipt });
}
async function callParseEthersTxReceipt() {
  parsedEthersReceipt = await parseEthersTxReceipt(testEthersReceipt);
  // console.log({ parsedEthersReceipt });
}

test("gas used is correct?", async () => {
  expect(parsedWeb3Receipt.gasUsed).toBe(105925);
});

test("total cost in ether is correct?", async () => {
  expect(parsedWeb3Receipt.gasCostInEther).toBe(0.0008612399473789);
});

test("effective gas price in gwei is correct?", async () => {
  expect(parsedWeb3Receipt.gasPriceInGwei).toBe(8.130657988);
});
test("base quantity scaled for decimals is correct?", async () => {
  expect(parsedWeb3Receipt.sellQtyUnscaled).toBe(1.0);
});
test("quote quantity scaled for decimals is correct?", async () => {
  expect(parsedWeb3Receipt.buyQtyUnscaled).toBe(0.00001958);
});
test("sell address is correct?", async () => {
  expect(parsedWeb3Receipt.sellAddress).toBe(
    "0x83e77c197e744d21810a1f970cd24a246e0932a1"
  );
});
test("buy address is correct?", async () => {
  expect(parsedWeb3Receipt.buyAddress).toBe(
    "0xccea4dfe9f0dbccf6357b935846bf67778167d99"
  );
});
test("conversion rate string is correct?", async () => {
  expect(parsedWeb3Receipt.conversionRateString).toBe(
    "Swapped 1 USDC for 0.00001958 WBTC at a rate of 51072.52 USDC per WBTC"
  );
});

test("gas used is correct?", async () => {
  expect(parsedEthersReceipt.gasUsed).toBe(106109);
});

test("total cost in ether is correct?", async () => {
  expect(parsedEthersReceipt.gasCostInEther).toBe(0.001026431806097911);
});

test("effective gas price in gwei is correct?", async () => {
  expect(parsedEthersReceipt.gasPriceInGwei).toBe(9.673371779);
});
test("base quantity scaled for decimals is correct?", async () => {
  expect(parsedEthersReceipt.sellQtyUnscaled).toBe(0.00004037);
});
test("quote quantity scaled for decimals is correct?", async () => {
  expect(parsedEthersReceipt.buyQtyUnscaled).toBe(2);
});
test("sell address is correct?", async () => {
  expect(parsedEthersReceipt.sellAddress).toBe(
    "0xccea4dfe9f0dbccf6357b935846bf67778167d99"
  );
});
test("buy address is correct?", async () => {
  expect(parsedEthersReceipt.buyAddress).toBe(
    "0x83e77c197e744d21810a1f970cd24a246e0932a1"
  );
});
test("conversion rate string is correct?", async () => {
  expect(parsedEthersReceipt.conversionRateString).toBe(
    "Swapped 0.00004037 WBTC for 2 USDC at a rate of 49541.74 USDC per WBTC"
  );
});
