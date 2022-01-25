import { ethers, BigNumber, Contract, Signer } from "ethers";
import {
  contractAddresses,
  CROC_ABI,
  ERC20_ABI,
  QUERY_ABI,
  toFixedNumber,
} from "..";

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

type EthersTokenReceipt = {
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

type EthersNativeReceipt = {
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

export function scaleQty(qty: string, tokenDecimals: number): BigNumber {
  const bigQtyScaled = ethers.utils.parseUnits(qty, tokenDecimals);
  return bigQtyScaled;
}

export function unscaleQty(qty: string, tokenDecimals: number): string {
  // const unscaledQty = qty * Math.pow(10, -1 * tokenDecimals);
  const bigQtyUnscaled = ethers.utils.formatUnits(qty, tokenDecimals);
  return bigQtyUnscaled;
}

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
  receipt: EthersTokenReceipt | EthersNativeReceipt
): Promise<ParsedReceipt> {
  const NODE_URL =
    "https://speedy-nodes-nyc.moralis.io/015fffb61180886c9708499e/eth/ropsten";
  const provider = new ethers.providers.JsonRpcProvider(NODE_URL);

  // receipts for native ETH swaps only have one log
  if (receipt.logs.length === 1) {
    // console.log("native tx");
    // console.log("receipt: " + JSON.stringify(receipt));
    const blockNumber = receipt.blockNumber;

    const timestamp = (await provider.getBlock(blockNumber)).timestamp;

    const transactionHash = receipt.transactionHash;
    const tx = await provider.getTransaction(transactionHash);
    // console.log({ tx });
    const txValueInWei = tx.value;
    // const txValueInEther = parseInt(txBigValue.toString());

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
    const quoteQty = parseInt(logs[0].data);
    // const baseDecimals = 6;
    const baseQty = txValueInWei;
    // const quoteDecimals = 8;

    const baseAddress = "0x0000000000000000000000000000000000000000";
    const quoteAddress = logs[0].address.toLowerCase();

    // const baseContract = new ethers.Contract(baseAddress, ERC20_ABI, provider);
    const quoteContract = new ethers.Contract(
      quoteAddress,
      ERC20_ABI,
      provider
    );

    const baseDecimals = 18;
    const quoteDecimals = await quoteContract.decimals();

    const baseSymbol = "ETH";
    const quoteSymbol = await quoteContract.symbol();

    // const baseQtyUnscaled = ethers.utils.formatUnits(baseQty, baseDecimals);
    const baseQtyUnscaled = parseFloat(
      unscaleQty(baseQty.toString(), baseDecimals)
    );
    const quoteQtyUnscaled = parseFloat(
      unscaleQty(quoteQty.toString(), quoteDecimals)
    );
    // ethers.utils.formatUnits(quoteQty, quoteDecimals)
    // const baseSender = ethers.utils.hexStripZeros(events[0].raw.topics[1]);
    // const baseReceiver = ethers.utils.hexStripZeros(events[0].raw.topics[2]);
    const quoteSender = ethers.utils
      .hexStripZeros(logs[0].topics[1])
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
  } else {
    // console.log("receipt: " + JSON.stringify(receipt));
    // console.log("token receipt");
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
    const quoteContract = new ethers.Contract(
      quoteAddress,
      ERC20_ABI,
      provider
    );

    const baseDecimals = await baseContract.decimals();
    const quoteDecimals = await quoteContract.decimals();

    const baseSymbol = await baseContract.symbol();
    const quoteSymbol = await quoteContract.symbol();

    // const baseQtyUnscaled = ethers.utils.formatUnits(baseQty, baseDecimals);
    const baseQtyUnscaled = parseFloat(
      unscaleQty(baseQty.toString(), baseDecimals)
    );
    const quoteQtyUnscaled = parseFloat(
      unscaleQty(quoteQty.toString(), quoteDecimals)
    );
    // ethers.utils.formatUnits(quoteQty, quoteDecimals)
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
}

export async function approveToken(tokenAddress: string, signer: Signer) {
  const dex = contractAddresses["CROC_SWAP_ADDR"];

  const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer);

  const qty = ethers.BigNumber.from("1000000000000000000000");
  const tx = await tokenContract.approve(dex, qty);

  return tx;
}

export async function getTokenAllowance(
  tokenAddress: string,
  account: string,
  signer: Signer
) {
  const dex = contractAddresses["CROC_SWAP_ADDR"];
  const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer);

  const allowance = await tokenContract.allowance(account, dex);
  return allowance;
}

export async function getTokenDecimals(tokenAddress: string) {
  if (tokenAddress === contractAddresses.ZERO_ADDR) {
    return 18;
  }
  const NODE_URL =
    "https://speedy-nodes-nyc.moralis.io/015fffb61180886c9708499e/eth/ropsten";
  const provider = new ethers.providers.JsonRpcProvider(NODE_URL);
  const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
  const decimals = await tokenContract.decimals();
  return decimals;
}

export async function getTokenBalanceOffChain(
  tokenAddress: string,
  account: string,
  signer: Signer
) {
  console.log({ tokenAddress });
  if (tokenAddress === contractAddresses.ZERO_ADDR) {
    const nativeBalance = await signer.getBalance();
    return nativeBalance.toString();
  }

  const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer);

  const tokenBalanceBigNum = await tokenContract.balanceOf(account);
  return tokenBalanceBigNum.toString();
}

export async function getUnscaledTokenBalance(
  tokenAddress: string,
  account: string,
  signer: Signer
) {
  const sellTokenDecimals = await getTokenDecimals(tokenAddress);

  const tokenBalanceOffChain = await getTokenBalanceOffChain(
    tokenAddress,
    account,
    signer
  );

  if (tokenBalanceOffChain <= 0) {
    console.log("balance is 0");
    // setSellTokenBalance(0);
    return 0;
  } else {
    console.log({ tokenBalanceOffChain });
    console.log({ sellTokenDecimals });

    const unscaledBalance = unscaleQty(tokenBalanceOffChain, sellTokenDecimals);
    console.log({ unscaledBalance });
    return unscaledBalance;
  }
}

export function getBaseTokenAddress(token1: string, token2: string): string {
  let baseTokenAddress = "";

  if (!!token1 && !!token2) {
    const token1BigNum = BigNumber.from(token1);
    const token2BigNum = BigNumber.from(token2);
    // if token1 - token2 < 0, then token1 is the "base" and token2 is the "quote" token
    baseTokenAddress = token1BigNum.lt(token2BigNum) ? token1 : token2;
  }
  return baseTokenAddress;
}
export function getQuoteTokenAddress(token1: string, token2: string): string {
  let quoteTokenAddress = "";

  if (!!token1 && !!token2) {
    const token1BigNum = BigNumber.from(token1);
    const token2BigNum = BigNumber.from(token2);
    // if token1 - token2 < 0, then token1 is the "base" and token2 is the "quote" token
    quoteTokenAddress = token1BigNum.gt(token2BigNum) ? token1 : token2;
  }
  return quoteTokenAddress;
}

export async function getSpotPrice(
  baseTokenAddress: string,
  quoteTokenAddress: string,
  pool: number
) {
  const NODE_URL =
    "https://speedy-nodes-nyc.moralis.io/015fffb61180886c9708499e/eth/ropsten";
  const provider = new ethers.providers.JsonRpcProvider(NODE_URL);

  const queryAddress = contractAddresses["QUERY_ADDR"];
  const queryContract = new Contract(queryAddress, QUERY_ABI, provider);

  const price = await queryContract.queryPrice(
    baseTokenAddress,
    quoteTokenAddress,
    pool
  );

  return price;
}

export async function getUnscaledSpotPrice(
  baseTokenAddress: string,
  quoteTokenAddress: string
) {
  const price = await getSpotPrice(baseTokenAddress, quoteTokenAddress, 35000);
  const bigNumPrice = ethers.BigNumber.from(price);

  const unscaledSpotPrice = unscalePrice(
    fromSqrtPrice(bigNumPrice),
    await getTokenDecimals(baseTokenAddress),
    await getTokenDecimals(quoteTokenAddress)
  );
  return unscaledSpotPrice;
}

export async function getLimitPrice(
  sellTokenAddress: string,
  buyTokenAddress: string,
  slippageTolerance: number
) {
  const sellTokenIsBase =
    sellTokenAddress === getBaseTokenAddress(sellTokenAddress, buyTokenAddress);
  const baseTokenAddress = sellTokenIsBase ? sellTokenAddress : buyTokenAddress;
  const quoteTokenAddress = sellTokenIsBase
    ? buyTokenAddress
    : sellTokenAddress;

  let limitPrice;

  if (sellTokenIsBase) {
    limitPrice = toSqrtPrice(
      scalePrice(
        (await getUnscaledSpotPrice(baseTokenAddress, quoteTokenAddress)) *
          (1 + slippageTolerance * 0.01),
        await getTokenDecimals(baseTokenAddress),
        await getTokenDecimals(quoteTokenAddress)
      )
    );
  } else {
    limitPrice = toSqrtPrice(
      scalePrice(
        (await getUnscaledSpotPrice(baseTokenAddress, quoteTokenAddress)) *
          (1 - slippageTolerance * 0.01),
        await getTokenDecimals(baseTokenAddress),
        await getTokenDecimals(quoteTokenAddress)
      )
    );
  }
  return limitPrice;
}

export async function sendSwap(
  sellTokenAddress: string,
  buyTokenAddress: string,
  qtyIsSellToken: boolean,
  qty: number,
  slippageTolerance: number,
  POOL_IDX: number,
  signer: Signer
) {
  const crocContract = new ethers.Contract(
    contractAddresses["CROC_SWAP_ADDR"],
    CROC_ABI,
    signer
  );

  let tx;

  const baseTokenAddress = getBaseTokenAddress(
    buyTokenAddress,
    sellTokenAddress
  );
  const quoteTokenAddress = getQuoteTokenAddress(
    buyTokenAddress,
    sellTokenAddress
  );

  const sellTokenIsBase = sellTokenAddress === baseTokenAddress ? true : false;

  let qtyIsBase;

  if (qtyIsSellToken && sellTokenIsBase) {
    qtyIsBase = true;
  } else if (!qtyIsSellToken && !sellTokenIsBase) {
    qtyIsBase = true;
  } else {
    qtyIsBase = false;
  }

  let crocQty;
  if (qtyIsSellToken) {
    crocQty = scaleQty(
      qty.toString(),
      await getTokenDecimals(sellTokenAddress)
    );
  } else {
    crocQty = scaleQty(qty.toString(), await getTokenDecimals(buyTokenAddress));
  }

  const limitPrice = getLimitPrice(
    sellTokenAddress,
    buyTokenAddress,
    slippageTolerance
  );

  if (sellTokenAddress === contractAddresses.ZERO_ADDR) {
    tx = await crocContract.swap(
      baseTokenAddress,
      quoteTokenAddress,
      POOL_IDX,
      sellTokenIsBase, // ?? isBuy (i.e. converting base token for quote token)
      qtyIsBase, // qty is base token -- boolean whether qty represents BASE or QUOTE
      crocQty, // quantity of token to divest
      limitPrice, // slippage-adjusted price client will accept
      false, // ?? surplus
      { value: crocQty }
      // { gasLimit: 1000000 }
    );
  } else {
    tx = await crocContract.swap(
      baseTokenAddress,
      quoteTokenAddress,
      POOL_IDX,
      sellTokenIsBase, // ?? isBuy (i.e. converting base token for quote token)
      qtyIsBase, // qty is base token -- boolean whether qty represents BASE or QUOTE
      crocQty, // quantity of token to divest
      limitPrice, // slippage-adjusted price client will accept
      false // ?? surplus
      // { gasLimit: 1000000 }
    );
  }
  return tx;
}
