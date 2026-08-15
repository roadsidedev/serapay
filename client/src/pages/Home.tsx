import { useAuth } from "@/_core/hooks/useAuth";
import { useSeraPrivy } from "@/contexts/PrivyContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLocale } from "@/contexts/LocaleContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActivityJournal } from "@/components/ActivityJournal";
import { VaultDialog } from "@/components/VaultDialog";
import { ProfilePreferences } from "@/components/ProfilePreferences";
import { ExploreLayer } from "@/components/ExploreLayer";
import { DeveloperStagingSuite } from "@/components/DeveloperStagingSuite";
import { AccountProfilePanel } from "@/components/AccountProfilePanel";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { createWalletActivityEntry, readWalletActivity, recordWalletActivity, type WalletActivityEntry } from "@/lib/walletActivity";
import { connectInjectedWallet, getWalletChainId, sendErc20Transaction, signSeraSwap, signTypedData } from "@/lib/walletClient";
import { miniAppCategories, miniAppPermissions, type MiniAppPermission } from "../../../shared/miniApps";
import { encodeErc20Transfer, parseTokenAmount, type SeraSwapIntent } from "../../../shared/wallet";
import { CORE_NAVIGATION, type CoreView } from "../../../shared/coreNavigation";
import { isSeraQuoteUsable, isSeraSettlementTerminal } from "../../../shared/sera";
import { QRCodeSVG } from "qrcode.react";
import {
  Activity,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clipboard,
  Code2,
  Copy,
  ExternalLink,
  FileCheck2,
  Globe2,
  Grid2X2,
  Layers3,
  Loader2,
  LockKeyhole,
  Moon,
  MoreHorizontal,
  Network,
  PanelLeftClose,
  Plus,
  ReceiptText,
  Rocket,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Store,
  Sun,
  WalletCards,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type View = CoreView;
type WalletNetwork = "mainnet" | "sepolia";

type SeraToken = {
  address: string;
  symbol: string;
  decimals: number;
  currency: string;
  min_trade_amount?: string;
};

type QuoteResponse = {
  uuid: string;
  route_params: SeraSwapIntent;
  output_amount?: string;
  min_output_amount?: string;
  fee_amount?: string;
  expires_at?: string;
  permit?: {
    permit_supported?: boolean;
    permit_required?: boolean;
    suggested_deadline?: string | number;
    eip712?: unknown;
  };
};

const navigation = CORE_NAVIGATION.map(item => ({ ...item, icon: item.id === "wallet" ? WalletCards : item.id === "explore" ? Grid2X2 : Settings2 }));

const categoryAccent: Record<string, string> = {
  Payments: "bg-violet-500/15 text-violet-200 border-violet-400/20",
  Utilities: "bg-amber-500/15 text-amber-200 border-amber-400/20",
  Exchange: "bg-teal-500/15 text-teal-200 border-teal-400/20",
  Trading: "bg-sky-500/15 text-sky-200 border-sky-400/20",
  Savings: "bg-emerald-500/15 text-emerald-200 border-emerald-400/20",
  Yield: "bg-pink-500/15 text-pink-200 border-pink-400/20",
};

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function safeNumber(value: string | number | undefined) {
  const parsed = Number(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmount(value: string | number | undefined, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(safeNumber(value));
}

function WalletMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-white text-black shadow-[0_10px_24px_rgba(255,255,255,0.12)]">
        <span className="relative z-10 text-base font-black leading-none">S</span><span className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-black/35" />
      </div>
      {!compact ? (
        <div>
          <p className="font-semibold tracking-tight text-white">SeraPay</p>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/35">Experience layer</p>
        </div>
      ) : null}
    </div>
  );
}

function SideNavigation({ activeView, setActiveView }: { activeView: View; setActiveView: (view: View) => void }) {
  const { copy } = useLocale();
  return (
    <aside className="hidden w-[246px] shrink-0 border-r border-white/10 bg-black px-3 py-5 lg:flex lg:flex-col">
      <div className="px-3"><WalletMark /></div>
      <nav className="mt-10 space-y-1">
        {navigation.map(item => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                "flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm transition-colors",
                active ? "bg-white text-black" : "text-white/55 hover:bg-white/[0.08] hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{copy[item.id]}</span>
            </button>
          );
        })}
      </nav>
      <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
        <div className="flex items-center gap-2 text-xs font-medium text-white"><Sparkles className="h-3.5 w-3.5" /> Built on Sera</div>
        <p className="mt-2 text-xs leading-5 text-white/45">A focused stablecoin experience for Ethereum Mainnet.</p>
      </div>
    </aside>
  );
}

function TopBar({ address, avatarUrl = null, displayName = null, onConnect, onReceive, isConnecting }: { address: string | null; avatarUrl?: string | null; displayName?: string | null; network?: WalletNetwork; onConnect: () => void; onReceive: () => void; isConnecting: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const profileInitial = (displayName ?? address?.slice(2, 3) ?? "S").slice(0, 1).toUpperCase();
  return (
    <header className="flex h-[72px] items-center justify-between border-b border-white/10 px-4 sm:px-7">
      <div className="lg:hidden"><WalletMark compact /></div>
      <div className="hidden lg:flex items-center gap-2 text-xs text-white/45"><span>SeraPay</span><ChevronRight className="h-3.5 w-3.5" /><span className="text-white/80">Wallet</span></div>
      <div className="flex items-center gap-2 sm:gap-3">
        <button onClick={toggleTheme} aria-label="Toggle color theme" className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white/70 transition hover:bg-white hover:text-black">{theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</button>
        {address ? (
          <button onClick={onReceive} aria-label="View wallet receive address" className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] py-1.5 pl-1.5 pr-3 text-xs font-medium text-white/85 transition hover:bg-white hover:text-black"><span className="grid h-6 w-6 place-items-center overflow-hidden rounded-full bg-white text-[10px] font-black text-black">{avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : profileInitial}</span><span className="hidden sm:inline">{shortenAddress(address)}</span></button>
        ) : (
          <Button onClick={onConnect} disabled={isConnecting} className="h-9 rounded-full bg-white px-4 text-xs font-semibold text-black hover:bg-white/85">{isConnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <WalletCards className="mr-1.5 h-3.5 w-3.5" />} Connect wallet</Button>
        )}
      </div>
    </header>
  );
}

function ReceiveDialog({ address, open, onOpenChange }: { address: string | null; open: boolean; onOpenChange: (value: boolean) => void }) {
  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    toast.success("Wallet address copied");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-white/10 bg-[#111916] p-0 text-white">
        <DialogHeader className="border-b border-white/[0.07] p-6 text-left"><DialogTitle className="text-lg">Receive stablecoins</DialogTitle><DialogDescription className="text-white/45">Send only supported Ethereum assets to this address.</DialogDescription></DialogHeader>
        <div className="space-y-5 p-6">
          <div className="mx-auto grid w-fit place-items-center rounded-2xl bg-white p-4 shadow-[0_0_38px_rgba(179,255,62,0.12)]">
            {address ? <QRCodeSVG value={`ethereum:${address}`} size={168} bgColor="#ffffff" fgColor="#0b1a0e" includeMargin={false} /> : <div className="grid h-[168px] w-[168px] place-items-center text-center text-xs text-slate-500">Connect a wallet to generate a receive QR.</div>}
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">Your Ethereum address</p>
            <p className="break-all font-mono text-xs leading-5 text-white/75">{address ?? "Not connected"}</p>
          </div>
          <Button onClick={copyAddress} disabled={!address} className="h-10 w-full rounded-xl bg-white text-black hover:bg-white/85"><Copy className="mr-2 h-4 w-4" />Copy address</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TokenGlyph({ symbol, size = "md" }: { symbol: string; size?: "sm" | "md" }) {
  return <span className={cn("grid shrink-0 place-items-center rounded-full border border-white/15 bg-white font-bold text-black", size === "sm" ? "h-7 w-7 text-[9px]" : "h-10 w-10 text-xs")}>{symbol.slice(0, 2)}</span>;
}

function WalletHome({ address, setView, onReceive, onSend, onSwap, onVault, balances, balancesLoading, tokens }: { address: string | null; network?: WalletNetwork; serverReadReady?: boolean; setView: (view: View) => void; onReceive: () => void; onSend: () => void; onSwap: () => void; onVault: () => void; balances: Array<{ symbol: string; currency: string; tokenAddress: string; walletBalance: string; vaultAvailable: string; vaultFrozen: string }>; balancesLoading: boolean; tokens: SeraToken[] }) {
  const { copy } = useLocale();
  const total = balances.reduce((sum, balance) => sum + safeNumber(balance.walletBalance) + safeNumber(balance.vaultAvailable), 0);
  const displayAssets = balances.length ? balances : tokens.slice(0, 6).map(token => ({ symbol: token.symbol, currency: token.currency, tokenAddress: token.address, walletBalance: "0", vaultAvailable: "0", vaultFrozen: "0" }));

  return (
    <section className="mx-auto max-w-[1320px] animate-in fade-in duration-300">
      <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">{copy.wallet}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{copy.stablecoinsOrganized}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/50">Balances, vault assets, and trusted Sera actions — while your wallet stays self-custodial.</p></div>
      <div className="mt-7 rounded-3xl border border-white/12 bg-white/[0.035] p-6 sm:p-8">
          <div className="flex items-start justify-between"><div><p className="text-sm text-white/50">Total stablecoin value</p><div className="mt-2 flex items-baseline gap-2"><span className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">${formatAmount(total)}</span><span className="text-xs text-white/40">wallet + vault</span></div></div><Badge variant="outline" className="border-white/15 text-white/70"><ShieldCheck className="mr-1 h-3 w-3" />Self-custodial</Badge></div>
          <div className="mt-9 grid grid-cols-4 gap-2 sm:gap-3">
            {[
              { label: "Receive", icon: ArrowDownLeft, onClick: onReceive },
              { label: "Send", icon: ArrowUpRight, onClick: onSend },
              { label: "Swap", icon: ArrowLeftRight, onClick: onSwap },
              { label: "Earn", icon: CircleDollarSign, onClick: onVault },
            ].map(action => { const Icon = action.icon; return <button key={action.label} onClick={action.onClick} className="group flex flex-col items-center gap-2 rounded-2xl border border-white/12 bg-black/20 px-2 py-3 text-xs text-white/60 transition hover:border-white hover:bg-white hover:text-black"><span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-white transition group-hover:border-black/10 group-hover:bg-black group-hover:text-white"><Icon className="h-4 w-4" /></span>{action.label}</button>; })}
          </div>
      </div>
      <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="font-medium text-white">Stablecoin balances</p><p className="mt-1 text-xs text-white/45">Wallet assets and Sera Vault positions remain separate.</p></div><Button variant="ghost" onClick={() => setView("account")} className="h-8 text-xs text-white/60 hover:bg-white/[0.08] hover:text-white">Activity <ChevronRight className="ml-1 h-3.5 w-3.5" /></Button></div>{balancesLoading ? <div className="grid place-items-center py-12 text-sm text-white/45"><Loader2 className="mb-2 h-5 w-5 animate-spin text-white" />Loading balances…</div> : <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-3">{displayAssets.map(asset => <div key={`${asset.symbol}-${asset.tokenAddress}`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5"><div className="flex items-center gap-3"><TokenGlyph symbol={asset.symbol} size="sm" /><div><p className="text-sm font-medium text-white">{asset.symbol}</p><p className="mt-0.5 text-[11px] text-white/40">{asset.currency} · Vault {formatAmount(asset.vaultAvailable)}</p></div></div><div className="text-right"><p className="font-mono text-sm text-white/85">{formatAmount(asset.walletBalance, 4)}</p><p className="mt-0.5 text-[11px] text-white/40">available</p></div></div>)}</div>}</div>
      <EarnSurface balances={displayAssets} onVault={onVault} />
      <FxRatesCard />
      {!address ? <div className="mt-5 rounded-2xl border border-dashed border-white/[0.14] bg-white/[0.02] p-4 text-center text-sm text-white/45">Continue with your social account to create a SeraPay wallet and load supported stablecoin balances.</div> : null}
    </section>
  );
}

function EarnSurface({ balances, onVault }: { balances: Array<{ symbol: string; vaultAvailable: string; walletBalance: string }>; onVault: () => void }) {
  const vaultValue = balances.reduce((sum, balance) => sum + safeNumber(balance.vaultAvailable), 0);
  const supportedAssets = balances.filter(balance => safeNumber(balance.walletBalance) > 0 || safeNumber(balance.vaultAvailable) > 0).slice(0, 3);
  return <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white text-black"><CircleDollarSign className="h-5 w-5" /></div><div><div className="flex items-center gap-2"><p className="font-medium text-white">Earn with Sera Vault</p><Badge variant="outline" className="border-white/15 text-white/60">Liquidity</Badge></div><p className="mt-1 max-w-xl text-xs leading-5 text-white/48">Supply supported stablecoins to the Sera Vault. Review the transaction and sign in your wallet before anything moves.</p></div></div><div className="flex items-center justify-between gap-4 sm:justify-end"><div className="text-right"><p className="text-[11px] uppercase tracking-[0.14em] text-white/40">In vault</p><p className="mt-1 text-xl font-semibold text-white">${formatAmount(vaultValue)}</p></div><Button onClick={onVault} className="h-10 rounded-xl bg-white text-black hover:bg-white/85">Open Vault <ChevronRight className="ml-1 h-3.5 w-3.5" /></Button></div></div>{supportedAssets.length ? <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{supportedAssets.map(asset => <div key={asset.symbol} className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2"><TokenGlyph symbol={asset.symbol} size="sm" /><span className="text-xs text-white/70">{asset.symbol}</span><span className="font-mono text-xs text-white">{formatAmount(asset.vaultAvailable)}</span></div>)}</div> : <p className="mt-5 text-xs text-white/40">Your eligible wallet assets appear here when a connected wallet is loaded.</p>}</section>;
}

function FxRatesCard() {
  const marketsQuery = trpc.sera.markets.useQuery(undefined, { retry: 1 });
  const markets = ((marketsQuery.data as { markets?: Array<Record<string, unknown>> } | undefined)?.markets ?? []).slice(0, 6);
  const getMarketLabel = (market: Record<string, unknown>) => String(market.symbol ?? market.name ?? market.market ?? `${market.base_currency ?? market.base ?? "—"}/${market.quote_currency ?? market.quote ?? "—"}`);
  const getMarketRate = (market: Record<string, unknown>) => market.price ?? market.rate ?? market.mid_price ?? market.last_price ?? null;

  return <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="font-medium text-white">Live FX exchange rates</p><p className="mt-1 text-xs text-white/45">Protocol markets supplied by Sera.</p></div><button className="text-xs font-medium text-white underline-offset-4 hover:underline" onClick={() => marketsQuery.refetch()}>Refresh</button></div>{marketsQuery.isLoading ? <div className="grid place-items-center py-8 text-xs text-white/50"><Loader2 className="mb-2 h-4 w-4 animate-spin text-white" />Reading markets…</div> : marketsQuery.error ? <p className="mt-5 text-xs leading-5 text-white/60">FX market data is temporarily unavailable: {marketsQuery.error.message}</p> : !markets.length ? <p className="mt-5 text-xs leading-5 text-white/45">No published Sera FX markets are available yet.</p> : <div className="mt-5 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">{markets.map((market, index) => <div key={`${getMarketLabel(market)}-${index}`} className="min-w-[168px] snap-start rounded-2xl border border-white/10 bg-black/20 px-4 py-3 sm:min-w-0"><div className="flex items-center justify-between"><span className="text-sm font-medium text-white">{getMarketLabel(market)}</span><span className="text-[10px] uppercase tracking-wide text-white/45">Live</span></div><p className="mt-2 font-mono text-base text-white">{getMarketRate(market) === null ? "—" : String(getMarketRate(market))}</p></div>)}</div>}</section>;
}


function SwapView({ address, network, tokens, onActivity }: { address: string | null; network: WalletNetwork; tokens: SeraToken[]; onActivity: (entry: WalletActivityEntry) => void }) {
  const [fromToken, setFromToken] = useState("");
  const [toToken, setToToken] = useState("");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [swapStatus, setSwapStatus] = useState<"idle" | "submitting" | "submitted" | "settled" | "failed">("idle");
  const [submittedUuid, setSubmittedUuid] = useState<string | null>(null);
  const [swapStatusDetail, setSwapStatusDetail] = useState("");
  const quoteMutation = trpc.sera.quote.useMutation();
  const executeMutation = trpc.sera.executeSwap.useMutation();
  const routeStatusQuery = trpc.sera.orderByRouteUuid.useQuery(
    { walletAddress: address ?? "0x0000000000000000000000000000000000000000", uuid: submittedUuid ?? "pending" },
    { enabled: false, retry: false },
  );
  const selectedFrom = tokens.find(token => token.address === fromToken);
  const selectedTo = tokens.find(token => token.address === toToken);

  useEffect(() => {
    if (!fromToken && tokens.length) setFromToken(tokens[0].address);
    if (!toToken && tokens.length > 1) setToToken(tokens[1].address);
  }, [fromToken, toToken, tokens]);

  const getQuote = async () => {
    if (!address || !selectedFrom || !selectedTo) return toast.error("Connect a wallet and select a token pair first.");
    if (network !== "mainnet") return toast.error("Sera swaps use the documented Ethereum Mainnet signing domain.");
    try {
      const fromAmount = parseTokenAmount(amount, selectedFrom.decimals);
      const result = await quoteMutation.mutateAsync({ fromToken, toToken, fromAmount, ownerAddress: address, recipient: address, expiration: Math.floor(Date.now() / 1000) + 30, gasMode: "receive_less" });
      setQuote(result as QuoteResponse);
      setSwapStatus("idle");
      toast.success("Fresh Sera route ready for signature.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Quote could not be retrieved."); }
  };

  const executeSwap = async () => {
    if (!address || !quote) return;
    try {
      setSwapStatus("submitting");
      if (!isSeraQuoteUsable(quote.expires_at)) {
        setQuote(null);
        setConfirmOpen(false);
        throw new Error("This Sera quote has expired. Request a new quote before signing.");
      }
      const chainId = await getWalletChainId();
      if (chainId !== "0x1") throw new Error("Switch your wallet to Ethereum Mainnet before signing.");
      const signature = await signSeraSwap(address, quote.route_params);
      const permitRequired = Boolean(quote.permit?.permit_required);
      if (permitRequired && (!quote.permit?.permit_supported || !quote.permit.eip712 || !quote.permit.suggested_deadline)) {
        throw new Error("Sera requires a permit for this route, but the quote did not include a signable permit payload.");
      }
      const permitSignature = permitRequired ? await signTypedData(address, quote.permit?.eip712) : undefined;
      const permitDeadline = permitRequired ? Number(quote.permit?.suggested_deadline) : undefined;
      const result = await executeMutation.mutateAsync({ uuid: quote.uuid, signature, ...(permitSignature ? { permitSignature, permitDeadline } : {}) });
      toast.success("Swap submitted to Sera.", { description: typeof result === "object" && result ? "Track the outcome from Activity." : undefined });
      onActivity(createWalletActivityEntry({ kind: "swap", id: quote.uuid, label: `${selectedFrom?.symbol ?? "Asset"} → ${selectedTo?.symbol ?? "asset"} swap` }));
      setSubmittedUuid(quote.uuid);
      setSwapStatus("submitted");
      setSwapStatusDetail("Sera accepted the signed route. Refresh to query the latest matching order status.");
      setQuote(null);
      setConfirmOpen(false);
    } catch (error) { setSwapStatus("failed"); setSwapStatusDetail(error instanceof Error ? error.message : "Your swap was not submitted."); toast.error(error instanceof Error ? error.message : "Your swap was not submitted."); }
  };
  const refreshSwapStatus = async () => {
    if (!address || !submittedUuid) return;
    setSwapStatus("submitting");
    const refreshed = await routeStatusQuery.refetch();
    if (refreshed.error) {
      setSwapStatus("failed");
      setSwapStatusDetail(refreshed.error.message);
      return;
    }
    const latest = refreshed.data?.[0];
    if (!latest) {
      setSwapStatus("submitted");
      setSwapStatusDetail("Sera has not exposed a matching order yet. Refresh again shortly.");
      return;
    }
    const terminal = isSeraSettlementTerminal(latest.status);
    setSwapStatus(terminal ? "settled" : "submitted");
    setSwapStatusDetail(`Sera order status: ${latest.status}.`);
  };

  return <><section className="mx-auto grid max-w-[1120px] gap-6 animate-in fade-in duration-300 lg:grid-cols-[1fr_0.78fr]"><div className="rounded-3xl border border-white/10 bg-black/20 p-5 sm:p-7"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Sera swap</p><h1 className="mt-2 text-3xl font-semibold text-white">Move value across currencies.</h1><p className="mt-2 text-sm leading-6 text-white/50">Request a Sera quote, sign the returned intent in your wallet, then submit the single-use route.</p><div className="mt-7 space-y-3"><TokenAmountCard label="You send" token={selectedFrom} value={amount} onChange={setAmount} tokens={tokens} selected={fromToken} onSelect={value => { setFromToken(value); setQuote(null); }} /><button onClick={() => { setFromToken(toToken); setToToken(fromToken); setQuote(null); }} className="relative z-10 mx-auto -my-5 grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-white/[0.05] text-white hover:bg-white hover:text-black"><ArrowLeftRight className="h-4 w-4" /></button><TokenAmountCard label="You receive" token={selectedTo} value={quote?.min_output_amount ?? quote?.output_amount ?? ""} readOnly tokens={tokens} selected={toToken} onSelect={value => { setToToken(value); setQuote(null); }} /></div><Button onClick={quote ? () => setConfirmOpen(true) : getQuote} disabled={quoteMutation.isPending || executeMutation.isPending || !tokens.length} className="mt-6 h-12 w-full rounded-xl bg-white font-semibold text-black hover:bg-white/85">{quoteMutation.isPending || executeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : quote ? <LockKeyhole className="mr-2 h-4 w-4" /> : <ArrowLeftRight className="mr-2 h-4 w-4" />}{quote ? "Review swap" : "Get Sera quote"}</Button></div><div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-white text-black"><ShieldCheck className="h-5 w-5" /></div><div><p className="font-medium text-white">What you sign</p><p className="mt-1 text-xs leading-5 text-white/48">The quote returns an EIP-712 intent. SeraPay signs it in your wallet; a private key never enters the browser app or server.</p></div></div><div className="mt-5 space-y-3 border-t border-white/10 pt-5 text-xs"><SwapDetail label="Execution" value="Smart order routing" /><SwapDetail label="Gas mode" value="Receive less" /><SwapDetail label="Quote lifetime" value="120 seconds" /></div>{quote ? <div className="mt-5 rounded-2xl border border-white/15 bg-white/[0.04] p-4 text-xs text-white/70"><p className="font-medium">Signed route prepared</p><p className="mt-1 leading-5 text-white/55">This quote UUID can be used once. If signing or submission fails, request a new quote rather than retrying it.</p></div> : null}</div></section><Dialog open={confirmOpen} onOpenChange={setConfirmOpen}><DialogContent className="max-w-md border-white/15 bg-black text-white"><DialogHeader><DialogTitle>Review Sera swap</DialogTitle><DialogDescription className="text-white/50">Confirm the route details before opening your wallet’s EIP-712 signature prompt.</DialogDescription></DialogHeader><div className="space-y-3 pt-2 text-sm"><SwapDetail label="Send" value={`${amount || "0"} ${selectedFrom?.symbol ?? ""}`} /><SwapDetail label="Minimum receive" value={`${quote?.min_output_amount ?? quote?.output_amount ?? "—"} ${selectedTo?.symbol ?? ""}`} /><SwapDetail label="Route UUID" value={quote?.uuid ?? "—"} /></div><Button onClick={executeSwap} disabled={executeMutation.isPending} className="mt-3 h-11 w-full rounded-xl bg-white text-black hover:bg-white/85">{executeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LockKeyhole className="mr-2 h-4 w-4" />}Sign in wallet & submit</Button></DialogContent></Dialog><SwapSubmissionPanel status={swapStatus} uuid={submittedUuid} detail={swapStatusDetail} onRefresh={refreshSwapStatus} /></>;
}

function TokenAmountCard({ label, token, value, onChange, tokens, selected, onSelect, readOnly = false }: { label: string; token?: SeraToken; value: string; onChange?: (value: string) => void; tokens: SeraToken[]; selected: string; onSelect: (value: string) => void; readOnly?: boolean }) {
  return <div className="rounded-2xl border border-white/[0.09] bg-black/20 p-4"><div className="flex items-center justify-between"><p className="text-xs text-white/42">{label}</p><p className="text-[11px] text-white/28">{token?.currency ?? "Select asset"}</p></div><div className="mt-3 flex items-center gap-3"><Input value={value} onChange={event => onChange?.(event.target.value)} readOnly={readOnly} inputMode="decimal" placeholder="0.00" className="h-10 flex-1 border-0 bg-transparent p-0 text-2xl font-medium text-white placeholder:text-white/20 focus-visible:ring-0" /><Select value={selected} onValueChange={onSelect}><SelectTrigger className="h-11 w-[142px] rounded-xl border-white/[0.09] bg-white/[0.06] text-white"><SelectValue placeholder="Choose" /></SelectTrigger><SelectContent>{tokens.map(item => <SelectItem key={item.address} value={item.address}>{item.symbol} · {item.currency}</SelectItem>)}</SelectContent></Select></div></div>;
}

function SwapDetail({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between"><span className="text-white/38">{label}</span><span className="text-white/70">{label === "Quote lifetime" ? "About 30 seconds" : value}</span></div>; }

function SwapSubmissionPanel({ status, uuid, detail, onRefresh }: { status: "idle" | "submitting" | "submitted" | "settled" | "failed"; uuid: string | null; detail: string; onRefresh: () => void }) {
  if (status === "idle") return null;
  const title = status === "submitting" ? "Refreshing Sera route" : status === "submitted" ? "Route submitted" : status === "settled" ? "Sera reports settlement" : "Submission needs attention";
  const copy = status === "submitting" ? "SeraPay is asking the authenticated Sera adapter for the latest matching order." : status === "submitted" ? "The route UUID is recorded locally and can be rechecked against Sera." : status === "settled" ? "The latest Sera order response reports a terminal settlement state." : "The route was not submitted or its status could not be refreshed. Request a new quote before another signature.";
  return <div className={cn("mx-auto mt-6 max-w-[1120px] rounded-2xl border p-4", status === "failed" ? "border-red-300/25 bg-red-300/[0.08]" : "border-white/15 bg-white/[0.04]")}><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-white">{title}</p><p className="mt-1 text-xs leading-5 text-white/55">{detail || copy}{uuid ? ` Route UUID: ${uuid}.` : ""}</p></div><Button onClick={onRefresh} variant="outline" className="h-9 shrink-0 border-white/15 text-xs text-white/75 hover:bg-white hover:text-black">Refresh Sera status</Button></div></div>;
}

function EmptyState({ icon: Icon, title, copy }: { icon: typeof WalletCards; title: string; copy: string }) { return <div className="grid place-items-center px-6 py-16 text-center"><div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/60"><Icon className="h-4 w-4" /></div><h2 className="mt-4 text-sm font-medium text-white">{title}</h2><p className="mt-2 max-w-md text-sm leading-6 text-white/48">{copy}</p></div>; }

function MiniAppLaunchDialog({ app, open, onOpenChange }: { app: { name: string; launchUrl?: string; source: "sandbox" | "verified"; permissions: string[] } | null; open: boolean; onOpenChange: (value: boolean) => void }) {
  const sandboxSource = `<!doctype html><html><head><style>body{margin:0;background:#080808;color:#f7f7f7;font-family:Inter,system-ui;padding:28px}.pill{display:inline-block;padding:5px 9px;border:1px solid #ffffff33;border-radius:99px;color:#f7f7f7;font-size:12px}.card{margin-top:20px;padding:18px;border:1px solid #ffffff22;border-radius:16px;background:#111}.value{font-size:28px;margin:8px 0;color:#fff}.button{width:100%;margin-top:14px;border:0;border-radius:12px;padding:12px;background:#fff;color:#111;font-weight:700}</style></head><body><span class='pill'>SeraPay sandbox</span><h2 style='margin:18px 0 4px'>Utility payment</h2><p style='color:#a0a0a0;line-height:1.5'>This local mini app runs inside the SeraPay shell and can request wallet capabilities without direct key access.</p><div class='card'><small style='color:#a0a0a0'>Available sandbox balance</small><div class='value'>USDC 0.00</div><small style='color:#a0a0a0'>No funds are accessible in sandbox mode.</small></div><button class='button' onclick='alert("The host wallet would show an explicit approval screen here.")'>Request payment approval</button></body></html>`;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="h-[min(760px,90vh)] max-w-4xl overflow-hidden border-white/15 bg-black p-0 text-white"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><p className="text-sm font-medium">{app?.name}</p><p className="mt-1 text-xs text-white/45">Contained mini-app session · {app?.permissions.join(", ")}</p></div><Badge variant="outline" className="border-white/15 text-white/70">Wallet bridge active</Badge></div><div className="h-[calc(100%-73px)] bg-black p-3"><iframe title={app?.name ?? "Mini app"} sandbox="allow-scripts allow-forms" className="h-full w-full rounded-xl border border-white/10 bg-black" src={app?.source === "sandbox" ? undefined : app?.launchUrl} srcDoc={app?.source === "sandbox" ? sandboxSource : undefined} /></div></DialogContent></Dialog>;
}

function DeveloperSubmission() {
  const { authenticated: isAuthenticated, configured, login } = useSeraPrivy();
  const [permissions, setPermissions] = useState<MiniAppPermission[]>(["wallet.read"]);
  const [category, setCategory] = useState<(typeof miniAppCategories)[number]>("Utilities");
  const [readiness, setReadiness] = useState<"idle" | "ready" | "needs-attention">("idle");
  const submission = trpc.miniApps.submit.useMutation({ onSuccess: () => toast.success("Mini app submitted for owner review.") });
  const draftValidation = trpc.miniApps.validateDraft.useMutation();
  const buildDraft = (form: HTMLFormElement) => {
    const data = new FormData(form);
    return {
      name: String(data.get("name") ?? ""), description: String(data.get("description") ?? ""), logoUrl: String(data.get("logoUrl") ?? ""), launchUrl: String(data.get("launchUrl") ?? ""), manifestUrl: String(data.get("manifestUrl") ?? ""), developerIdentity: String(data.get("developerIdentity") ?? ""), version: String(data.get("version") ?? ""), category, permissions, supportedCurrencies: String(data.get("supportedCurrencies") ?? "").split(",").map(value => value.trim().toUpperCase()).filter(Boolean),
    };
  };
  const validateDraft = async (form: HTMLFormElement) => {
    if (!form.reportValidity()) return;
    if (!isAuthenticated) {
      if (configured) login(); else toast.error("Set VITE_PRIVY_APP_ID to enable social onboarding.");
      return;
    }
    try {
      await draftValidation.mutateAsync(buildDraft(form));
      setReadiness("ready");
      toast.success("Draft validated: URLs, manifest, metadata, and permissions are ready for review.");
    } catch (error) {
      setReadiness("needs-attention");
      toast.error(error instanceof Error ? error.message : "Draft validation failed.");
    }
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAuthenticated) {
      if (configured) login(); else toast.error("Set VITE_PRIVY_APP_ID to enable social onboarding.");
      return;
    }
    try {
      await submission.mutateAsync(buildDraft(event.currentTarget));
      event.currentTarget.reset();
      setPermissions(["wallet.read"]);
      setReadiness("idle");
    } catch (error) { toast.error(error instanceof Error ? error.message : "The submission could not be saved."); }
  };
  const togglePermission = (permission: MiniAppPermission) => setPermissions(current => current.includes(permission) ? current.filter(item => item !== permission) : [...current, permission]);
  return <section className="rounded-2xl border border-white/10 bg-black/20 p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Submission</p><h2 className="mt-2 text-xl font-semibold text-white">Publish a mini app</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/50">Validate reachability, manifest metadata, and requested wallet permissions before owner review.</p></div><Code2 className="h-5 w-5 text-white" /></div><form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-2"><Field label="App name"><Input name="name" required placeholder="Utility desk" className="field-input" /></Field><Field label="Developer identity"><Input name="developerIdentity" required placeholder="Example Labs" className="field-input" /></Field><Field label="Launch URL"><Input name="launchUrl" required type="url" placeholder="https://app.example.com" className="field-input" /></Field><Field label="Manifest URL"><Input name="manifestUrl" required type="url" placeholder="https://app.example.com/manifest.json" className="field-input" /></Field><Field label="Logo URL"><Input name="logoUrl" required type="url" placeholder="https://app.example.com/logo.svg" className="field-input" /></Field><Field label="Version"><Input name="version" required placeholder="1.0.0" pattern="^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$" className="field-input" /></Field><Field label="Category"><Select value={category} onValueChange={value => setCategory(value as typeof category)}><SelectTrigger className="field-input"><SelectValue /></SelectTrigger><SelectContent>{miniAppCategories.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field><Field label="Supported currencies"><Input name="supportedCurrencies" required placeholder="USD, NGN, EUR" className="field-input" /></Field><Field label="Description" className="md:col-span-2"><Textarea name="description" required minLength={20} maxLength={500} placeholder="Explain the real user task your mini app solves." className="min-h-24 border-white/15 bg-black/30 text-white placeholder:text-white/25" /></Field><div className="md:col-span-2"><Label className="text-xs text-white/60">Requested wallet permissions</Label><div className="mt-3 flex flex-wrap gap-2">{miniAppPermissions.map(permission => <button type="button" key={permission} onClick={() => { setReadiness("idle"); togglePermission(permission); }} className={cn("rounded-full border px-3 py-1.5 text-xs transition", permissions.includes(permission) ? "border-white bg-white text-black" : "border-white/15 text-white/55 hover:border-white/40 hover:text-white")}>{permissions.includes(permission) ? <Check className="mr-1 inline h-3 w-3" /> : null}{permission}</button>)}</div></div><div className="mt-2 flex flex-col justify-between gap-4 border-t border-white/10 pt-5 md:col-span-2 md:flex-row md:items-center"><p className={cn("max-w-xl text-xs leading-5", readiness === "ready" ? "text-white" : readiness === "needs-attention" ? "text-white/70" : "text-white/45")}>{readiness === "ready" ? "Ready to submit: the current draft passed reachability and manifest validation." : readiness === "needs-attention" ? "Needs attention: update the draft and run validation again before submission." : "Sensitive wallet operations require explicit user approval in the host wallet. App code does not receive private keys or seed phrases."}</p><div className="flex shrink-0 gap-2"><Button type="button" onClick={event => { const form = event.currentTarget.form; if (form) validateDraft(form); }} disabled={draftValidation.isPending} variant="outline" className="h-10 border-white/15 text-white hover:bg-white hover:text-black">{draftValidation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Validate draft</Button><Button type="submit" disabled={submission.isPending} className="h-10 rounded-xl bg-white text-black hover:bg-white/85">{submission.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck2 className="mr-2 h-4 w-4" />}{isAuthenticated ? "Submit for review" : "Sign in to submit"}</Button></div></div></form></section>;
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) { return <div className={className}><Label className="text-xs text-white/52">{label}</Label><div className="mt-2">{children}</div></div>; }

function AdminReview() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const apps = trpc.miniApps.listForReview.useQuery(undefined, { enabled: isAdmin, retry: false });
  const utils = trpc.useUtils();
  const review = trpc.miniApps.review.useMutation({ onSuccess: () => { utils.miniApps.listForReview.invalidate(); utils.miniApps.listApproved.invalidate(); toast.success("Mini-app review recorded."); } });
  if (!isAdmin) return <section className="mx-auto max-w-[920px]"><EmptyState icon={LockKeyhole} title="Owner review access required" copy="This review queue is restricted to the SeraPay owner role." /></section>;
  return <section className="space-y-2"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Owner controls</p><h2 className="text-xl font-semibold text-white">Mini-app review queue</h2><p className="text-sm text-white/50">Review reachability, identity, manifest, and permission footprint before approval.</p><div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/20">{apps.isLoading ? <div className="grid place-items-center py-16 text-white/50"><Loader2 className="h-5 w-5 animate-spin" /></div> : !apps.data?.length ? <EmptyState icon={FileCheck2} title="No app submissions await review" copy="New developer submissions appear here after public URL validation completes." /> : apps.data.map(app => <div key={app.id} className="border-b border-white/10 p-5 last:border-b-0"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="flex items-center gap-2"><h3 className="font-medium text-white">{app.name}</h3><Badge variant="outline" className="border-white/15 text-white/60">{app.status}</Badge></div><p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">{app.description}</p><div className="mt-3 flex flex-wrap gap-2 text-xs text-white/45"><span>{app.developerIdentity}</span><span>·</span><a className="inline-flex items-center gap-1 hover:text-white" href={app.launchUrl} target="_blank" rel="noreferrer">Launch URL <ExternalLink className="h-3 w-3" /></a><span>·</span><span>{app.permissions.join(", ")}</span></div></div><div className="flex shrink-0 gap-2"><Button onClick={() => review.mutate({ id: app.id, status: "rejected" })} disabled={review.isPending || app.status !== "pending"} variant="outline" className="border-white/15 text-white/70 hover:bg-white hover:text-black">Reject</Button><Button onClick={() => review.mutate({ id: app.id, status: "approved" })} disabled={review.isPending || app.status !== "pending"} className="bg-white text-black hover:bg-white/85">Approve</Button></div></div></div>)}</div></section>;
}


function SendDialog({ address, open, onOpenChange, tokens, onActivity }: { address: string | null; open: boolean; onOpenChange: (value: boolean) => void; tokens: SeraToken[]; onActivity: (entry: WalletActivityEntry) => void }) {
  const [tokenAddress, setTokenAddress] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const selected = tokens.find(token => token.address === tokenAddress) ?? tokens[0];
  useEffect(() => { if (!tokenAddress && tokens.length) setTokenAddress(tokens[0].address); }, [tokenAddress, tokens]);
  const submit = async () => { if (!address || !selected) return toast.error("Connect a wallet and select an asset."); try { setSubmitting(true); const rawAmount = parseTokenAmount(amount, selected.decimals); const data = encodeErc20Transfer(recipient, rawAmount); const hash = await sendErc20Transaction(address, selected.address, data); onActivity(createWalletActivityEntry({ kind: "send", id: hash, label: `${amount} ${selected.symbol} sent` })); toast.success("ERC-20 transfer broadcast.", { description: shortenAddress(hash) }); onOpenChange(false); setAmount(""); setRecipient(""); } catch (error) { toast.error(error instanceof Error ? error.message : "Transfer could not be broadcast."); } finally { setSubmitting(false); } };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-md border-white/15 bg-black text-white"><DialogHeader><DialogTitle>Send stablecoin</DialogTitle><DialogDescription className="text-white/50">Review the asset, recipient, and amount before your wallet broadcasts the ERC-20 transfer.</DialogDescription></DialogHeader><div className="space-y-4 pt-2"><Field label="Asset"><Select value={selected?.address} onValueChange={setTokenAddress}><SelectTrigger className="field-input"><SelectValue /></SelectTrigger><SelectContent>{tokens.map(token => <SelectItem key={token.address} value={token.address}>{token.symbol} · {token.currency}</SelectItem>)}</SelectContent></Select></Field><Field label="Recipient"><Input value={recipient} onChange={event => setRecipient(event.target.value)} placeholder="0x…" className="field-input font-mono" /></Field><Field label="Amount"><Input value={amount} onChange={event => setAmount(event.target.value)} inputMode="decimal" placeholder="0.00" className="field-input" /></Field><div className="rounded-xl border border-white/15 bg-white/[0.04] p-3 text-xs leading-5 text-white/65"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" />This action asks your wallet to broadcast a standard ERC-20 transfer. Confirm the destination and amount in your wallet before approving.</div><Button onClick={submit} disabled={submitting || !tokens.length} className="h-11 w-full rounded-xl bg-white text-black hover:bg-white/85">{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Review & broadcast</Button></div></DialogContent></Dialog>;
}

function AccountView({ address, developerToolsOpen, isAdmin, onCloseDevConsole, onOpenDevConsole }: { address: string | null; developerToolsOpen: boolean; isAdmin: boolean; onCloseDevConsole: () => void; onOpenDevConsole: () => void }) {
  return <section className="mx-auto max-w-[1050px] space-y-5"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Account</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Settings & security</h1><p className="mt-2 text-sm text-white/50">Manage your SeraPay identity, regional experience, wallet security, and developer work.</p></div><AccountProfilePanel address={address} />{developerToolsOpen ? <section className="space-y-5 rounded-3xl border border-white/12 bg-white/[0.025] p-4 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Dev Console</p><h2 className="mt-1 text-lg font-semibold text-white">Build, stage, and publish</h2><p className="mt-1 max-w-xl text-sm leading-6 text-white/50">Preview inside a contained wallet shell, validate the manifest, and submit your mini app for review.</p></div><Button variant="outline" onClick={onCloseDevConsole} className="rounded-xl border-white/15 text-white hover:bg-white hover:text-black">Close console</Button></div><DeveloperStagingSuite /><DeveloperSubmission />{isAdmin ? <section className="border-t border-white/10 pt-5"><AdminReview /></section> : null}</section> : <button onClick={onOpenDevConsole} className="flex w-full items-center justify-between rounded-2xl border border-dashed border-white/20 bg-white/[0.02] px-5 py-4 text-left transition hover:border-white hover:bg-white/[0.06]"><span><span className="block text-sm font-medium text-white">Dev Console</span><span className="mt-1 block text-xs text-white/50">Build, stage, validate, and submit a mini app.</span></span><Code2 className="h-5 w-5 text-white/75" /></button>}</section>;
}

export default function Home() {
  const { user, isAuthenticated: previewAuthenticated } = useAuth();
  const { authenticated: privyAuthenticated, configured: privyConfigured, login: loginWithPrivy, walletAddress: embeddedWalletAddress, avatarUrl, displayName } = useSeraPrivy();
  const { copy } = useLocale();
  const isAuthenticated = privyConfigured ? privyAuthenticated : previewAuthenticated;
  const [activeView, setActiveView] = useState<View>("wallet");
  const [address, setAddress] = useState<string | null>(null);
  const network: WalletNetwork = "mainnet";
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [homeSwapOpen, setHomeSwapOpen] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [developerToolsOpen, setDeveloperToolsOpen] = useState(false);
  const [miniApp, setMiniApp] = useState<{ name: string; launchUrl?: string; source: "sandbox" | "verified"; permissions: string[] } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const tokenQuery = trpc.sera.tokens.useQuery(undefined, { retry: 1 });
  const statusQuery = trpc.sera.status.useQuery();
  const balancesQuery = trpc.sera.balances.useQuery(address ?? "", { enabled: Boolean(address && isAuthenticated && statusQuery.data?.readCredentialsConfigured), retry: false });
  const tokens = useMemo(() => ((tokenQuery.data as { tokens?: SeraToken[] } | undefined)?.tokens ?? []).filter(token => token.address && token.symbol), [tokenQuery.data]);
  useEffect(() => { if (embeddedWalletAddress) setAddress(embeddedWalletAddress); }, [embeddedWalletAddress]);
  const connectWallet = async () => {
    if (privyConfigured) {
      if (!privyAuthenticated) loginWithPrivy();
      else if (!embeddedWalletAddress) toast.message("Your Privy session is ready. Create or link an Ethereum wallet in the Privy flow to continue.");
      return;
    }
    try { setConnecting(true); const nextAddress = await connectInjectedWallet(); const chainId = await getWalletChainId(); if (chainId !== "0x1") { toast.error("SeraPay supports Ethereum Mainnet. Switch networks in your wallet and try again."); return; } setAddress(nextAddress); toast.success("Wallet connected", { description: shortenAddress(nextAddress) }); } catch (error) { toast.error(error instanceof Error ? error.message : "Wallet connection failed."); } finally { setConnecting(false); }
  };
  const recordActivity = (entry: WalletActivityEntry) => { recordWalletActivity(entry); };
  const openSend = () => setSendOpen(true);
  const isAdmin = user?.role === "admin";
  const content = activeView === "wallet" ? <WalletHome address={address} setView={setActiveView} onReceive={() => setReceiveOpen(true)} onSend={openSend} onSwap={() => setHomeSwapOpen(true)} onVault={() => setVaultOpen(true)} balances={balancesQuery.data ?? []} balancesLoading={balancesQuery.isLoading} tokens={tokens} /> : activeView === "explore" ? <ExploreLayer onLaunch={app => setMiniApp(app)} onBuild={() => setActiveView("account")} /> : <AccountView address={address} developerToolsOpen={developerToolsOpen} isAdmin={isAdmin} onOpenDevConsole={() => setDeveloperToolsOpen(true)} onCloseDevConsole={() => setDeveloperToolsOpen(false)} />;
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex min-h-screen">
        <SideNavigation activeView={activeView} setActiveView={setActiveView} />
        <div className="min-w-0 flex-1">
          <TopBar address={address} avatarUrl={avatarUrl} displayName={displayName} onConnect={connectWallet} onReceive={() => setReceiveOpen(true)} isConnecting={connecting} />
          <main className="px-4 py-7 pb-32 sm:px-7 lg:px-10 lg:py-9">
            {tokenQuery.error ? <div className="mb-5 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-xs text-white/70">Live Sera asset discovery is temporarily unavailable: {tokenQuery.error.message}</div> : null}
            {content}
          </main>
        </div>
      </div>
      <ReceiveDialog address={address} open={receiveOpen} onOpenChange={setReceiveOpen} />
      <SendDialog address={address} open={sendOpen} onOpenChange={setSendOpen} tokens={tokens} onActivity={recordActivity} />
      <VaultDialog address={address} open={vaultOpen} onOpenChange={setVaultOpen} tokens={tokens} onSubmitted={recordActivity} />
      <Dialog open={homeSwapOpen} onOpenChange={setHomeSwapOpen}><DialogContent className="h-[min(860px,94vh)] max-w-4xl overflow-y-auto border-white/15 bg-black p-4 text-white sm:p-6"><SwapView address={address} network={network} tokens={tokens} onActivity={recordActivity} /></DialogContent></Dialog>
      <MiniAppLaunchDialog app={miniApp} open={Boolean(miniApp)} onOpenChange={open => !open && setMiniApp(null)} />
      <nav aria-label="Primary navigation" className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-30 mx-auto flex max-w-sm items-center gap-1 rounded-2xl border border-white/15 bg-black/95 p-1.5 shadow-[0_16px_42px_rgba(0,0,0,0.5)] backdrop-blur-xl lg:hidden">
        {navigation.map(item => { const Icon = item.icon; const active = activeView === item.id; return <button key={item.id} onClick={() => setActiveView(item.id)} className={cn("grid min-h-12 flex-1 place-items-center gap-1 rounded-xl py-1 text-[10px] font-medium transition", active ? "bg-white text-black" : "text-white/50 hover:bg-white/[0.08] hover:text-white")}><Icon className="h-4 w-4" />{copy[item.id]}</button>; })}
      </nav>
    </div>
  );
}
