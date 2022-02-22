import { ethers, Signer } from "ethers";
import { CROC_ABI, ERC20_ABI } from "./abis";
import {
  Web3Receipt,
  EthersTokenReceipt,
  EthersNativeReceipt,
} from "./utils/web3";
import {
  getTokenDecimals,
  fromDisplayQty,
  toDisplayQty,
  getBaseTokenAddress,
  getQuoteTokenAddress,
} from "./utils/token";
import { encodeCrocPrice, getSpotPrice } from "./utils/price";
import { NODE_URL, POOL_PRIMARY, contractAddresses } from "./constants";
import { toFixedNumber } from "./utils/math";

export type ParsedSwapReceipt = {
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

export async function parseSwapWeb3TxReceipt(
  receipt: Web3Receipt
): Promise<ParsedSwapReceipt> {
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
  const quoteQty = events[1].raw.data.toString();

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

  const parsedReceipt: ParsedSwapReceipt = {
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

export async function parseSwapEthersTxReceipt(
  receipt: EthersTokenReceipt | EthersNativeReceipt
): Promise<ParsedSwapReceipt> {
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

    const baseQtyUnscaled = parseFloat(
      toDisplayQty(baseQty.toString(), baseDecimals)
    );

    let quoteQtyUnscaled;
    try {
      quoteQtyUnscaled = parseFloat(
        toDisplayQty(quoteQty.toString(), quoteDecimals)
      );
    } catch (error) {
      quoteQtyUnscaled = 10000000000;
    }

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

    const parsedReceipt: ParsedSwapReceipt = {
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
  } else if (receipt.logs.length === 0) {
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

    let sellQtyUnscaled, buyQtyUnscaled, buySymbol, sellSymbol;

    let lessExpensiveSymbol, moreExpensiveSymbol;
    let readableConversionRate;

    const conversionRateString = `Swapped ${sellQtyUnscaled} ${sellSymbol} for ${buyQtyUnscaled} ${buySymbol} at a rate of ${readableConversionRate} ${lessExpensiveSymbol} per ${moreExpensiveSymbol}`;

    const parsedReceipt: ParsedSwapReceipt = {
      blockNumber: blockNumber,
      timestamp: timestamp,
      transactionHash: transactionHash,
      gasUsed: gasUsed,
      gasPriceInGwei: parseFloat(effectiveGasPriceInGwei),
      gasCostInEther: parseFloat(gasCostInEther),
      status: status,
      sellQtyUnscaled: 0,
      buyQtyUnscaled: 0,
      sellAddress: "xxx",
      sellSymbol: "xxx",
      buyAddress: "xxx",
      buySymbol: "xxx",
      moreExpensiveSymbol: "xxx",
      lessExpensiveSymbol: "xxx",
      readableConversionRate: 0,
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
    const quoteQty = parseInt(logs[1].data);

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

    const baseQtyUnscaled = parseFloat(
      toDisplayQty(baseQty.toString(), baseDecimals)
    );
    const quoteQtyUnscaled = parseFloat(
      toDisplayQty(quoteQty.toString(), quoteDecimals)
    );

    const quoteSender = ethers.utils
      .hexStripZeros(logs[1].topics[1])
      .toLowerCase();

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

    const parsedReceipt: ParsedSwapReceipt = {
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
    limitPrice = encodeCrocPrice(
      (await getSpotPrice(baseTokenAddress, quoteTokenAddress, POOL_PRIMARY)) *
        (1 + slippageTolerance * 0.01)
    );
  } else {
    limitPrice = encodeCrocPrice(
      (await getSpotPrice(baseTokenAddress, quoteTokenAddress, POOL_PRIMARY)) *
        (1 - slippageTolerance * 0.01)
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
    crocQty = fromDisplayQty(
      qty.toString(),
      await getTokenDecimals(sellTokenAddress)
    );
  } else {
    crocQty = fromDisplayQty(
      qty.toString(),
      await getTokenDecimals(buyTokenAddress)
    );
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
