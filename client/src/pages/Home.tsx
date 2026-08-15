import { useAuth } from "@/_core/hooks/useAuth";
import { useSeraPrivy } from "@/contexts/PrivyContext";
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
import { connectInjectedWallet, getWalletChainId, sendErc20Transaction, signSeraSwap } from "@/lib/walletClient";
import { miniAppCategories, miniAppPermissions, type MiniAppPermission } from "../../../shared/miniApps";
import { encodeErc20Transfer, parseTokenAmount, type SeraSwapIntent } from "../../../shared/wallet";
import { CORE_NAVIGATION, type CoreView } from "../../../shared/coreNavigation";
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
  Menu,
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
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#b3ff3e] to-[#22c55e] text-[#09210d] shadow-[0_0_28px_rgba(179,255,62,0.25)]">
        <span className="text-base font-black leading-none">S</span>
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

function StatusDot({ className = "bg-[#b3ff3e]" }: { className?: string }) {
  return <span className={cn("inline-block h-1.5 w-1.5 rounded-full", className)} />;
}

function SideNavigation({ activeView, setActiveView }: { activeView: View; setActiveView: (view: View) => void }) {
  return (
    <aside className="hidden w-[246px] shrink-0 border-r border-white/[0.07] bg-[#0a0f0d] px-3 py-5 lg:flex lg:flex-col">
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
                active ? "bg-white/[0.09] text-white" : "text-white/45 hover:bg-white/[0.05] hover:text-white/80",
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-[#b3ff3e]" : "")} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="mt-auto rounded-2xl border border-[#b3ff3e]/15 bg-[#b3ff3e]/[0.05] p-3.5">
        <div className="flex items-center gap-2 text-xs font-medium text-[#d8ff9d]"><Sparkles className="h-3.5 w-3.5" /> Built on Sera</div>
        <p className="mt-2 text-xs leading-5 text-white/45">Non-custodial stablecoin FX, surfaced as one coherent experience.</p>
      </div>
    </aside>
  );
}

function TopBar({ address, network, onConnect, onReceive, isConnecting }: { address: string | null; network: WalletNetwork; onConnect: () => void; onReceive: () => void; isConnecting: boolean }) {
  return (
    <header className="flex h-[72px] items-center justify-between border-b border-white/[0.07] px-4 sm:px-7">
      <div className="lg:hidden"><WalletMark compact /></div>
      <div className="hidden lg:flex items-center gap-2 text-xs text-white/36"><span>Ethereum</span><ChevronRight className="h-3.5 w-3.5" /><span className="text-white/66">SeraPay</span></div>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-white/55 sm:flex"><StatusDot className={network === "mainnet" ? "bg-[#b3ff3e]" : "bg-amber-300"} /> Ethereum {network === "mainnet" ? "Mainnet" : "Sepolia"}</div>
        {address ? (
          <button onClick={onReceive} className="flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.04] py-1.5 pl-2 pr-3 text-xs font-medium text-white/82 hover:bg-white/[0.08]"><span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-[#b3ff3e] to-[#42b883] text-[9px] font-black text-[#08210d]">{address.slice(2, 3).toUpperCase()}</span>{shortenAddress(address)}</button>
        ) : (
          <Button onClick={onConnect} disabled={isConnecting} className="h-9 rounded-full bg-[#b3ff3e] px-4 text-xs font-semibold text-[#0b1a0e] hover:bg-[#c6ff66]">{isConnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <WalletCards className="mr-1.5 h-3.5 w-3.5" />} Connect wallet</Button>
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
          <Button onClick={copyAddress} disabled={!address} className="h-10 w-full rounded-xl bg-[#b3ff3e] text-[#0b1a0e] hover:bg-[#c6ff66]"><Copy className="mr-2 h-4 w-4" />Copy address</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TokenGlyph({ symbol, size = "md" }: { symbol: string; size?: "sm" | "md" }) {
  const palette = ["from-sky-400 to-blue-600", "from-emerald-300 to-teal-600", "from-amber-300 to-orange-600", "from-fuchsia-400 to-purple-600"];
  const index = symbol.charCodeAt(0) % palette.length;
  return <span className={cn("grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-bold text-[#09130b]", palette[index], size === "sm" ? "h-7 w-7 text-[9px]" : "h-10 w-10 text-xs")}>{symbol.slice(0, 2)}</span>;
}

function WalletHome({ address, network, setView, onReceive, onSend, onSwap, onVault, balances, balancesLoading, tokens, serverReadReady }: { address: string | null; network: WalletNetwork; setView: (view: View) => void; onReceive: () => void; onSend: () => void; onSwap: () => void; onVault: () => void; balances: Array<{ symbol: string; currency: string; tokenAddress: string; walletBalance: string; vaultAvailable: string; vaultFrozen: string }>; balancesLoading: boolean; tokens: SeraToken[]; serverReadReady: boolean }) {
  const total = balances.reduce((sum, balance) => sum + safeNumber(balance.walletBalance) + safeNumber(balance.vaultAvailable), 0);
  const displayAssets = balances.length ? balances : tokens.slice(0, 6).map(token => ({ symbol: token.symbol, currency: token.currency, tokenAddress: token.address, walletBalance: "0", vaultAvailable: "0", vaultFrozen: "0" }));

  return (
    <section className="mx-auto max-w-[1320px] animate-in fade-in duration-300">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div><p className="text-xs font-medium uppercase tracking-[0.2em] text-[#b3ff3e]">Your stablecoin command center</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Good {new Date().getHours() < 12 ? "morning" : "day"}.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/48">Manage stablecoin balances, settle FX with Sera, and launch apps without leaving your wallet.</p></div>
        <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1.5 text-xs"><span className="px-2 text-white/40">Network</span><span className="flex items-center gap-2 rounded-xl bg-white/[0.07] px-3 py-2 text-white/80"><Network className="h-3.5 w-3.5 text-[#b3ff3e]" />{network === "mainnet" ? "Ethereum Mainnet" : "Ethereum Sepolia"}</span></div>
      </div>
      <div className="mt-7 grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.10] bg-[radial-gradient(circle_at_85%_0%,rgba(179,255,62,0.15),transparent_37%),linear-gradient(145deg,#17251c,#0d1410_66%)] p-6 sm:p-8">
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full border border-[#b3ff3e]/10" /><div className="absolute -right-7 -top-7 h-28 w-28 rounded-full border border-[#b3ff3e]/15" />
          <div className="relative flex items-start justify-between"><div><p className="text-sm text-white/45">Total stablecoin value</p><div className="mt-2 flex items-baseline gap-2"><span className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">${formatAmount(total)}</span><span className="text-xs text-white/35">across wallet + vault</span></div></div><Badge className="border-[#b3ff3e]/20 bg-[#b3ff3e]/10 text-[#cbff88] hover:bg-[#b3ff3e]/10"><ShieldCheck className="mr-1 h-3 w-3" />Non-custodial</Badge></div>
          <div className="relative mt-9 grid grid-cols-4 gap-2 sm:gap-3">
            {[
              { label: "Receive", icon: ArrowDownLeft, onClick: onReceive },
              { label: "Send", icon: ArrowUpRight, onClick: onSend },
              { label: "Swap", icon: ArrowLeftRight, onClick: onSwap },
              { label: "Earn", icon: CircleDollarSign, onClick: onVault },
            ].map(action => { const Icon = action.icon; return <button key={action.label} onClick={action.onClick} className="group flex flex-col items-center gap-2 rounded-2xl border border-white/[0.09] bg-black/15 px-2 py-3 text-xs text-white/55 transition hover:border-[#b3ff3e]/25 hover:bg-[#b3ff3e]/[0.08] hover:text-white"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.06] text-white/70 transition group-hover:bg-[#b3ff3e] group-hover:text-[#0b1a0e]"><Icon className="h-4 w-4" /></span>{action.label}</button>; })}
          </div>
        </div>
        <div className="rounded-3xl border border-white/[0.08] bg-[#111815] p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-white">Wallet state</p><p className="mt-1 text-xs text-white/40">Live data from the Sera adapter.</p></div><div className="rounded-full border border-white/[0.09] bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/48">{serverReadReady ? "Read access ready" : "Credentials pending"}</div></div><div className="mt-6 space-y-3"><StateLine active={Boolean(address)} label="Injected wallet" detail={address ? shortenAddress(address) : "Not connected"} /><StateLine active={network === "mainnet"} label="Sera settlement" detail={network === "mainnet" ? "Ethereum Mainnet" : "Switch to Mainnet to trade"} /><StateLine active={serverReadReady} label="Sera read access" detail={serverReadReady ? "Balances + orders enabled" : "Awaiting server credentials"} /></div></div>
      </div>
      <div className="mt-8 rounded-3xl border border-white/[0.08] bg-[#101714] p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="font-medium text-white">Stablecoin balances</p><p className="mt-1 text-xs text-white/40">Wallet assets and Sera Vault positions remain separate.</p></div><Button variant="ghost" onClick={() => setView("account")} className="h-8 text-xs text-white/55 hover:bg-white/[0.06] hover:text-white">Account activity <ChevronRight className="ml-1 h-3.5 w-3.5" /></Button></div>{balancesLoading ? <div className="grid place-items-center py-12 text-sm text-white/45"><Loader2 className="mb-2 h-5 w-5 animate-spin text-[#b3ff3e]" />Loading Sera balances…</div> : <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-3">{displayAssets.map(asset => <div key={`${asset.symbol}-${asset.tokenAddress}`} className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-black/15 px-4 py-3.5"><div className="flex items-center gap-3"><TokenGlyph symbol={asset.symbol} size="sm" /><div><p className="text-sm font-medium text-white">{asset.symbol}</p><p className="mt-0.5 text-[11px] text-white/35">{asset.currency} · Vault {formatAmount(asset.vaultAvailable)}</p></div></div><div className="text-right"><p className="font-mono text-sm text-white/82">{formatAmount(asset.walletBalance, 4)}</p><p className="mt-0.5 text-[11px] text-white/35">available</p></div></div>)}</div>}</div>
      <EarnSurface balances={displayAssets} onVault={onVault} />
      <FxRatesCard />
      {!address ? <div className="mt-5 rounded-2xl border border-dashed border-white/[0.14] bg-white/[0.02] p-4 text-center text-sm text-white/45">Continue with your social account to create a SeraPay wallet and load supported stablecoin balances.</div> : null}
    </section>
  );
}

function EarnSurface({ balances, onVault }: { balances: Array<{ symbol: string; vaultAvailable: string; walletBalance: string }>; onVault: () => void }) {
  const vaultValue = balances.reduce((sum, balance) => sum + safeNumber(balance.vaultAvailable), 0);
  const supportedAssets = balances.filter(balance => safeNumber(balance.walletBalance) > 0 || safeNumber(balance.vaultAvailable) > 0).slice(0, 3);
  return <section className="mt-5 overflow-hidden rounded-3xl border border-[#b3ff3e]/15 bg-[radial-gradient(circle_at_100%_0%,rgba(179,255,62,0.14),transparent_38%),#111815] p-5 sm:p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#b3ff3e]/10 text-[#b3ff3e]"><CircleDollarSign className="h-5 w-5" /></div><div><div className="flex items-center gap-2"><p className="font-medium text-white">Earn with Sera Vault</p><Badge className="border-[#b3ff3e]/20 bg-[#b3ff3e]/10 text-[#d9ff9b] hover:bg-[#b3ff3e]/10">Liquidity</Badge></div><p className="mt-1 max-w-xl text-xs leading-5 text-white/42">Supply supported stablecoins to the Sera Vault. You review the transaction and sign it in your wallet before anything moves.</p></div></div><div className="flex items-center justify-between gap-4 sm:justify-end"><div className="text-right"><p className="text-[11px] uppercase tracking-[0.14em] text-white/35">In vault</p><p className="mt-1 text-xl font-semibold text-white">${formatAmount(vaultValue)}</p></div><Button onClick={onVault} className="h-10 rounded-xl bg-[#b3ff3e] text-[#0b1a0e] hover:bg-[#c6ff66]">Open Vault <ChevronRight className="ml-1 h-3.5 w-3.5" /></Button></div></div>{supportedAssets.length ? <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{supportedAssets.map(asset => <div key={asset.symbol} className="flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-black/15 px-3 py-2"><TokenGlyph symbol={asset.symbol} size="sm" /><span className="text-xs text-white/65">{asset.symbol}</span><span className="font-mono text-xs text-white">{formatAmount(asset.vaultAvailable)}</span></div>)}</div> : <p className="mt-5 text-xs text-white/35">Your eligible wallet assets will appear here once a connected wallet is loaded.</p>}</section>;
}

function FxRatesCard() {
  const marketsQuery = trpc.sera.markets.useQuery(undefined, { retry: 1 });
  const markets = ((marketsQuery.data as { markets?: Array<Record<string, unknown>> } | undefined)?.markets ?? []).slice(0, 6);
  const getMarketLabel = (market: Record<string, unknown>) => String(market.symbol ?? market.name ?? market.market ?? `${market.base_currency ?? market.base ?? "—"}/${market.quote_currency ?? market.quote ?? "—"}`);
  const getMarketRate = (market: Record<string, unknown>) => market.price ?? market.rate ?? market.mid_price ?? market.last_price ?? null;

  return <section className="mt-5 rounded-3xl border border-white/[0.08] bg-[#101714] p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="font-medium text-white">Live FX exchange rates</p><p className="mt-1 text-xs text-white/40">Protocol markets supplied by Sera.</p></div><button className="text-xs font-medium text-[#b3ff3e]" onClick={() => marketsQuery.refetch()}>Refresh</button></div>{marketsQuery.isLoading ? <div className="grid place-items-center py-8 text-xs text-white/45"><Loader2 className="mb-2 h-4 w-4 animate-spin text-[#b3ff3e]" />Reading markets…</div> : marketsQuery.error ? <p className="mt-5 text-xs leading-5 text-amber-100/70">FX market data is temporarily unavailable: {marketsQuery.error.message}</p> : !markets.length ? <p className="mt-5 text-xs leading-5 text-white/40">No published Sera FX markets are available for this network yet.</p> : <div className="mt-5 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">{markets.map((market, index) => <div key={`${getMarketLabel(market)}-${index}`} className="min-w-[168px] snap-start rounded-2xl border border-white/[0.07] bg-black/15 px-4 py-3 sm:min-w-0"><div className="flex items-center justify-between"><span className="text-sm font-medium text-white">{getMarketLabel(market)}</span><span className="text-[10px] uppercase tracking-wide text-white/35">Live</span></div><p className="mt-2 font-mono text-base text-[#d8ff9d]">{getMarketRate(market) === null ? "—" : String(getMarketRate(market))}</p></div>)}</div>}</section>;
}

function StateLine({ active, label, detail }: { active: boolean; label: string; detail: string }) {
  return <div className="flex items-center gap-3"><span className={cn("grid h-7 w-7 place-items-center rounded-full", active ? "bg-[#b3ff3e]/12 text-[#b3ff3e]" : "bg-white/[0.05] text-white/25")}>{active ? <Check className="h-3.5 w-3.5" /> : <MoreHorizontal className="h-3.5 w-3.5" />}</span><div><p className="text-xs font-medium text-white/75">{label}</p><p className="mt-0.5 text-[11px] text-white/35">{detail}</p></div></div>;
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
      const result = await quoteMutation.mutateAsync({ fromToken, toToken, fromAmount, ownerAddress: address, recipient: address, expiration: Math.floor(Date.now() / 1000) + 120, gasMode: "receive_less" });
      setQuote(result as QuoteResponse);
      setSwapStatus("idle");
      toast.success("Fresh Sera route ready for signature.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Quote could not be retrieved."); }
  };

  const executeSwap = async () => {
    if (!address || !quote) return;
    try {
      setSwapStatus("submitting");
      const chainId = await getWalletChainId();
      if (chainId !== "0x1") throw new Error("Switch your wallet to Ethereum Mainnet before signing.");
      const signature = await signSeraSwap(address, quote.route_params);
      const result = await executeMutation.mutateAsync({ uuid: quote.uuid, signature });
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
    const status = latest.status.toLowerCase();
    const terminal = ["settled", "filled", "completed", "complete", "success"].some(value => status.includes(value));
    setSwapStatus(terminal ? "settled" : "submitted");
    setSwapStatusDetail(`Sera order status: ${latest.status}.`);
  };

  return <><section className="mx-auto grid max-w-[1120px] gap-6 animate-in fade-in duration-300 lg:grid-cols-[1fr_0.78fr]"><div className="rounded-3xl border border-white/[0.09] bg-[#111815] p-5 sm:p-7"><p className="text-xs font-medium uppercase tracking-[0.2em] text-[#b3ff3e]">Sera swap</p><h1 className="mt-2 text-3xl font-semibold text-white">Move value across currencies.</h1><p className="mt-2 text-sm leading-6 text-white/45">Request a Sera quote, sign the returned intent in your wallet, then submit the single-use route.</p><div className="mt-7 space-y-3"><TokenAmountCard label="You send" token={selectedFrom} value={amount} onChange={setAmount} tokens={tokens} selected={fromToken} onSelect={value => { setFromToken(value); setQuote(null); }} /><button onClick={() => { setFromToken(toToken); setToToken(fromToken); setQuote(null); }} className="relative z-10 mx-auto -my-5 grid h-10 w-10 place-items-center rounded-xl border border-white/[0.10] bg-[#16201a] text-white/65 hover:border-[#b3ff3e]/40 hover:text-[#b3ff3e]"><ArrowLeftRight className="h-4 w-4" /></button><TokenAmountCard label="You receive" token={selectedTo} value={quote?.min_output_amount ?? quote?.output_amount ?? ""} readOnly tokens={tokens} selected={toToken} onSelect={value => { setToToken(value); setQuote(null); }} /></div><Button onClick={quote ? () => setConfirmOpen(true) : getQuote} disabled={quoteMutation.isPending || executeMutation.isPending || !tokens.length} className="mt-6 h-12 w-full rounded-xl bg-[#b3ff3e] font-semibold text-[#0b1a0e] hover:bg-[#c6ff66]">{quoteMutation.isPending || executeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : quote ? <LockKeyhole className="mr-2 h-4 w-4" /> : <ArrowLeftRight className="mr-2 h-4 w-4" />}{quote ? "Review swap" : "Get Sera quote"}</Button></div><div className="rounded-3xl border border-white/[0.08] bg-black/15 p-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#b3ff3e]/10 text-[#b3ff3e]"><ShieldCheck className="h-5 w-5" /></div><div><p className="font-medium text-white">What you sign</p><p className="mt-1 text-xs leading-5 text-white/40">The quote returns an EIP-712 intent. SeraPay signs it in your injected wallet; a private key never enters the browser app or server.</p></div></div><div className="mt-5 space-y-3 border-t border-white/[0.07] pt-5 text-xs"><SwapDetail label="Execution" value="Smart order routing" /><SwapDetail label="Gas mode" value="Receive less" /><SwapDetail label="Quote lifetime" value="120 seconds" /></div>{quote ? <div className="mt-5 rounded-2xl border border-[#b3ff3e]/15 bg-[#b3ff3e]/[0.05] p-4 text-xs text-[#dcffab]"><p className="font-medium">Signed route prepared</p><p className="mt-1 leading-5 text-white/55">This quote UUID can be used once. If signing or submission fails, request a new quote rather than retrying it.</p></div> : null}</div></section><Dialog open={confirmOpen} onOpenChange={setConfirmOpen}><DialogContent className="max-w-md border-white/10 bg-[#111916] text-white"><DialogHeader><DialogTitle>Review Sera swap</DialogTitle><DialogDescription className="text-white/45">Confirm the route details before opening your wallet’s EIP-712 signature prompt.</DialogDescription></DialogHeader><div className="space-y-3 pt-2 text-sm"><SwapDetail label="Send" value={`${amount || "0"} ${selectedFrom?.symbol ?? ""}`} /><SwapDetail label="Minimum receive" value={`${quote?.min_output_amount ?? quote?.output_amount ?? "—"} ${selectedTo?.symbol ?? ""}`} /><SwapDetail label="Route UUID" value={quote?.uuid ?? "—"} /></div><Button onClick={executeSwap} disabled={executeMutation.isPending} className="mt-3 h-11 w-full rounded-xl bg-[#b3ff3e] text-[#0b1a0e] hover:bg-[#c6ff66]">{executeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LockKeyhole className="mr-2 h-4 w-4" />}Sign in wallet & submit</Button></DialogContent></Dialog><SwapSubmissionPanel status={swapStatus} uuid={submittedUuid} detail={swapStatusDetail} onRefresh={refreshSwapStatus} /></>;
}

function TokenAmountCard({ label, token, value, onChange, tokens, selected, onSelect, readOnly = false }: { label: string; token?: SeraToken; value: string; onChange?: (value: string) => void; tokens: SeraToken[]; selected: string; onSelect: (value: string) => void; readOnly?: boolean }) {
  return <div className="rounded-2xl border border-white/[0.09] bg-black/20 p-4"><div className="flex items-center justify-between"><p className="text-xs text-white/42">{label}</p><p className="text-[11px] text-white/28">{token?.currency ?? "Select asset"}</p></div><div className="mt-3 flex items-center gap-3"><Input value={value} onChange={event => onChange?.(event.target.value)} readOnly={readOnly} inputMode="decimal" placeholder="0.00" className="h-10 flex-1 border-0 bg-transparent p-0 text-2xl font-medium text-white placeholder:text-white/20 focus-visible:ring-0" /><Select value={selected} onValueChange={onSelect}><SelectTrigger className="h-11 w-[142px] rounded-xl border-white/[0.09] bg-white/[0.06] text-white"><SelectValue placeholder="Choose" /></SelectTrigger><SelectContent>{tokens.map(item => <SelectItem key={item.address} value={item.address}>{item.symbol} · {item.currency}</SelectItem>)}</SelectContent></Select></div></div>;
}

function SwapDetail({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between"><span className="text-white/38">{label}</span><span className="text-white/70">{value}</span></div>; }

function SwapSubmissionPanel({ status, uuid, detail, onRefresh }: { status: "idle" | "submitting" | "submitted" | "settled" | "failed"; uuid: string | null; detail: string; onRefresh: () => void }) {
  if (status === "idle") return null;
  const title = status === "submitting" ? "Refreshing Sera route" : status === "submitted" ? "Route submitted" : status === "settled" ? "Sera reports settlement" : "Submission needs attention";
  const copy = status === "submitting" ? "SeraPay is asking the authenticated Sera adapter for the latest matching order." : status === "submitted" ? "The route UUID is recorded locally and can be rechecked against Sera." : status === "settled" ? "The latest Sera order response reports a terminal settlement state." : "The route was not submitted or its status could not be refreshed. Request a new quote before another signature.";
  return <div className={cn("mx-auto mt-6 max-w-[1120px] rounded-2xl border p-4", status === "submitted" || status === "settled" ? "border-[#b3ff3e]/20 bg-[#b3ff3e]/[0.05]" : status === "failed" ? "border-red-300/20 bg-red-300/[0.06]" : "border-amber-300/20 bg-amber-300/[0.06]")}><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-white">{title}</p><p className="mt-1 text-xs leading-5 text-white/52">{detail || copy}{uuid ? ` Route UUID: ${uuid}.` : ""}</p></div><Button onClick={onRefresh} variant="outline" className="h-9 shrink-0 border-white/[0.1] bg-transparent text-xs text-white/75 hover:bg-white/[0.06] hover:text-white">Refresh Sera status</Button></div></div>;
}

function ActivityView({ address, isAuthenticated }: { address: string | null; isAuthenticated: boolean }) {
  const activityQuery = trpc.sera.activity.useQuery(address ?? "", { enabled: Boolean(address && isAuthenticated), retry: false });
  const orders = ((activityQuery.data?.orders as { orders?: unknown[] } | undefined)?.orders ?? []) as Array<Record<string, unknown>>;
  const fills = ((activityQuery.data?.fills as { fills?: unknown[] } | undefined)?.fills ?? []) as Array<Record<string, unknown>>;
  const entries = [...orders.map(order => ({ type: "Order", status: String(order.status ?? "open"), id: String(order.order_id ?? order.id ?? "—"), timestamp: String(order.created_at ?? order.createdAt ?? "—") })), ...fills.map(fill => ({ type: "Fill", status: String(fill.status ?? "settled"), id: String(fill.fill_id ?? fill.id ?? "—"), timestamp: String(fill.created_at ?? fill.createdAt ?? "—") }))];
  return <section className="mx-auto max-w-[1100px] animate-in fade-in duration-300"><p className="text-xs font-medium uppercase tracking-[0.2em] text-[#b3ff3e]">Execution journal</p><div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-3xl font-semibold text-white">Activity</h1><p className="mt-2 text-sm text-white/45">Your Sera orders, fills, deposits, withdrawals, and sends converge here.</p></div><Badge className="w-fit border-white/[0.09] bg-white/[0.04] text-white/55 hover:bg-white/[0.04]">{entries.length} records</Badge></div><div className="mt-7 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#101714]">{activityQuery.isLoading ? <div className="grid place-items-center py-24 text-sm text-white/45"><Loader2 className="mb-2 h-5 w-5 animate-spin text-[#b3ff3e]" />Reading activity…</div> : !address ? <EmptyState icon={WalletCards} title="Connect your wallet to see activity" copy="SeraPay keeps wallet and Sera records connected to the address you choose." /> : !isAuthenticated ? <EmptyState icon={LockKeyhole} title="Sign in to unlock protected Sera reads" copy="Orders and fills use server-only Sera API credentials paired with your authenticated SeraPay profile." /> : activityQuery.error ? <EmptyState icon={ReceiptText} title="Sera activity is not available yet" copy={activityQuery.error.message} /> : !entries.length ? <EmptyState icon={ReceiptText} title="No Sera activity has settled for this address" copy="New swaps and Sera trading events appear here as they are reported by the protocol." /> : <div>{entries.map((entry, index) => <div key={`${entry.id}-${index}`} className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4 last:border-b-0"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.05] text-[#b3ff3e]"><ReceiptText className="h-4 w-4" /></span><div><p className="text-sm font-medium text-white">{entry.type}</p><p className="mt-1 text-xs text-white/36">{entry.id}</p></div></div><div className="text-right"><Badge className="border-emerald-300/15 bg-emerald-300/10 text-emerald-200 hover:bg-emerald-300/10">{entry.status}</Badge><p className="mt-1.5 text-[11px] text-white/34">{entry.timestamp}</p></div></div>)}</div>}</div></section>;
}

function EmptyState({ icon: Icon, title, copy }: { icon: typeof WalletCards; title: string; copy: string }) { return <div className="grid place-items-center px-6 py-24 text-center"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.05] text-white/38"><Icon className="h-5 w-5" /></div><h2 className="mt-5 text-base font-medium text-white">{title}</h2><p className="mt-2 max-w-md text-sm leading-6 text-white/42">{copy}</p></div>; }

function ExploreView({ onLaunch }: { onLaunch: (app: { name: string; launchUrl?: string; source: "sandbox" | "verified"; permissions: string[] }) => void }) {
  const appsQuery = trpc.miniApps.listApproved.useQuery(undefined, { retry: false });
  const verifiedApps = appsQuery.data ?? [];
  const sandboxApp = { name: "Sera Utilities sandbox", source: "sandbox" as const, permissions: ["wallet.balance", "wallet.payment"], category: "Utilities", developerIdentity: "SeraPay sandbox", description: "A contained local mini-app that demonstrates balance access and an approval prompt without moving funds." };
  const apps = [sandboxApp, ...verifiedApps.map(app => ({ ...app, source: "verified" as const }))];
  const [filter, setFilter] = useState("All");
  const visibleApps = apps.filter(app => filter === "All" || app.category === filter);
  return <section className="mx-auto max-w-[1240px] animate-in fade-in duration-300"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-medium uppercase tracking-[0.2em] text-[#b3ff3e]">Mini app runtime</p><h1 className="mt-2 text-3xl font-semibold text-white">Use more, leave less.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">Discover focused experiences that request capabilities from your wallet instead of gaining access to its keys.</p></div><Button onClick={() => document.getElementById("developer-submission")?.scrollIntoView({ behavior: "smooth" })} variant="outline" className="h-10 rounded-xl border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.08] hover:text-white"><Plus className="mr-2 h-4 w-4" />Submit an app</Button></div><div className="mt-7 flex gap-2 overflow-x-auto pb-1">{["All", ...miniAppCategories].map(category => <button key={category} onClick={() => setFilter(category)} className={cn("whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition", filter === category ? "border-[#b3ff3e]/30 bg-[#b3ff3e]/10 text-[#d9ff9b]" : "border-white/[0.08] bg-white/[0.03] text-white/45 hover:text-white/80")}>{category}</button>)}</div><div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleApps.map((app, index) => <article key={`${app.name}-${index}`} className="group flex min-h-[246px] flex-col rounded-3xl border border-white/[0.08] bg-[#111815] p-5 transition hover:-translate-y-0.5 hover:border-white/[0.16]"><div className="flex items-start justify-between"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#b3ff3e]/90 to-[#4dae75] text-[#0b1a0e]"><Layers3 className="h-5 w-5" /></div><Badge className={cn("border", categoryAccent[app.category] ?? "border-white/10 bg-white/[0.05] text-white/65")}>{app.category}</Badge></div><div className="mt-5"><div className="flex items-center gap-2"><h2 className="font-medium text-white">{app.name}</h2>{app.source === "verified" ? <ShieldCheck className="h-4 w-4 text-[#b3ff3e]" /> : <Badge className="border-white/[0.08] bg-white/[0.04] text-[9px] text-white/45 hover:bg-white/[0.04]">sandbox</Badge>}</div><p className="mt-2 line-clamp-3 text-sm leading-5 text-white/42">{app.description}</p></div><div className="mt-auto pt-5"><div className="flex items-center justify-between text-[11px] text-white/35"><span>{app.developerIdentity}</span><span>{app.permissions.length} permissions</span></div><Button onClick={() => onLaunch({ name: app.name, launchUrl: "launchUrl" in app ? app.launchUrl : undefined, source: app.source, permissions: app.permissions })} className="mt-4 h-9 w-full rounded-xl bg-white/[0.07] text-xs text-white hover:bg-[#b3ff3e] hover:text-[#0b1a0e]">Launch in wallet <ChevronRight className="ml-1 h-3.5 w-3.5" /></Button></div></article>)}</div><div id="developer-submission" className="mt-10"><DeveloperSubmission /></div></section>;
}

function MiniAppLaunchDialog({ app, open, onOpenChange }: { app: { name: string; launchUrl?: string; source: "sandbox" | "verified"; permissions: string[] } | null; open: boolean; onOpenChange: (value: boolean) => void }) {
  const sandboxSource = `<!doctype html><html><head><style>body{margin:0;background:#0d1510;color:#f4f7f2;font-family:Inter,system-ui;padding:28px} .pill{display:inline-block;padding:5px 9px;border-radius:99px;background:#b3ff3e22;color:#d9ff9b;font-size:12px}.card{margin-top:20px;padding:18px;border:1px solid #ffffff14;border-radius:16px;background:#121d15}.value{font-size:28px;margin:8px 0;color:#fff}.button{width:100%;margin-top:14px;border:0;border-radius:12px;padding:12px;background:#b3ff3e;color:#0b1a0e;font-weight:700}</style></head><body><span class='pill'>SeraPay sandbox</span><h2 style='margin:18px 0 4px'>Utility payment</h2><p style='color:#9da8a0;line-height:1.5'>This local mini app runs inside the SeraPay shell and can request wallet capabilities without direct key access.</p><div class='card'><small style='color:#9da8a0'>Available sandbox balance</small><div class='value'>USDC 0.00</div><small style='color:#9da8a0'>No funds are accessible in sandbox mode.</small></div><button class='button' onclick='alert("The host wallet would show an explicit approval screen here.")'>Request payment approval</button></body></html>`;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="h-[min(760px,90vh)] max-w-4xl overflow-hidden border-white/10 bg-[#0d1410] p-0 text-white"><div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4"><div><p className="text-sm font-medium">{app?.name}</p><p className="mt-1 text-xs text-white/40">Contained mini-app session · {app?.permissions.join(", ")}</p></div><Badge className="border-[#b3ff3e]/20 bg-[#b3ff3e]/10 text-[#d9ff9b]">Wallet bridge active</Badge></div><div className="h-[calc(100%-73px)] bg-[#0b100d] p-3"><iframe title={app?.name ?? "Mini app"} sandbox="allow-scripts allow-forms" className="h-full w-full rounded-xl border border-white/[0.07] bg-[#0d1510]" src={app?.source === "sandbox" ? undefined : app?.launchUrl} srcDoc={app?.source === "sandbox" ? sandboxSource : undefined} /></div></DialogContent></Dialog>;
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
  return <div className="rounded-3xl border border-[#b3ff3e]/15 bg-[linear-gradient(125deg,rgba(179,255,62,0.07),transparent_43%),#111815] p-5 sm:p-7"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-start"><div><p className="text-xs font-medium uppercase tracking-[0.2em] text-[#b3ff3e]">Developer portal</p><h2 className="mt-2 text-2xl font-semibold text-white">Bring your mini app to SeraPay.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/45">Validate reachability, manifest schema, matching metadata, and wallet permissions before you submit for owner review.</p></div><Code2 className="h-9 w-9 text-[#b3ff3e]" /></div><form onSubmit={submit} className="mt-7 grid gap-4 md:grid-cols-2"><Field label="App name"><Input name="name" required placeholder="Utility desk" className="field-input" /></Field><Field label="Developer identity"><Input name="developerIdentity" required placeholder="Example Labs" className="field-input" /></Field><Field label="Launch URL"><Input name="launchUrl" required type="url" placeholder="https://app.example.com" className="field-input" /></Field><Field label="Manifest URL"><Input name="manifestUrl" required type="url" placeholder="https://app.example.com/manifest.json" className="field-input" /></Field><Field label="Logo URL"><Input name="logoUrl" required type="url" placeholder="https://app.example.com/logo.svg" className="field-input" /></Field><Field label="Version"><Input name="version" required placeholder="1.0.0" pattern="^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$" className="field-input" /></Field><Field label="Category"><Select value={category} onValueChange={value => setCategory(value as typeof category)}><SelectTrigger className="field-input"><SelectValue /></SelectTrigger><SelectContent>{miniAppCategories.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field><Field label="Supported currencies"><Input name="supportedCurrencies" required placeholder="USD, NGN, EUR" className="field-input" /></Field><Field label="Description" className="md:col-span-2"><Textarea name="description" required minLength={20} maxLength={500} placeholder="Explain the real user task your mini app solves." className="min-h-24 border-white/[0.1] bg-black/20 text-white placeholder:text-white/25 focus-visible:ring-[#b3ff3e]/40" /></Field><div className="md:col-span-2"><Label className="text-xs text-white/52">Requested wallet permissions</Label><div className="mt-3 flex flex-wrap gap-2">{miniAppPermissions.map(permission => <button type="button" key={permission} onClick={() => { setReadiness("idle"); togglePermission(permission); }} className={cn("rounded-full border px-3 py-1.5 text-xs transition", permissions.includes(permission) ? "border-[#b3ff3e]/30 bg-[#b3ff3e]/10 text-[#d9ff9b]" : "border-white/[0.08] bg-white/[0.03] text-white/42 hover:text-white/75")}>{permissions.includes(permission) ? <Check className="mr-1 inline h-3 w-3" /> : null}{permission}</button>)}</div></div><div className="mt-2 flex flex-col justify-between gap-4 border-t border-white/[0.07] pt-5 md:col-span-2 md:flex-row md:items-center"><p className={cn("max-w-xl text-xs leading-5", readiness === "ready" ? "text-[#d9ff9b]" : readiness === "needs-attention" ? "text-amber-200" : "text-white/35")}>{readiness === "ready" ? "Ready to submit: the current draft passed reachability and manifest validation." : readiness === "needs-attention" ? "Needs attention: update the draft and run validation again before submission." : "Sensitive wallet operations require explicit user approval in the host wallet. App code does not receive private keys or seed phrases."}</p><div className="flex shrink-0 gap-2"><Button type="button" onClick={event => { const form = event.currentTarget.form; if (form) validateDraft(form); }} disabled={draftValidation.isPending} variant="outline" className="h-10 border-white/[0.10] bg-transparent text-white/75 hover:bg-white/[0.06] hover:text-white">{draftValidation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Validate draft</Button><Button type="submit" disabled={submission.isPending} className="h-10 rounded-xl bg-[#b3ff3e] text-[#0b1a0e] hover:bg-[#c6ff66]">{submission.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck2 className="mr-2 h-4 w-4" />}{isAuthenticated ? "Submit for review" : "Sign in to submit"}</Button></div></div></form></div>;
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) { return <div className={className}><Label className="text-xs text-white/52">{label}</Label><div className="mt-2">{children}</div></div>; }

function AdminReview() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const apps = trpc.miniApps.listForReview.useQuery(undefined, { enabled: isAdmin, retry: false });
  const utils = trpc.useUtils();
  const review = trpc.miniApps.review.useMutation({ onSuccess: () => { utils.miniApps.listForReview.invalidate(); utils.miniApps.listApproved.invalidate(); toast.success("Mini-app review recorded."); } });
  if (!isAdmin) return <section className="mx-auto max-w-[920px]"><EmptyState icon={LockKeyhole} title="Owner review access required" copy="This review queue is restricted to the SeraPay owner role." /></section>;
  return <section className="mx-auto max-w-[1100px] animate-in fade-in duration-300"><p className="text-xs font-medium uppercase tracking-[0.2em] text-[#b3ff3e]">Owner controls</p><h1 className="mt-2 text-3xl font-semibold text-white">Mini-app review queue</h1><p className="mt-2 text-sm text-white/45">Approve only apps whose reachability, identity, manifest, and permission footprint are appropriate for the wallet ecosystem.</p><div className="mt-7 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#101714]">{apps.isLoading ? <div className="grid place-items-center py-20 text-white/45"><Loader2 className="h-5 w-5 animate-spin" /></div> : !apps.data?.length ? <EmptyState icon={FileCheck2} title="No app submissions await review" copy="New developer submissions appear here after public URL validation completes." /> : apps.data.map(app => <div key={app.id} className="border-b border-white/[0.07] p-5 last:border-b-0"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="flex items-center gap-2"><h2 className="font-medium text-white">{app.name}</h2><Badge className="border-white/[0.08] bg-white/[0.04] text-white/50 hover:bg-white/[0.04]">{app.status}</Badge></div><p className="mt-2 max-w-2xl text-sm leading-6 text-white/42">{app.description}</p><div className="mt-3 flex flex-wrap gap-2 text-xs text-white/40"><span>{app.developerIdentity}</span><span>·</span><a className="inline-flex items-center gap-1 hover:text-[#b3ff3e]" href={app.launchUrl} target="_blank" rel="noreferrer">Launch URL <ExternalLink className="h-3 w-3" /></a><span>·</span><span>{app.permissions.join(", ")}</span></div></div><div className="flex shrink-0 gap-2"><Button onClick={() => review.mutate({ id: app.id, status: "rejected" })} disabled={review.isPending || app.status !== "pending"} variant="outline" className="border-white/[0.09] bg-transparent text-white/62 hover:bg-white/[0.06] hover:text-white">Reject</Button><Button onClick={() => review.mutate({ id: app.id, status: "approved" })} disabled={review.isPending || app.status !== "pending"} className="bg-[#b3ff3e] text-[#0b1a0e] hover:bg-[#c6ff66]">Approve</Button></div></div></div>)}</div></section>;
}

function SettingsView({ address, network, setNetwork, serverReadReady, readAccessDescriptor, onConnect }: { address: string | null; network: WalletNetwork; setNetwork: (value: WalletNetwork) => void; serverReadReady: boolean; readAccessDescriptor: string; onConnect: () => void }) {
  const { user } = useAuth();
  const { authenticated: isAuthenticated, configured, did, login, logout } = useSeraPrivy();
  const copyAddress = async () => { if (address) { await navigator.clipboard.writeText(address); toast.success("Wallet address copied"); } };
  return <section className="mx-auto max-w-[960px] animate-in fade-in duration-300"><p className="text-xs font-medium uppercase tracking-[0.2em] text-[#b3ff3e]">Wallet preferences</p><h1 className="mt-2 text-3xl font-semibold text-white">Settings</h1><div className="mt-7 space-y-4"><SettingsCard icon={WalletCards} title="Connected wallet" copy={address ? shortenAddress(address) : "No embedded or injected wallet connected"}><Button onClick={address ? copyAddress : onConnect} variant="outline" className="border-white/[0.09] bg-white/[0.03] text-white/75 hover:bg-white/[0.08] hover:text-white">{address ? <><Copy className="mr-2 h-3.5 w-3.5" />Copy address</> : "Create or connect"}</Button></SettingsCard><SettingsCard icon={Network} title="Settlement network" copy="Sera mainnet signing uses Ethereum chain ID 1. Sepolia is shown for exploration only."><Select value={network} onValueChange={value => setNetwork(value as WalletNetwork)}><SelectTrigger className="h-9 w-[180px] border-white/[0.09] bg-white/[0.03] text-xs text-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mainnet">Ethereum Mainnet</SelectItem><SelectItem value="sepolia">Ethereum Sepolia</SelectItem></SelectContent></Select></SettingsCard><SettingsCard icon={LockKeyhole} title="Sera read access" copy={serverReadReady ? `Server credentials are configured as ${readAccessDescriptor}. API keys stay on the backend and are never shown in this browser.` : "Server credentials are pending. Balance and order reads remain gated until configured."}><Badge className={cn("border", serverReadReady ? "border-[#b3ff3e]/20 bg-[#b3ff3e]/10 text-[#d9ff9b]" : "border-amber-300/15 bg-amber-300/10 text-amber-200")}>{serverReadReady ? readAccessDescriptor : "Pending"}</Badge></SettingsCard><SettingsCard icon={Globe2} title="SeraPay profile" copy={isAuthenticated ? `${user?.username ? `@${user.username}` : user?.name ?? "SeraPay member"} · ${did ?? "Privy verified"}` : configured ? "Continue with a social account to create your SeraPay profile and embedded wallet." : "Set VITE_PRIVY_APP_ID to activate social onboarding."}><Button onClick={isAuthenticated ? logout : () => configured ? login() : toast.error("Set VITE_PRIVY_APP_ID to enable social onboarding.")} variant="outline" className="border-white/[0.09] bg-white/[0.03] text-white/75 hover:bg-white/[0.08] hover:text-white">{isAuthenticated ? "Sign out" : "Continue with Privy"}</Button></SettingsCard><ProfilePreferences /></div></section>;
}

function SettingsCard({ icon: Icon, title, copy, children }: { icon: typeof WalletCards; title: string; copy: string; children: React.ReactNode }) { return <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[#111815] p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-4"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-[#b3ff3e]"><Icon className="h-4 w-4" /></div><div><p className="text-sm font-medium text-white">{title}</p><p className="mt-1 max-w-lg text-xs leading-5 text-white/42">{copy}</p></div></div>{children}</div>; }

function SendDialog({ address, open, onOpenChange, tokens, onActivity }: { address: string | null; open: boolean; onOpenChange: (value: boolean) => void; tokens: SeraToken[]; onActivity: (entry: WalletActivityEntry) => void }) {
  const [tokenAddress, setTokenAddress] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const selected = tokens.find(token => token.address === tokenAddress) ?? tokens[0];
  useEffect(() => { if (!tokenAddress && tokens.length) setTokenAddress(tokens[0].address); }, [tokenAddress, tokens]);
  const submit = async () => { if (!address || !selected) return toast.error("Connect a wallet and select an asset."); try { setSubmitting(true); const rawAmount = parseTokenAmount(amount, selected.decimals); const data = encodeErc20Transfer(recipient, rawAmount); const hash = await sendErc20Transaction(address, selected.address, data); onActivity(createWalletActivityEntry({ kind: "send", id: hash, label: `${amount} ${selected.symbol} sent` })); toast.success("ERC-20 transfer broadcast.", { description: shortenAddress(hash) }); onOpenChange(false); setAmount(""); setRecipient(""); } catch (error) { toast.error(error instanceof Error ? error.message : "Transfer could not be broadcast."); } finally { setSubmitting(false); } };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-md border-white/10 bg-[#111916] text-white"><DialogHeader><DialogTitle>Send stablecoin</DialogTitle><DialogDescription className="text-white/45">You review the asset, recipient, and amount before your injected wallet broadcasts the ERC-20 transfer.</DialogDescription></DialogHeader><div className="space-y-4 pt-2"><Field label="Asset"><Select value={selected?.address} onValueChange={setTokenAddress}><SelectTrigger className="field-input"><SelectValue /></SelectTrigger><SelectContent>{tokens.map(token => <SelectItem key={token.address} value={token.address}>{token.symbol} · {token.currency}</SelectItem>)}</SelectContent></Select></Field><Field label="Recipient"><Input value={recipient} onChange={event => setRecipient(event.target.value)} placeholder="0x…" className="field-input font-mono" /></Field><Field label="Amount"><Input value={amount} onChange={event => setAmount(event.target.value)} inputMode="decimal" placeholder="0.00" className="field-input" /></Field><div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.06] p-3 text-xs leading-5 text-amber-100/80"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" />This action asks your wallet to broadcast a standard ERC-20 transfer. Confirm the destination and amount in your wallet before approving.</div><Button onClick={submit} disabled={submitting || !tokens.length} className="h-11 w-full rounded-xl bg-[#b3ff3e] text-[#0b1a0e] hover:bg-[#c6ff66]">{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Review & broadcast</Button></div></DialogContent></Dialog>;
}

export default function Home() {
  const { user, isAuthenticated: previewAuthenticated } = useAuth();
  const { authenticated: privyAuthenticated, configured: privyConfigured, login: loginWithPrivy, walletAddress: embeddedWalletAddress } = useSeraPrivy();
  const isAuthenticated = privyConfigured ? privyAuthenticated : previewAuthenticated;
  const [activeView, setActiveView] = useState<View>("wallet");
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<WalletNetwork>("mainnet");
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
    try { setConnecting(true); const nextAddress = await connectInjectedWallet(); setAddress(nextAddress); const chainId = await getWalletChainId(); setNetwork(chainId === "0xaa36a7" ? "sepolia" : "mainnet"); toast.success("Wallet connected", { description: shortenAddress(nextAddress) }); } catch (error) { toast.error(error instanceof Error ? error.message : "Wallet connection failed."); } finally { setConnecting(false); }
  };
  const recordActivity = (entry: WalletActivityEntry) => { recordWalletActivity(entry); };
  const openSend = () => setSendOpen(true);
  const isAdmin = user?.role === "admin";
  const content = activeView === "wallet" ? <WalletHome address={address} network={network} setView={setActiveView} onReceive={() => setReceiveOpen(true)} onSend={openSend} onSwap={() => setHomeSwapOpen(true)} onVault={() => setVaultOpen(true)} balances={balancesQuery.data ?? []} balancesLoading={balancesQuery.isLoading} tokens={tokens} serverReadReady={Boolean(statusQuery.data?.readCredentialsConfigured)} /> : activeView === "explore" ? <ExploreLayer onLaunch={app => setMiniApp(app)} onBuild={() => setActiveView("account")} /> : <section className="mx-auto max-w-[1050px] space-y-5"><SettingsView address={address} network={network} setNetwork={setNetwork} serverReadReady={Boolean(statusQuery.data?.readCredentialsConfigured)} readAccessDescriptor={statusQuery.data?.readAccessDescriptor ?? "Not configured"} onConnect={connectWallet} /><AccountProfilePanel address={address} onOpenBuild={() => setDeveloperToolsOpen(true)} />{developerToolsOpen ? <section className="space-y-5 rounded-3xl border border-white/[0.08] bg-[#0f1712] p-4 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-[#b3ff3e]">Developer tools</p><p className="mt-1 text-sm text-white/45">Preview and validate a mini app before it enters owner review.</p></div><Button variant="outline" onClick={() => setDeveloperToolsOpen(false)} className="border-white/[0.1] text-white/70 hover:bg-white/[0.06] hover:text-white">Hide tools</Button></div><DeveloperStagingSuite /><DeveloperSubmission /></section> : <button onClick={() => setDeveloperToolsOpen(true)} className="flex w-full items-center justify-between rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] px-5 py-4 text-left transition hover:border-[#b3ff3e]/30 hover:bg-[#b3ff3e]/[0.04]"><span><span className="block text-sm font-medium text-white">Developer suite</span><span className="mt-1 block text-xs text-white/42">Preview, validate, and submit a mini app for review.</span></span><Code2 className="h-5 w-5 text-[#b3ff3e]" /></button>}{isAdmin ? <section className="rounded-3xl border border-white/[0.08] bg-[#0f1712] p-4 sm:p-6"><AdminReview /></section> : null}</section>;
  return <div className="min-h-screen bg-[#0d1410] text-white"><div className="flex min-h-screen"><SideNavigation activeView={activeView} setActiveView={setActiveView} /><div className="min-w-0 flex-1"><TopBar address={address} network={network} onConnect={connectWallet} onReceive={() => setReceiveOpen(true)} isConnecting={connecting} /><main className="px-4 py-7 pb-32 sm:px-7 lg:px-10 lg:py-9">{tokenQuery.error ? <div className="mb-5 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] px-4 py-3 text-xs text-amber-100/75">Live Sera asset discovery is temporarily unavailable: {tokenQuery.error.message}</div> : null}{content}</main></div></div><ReceiveDialog address={address} open={receiveOpen} onOpenChange={setReceiveOpen} /><SendDialog address={address} open={sendOpen} onOpenChange={setSendOpen} tokens={tokens} onActivity={recordActivity} /><VaultDialog address={address} open={vaultOpen} onOpenChange={setVaultOpen} tokens={tokens} onSubmitted={recordActivity} /><Dialog open={homeSwapOpen} onOpenChange={setHomeSwapOpen}><DialogContent className="h-[min(860px,94vh)] max-w-4xl overflow-y-auto border-white/10 bg-[#0d1410] p-4 text-white sm:p-6"><SwapView address={address} network={network} tokens={tokens} onActivity={recordActivity} /></DialogContent></Dialog><MiniAppLaunchDialog app={miniApp} open={Boolean(miniApp)} onOpenChange={open => !open && setMiniApp(null)} /><nav aria-label="Primary navigation" className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-30 mx-auto flex max-w-sm items-center gap-1 rounded-2xl border border-white/[0.12] bg-[#0a0f0d]/95 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.42)] backdrop-blur-xl lg:hidden">{navigation.map(item => { const Icon = item.icon; const active = activeView === item.id; return <button key={item.id} onClick={() => setActiveView(item.id)} className={cn("grid min-h-12 flex-1 place-items-center gap-1 rounded-xl py-1 text-[10px] font-medium transition", active ? "bg-[#b3ff3e] text-[#0a150c] shadow-[0_0_20px_rgba(179,255,62,0.18)]" : "text-white/48 hover:bg-white/[0.06] hover:text-white/80")}><Icon className="h-4 w-4" />{item.label}</button>; })}</nav></div>;
}
