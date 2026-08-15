import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { isStagingMiniAppUrl } from "@shared/staging";
import { Code2, ExternalLink, Laptop, ShieldCheck, WalletCards } from "lucide-react";
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
  const frame = useRef<HTMLIFrameElement>(null);
  const isValid = isStagingMiniAppUrl(url);
  const previewUrl = useMemo(() => isValid ? url.trim() : "", [isValid, url]);

  useEffect(() => {
    localStorage.setItem("serapay-dev-mode", String(enabled));
  }, [enabled]);

  useEffect(() => {
    localStorage.setItem("serapay-staging-url", url);
  }, [url]);

  const sendSimulatorContext = () => {
    frame.current?.contentWindow?.postMessage(simulatorContext, "*");
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><Code2 className="h-4 w-4 text-white" /><p className="text-sm font-medium text-white">Contained preview</p></div>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-white/45">Preview your mini-app in a contained wallet shell before submitting it for review. Only isolated simulation data is sent to the preview; no connected wallet or Privy credentials are exposed.</p>
        </div>
        <div className="flex items-center gap-2"><Badge variant="outline" className={cn("border-white/15", enabled ? "bg-white text-black" : "text-white/50")}>{enabled ? "Dev mode on" : "Dev mode off"}</Badge><Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Enable developer staging mode" /></div>
      </div>

      {enabled ? <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42" htmlFor="staging-url">Mini-app preview URL</label>
          <div className="mt-2 flex gap-2"><Input id="staging-url" value={url} onChange={event => setUrl(event.target.value)} placeholder="http://localhost:5173" className="h-10 border-white/15 bg-white/[0.04] text-sm text-white placeholder:text-white/25" /><Button asChild variant="outline" className="h-10 shrink-0 border-white/15 bg-transparent px-3 text-white/70 hover:bg-white hover:text-black"><a href={previewUrl || undefined} target="_blank" rel="noreferrer" aria-disabled={!previewUrl}><ExternalLink className="h-3.5 w-3.5" /></a></Button></div>
          <p className={cn("mt-2 text-xs", isValid ? "text-white/38" : "text-amber-200/80")}>{isValid ? "HTTPS URLs and local loopback HTTP URLs are supported." : "Use https:// for remote previews, or http://localhost / 127.0.0.1 for local development."}</p>
          {previewUrl ? <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.08] bg-black"><iframe ref={frame} title="Mini-app staging preview" src={previewUrl} sandbox="allow-scripts allow-forms" onLoad={sendSimulatorContext} className="h-[430px] w-full bg-white" /></div> : <div className="mt-4 grid h-[220px] place-items-center rounded-xl border border-dashed border-white/[0.12] bg-black/15 text-center"><Laptop className="h-5 w-5 text-white/30" /><p className="-mt-10 text-xs text-white/40">Enter a safe preview URL to launch the contained simulator.</p></div>}
        </div>
        <aside className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><WalletCards className="h-4 w-4 text-white" /><p className="mt-3 text-sm font-medium text-white">Simulation contract</p><p className="mt-1 text-xs leading-5 text-white/48">The frame receives a <code className="text-white">serapay:staging-context</code> message after load with a labelled test address, chain ID, and test USDC balance.</p><Button onClick={sendSimulatorContext} variant="outline" className="mt-4 h-9 w-full border-white/15 bg-transparent text-xs text-white/70 hover:bg-white hover:text-black">Resend test context</Button></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><ShieldCheck className="h-4 w-4 text-white" /><p className="mt-3 text-sm font-medium text-white">Boundary by design</p><p className="mt-1 text-xs leading-5 text-white/48">Preview frames run in a restricted sandbox. Production release still requires manifest validation and owner approval.</p></div>
        </aside>
      </div> : <div className="mt-5 rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] px-4 py-7 text-center"><Laptop className="mx-auto h-5 w-5 text-white/28" /><p className="mt-2 text-sm text-white/55">Turn on Dev Mode to stage a local or HTTPS mini-app preview.</p></div>}
    </section>
  );
}
