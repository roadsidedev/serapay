import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getErc2612PermitTypedData, getSeraWithdrawTypedData, parseTokenAmount, type Eip712Domain } from "../../../shared/wallet";
import { isSeraSettlementTerminal } from "../../../shared/sera";
import { trpc } from "@/lib/trpc";
import { getTransactionReceipt, signBuiltTransaction, signTypedData, type UnsignedEip1559Transaction } from "@/lib/walletClient";
import { Check, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export type VaultToken = {
  address: string;
  symbol: string;
  decimals: number;
  currency: string;
};

type VaultDialogProps = {
  address: string | null;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  tokens: VaultToken[];
  onSubmitted: (entry: { id: string; kind: "deposit" | "withdrawal"; label: string; status: "submitted"; createdAt: string }) => void;
};

type SeraConfig = {
  chain_id?: number;
  sera_address?: string;
  vault_address?: string;
  eip712_domain?: Eip712Domain;
};

type PermitMetadata = {
  permit_supported?: boolean;
  spender?: string;
  nonce?: number;
  domain?: Eip712Domain;
};

type BuiltTransactionResponse = { tx: UnsignedEip1559Transaction };
type SentTransactionResponse = { tx_hash?: string };

function getDomain(config: SeraConfig | undefined): Eip712Domain {
  if (config?.eip712_domain) return config.eip712_domain;
  if (!config?.sera_address || !config.chain_id) throw new Error("Sera configuration is not ready for EIP-712 signing.");
  return { name: "Sera", version: "1", chainId: config.chain_id, verifyingContract: config.sera_address };
}

export function VaultDialog({ address, open, onOpenChange, tokens, onSubmitted }: VaultDialogProps) {
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [tokenAddress, setTokenAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [stage, setStage] = useState<"review" | "preparing" | "signing" | "broadcasting" | "submitted" | "checkingSettlement" | "settled" | "failed">("review");
  const [settlementId, setSettlementId] = useState<string | null>(null);
  const [settlementDetail, setSettlementDetail] = useState("");
  const configQuery = trpc.sera.config.useQuery(undefined, { retry: false });
  const permitQuery = trpc.sera.permitMetadata.useQuery(
    { walletAddress: address ?? "0x0000000000000000000000000000000000000000", tokenAddress: tokenAddress || "0x0000000000000000000000000000000000000000" },
    { enabled: false, retry: false },
  );
  const buildApprove = trpc.sera.buildApprove.useMutation();
  const buildDeposit = trpc.sera.buildDeposit.useMutation();
  const sendBuiltTransaction = trpc.sera.sendBuiltTransaction.useMutation();
  const requestWithdrawal = trpc.sera.requestWithdrawal.useMutation();
  const buildWithdrawal = trpc.sera.buildWithdrawal.useMutation();
  const sendWithdrawal = trpc.sera.sendWithdrawal.useMutation();
  const settlementQuery = trpc.sera.activity.useQuery(address ?? "0x0000000000000000000000000000000000000000", { enabled: false, retry: false });
  const selectedToken = useMemo(() => tokens.find(token => token.address === tokenAddress) ?? tokens[0], [tokenAddress, tokens]);

  useEffect(() => { if (!tokenAddress && tokens.length) setTokenAddress(tokens[0].address); }, [tokenAddress, tokens]);
  useEffect(() => { if (address && !recipient) setRecipient(address); }, [address, recipient]);

  const submitDeposit = async () => {
    if (!address || !selectedToken) throw new Error("Connect a wallet and select an asset first.");
    const rawAmount = parseTokenAmount(amount, selectedToken.decimals);
    setStage("preparing");
    const metadataResult = await permitQuery.refetch();
    if (metadataResult.error) throw metadataResult.error;
    const permit = metadataResult.data as PermitMetadata | undefined;
    let builder: BuiltTransactionResponse;

    if (permit?.permit_supported && permit.domain && permit.spender && permit.nonce !== undefined) {
      const permitDeadline = Math.floor(Date.now() / 1000) + 600;
      setStage("signing");
      const permitSignature = await signTypedData(address, getErc2612PermitTypedData(permit.domain, { owner: address, spender: permit.spender, value: rawAmount, nonce: permit.nonce, deadline: permitDeadline }));
      builder = await buildDeposit.mutateAsync({ token: selectedToken.address, owner: address, amount: rawAmount, permitSignature, permitDeadline, permitAmount: rawAmount }) as BuiltTransactionResponse;
    } else {
      const vaultAddress = (configQuery.data as SeraConfig | undefined)?.vault_address;
      if (!vaultAddress) throw new Error("Sera Vault configuration is unavailable. Try again after server configuration loads.");
      const approval = await buildApprove.mutateAsync({ token: selectedToken.address, owner: address, spender: vaultAddress, amount: rawAmount }) as BuiltTransactionResponse;
      setStage("signing");
      const approvedRawTransaction = await signBuiltTransaction(address, approval.tx);
      setStage("broadcasting");
      await sendBuiltTransaction.mutateAsync({ rawTransaction: approvedRawTransaction });
      builder = await buildDeposit.mutateAsync({ token: selectedToken.address, owner: address, amount: rawAmount }) as BuiltTransactionResponse;
    }

    setStage("signing");
    const signedRawTransaction = await signBuiltTransaction(address, builder.tx);
    setStage("broadcasting");
    const sent = await sendBuiltTransaction.mutateAsync({ rawTransaction: signedRawTransaction }) as SentTransactionResponse;
    const id = sent.tx_hash ?? `deposit-${Date.now()}`;
    onSubmitted({ id, kind: "deposit", label: `${amount} ${selectedToken.symbol} deposited`, status: "submitted", createdAt: new Date().toISOString() });
    setSettlementId(id);
    setSettlementDetail("Transaction broadcast. Use the settlement check to refresh Sera activity for this transaction hash.");
    setStage("submitted");
    toast.success("Vault deposit broadcast.", { description: "Sera will report settlement in Activity." });
  };

  const submitWithdrawal = async () => {
    if (!address || !selectedToken) throw new Error("Connect a wallet and select an asset first.");
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) throw new Error("Enter a valid Ethereum recipient address.");
    const rawAmount = parseTokenAmount(amount, selectedToken.decimals);
    const intent = { user: address, tokens: [selectedToken.address], amounts: [rawAmount], recipient, deadline: String(Math.floor(Date.now() / 1000) + 600), uuid: String(Date.now()) };
    setStage("signing");
    const userSignature = await signTypedData(address, getSeraWithdrawTypedData(intent, getDomain(configQuery.data as SeraConfig | undefined)));
    setStage("preparing");
    const cosign = await requestWithdrawal.mutateAsync({ intent, userSignature }) as { executor_address: string; executor_signature: string };
    const builder = await buildWithdrawal.mutateAsync({ intent, userSignature, executor: cosign.executor_address, executorSignature: cosign.executor_signature }) as BuiltTransactionResponse;
    setStage("signing");
    const signedRawTransaction = await signBuiltTransaction(address, builder.tx);
    setStage("broadcasting");
    const sent = await sendWithdrawal.mutateAsync({ rawTransaction: signedRawTransaction }) as SentTransactionResponse;
    const id = sent.tx_hash ?? `withdrawal-${Date.now()}`;
    onSubmitted({ id, kind: "withdrawal", label: `${amount} ${selectedToken.symbol} withdrawn`, status: "submitted", createdAt: new Date().toISOString() });
    setSettlementId(id);
    setSettlementDetail("Transaction broadcast. Use the settlement check to refresh Sera activity for this transaction hash.");
    setStage("submitted");
    toast.success("Withdrawal broadcast.", { description: "Sera will report settlement in Activity." });
  };

  const submit = async () => {
    try {
      setSubmitting(true);
      if (mode === "deposit") await submitDeposit(); else await submitWithdrawal();
    } catch (error) {
      setStage("failed");
      toast.error(error instanceof Error ? error.message : "The vault transaction could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  const refreshSettlement = async () => {
    if (!settlementId) return;
    setStage("checkingSettlement");
    try {
      const receipt = await getTransactionReceipt(settlementId);
      if (!receipt) {
        setStage("submitted");
        setSettlementDetail("The signed Ethereum transaction is still pending confirmation. Check again shortly.");
        return;
      }
      if (receipt.status === "0x0") {
        setStage("failed");
        setSettlementDetail("The Ethereum transaction was reverted on-chain. No Vault settlement was completed.");
        return;
      }
      if (receipt.status === "0x1") {
        setStage("settled");
        setSettlementDetail(`Ethereum confirmed the Vault transaction in block ${Number.parseInt(receipt.blockNumber, 16)}. Sera activity remains available as a separate protected record.`);
        return;
      }
    } catch (error) {
      setStage("failed");
      setSettlementDetail(error instanceof Error ? error.message : "The connected wallet could not read the transaction receipt.");
      return;
    }
    const refreshed = await settlementQuery.refetch();
    if (refreshed.error) {
      setStage("failed");
      setSettlementDetail(refreshed.error.message);
      return;
    }
    const records = [...(refreshed.data?.orders ?? []), ...(refreshed.data?.fills ?? [])] as Array<{ status: string; txHash?: string }>;
    const matching = records.find(record => record.txHash?.toLowerCase() === settlementId.toLowerCase());
    if (!matching) {
      setStage("submitted");
      setSettlementDetail("Sera activity refreshed; settlement for this transaction has not been reported yet. Check again shortly.");
      return;
    }
    const terminal = isSeraSettlementTerminal(matching.status);
    setStage(terminal ? "settled" : "submitted");
    setSettlementDetail(`Sera activity status: ${matching.status}.`);
  };

  const stageCopy = stage === "preparing" ? "Preparing Sera transaction builders…" : stage === "signing" ? "Awaiting your wallet signature…" : stage === "broadcasting" ? "Broadcasting the signed transaction through Sera…" : stage === "checkingSettlement" ? "Refreshing the authenticated Sera activity feed…" : stage === "settled" ? "Sera reports a terminal settlement status for this transaction." : stage === "submitted" ? settlementDetail || "Transaction submitted. Check Sera activity for settlement." : stage === "failed" ? settlementDetail || "This attempt was not submitted. Review the inputs and request a fresh transaction." : "Review the selected asset, amount, and destination before requesting a wallet signature.";
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-md border-white/15 bg-black text-white"><DialogHeader><DialogTitle>Sera Vault</DialogTitle><DialogDescription className="text-white/50">{mode === "deposit" ? "Deposit using an ERC-2612 permit when supported, otherwise approve then deposit." : "Withdraw through Sera’s dual-signature instant-withdrawal flow."}</DialogDescription></DialogHeader><div className="mt-2 grid grid-cols-2 rounded-xl bg-white/[0.04] p-1 text-xs"><button onClick={() => { setMode("deposit"); setReviewing(false); setStage("review"); }} className={`rounded-lg px-3 py-2 ${mode === "deposit" ? "bg-white font-semibold text-black" : "text-white/50"}`}>Deposit</button><button onClick={() => { setMode("withdraw"); setReviewing(false); setStage("review"); }} className={`rounded-lg px-3 py-2 ${mode === "withdraw" ? "bg-white font-semibold text-black" : "text-white/50"}`}>Withdraw</button></div><div className="space-y-4 pt-4"><div><Label className="text-xs text-white/52">Asset</Label><Select value={selectedToken?.address} onValueChange={value => { setTokenAddress(value); setReviewing(false); setStage("review"); }}><SelectTrigger className="mt-2 h-10 border-white/15 bg-black/20 text-white"><SelectValue /></SelectTrigger><SelectContent>{tokens.map(token => <SelectItem key={token.address} value={token.address}>{token.symbol} · {token.currency}</SelectItem>)}</SelectContent></Select></div><div><Label className="text-xs text-white/52">Amount</Label><Input value={amount} onChange={event => { setAmount(event.target.value); setReviewing(false); setStage("review"); }} inputMode="decimal" placeholder="0.00" className="mt-2 h-10 border-white/15 bg-black/20 text-white placeholder:text-white/25" /></div>{mode === "withdraw" ? <div><Label className="text-xs text-white/52">Recipient</Label><Input value={recipient} onChange={event => { setRecipient(event.target.value); setReviewing(false); setStage("review"); }} placeholder="0x…" className="mt-2 h-10 border-white/15 bg-black/20 font-mono text-white placeholder:text-white/25" /></div> : null}<div className="rounded-xl border border-white/15 bg-white/[0.04] p-3 text-xs leading-5 text-white/65"><ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-white" />{mode === "deposit" ? "You sign permit, approval, and deposit transactions in your wallet. The server only builds and broadcasts signed transaction bytes." : "You sign the WithdrawIntent and final EIP-1559 transaction in your wallet. Sera’s executor only co-signs the same intent."}</div>{reviewing ? <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-white/60"><p className="font-medium text-white">Confirm vault transaction</p><p className="mt-1">{mode === "deposit" ? `Deposit ${amount || "0"} ${selectedToken?.symbol ?? ""} into Sera Vault.` : `Withdraw ${amount || "0"} ${selectedToken?.symbol ?? ""} to ${recipient || "your connected wallet"}.`}</p></div> : null}<div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/60">{stageCopy}</div><Button onClick={() => reviewing ? submit() : setReviewing(true)} disabled={submitting || !tokens.length || stage === "submitted" || stage === "checkingSettlement" || stage === "settled"} className="h-11 w-full rounded-xl bg-white text-black hover:bg-white/85">{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}{reviewing ? (mode === "deposit" ? "Confirm & sign deposit" : "Confirm & sign withdrawal") : (mode === "deposit" ? "Review deposit" : "Review withdrawal")}</Button>{stage === "submitted" ? <Button onClick={refreshSettlement} disabled={settlementQuery.isFetching} variant="outline" className="h-10 w-full border-white/15 bg-transparent text-white/75 hover:bg-white hover:text-black">{settlementQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Check Sera settlement</Button> : null}{stage === "submitted" || stage === "settled" ? <Button onClick={() => { setReviewing(false); setStage("review"); setAmount(""); setSettlementId(null); setSettlementDetail(""); }} variant="outline" className="h-10 w-full border-white/15 bg-transparent text-white/75 hover:bg-white hover:text-black">Start another transaction</Button> : null}</div></DialogContent></Dialog>;
}
