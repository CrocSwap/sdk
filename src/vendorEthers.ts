import { ethers, isCallException, isError } from "ethers";
import { CrocContext } from "./context";

export async function sendTransaction(cntx: CrocContext, populatedTx: ethers.ContractTransaction): Promise<ethers.TransactionResponse> {
  // Every Ethers provider is actually a JsonRpcApiProvider, so we can use
  // its methods when needed.
  const params = (cntx.provider as ethers.JsonRpcApiProvider).getRpcTransaction(populatedTx);
  return await ethers_sendTransaction(cntx, params);
}

// Almost exact copy of `ethers.providers.JsonRpcSigner.sendTransaction` which
// doesn't use the wallet provider for RPC calls, only to send the transaction.
//
// https://github.com/ethers-io/ethers.js/blob/v6.13.5/src.ts/providers/provider-jsonrpc.ts#L353-L415
export async function ethers_sendTransaction(cntx: CrocContext, txParams: ethers.JsonRpcTransactionRequest): Promise<ethers.TransactionResponse> {
  console.log('manual ethers_sendTransaction', txParams);
  const signer = cntx.actor;
  const walletProvider = signer.provider as ethers.JsonRpcApiProvider;
  if (!signer || !walletProvider)
    throw new Error("Wallet isn't connected");

  if (!txParams.from)
    txParams.from = (await signer.getAddress()).toLowerCase();

  // This cannot be mined any earlier than any recent block
  const blockNumber = await cntx.provider.getBlockNumber();

  // Send the transaction
  const hash = await walletProvider.send('eth_sendTransaction', [txParams]);

  // Unfortunately, JSON-RPC only provides and opaque transaction hash
  // for a response, and we need the actual transaction, so we poll
  // for it; it should show up very quickly
  return await (new Promise((resolve, reject) => {
    const timeouts = [1000, 100];
    let invalids = 0;

    const checkTx = async () => {

      try {
        // Try getting the transaction
        const tx = await cntx.provider.getTransaction(hash);

        if (tx != null) {
          resolve(tx.replaceableTransaction(blockNumber));
          return;
        }

      } catch (error) {

        // If we were cancelled: stop polling.
        // If the data is bad: the node returns bad transactions
        // If the network changed: calling again will also fail
        // If unsupported: likely destroyed
        if (isError(error, "CANCELLED") || isError(error, "BAD_DATA") ||
          isError(error, "NETWORK_ERROR") || isError(error, "UNSUPPORTED_OPERATION")) {

          if (error.info == null) { error.info = {}; }
          error.info.sendTransactionHash = hash;

          reject(error);
          return;
        }

        // Stop-gap for misbehaving backends; see #4513
        if (isError(error, "INVALID_ARGUMENT")) {
          invalids++;
          if (error.info == null) { error.info = {}; }
          error.info.sendTransactionHash = hash;
          if (invalids > 10) {
            reject(error);
            return;
          }
        }
      }

      // Wait another 4 seconds
      setTimeout(() => { checkTx(); }, timeouts.pop() || 4000);
    };
    checkTx();
  }));
}

// Almost exact copy of `ethers.contract.BaseContractMethod.staticCallResult`.
//
// https://github.com/ethers-io/ethers.js/blob/v6.13.5/src.ts/contract/contract.ts#L328-L347
export async function staticCall(cntx: CrocContext, populatedTx: ethers.ContractTransaction, contract: ethers.Contract, fragment: ethers.FunctionFragment): Promise<ethers.Result> {
  const runner = cntx.provider;

  let result = "0x";
  try {
    result = await runner.call(populatedTx);
  } catch (error: any) {
    if (isCallException(error) && error.data) {
      throw contract.interface.makeError(error.data, populatedTx);
    }
    throw error;
  }

  const decoded = contract.interface.decodeFunctionResult(fragment, result);
  return decoded.length == 1 ? decoded[0] : decoded;
};
