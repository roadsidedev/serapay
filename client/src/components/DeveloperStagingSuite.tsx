import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { isStagingMiniAppUrl } from "@shared/staging";
import { ChevronDown, Code2, ExternalLink, Laptop, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const simulatorContext = {
  type: "serapay:staging-context",
  version: 1,
  environment: "staging",
  wallet: {
    address: "0x000000000000000000000000000000000000dEaD",
    chainId: 1,
    isSimulation: true,
    balances: [{ symbol: "USDC", amount: "1000.00" }],
  },
};

export function DeveloperStagingSuite() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem("serapay-dev-mode") === "true");
  const [url, setUrl] = useState(() => localStorage.getItem("serapay-staging-url") ?? "http://localhost:5173");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const isValid = isStagingMiniAppUrl(url);
  const previewUrl = useMemo(() => isValid ? url.trim() : "", [isValid, url]);

  useEffect(() => { localStorage.setItem("serapay-dev-mode", String(enabled)); }, [enabled]);
  useEffect(() => { localStorage.setItem("serapay-staging-url", url); }, [url]);

  const sendSimulatorContext = () => frame.current?.contentWindow?.postMessage(simulatorContext, "*");

  return <section className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-6">
    <header className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#7161DF]/35 bg-[#7161DF]/12 text-[#b8b0ff]"><Code2 className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-semibold text-white">Contained preview</h2><Badge variant="outline" className={cn("border-white/15 text-[10px]", enabled ? "bg-[#7161DF]/15 text-[#b8b0ff]" : "text-white/50")}>{enabled ? "Dev mode on" : "Dev mode off"}</Badge></div><p className="mt-1.5 text-sm leading-5 text-white/50">Test your mini app inside a restricted wallet shell before submitting it for review.</p></div><Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Enable developer staging mode" />
    </header>

    {enabled ? <div className="mt-5 space-y-4">
      <div><label className="text-sm font-medium text-white/80" htmlFor="staging-url">Preview URL</label><p className="mt-1 text-xs leading-5 text-white/45">Use HTTPS for remote previews, or localhost for development.</p><div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><Input id="staging-url" value={url} onChange={event => setUrl(event.target.value)} placeholder="http://localhost:5173" className="field-input h-11 min-w-0 w-full" /><Button asChild variant="outline" disabled={!previewUrl} className="h-11 border-white/15 text-white hover:bg-[#7161DF]/15 hover:text-white"><a href={previewUrl || "#"} target="_blank" rel="noreferrer" aria-disabled={!previewUrl}><ExternalLink className="mr-2 h-4 w-4" />Open preview</a></Button></div><p className={cn("mt-2 text-xs", isValid ? "text-emerald-200/75" : "text-amber-200/80")} role="status">{isValid ? "Safe preview URL" : "Enter a valid HTTPS or local loopback URL."}</p></div>
      {previewUrl ? <div className="overflow-hidden rounded-2xl border border-white/10 bg-white p-1"><iframe ref={frame} title="Mini-app staging preview" src={previewUrl} sandbox="allow-scripts allow-forms" onLoad={sendSimulatorContext} className="h-[min(52vh,420px)] w-full rounded-xl bg-white" /></div> : <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-white/15 bg-black/15 px-5 text-center"><div><Laptop className="mx-auto h-5 w-5 text-white/35" /><p className="mt-3 text-sm text-white/55">Your contained preview will appear here.</p><p className="mt-1 text-xs text-white/40">Enter a safe URL above to launch the simulator.</p></div></div>}
      <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.025] p-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#b8b0ff]" /><p className="text-xs leading-5 text-white/55">Only labelled simulation data is sent. Connected wallet credentials never enter the preview.</p></div><Button onClick={sendSimulatorContext} disabled={!previewUrl} variant="outline" className="min-h-10 shrink-0 border-white/15 text-white hover:bg-[#7161DF]/15 hover:text-white"><RefreshCw className="mr-2 h-4 w-4" />Resend context</Button></div>
      <div className="rounded-2xl border border-white/10 bg-black/20"><button type="button" onClick={() => setDetailsOpen(open => !open)} aria-expanded={detailsOpen} className="flex min-h-11 w-full items-center justify-between px-3 text-left text-sm font-medium text-white/75"><span>How staging is isolated</span><ChevronDown className={`h-4 w-4 text-white/50 transition-transform ${detailsOpen ? "rotate-180" : ""}`} /></button>{detailsOpen ? <div className="border-t border-white/10 px-3 pb-3 pt-2 text-xs leading-5 text-white/45">The frame runs in a restricted sandbox with a labelled test address, Ethereum Mainnet chain ID, and test USDC balance. Production release still requires manifest validation and owner approval.</div> : null}</div>
    </div> : <div className="mt-5 grid min-h-32 place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-5 text-center"><div><Laptop className="mx-auto h-5 w-5 text-white/30" /><p className="mt-2 text-sm text-white/55">Turn on Dev Mode to stage a local or HTTPS mini-app preview.</p></div></div>}
  </section>;
}
