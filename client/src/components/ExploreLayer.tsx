import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useSeraPrivy } from "@/contexts/PrivyContext";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Compass, Heart, Play, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

type LaunchableMiniApp = {
  name: string;
  launchUrl?: string;
  source: "sandbox" | "verified";
  permissions: string[];
};

type ListedMiniApp = {
  id: number;
  name: string;
  description: string;
  developerIdentity: string;
  category: string;
  permissions: string[];
  launchUrl: string;
  isFavorite?: boolean;
  visitCount?: number;
};

export function ExploreLayer({ onLaunch }: { onLaunch: (app: LaunchableMiniApp) => void }) {
  const [tab, setTab] = useState<"explore" | "mine">("explore");
  const { authenticated, configured, login } = useSeraPrivy();
  const { isAuthenticated: previewAuthenticated } = useAuth();
  const appAuthenticated = authenticated || previewAuthenticated;
  const approved = trpc.miniApps.listApproved.useQuery(undefined, { retry: false });
  const mine = trpc.miniApps.listMine.useQuery(undefined, { enabled: appAuthenticated, retry: false });
  const utils = trpc.useUtils();
  const favorite = trpc.miniApps.setFavorite.useMutation({ onSuccess: () => utils.miniApps.listMine.invalidate() });
  const recordLaunch = trpc.miniApps.recordLaunch.useMutation({ onSuccess: () => utils.miniApps.listMine.invalidate() });
  const apps = (approved.data ?? []) as ListedMiniApp[];
  const myApps = (mine.data ?? []) as ListedMiniApp[];
  const visibleApps = useMemo(() => tab === "mine" ? myApps : apps, [apps, myApps, tab]);
  const loading = approved.isLoading || (tab === "mine" && mine.isLoading);
  const signIn = () => { if (configured) login(); };
  const openMine = () => appAuthenticated ? setTab("mine") : signIn();
  const launch = (app: ListedMiniApp) => {
    if (appAuthenticated) recordLaunch.mutate({ appId: app.id });
    onLaunch({ name: app.name, launchUrl: app.launchUrl, source: "verified", permissions: app.permissions });
  };
  const toggleFavorite = (app: ListedMiniApp) => {
    if (!appAuthenticated) return signIn();
    favorite.mutate({ appId: app.id, isFavorite: !app.isFavorite });
  };

  return (
    <section className="mx-auto max-w-[1240px] pb-6">
      <header className="mb-5 flex items-end justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b90f5]">Explore</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Mini apps</h1><p className="mt-1 text-sm text-white/50">Small tools for your wallet.</p></div>
        <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[#7161DF]/35 bg-[#7161DF]/12 text-[#b8b0ff]"><Compass className="h-5 w-5" /></span>
      </header>

      <div className="glass-control mb-5 inline-flex rounded-2xl p-1" role="tablist" aria-label="Mini app views">
        <ToggleButton active={tab === "explore"} onClick={() => setTab("explore")}><Compass className="h-3.5 w-3.5" />Explore</ToggleButton>
        <ToggleButton active={tab === "mine"} onClick={openMine}><Sparkles className="h-3.5 w-3.5" />My mini apps</ToggleButton>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? <StateCard copy="Loading mini apps…" /> : null}
        {!loading && !visibleApps.length ? <EmptyMiniApps tab={tab} authenticated={appAuthenticated} onSignIn={signIn} /> : null}
        {!loading ? visibleApps.map(app => <MiniAppCard app={app} key={app.id} onFavorite={() => toggleFavorite(app)} onLaunch={() => launch(app)} />) : null}
      </div>
    </section>
  );
}

function ToggleButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button role="tab" aria-selected={active} onClick={onClick} className={cn("inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition", active ? "bg-[#7161DF] text-white shadow-[0_8px_22px_rgba(113,97,223,0.28)]" : "text-white/55 hover:text-white")}>{children}</button>;
}

function MiniAppCard({ app, onFavorite, onLaunch }: { app: ListedMiniApp; onFavorite: () => void; onLaunch: () => void }) {
  return (
    <article className="liquid-glass group flex min-h-[196px] flex-col rounded-3xl p-4 transition hover:-translate-y-0.5 hover:border-[#7161DF]/60 sm:p-5">
      <div className="flex items-start justify-between gap-4"><div className="grid h-11 w-11 place-items-center rounded-2xl border border-[#7161DF]/35 bg-[#7161DF]/12 text-[#b8b0ff]"><Sparkles className="h-5 w-5" /></div><button aria-label={`Favorite ${app.name}`} onClick={onFavorite} className={cn("grid h-8 w-8 place-items-center rounded-xl border transition", app.isFavorite ? "border-[#7161DF] bg-[#7161DF] text-white" : "border-white/12 text-white/50 hover:border-[#7161DF]/50 hover:text-[#b8b0ff]")}><Heart className={cn("h-3.5 w-3.5", app.isFavorite && "fill-current")} /></button></div>
      <div className="mt-5"><div className="flex items-center gap-2"><h2 className="font-medium text-white">{app.name}</h2><ShieldCheck className="h-3.5 w-3.5 text-[#9b90f5]" /></div><p className="mt-2 line-clamp-2 text-sm leading-5 text-white/48">{app.description}</p></div>
      <Button onClick={onLaunch} className="mt-auto h-10 w-full rounded-xl bg-[#7161DF] text-xs text-white hover:bg-[#6656d4]"><Play className="h-3.5 w-3.5" />Launch</Button>
    </article>
  );
}

function StateCard({ copy }: { copy: string }) {
  return <div className="col-span-full rounded-3xl border border-dashed border-[#7161DF]/30 bg-[#7161DF]/[0.04] px-5 py-14 text-center text-sm text-white/50">{copy}</div>;
}

function EmptyMiniApps({ tab, authenticated, onSignIn }: { tab: "mine" | "explore"; authenticated: boolean; onSignIn: () => void }) {
  return <div className="col-span-full rounded-3xl border border-dashed border-[#7161DF]/30 bg-[#7161DF]/[0.04] px-5 py-14 text-center"><Heart className="mx-auto h-5 w-5 text-[#9b90f5]" /><h2 className="mt-3 text-base font-medium text-white">{tab === "mine" ? "No saved mini apps" : "No mini apps yet"}</h2>{tab === "mine" && !authenticated ? <Button onClick={onSignIn} className="mt-5 rounded-xl bg-[#7161DF] text-white hover:bg-[#6656d4]">Sign in to continue</Button> : null}</div>;
}
