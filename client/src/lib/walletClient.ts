import { getSeraSwapTypedData, type SeraSwapIntent } from "../../../shared/wallet";

type RequestArguments = {
  method: string;
  params?: unknown[];
};

type InjectedProvider = {
  request: (request: RequestArguments) => Promise<unknown>;
};

type WalletWindow = Window & { ethereum?: InjectedProvider };

function requireProvider() {
  const provider = (window as WalletWindow).ethereum;
  if (!provider) throw new Error("No injected wallet was found. Install or unlock MetaMask, Rabby, or another compatible wallet.");
  return provider;
}

export async function connectInjectedWallet() {
  const provider = requireProvider();
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const address = accounts[0];
  if (!address) throw new Error("Your wallet did not return an account.");
  return address;
}

export async function getConnectedWallet() {
  const provider = requireProvider();
  const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
  return accounts[0] ?? null;
}

export async function getWalletChainId() {
  const provider = requireProvider();
  return (await provider.request({ method: "eth_chainId" })) as string;
}

export async function signSeraSwap(address: string, routeParams: SeraSwapIntent) {
  const typedData = getSeraSwapTypedData(routeParams);
  return signTypedData(address, typedData);
}

export async function signTypedData(address: string, typedData: unknown) {
  const provider = requireProvider();
  const signature = await provider.request({
    method: "eth_signTypedData_v4",
    params: [address, JSON.stringify(typedData)],
  });
  if (typeof signature !== "string") throw new Error("Your wallet did not return a signature.");
  return signature;
}

export type UnsignedEip1559Transaction = {
  to: string;
  data: string;
  value: string;
  chainId: string;
  nonce: string;
  gas: string;
  type: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
};

export async function signBuiltTransaction(from: string, transaction: UnsignedEip1559Transaction) {
  const provider = requireProvider();
  const signed = await provider.request({ method: "eth_signTransaction", params: [{ from, ...transaction }] });
  if (typeof signed !== "string") throw new Error("Your wallet did not return a signed transaction.");
  return signed;
}

export type TransactionReceipt = {
  transactionHash: string;
  blockNumber: string;
  status: "0x0" | "0x1" | string;
};

export async function getTransactionReceipt(transactionHash: string) {
  const provider = requireProvider();
  const receipt = await provider.request({ method: "eth_getTransactionReceipt", params: [transactionHash] });
  return (receipt ?? null) as TransactionReceipt | null;
}

export async function sendErc20Transaction(from: string, tokenAddress: string, transactionData: string) {
  const provider = requireProvider();
  const transactionHash = await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from,
        to: tokenAddress,
        data: transactionData,
        value: "0x0",
      },
    ],
  });
  if (typeof transactionHash !== "string") throw new Error("Your wallet did not return a transaction hash.");
  return transactionHash;
}
