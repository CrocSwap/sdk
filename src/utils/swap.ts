import { BigNumber } from "@ethersproject/bignumber";
import { ethers } from "ethers";
import { contractAddresses } from "..";
import { ERC20_ABI } from "..";
import { toFixedNumber } from ".";

const FLOAT_PRECISION = 10000000000;
const Q_64 = BigNumber.from(2).pow(64);
// const Q_48 = BigInt(2) ** BigInt(48);

export const MIN_TICK = -665454;
export const MAX_TICK = 831818;

export function toSqrtPrice(price: number): BigNumber {
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
  const scaledQtyRoundedDown = Math.floor(scaledQty);
  return BigNumber.from(scaledQtyRoundedDown);
}

export function unscaleQty(qty: number, tokenDecimals: number): number {
  const unscaledQty = qty * Math.pow(10, -1 * tokenDecimals);
  return unscaledQty;
}

type RawEventData = {
  data: string;
  topics: string[];
};

type Event = {
  address: string;
  blockHash: string;
  blockNumber: number;
  event?: unknown;
  id: string;
  logIndex: number;
  raw: RawEventData;
  removed: boolean;
  returnValues: unknown;
  signature: unknown;
  transactionHash: string;
  transactionIndex: number;
};

type Events = {
  0: Event;
  1: Event;
};

type EthersEvent = {
  address: string;
  blockHash: string;
  blockNumber: number;
  data: string;
  getBlock?: unknown;
  getTransaction?: unknown;
  getTransactionReceipt?: unknown;
  // event?: unknown;
  // id: string;
  logIndex: number;
  topics: string[];
  // removed: boolean;
  // returnValues: unknown;
  // signature: unknown;
  transactionHash: string;
  transactionIndex: number;
};

type EthersEvents = EthersEvent[];

type Web3Receipt = {
  blockHash: string;
  blockNumber: number;
  contractAddress?: string | null;
  cumulativeGasUsed: number;
  effectiveGasPrice: string;
  events: Events;
  from: string;
  gasUsed: number;
  logsBloom: string;
  status: boolean;
  to: string;
  transactionHash: string;
  transactionIndex: number;
  type: string;
};

type EthersReceipt = {
  blockHash: string;
  blockNumber: number;
  byzantium: boolean;
  confirmations: number;
  contractAddress?: string | null;
  cumulativeGasUsed: BigNumber;
  effectiveGasPrice: BigNumber;
  events: EthersEvents;
  from: string;
  // gasUsed: { type: string; hex: string };
  gasUsed: BigNumber;
  logs: EthersEvents;
  logsBloom: string;
  status: number;
  to: string;
  transactionHash: string;
  transactionIndex: number;
  type: number;
};

type ParsedReceipt = {
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
  readableConversionRate: number;
  moreExpensiveSymbol: string;
  lessExpensiveSymbol: string;
  conversionRateString: string;
};

export async function parseWeb3TxReceipt(
  receipt: Web3Receipt
): Promise<ParsedReceipt> {
  const NODE_URL =
    "https://speedy-nodes-nyc.moralis.io/015fffb61180886c9708499e/eth/ropsten";
  const provider = new ethers.providers.JsonRpcProvider(NODE_URL);

  // console.log("receipt: " + JSON.stringify(receipt));
  const blockNumber = receipt.blockNumber;

  const timestamp = (await provider.getBlock(blockNumber)).timestamp;

  const transactionHash = receipt.transactionHash;

  const gasUsed = receipt.gasUsed;
  const effectiveGasPrice = parseInt(receipt.effectiveGasPrice);
  const effectiveGasPriceInGwei = ethers.utils.formatUnits(
    effectiveGasPrice.toString(),
    "gwei"
  );
  const gasCostInWei = gasUsed * effectiveGasPrice;
  const gasCostInEther = ethers.utils.formatEther(gasCostInWei.toString());

  const status = receipt.status;

  const events = receipt.events;
  const baseQty = events[0].raw.data.toString();
  // const baseDecimals = 6;
  const quoteQty = events[1].raw.data.toString();
  // const quoteDecimals = 8;

  const baseAddress = events[0].address.toLowerCase();
  const quoteAddress = events[1].address.toLowerCase();

  const baseContract = new ethers.Contract(baseAddress, ERC20_ABI, provider);
  const quoteContract = new ethers.Contract(quoteAddress, ERC20_ABI, provider);

  const baseDecimals = await baseContract.decimals();
  const quoteDecimals = await quoteContract.decimals();

  const baseSymbol = await baseContract.symbol();
  const quoteSymbol = await quoteContract.symbol();

  const baseQtyUnscaled = parseFloat(
    ethers.utils.formatUnits(baseQty, baseDecimals)
  );
  const quoteQtyUnscaled = parseFloat(
    ethers.utils.formatUnits(quoteQty, quoteDecimals)
  );

  // const baseSender = ethers.utils.hexStripZeros(events[0].raw.topics[1]);
  // const baseReceiver = ethers.utils.hexStripZeros(events[0].raw.topics[2]);
  const quoteSender = ethers.utils
    .hexStripZeros(events[1].raw.topics[1])
    .toLowerCase();
  // const quoteReceiver = ethers.utils.hexStripZeros(events[1].raw.topics[2]);

  let sellQtyUnscaled,
    buyQtyUnscaled,
    sellAddress,
    buyAddress,
    buySymbol,
    sellSymbol;

  if (quoteSender === contractAddresses["CROC_SWAP_ADDR"].toLowerCase()) {
    buyQtyUnscaled = quoteQtyUnscaled;
    sellQtyUnscaled = baseQtyUnscaled;
    buyAddress = quoteAddress;
    sellAddress = baseAddress;
    buySymbol = quoteSymbol;
    sellSymbol = baseSymbol;
  } else {
    buyQtyUnscaled = baseQtyUnscaled;
    sellQtyUnscaled = quoteQtyUnscaled;
    buyAddress = baseAddress;
    sellAddress = quoteAddress;
    buySymbol = baseSymbol;
    sellSymbol = quoteSymbol;
  }

  const conversionRate = sellQtyUnscaled / buyQtyUnscaled;

  let lessExpensiveSymbol, moreExpensiveSymbol;
  let readableConversionRate;

  if (conversionRate < 1) {
    lessExpensiveSymbol = buySymbol;
    moreExpensiveSymbol = sellSymbol;
    readableConversionRate = 1 / conversionRate;
  } else {
    lessExpensiveSymbol = sellSymbol;
    moreExpensiveSymbol = buySymbol;
    readableConversionRate = conversionRate;
  }

  if (readableConversionRate < 2) {
    readableConversionRate = toFixedNumber(readableConversionRate, 6);
  } else {
    readableConversionRate = toFixedNumber(readableConversionRate, 2);
  }

  const conversionRateString = `Swapped ${sellQtyUnscaled} ${sellSymbol} for ${buyQtyUnscaled} ${buySymbol} at a rate of ${readableConversionRate} ${lessExpensiveSymbol} per ${moreExpensiveSymbol}`;

  const parsedReceipt: ParsedReceipt = {
    blockNumber: blockNumber,
    timestamp: timestamp,
    transactionHash: transactionHash,
    gasUsed: gasUsed,
    gasPriceInGwei: parseFloat(effectiveGasPriceInGwei),
    gasCostInEther: parseFloat(gasCostInEther),
    status: status,
    sellQtyUnscaled: sellQtyUnscaled,
    buyQtyUnscaled: buyQtyUnscaled,
    sellAddress: sellAddress,
    sellSymbol: sellSymbol,
    buyAddress: buyAddress,
    buySymbol: buySymbol,
    moreExpensiveSymbol: moreExpensiveSymbol,
    lessExpensiveSymbol: lessExpensiveSymbol,
    readableConversionRate: readableConversionRate,
    conversionRateString: conversionRateString,
  };

  return parsedReceipt;
}

export async function parseEthersTxReceipt(
  receipt: EthersReceipt
): Promise<ParsedReceipt> {
  const NODE_URL =
    "https://speedy-nodes-nyc.moralis.io/015fffb61180886c9708499e/eth/ropsten";
  const provider = new ethers.providers.JsonRpcProvider(NODE_URL);

  // console.log("receipt: " + JSON.stringify(receipt));
  const blockNumber = receipt.blockNumber;

  const timestamp = (await provider.getBlock(blockNumber)).timestamp;

  const transactionHash = receipt.transactionHash;

  const gasUsed = receipt.gasUsed.toNumber();
  const effectiveGasPrice = receipt.effectiveGasPrice.toNumber();
  const effectiveGasPriceInGwei = ethers.utils.formatUnits(
    effectiveGasPrice,
    "gwei"
  );
  const gasCostInWei = gasUsed * effectiveGasPrice;
  const gasCostInEther = ethers.utils.formatEther(gasCostInWei.toString());

  const status = receipt.status === 1 ? true : false;

  const logs = receipt.logs;
  const baseQty = parseInt(logs[0].data);
  // const baseDecimals = 6;
  const quoteQty = parseInt(logs[1].data);
  // const quoteDecimals = 8;

  const baseAddress = logs[0].address.toLowerCase();
  const quoteAddress = logs[1].address.toLowerCase();

  const baseContract = new ethers.Contract(baseAddress, ERC20_ABI, provider);
  const quoteContract = new ethers.Contract(quoteAddress, ERC20_ABI, provider);

  const baseDecimals = await baseContract.decimals();
  const quoteDecimals = await quoteContract.decimals();

  const baseSymbol = await baseContract.symbol();
  const quoteSymbol = await quoteContract.symbol();

  const baseQtyUnscaled = parseFloat(
    ethers.utils.formatUnits(baseQty, baseDecimals)
  );
  const quoteQtyUnscaled = parseFloat(
    ethers.utils.formatUnits(quoteQty, quoteDecimals)
  );

  // const baseSender = ethers.utils.hexStripZeros(events[0].raw.topics[1]);
  // const baseReceiver = ethers.utils.hexStripZeros(events[0].raw.topics[2]);
  const quoteSender = ethers.utils
    .hexStripZeros(logs[1].topics[1])
    .toLowerCase();
  // const quoteReceiver = ethers.utils.hexStripZeros(events[1].raw.topics[2]);

  let sellQtyUnscaled,
    buyQtyUnscaled,
    sellAddress,
    buyAddress,
    buySymbol,
    sellSymbol;

  if (quoteSender === contractAddresses["CROC_SWAP_ADDR"].toLowerCase()) {
    buyQtyUnscaled = quoteQtyUnscaled;
    sellQtyUnscaled = baseQtyUnscaled;
    buyAddress = quoteAddress;
    sellAddress = baseAddress;
    buySymbol = quoteSymbol;
    sellSymbol = baseSymbol;
  } else {
    buyQtyUnscaled = baseQtyUnscaled;
    sellQtyUnscaled = quoteQtyUnscaled;
    buyAddress = baseAddress;
    sellAddress = quoteAddress;
    buySymbol = baseSymbol;
    sellSymbol = quoteSymbol;
  }

  const conversionRate = sellQtyUnscaled / buyQtyUnscaled;

  let lessExpensiveSymbol, moreExpensiveSymbol;
  let readableConversionRate;

  if (conversionRate < 1) {
    lessExpensiveSymbol = buySymbol;
    moreExpensiveSymbol = sellSymbol;
    readableConversionRate = 1 / conversionRate;
  } else {
    lessExpensiveSymbol = sellSymbol;
    moreExpensiveSymbol = buySymbol;
    readableConversionRate = conversionRate;
  }

  if (readableConversionRate < 2) {
    readableConversionRate = toFixedNumber(readableConversionRate, 6);
  } else {
    readableConversionRate = toFixedNumber(readableConversionRate, 2);
  }

  const conversionRateString = `Swapped ${sellQtyUnscaled} ${sellSymbol} for ${buyQtyUnscaled} ${buySymbol} at a rate of ${readableConversionRate} ${lessExpensiveSymbol} per ${moreExpensiveSymbol}`;

  const parsedReceipt: ParsedReceipt = {
    blockNumber: blockNumber,
    timestamp: timestamp,
    transactionHash: transactionHash,
    gasUsed: gasUsed,
    gasPriceInGwei: parseFloat(effectiveGasPriceInGwei),
    gasCostInEther: parseFloat(gasCostInEther),
    status: status,
    sellQtyUnscaled: sellQtyUnscaled,
    buyQtyUnscaled: buyQtyUnscaled,
    sellAddress: sellAddress,
    sellSymbol: sellSymbol,
    buyAddress: buyAddress,
    buySymbol: buySymbol,
    moreExpensiveSymbol: moreExpensiveSymbol,
    lessExpensiveSymbol: lessExpensiveSymbol,
    readableConversionRate: readableConversionRate,
    conversionRateString: conversionRateString,
  };

  return parsedReceipt;
}
