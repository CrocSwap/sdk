import { BigNumber, ethers, Signer } from "ethers";
import {
  CROC_ABI,
  // ERC20_ABI
} from "./abis";

import {
  getTokenDecimals,
  fromDisplayQty,
  // toDisplayQty,
  getBaseTokenAddress,
  getQuoteTokenAddress,
} from "./utils/token";
import { encodeCrocPrice, getSpotPrice } from "./utils/price";
import {
  // NODE_URL,
  POOL_PRIMARY,
  contractAddresses,
} from "./constants";

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
  qty: BigNumber | string | number,
  ethValue: BigNumber | string | number,
  slippageTolerance: number,
  POOL_IDX: number,
  signer: Signer
) {
  const minOut = 0;

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
  if (qty instanceof BigNumber) {
    crocQty = qty;
  } else {
    if (qtyIsSellToken) {
      crocQty = fromDisplayQty(qty, await getTokenDecimals(sellTokenAddress));
    } else {
      crocQty = fromDisplayQty(qty, await getTokenDecimals(buyTokenAddress));
    }
  }

  let ethBigNum;

  if (ethValue instanceof BigNumber) {
    ethBigNum = ethValue;
  } else {
    ethBigNum = fromDisplayQty(ethValue, 18);
  }

  const limitPrice = await getLimitPrice(
    sellTokenAddress,
    buyTokenAddress,
    slippageTolerance
  );

  // console.log({ baseTokenAddress });
  // console.log({ sellTokenIsBase });
  // console.log({ quoteTokenAddress });
  // console.log({ POOL_IDX });
  // console.log({ qtyIsBase });
  // console.log({ ethValue });
  // console.log({ crocQty });
  // console.log({ limitPrice });

  if (sellTokenAddress === contractAddresses.ZERO_ADDR) {
    tx = await crocContract.swap(
      baseTokenAddress,
      quoteTokenAddress,
      POOL_IDX,
      sellTokenIsBase, // ?? isBuy (i.e. converting base token for quote token)
      qtyIsBase, // qty is base token -- boolean whether qty represents BASE or QUOTE
      crocQty, // quantity of primary token
      BigNumber.from(0), // tip argument - set to 0
      limitPrice, // slippage-adjusted price client will accept
      minOut,
      0, // ?? surplus
      // { value: ethBigNum }
      {
        value: ethBigNum,
        // gasLimit: 1000000
      }
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
      BigNumber.from(0), // tip argument - set to 0
      limitPrice, // slippage-adjusted price client will accept
      minOut,
      0 // ?? surplus
      // { gasLimit: 1000000 }
    );
  }
  return tx;
}
