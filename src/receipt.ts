import {
  //   Web3Receipt,
  EthersTokenReceipt,
  EthersNativeReceipt,
} from "./utils/web3";

import {
  // CROC_ABI,
  ERC20_ABI,
} from "./abis";
import { contractAddresses } from "./constants";
import {
  //   getTokenDecimals,
  //   fromDisplayQty,
  toDisplayQty,
  //   getBaseTokenAddress,
  //   getQuoteTokenAddress,
} from "./utils/token";
import { toFixedNumber } from "./utils/math";
import { JsonRpcProvider } from "@ethersproject/providers";
import { ethers } from "ethers";

export type ParsedSwapReceipt = {
  blockNumber: number;
  timestamp: number;
  txHash: string;
  gasUsed: number;
  gasCostInEther: number;
  gasPriceInGwei: number;
  status: boolean;
  tokenBAddress: string;
  tokenAAddress: string;
  tokenASymbol: string;
  tokenBQtyUnscaled: number;
  tokenBSymbol: string;
  tokenAQtyUnscaled: number;
  readableConversionRate: number;
  moreExpensiveSymbol: string;
  lessExpensiveSymbol: string;
  conversionRateString: string;
};

export type ParsedMintReceipt = {
  blockNumber: number;
  timestamp: number;
  txHash: string;
  gasUsed: number;
  gasCostInEther: number;
  gasPriceInGwei: number;
  status: boolean;
  baseTokenAddress: string;
  quoteTokenAddress: string;
  baseTokenSymbol: string;
  tokenAQtyUnscaled: number;
  quoteTokenSymbol: string;
  tokenBQtyUnscaled: number;
};

export async function parseSwapEthersReceipt(
  provider: JsonRpcProvider,
  receipt: EthersTokenReceipt | EthersNativeReceipt
): Promise<ParsedSwapReceipt> {
  //   const provider = new ethers.providers.JsonRpcProvider(NODE_URL);

  // receipts for native ETH swaps only have one log
  if (receipt.logs.length === 1) {
    // console.log("native tx");
    // console.log("receipt: " + JSON.stringify(receipt));
    const blockNumber = receipt.blockNumber;

    const timestamp = (await provider.getBlock(blockNumber)).timestamp;

    const txHash = receipt.transactionHash;
    const tx = await provider.getTransaction(txHash);
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

    let tokenAQtyUnscaled,
      tokenBQtyUnscaled,
      tokenAAddress,
      tokenBAddress,
      tokenBSymbol,
      tokenASymbol;

    if (quoteSender === contractAddresses["CROC_SWAP_ADDR"].toLowerCase()) {
      tokenBQtyUnscaled = quoteQtyUnscaled;
      tokenAQtyUnscaled = baseQtyUnscaled;
      tokenBAddress = quoteAddress;
      tokenAAddress = baseAddress;
      tokenBSymbol = quoteSymbol;
      tokenASymbol = baseSymbol;
    } else {
      tokenBQtyUnscaled = baseQtyUnscaled;
      tokenAQtyUnscaled = quoteQtyUnscaled;
      tokenBAddress = baseAddress;
      tokenAAddress = quoteAddress;
      tokenBSymbol = baseSymbol;
      tokenASymbol = quoteSymbol;
    }

    const conversionRate = tokenAQtyUnscaled / tokenBQtyUnscaled;

    let lessExpensiveSymbol, moreExpensiveSymbol;
    let readableConversionRate;

    if (conversionRate < 1) {
      lessExpensiveSymbol = tokenBSymbol;
      moreExpensiveSymbol = tokenASymbol;
      readableConversionRate = 1 / conversionRate;
    } else {
      lessExpensiveSymbol = tokenASymbol;
      moreExpensiveSymbol = tokenBSymbol;
      readableConversionRate = conversionRate;
    }

    if (readableConversionRate < 2) {
      readableConversionRate = toFixedNumber(readableConversionRate, 6);
    } else {
      readableConversionRate = toFixedNumber(readableConversionRate, 2);
    }

    const conversionRateString = `Swapped ${tokenAQtyUnscaled} ${tokenASymbol} for ${tokenBQtyUnscaled} ${tokenBSymbol} at a rate of ${readableConversionRate} ${lessExpensiveSymbol} per ${moreExpensiveSymbol}`;

    const parsedReceipt: ParsedSwapReceipt = {
      blockNumber: blockNumber,
      timestamp: timestamp,
      txHash: txHash,
      gasUsed: gasUsed,
      gasPriceInGwei: parseFloat(effectiveGasPriceInGwei),
      gasCostInEther: parseFloat(gasCostInEther),
      status: status,
      tokenAQtyUnscaled: tokenAQtyUnscaled,
      tokenBQtyUnscaled: tokenBQtyUnscaled,
      tokenAAddress: tokenAAddress,
      tokenASymbol: tokenASymbol,
      tokenBAddress: tokenBAddress,
      tokenBSymbol: tokenBSymbol,
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

    const txHash = receipt.transactionHash;

    const gasUsed = receipt.gasUsed.toNumber();
    const effectiveGasPrice = receipt.effectiveGasPrice.toNumber();
    const effectiveGasPriceInGwei = ethers.utils.formatUnits(
      effectiveGasPrice,
      "gwei"
    );
    const gasCostInWei = gasUsed * effectiveGasPrice;
    const gasCostInEther = ethers.utils.formatEther(gasCostInWei.toString());

    const status = receipt.status === 1 ? true : false;

    // let tokenBQtyUnscaled, tokenBSymbol, tokenASymbol;

    // let lessExpensiveSymbol, moreExpensiveSymbol;
    // let readableConversionRate;

    // const conversionRateString = `Swapped ${tokenAQtyUnscaled} ${tokenASymbol} for ${tokenBQtyUnscaled} ${tokenBSymbol} at a rate of ${readableConversionRate} ${lessExpensiveSymbol} per ${moreExpensiveSymbol}`;
    const conversionRateString = `log length = 0`;

    const parsedReceipt: ParsedSwapReceipt = {
      blockNumber: blockNumber,
      timestamp: timestamp,
      txHash: txHash,
      gasUsed: gasUsed,
      gasPriceInGwei: parseFloat(effectiveGasPriceInGwei),
      gasCostInEther: parseFloat(gasCostInEther),
      status: status,
      tokenAQtyUnscaled: 0,
      tokenBQtyUnscaled: 0,
      tokenAAddress: "xxx",
      tokenASymbol: "xxx",
      tokenBAddress: "xxx",
      tokenBSymbol: "xxx",
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

    const txHash = receipt.transactionHash;

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

    let tokenAQtyUnscaled,
      tokenBQtyUnscaled,
      tokenAAddress,
      tokenBAddress,
      tokenBSymbol,
      tokenASymbol;

    if (quoteSender === contractAddresses["CROC_SWAP_ADDR"].toLowerCase()) {
      tokenBQtyUnscaled = quoteQtyUnscaled;
      tokenAQtyUnscaled = baseQtyUnscaled;
      tokenBAddress = quoteAddress;
      tokenAAddress = baseAddress;
      tokenBSymbol = quoteSymbol;
      tokenASymbol = baseSymbol;
    } else {
      tokenBQtyUnscaled = baseQtyUnscaled;
      tokenAQtyUnscaled = quoteQtyUnscaled;
      tokenBAddress = baseAddress;
      tokenAAddress = quoteAddress;
      tokenBSymbol = baseSymbol;
      tokenASymbol = quoteSymbol;
    }

    const conversionRate = tokenAQtyUnscaled / tokenBQtyUnscaled;

    let lessExpensiveSymbol, moreExpensiveSymbol;
    let readableConversionRate;

    if (conversionRate < 1) {
      lessExpensiveSymbol = tokenBSymbol;
      moreExpensiveSymbol = tokenASymbol;
      readableConversionRate = 1 / conversionRate;
    } else {
      lessExpensiveSymbol = tokenASymbol;
      moreExpensiveSymbol = tokenBSymbol;
      readableConversionRate = conversionRate;
    }

    if (readableConversionRate < 2) {
      readableConversionRate = toFixedNumber(readableConversionRate, 6);
    } else {
      readableConversionRate = toFixedNumber(readableConversionRate, 2);
    }

    const conversionRateString = `Swapped ${tokenAQtyUnscaled} ${tokenASymbol} for ${tokenBQtyUnscaled} ${tokenBSymbol} at a rate of ${readableConversionRate} ${lessExpensiveSymbol} per ${moreExpensiveSymbol}`;

    const parsedReceipt: ParsedSwapReceipt = {
      blockNumber: blockNumber,
      timestamp: timestamp,
      txHash: txHash,
      gasUsed: gasUsed,
      gasPriceInGwei: parseFloat(effectiveGasPriceInGwei),
      gasCostInEther: parseFloat(gasCostInEther),
      status: status,
      tokenAQtyUnscaled: tokenAQtyUnscaled,
      tokenBQtyUnscaled: tokenBQtyUnscaled,
      tokenAAddress: tokenAAddress,
      tokenASymbol: tokenASymbol,
      tokenBAddress: tokenBAddress,
      tokenBSymbol: tokenBSymbol,
      moreExpensiveSymbol: moreExpensiveSymbol,
      lessExpensiveSymbol: lessExpensiveSymbol,
      readableConversionRate: readableConversionRate,
      conversionRateString: conversionRateString,
    };
    return parsedReceipt;
  }
}

export async function parseMintEthersReceipt(
  provider: JsonRpcProvider,
  receipt: EthersTokenReceipt | EthersNativeReceipt
): Promise<ParsedMintReceipt> {
  //   const provider = new ethers.providers.JsonRpcProvider(NODE_URL);

  // receipts for native ETH mints only have one log
  if (receipt.logs.length === 1) {
    // console.log("native tx");
    // console.log("receipt: " + JSON.stringify(receipt));
    const blockNumber = receipt.blockNumber;

    const timestamp = (await provider.getBlock(blockNumber)).timestamp;

    const txHash = receipt.transactionHash;
    // const tx = await provider.getTransaction(transactionHash);
    // console.log({ tx });
    // const txValueInWei = tx.value;
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
    // const baseQty = txValueInWei;
    // const quoteDecimals = 8;

    const baseAddress = "0x0000000000000000000000000000000000000000";
    const quoteAddress = logs[0].address.toLowerCase();

    // const baseContract = new ethers.Contract(baseAddress, ERC20_ABI, provider);
    const quoteContract = new ethers.Contract(
      quoteAddress,
      ERC20_ABI,
      provider
    );

    // const baseDecimals = 18;
    const quoteDecimals = await quoteContract.decimals();

    const baseSymbol = "ETH";
    const quoteSymbol = await quoteContract.symbol();

    // const baseQtyUnscaled = parseFloat(
    //   toDisplayQty(baseQty.toString(), baseDecimals)
    // );
    const baseQtyUnscaled = 0;

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
    // const quoteSender = ethers.utils
    //   .hexStripZeros(logs[0].topics[1])
    //   .toLowerCase();
    // const quoteReceiver = ethers.utils.hexStripZeros(events[1].raw.topics[2]);

    const parsedReceipt: ParsedMintReceipt = {
      blockNumber: blockNumber,
      timestamp: timestamp,
      txHash: txHash,
      gasUsed: gasUsed,
      gasPriceInGwei: parseFloat(effectiveGasPriceInGwei),
      gasCostInEther: parseFloat(gasCostInEther),
      status: status,
      tokenAQtyUnscaled: baseQtyUnscaled,
      tokenBQtyUnscaled: quoteQtyUnscaled,
      baseTokenAddress: baseAddress,
      baseTokenSymbol: baseSymbol,
      quoteTokenAddress: quoteAddress,
      quoteTokenSymbol: quoteSymbol,
    };
    return parsedReceipt;
  } else if (receipt.logs.length === 0) {
    // console.log("receipt: " + JSON.stringify(receipt));
    // console.log("token receipt");
    const blockNumber = receipt.blockNumber;

    const timestamp = (await provider.getBlock(blockNumber)).timestamp;

    const txHash = receipt.transactionHash;

    const gasUsed = receipt.gasUsed.toNumber();
    const effectiveGasPrice = receipt.effectiveGasPrice.toNumber();
    const effectiveGasPriceInGwei = ethers.utils.formatUnits(
      effectiveGasPrice,
      "gwei"
    );
    const gasCostInWei = gasUsed * effectiveGasPrice;
    const gasCostInEther = ethers.utils.formatEther(gasCostInWei.toString());

    const status = receipt.status === 1 ? true : false;

    // let tokenBQtyUnscaled, tokenBSymbol, tokenASymbol;

    // let lessExpensiveSymbol, moreExpensiveSymbol;
    // let readableConversionRate;

    // const conversionRateString = `Swapped ${tokenAQtyUnscaled} ${tokenASymbol} for ${tokenBQtyUnscaled} ${tokenBSymbol} at a rate of ${readableConversionRate} ${lessExpensiveSymbol} per ${moreExpensiveSymbol}`;

    const parsedReceipt: ParsedMintReceipt = {
      blockNumber: blockNumber,
      timestamp: timestamp,
      txHash: txHash,
      gasUsed: gasUsed,
      gasPriceInGwei: parseFloat(effectiveGasPriceInGwei),
      gasCostInEther: parseFloat(gasCostInEther),
      status: status,
      tokenAQtyUnscaled: 0,
      tokenBQtyUnscaled: 0,
      baseTokenAddress: "xxx",
      baseTokenSymbol: "xxx",
      quoteTokenAddress: "xxx",
      quoteTokenSymbol: "xxx",
    };
    return parsedReceipt;
  } else {
    // console.log("receipt: " + JSON.stringify(receipt));
    // console.log("token receipt");
    const blockNumber = receipt.blockNumber;

    const timestamp = (await provider.getBlock(blockNumber)).timestamp;

    const txHash = receipt.transactionHash;

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

    let tokenAQtyUnscaled,
      tokenBQtyUnscaled,
      tokenAAddress,
      tokenBAddress,
      tokenBSymbol,
      tokenASymbol;

    if (quoteSender === contractAddresses["CROC_SWAP_ADDR"].toLowerCase()) {
      tokenBQtyUnscaled = quoteQtyUnscaled;
      tokenAQtyUnscaled = baseQtyUnscaled;
      tokenBAddress = quoteAddress;
      tokenAAddress = baseAddress;
      tokenBSymbol = quoteSymbol;
      tokenASymbol = baseSymbol;
    } else {
      tokenBQtyUnscaled = baseQtyUnscaled;
      tokenAQtyUnscaled = quoteQtyUnscaled;
      tokenBAddress = baseAddress;
      tokenAAddress = quoteAddress;
      tokenBSymbol = baseSymbol;
      tokenASymbol = quoteSymbol;
    }

    const parsedReceipt: ParsedMintReceipt = {
      blockNumber: blockNumber,
      timestamp: timestamp,
      txHash: txHash,
      gasUsed: gasUsed,
      gasPriceInGwei: parseFloat(effectiveGasPriceInGwei),
      gasCostInEther: parseFloat(gasCostInEther),
      status: status,
      tokenAQtyUnscaled: tokenAQtyUnscaled,
      tokenBQtyUnscaled: tokenBQtyUnscaled,
      baseTokenAddress: tokenAAddress,
      baseTokenSymbol: tokenASymbol,
      quoteTokenAddress: tokenBAddress,
      quoteTokenSymbol: tokenBSymbol,
    };
    return parsedReceipt;
  }
}
