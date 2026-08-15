import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSeraPrivy } from "@/contexts/PrivyContext";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Heart, Layers3, Play, Plus, ShieldCheck } from "lucide-react";
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

const discoveryGroups = [
  { id: "all", label: "All categories", categories: [] },
  { id: "utility", label: "Utility", categories: ["Utilities", "Payments", "Remittance"] },
  { id: "lend", label: "Lend", categories: ["Savings", "Yield"] },
  { id: "shopping", label: "Shopping", categories: ["Shopping", "Commerce"] },
  { id: "markets", label: "Markets", categories: ["Exchange", "Trading"] },
] as const;

function matchesGroup(app: ListedMiniApp, groupId: string) {
  const group = discoveryGroups.find(item => item.id === groupId);
  return !group || group.categories.length === 0 || group.categories.includes(app.category as never);
}

export function ExploreLayer({ onLaunch, onBuild }: { onLaunch: (app: LaunchableMiniApp) => void; onBuild: () => void }) {
  const [tab, setTab] = useState<"explore" | "mine">("explore");
  const [group, setGroup] = useState("all");
  const { authenticated, configured, login } = useSeraPrivy();
  const approved = trpc.miniApps.listApproved.useQuery(undefined, { retry: false });
  const mine = trpc.miniApps.listMine.useQuery(undefined, { enabled: authenticated, retry: false });
  const utils = trpc.useUtils();
  const favorite = trpc.miniApps.setFavorite.useMutation({ onSuccess: () => utils.miniApps.listMine.invalidate() });
  const recordLaunch = trpc.miniApps.recordLaunch.useMutation({ onSuccess: () => utils.miniApps.listMine.invalidate() });
  const apps = (approved.data ?? []) as ListedMiniApp[];
  const myApps = (mine.data ?? []) as ListedMiniApp[];
  const visibleApps = useMemo(() => (tab === "mine" ? myApps : apps.filter(app => matchesGroup(app, group))), [apps, group, myApps, tab]);
  const loading = approved.isLoading || (tab === "mine" && mine.isLoading);
  const signIn = () => { if (configured) login(); };
  const openMine = () => authenticated ? setTab("mine") : signIn();
  const launch = (app: ListedMiniApp) => {
    if (authenticated) recordLaunch.mutate({ appId: app.id });
    onLaunch({ name: app.name, launchUrl: app.launchUrl, source: "verified", permissions: app.permissions });
  };
  const toggleFavorite = (app: ListedMiniApp) => {
    if (!authenticated) return signIn();
    favorite.mutate({ appId: app.id, isFavorite: !app.isFavorite });
  };

  return (
    <section className="mx-auto max-w-[1240px] space-y-6 pb-6">
      <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Mini apps</h1>
          <p className="mt-1 text-sm text-white/50">Verified tools that run within your wallet.</p>
        </div>
        <Button onClick={onBuild} variant="outline" className="h-10 rounded-xl border-white/15 bg-transparent text-white hover:bg-white hover:text-black">
          <Plus className="mr-2 h-4 w-4" /> Dev Console
        </Button>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit rounded-xl border border-white/12 bg-white/[0.04] p-1" role="tablist" aria-label="Mini app views">
          <ToggleButton active={tab === "explore"} onClick={() => setTab("explore")}>Explore</ToggleButton>
          <ToggleButton active={tab === "mine"} onClick={openMine}>My mini apps</ToggleButton>
        </div>
        {tab === "mine" && authenticated ? <Badge variant="outline" className="w-fit border-white/15 text-white/65">Favorites & recent</Badge> : null}
      </div>

      {tab === "explore" ? (
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Mini app categories">
          {discoveryGroups.map(item => <button key={item.id} onClick={() => setGroup(item.id)} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition", group === item.id ? "border-white bg-white text-black" : "border-white/12 bg-transparent text-white/55 hover:border-white/40 hover:text-white")}>{item.label}</button>)}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? <StateCard copy="Loading verified mini apps…" /> : null}
        {!loading && !visibleApps.length ? <EmptyMiniApps tab={tab} configured={configured} onSignIn={signIn} /> : null}
        {!loading ? visibleApps.map(app => <MiniAppCard app={app} key={app.id} onFavorite={() => toggleFavorite(app)} onLaunch={() => launch(app)} />) : null}
      </div>
    </section>
  );
}

function ToggleButton({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return <button role="tab" aria-selected={active} onClick={onClick} className={cn("rounded-lg px-3 py-2 text-xs font-medium transition", active ? "bg-white text-black shadow-sm" : "text-white/55 hover:text-white")}>{children}</button>;
}

function MiniAppCard({ app, onFavorite, onLaunch }: { app: ListedMiniApp; onFavorite: () => void; onLaunch: () => void }) {
  return (
    <article className="group flex min-h-[232px] flex-col rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.05]">
      <div className="flex items-start justify-between gap-4">
        <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white text-black"><Layers3 className="h-5 w-5" /></div>
        <div className="flex items-center gap-2"><Badge variant="outline" className="border-white/15 text-[10px] text-white/60">{app.category}</Badge><button aria-label={`Favorite ${app.name}`} onClick={onFavorite} className={cn("grid h-8 w-8 place-items-center rounded-lg border transition", app.isFavorite ? "border-white bg-white text-black" : "border-white/12 text-white/50 hover:border-white/35 hover:text-white")}><Heart className={cn("h-3.5 w-3.5", app.isFavorite && "fill-current")} /></button></div>
      </div>
      <div className="mt-5"><div className="flex items-center gap-2"><h2 className="font-medium text-white">{app.name}</h2><ShieldCheck className="h-3.5 w-3.5 text-white/80" /></div><p className="mt-2 line-clamp-3 text-sm leading-5 text-white/48">{app.description}</p></div>
      <div className="mt-auto pt-5"><div className="flex items-center justify-between text-[11px] text-white/40"><span>{app.developerIdentity}</span><span>{app.visitCount ? `${app.visitCount} launches` : `${app.permissions.length} permissions`}</span></div><Button onClick={onLaunch} className="mt-4 h-10 w-full rounded-xl bg-white text-xs text-black hover:bg-white/85"><Play className="mr-1.5 h-3.5 w-3.5" />Launch</Button></div>
    </article>
  );
}

function StateCard({ copy }: { copy: string }) {
  return <div className="col-span-full rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-14 text-center text-sm text-white/50">{copy}</div>;
}

function EmptyMiniApps({ tab, configured, onSignIn }: { tab: "explore" | "mine"; configured: boolean; onSignIn: () => void }) {
  return <div className="col-span-full rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-14 text-center"><Heart className="mx-auto h-5 w-5 text-white/70" /><h2 className="mt-3 text-base font-medium text-white">{tab === "mine" ? "Your mini app shelf is ready" : "No verified mini apps yet"}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/48">{tab === "mine" ? "Launch an app or save it to keep it close." : "Approved apps will appear here after owner review."}</p>{tab === "mine" && configured ? <Button onClick={onSignIn} className="mt-5 rounded-xl bg-white text-black hover:bg-white/85">Sign in to continue</Button> : null}</div>;
}
