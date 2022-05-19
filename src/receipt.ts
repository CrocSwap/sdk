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

export type ParsedMintReceipt = {
  blockNumber: number;
  timestamp: number;
  transactionHash: string;
  gasUsed: number;
  gasCostInEther: number;
  gasPriceInGwei: number;
  status: boolean;
  baseTokenAddress: string;
  quoteTokenAddress: string;
  baseTokenSymbol: string;
  baseQtyUnscaled: number;
  quoteTokenSymbol: string;
  quoteQtyUnscaled: number;
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

    // let buyQtyUnscaled, buySymbol, sellSymbol;

    // let lessExpensiveSymbol, moreExpensiveSymbol;
    // let readableConversionRate;

    // const conversionRateString = `Swapped ${sellQtyUnscaled} ${sellSymbol} for ${buyQtyUnscaled} ${buySymbol} at a rate of ${readableConversionRate} ${lessExpensiveSymbol} per ${moreExpensiveSymbol}`;
    const conversionRateString = `log length = 0`;

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

    const transactionHash = receipt.transactionHash;
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
      transactionHash: transactionHash,
      gasUsed: gasUsed,
      gasPriceInGwei: parseFloat(effectiveGasPriceInGwei),
      gasCostInEther: parseFloat(gasCostInEther),
      status: status,
      baseQtyUnscaled: baseQtyUnscaled,
      quoteQtyUnscaled: quoteQtyUnscaled,
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

    // let buyQtyUnscaled, buySymbol, sellSymbol;

    // let lessExpensiveSymbol, moreExpensiveSymbol;
    // let readableConversionRate;

    // const conversionRateString = `Swapped ${sellQtyUnscaled} ${sellSymbol} for ${buyQtyUnscaled} ${buySymbol} at a rate of ${readableConversionRate} ${lessExpensiveSymbol} per ${moreExpensiveSymbol}`;

    const parsedReceipt: ParsedMintReceipt = {
      blockNumber: blockNumber,
      timestamp: timestamp,
      transactionHash: transactionHash,
      gasUsed: gasUsed,
      gasPriceInGwei: parseFloat(effectiveGasPriceInGwei),
      gasCostInEther: parseFloat(gasCostInEther),
      status: status,
      baseQtyUnscaled: 0,
      quoteQtyUnscaled: 0,
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

    const parsedReceipt: ParsedMintReceipt = {
      blockNumber: blockNumber,
      timestamp: timestamp,
      transactionHash: transactionHash,
      gasUsed: gasUsed,
      gasPriceInGwei: parseFloat(effectiveGasPriceInGwei),
      gasCostInEther: parseFloat(gasCostInEther),
      status: status,
      baseQtyUnscaled: sellQtyUnscaled,
      quoteQtyUnscaled: buyQtyUnscaled,
      baseTokenAddress: sellAddress,
      baseTokenSymbol: sellSymbol,
      quoteTokenAddress: buyAddress,
      quoteTokenSymbol: buySymbol,
    };
    return parsedReceipt;
  }
}
