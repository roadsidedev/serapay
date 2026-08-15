import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSeraPrivy } from "@/contexts/PrivyContext";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Heart, Layers3, Play, Plus, ShieldCheck, Sparkles } from "lucide-react";
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

const categoryTone: Record<string, string> = {
  Payments: "bg-violet-400/12 text-violet-200",
  Utilities: "bg-amber-400/12 text-amber-200",
  Exchange: "bg-cyan-400/12 text-cyan-200",
  Trading: "bg-sky-400/12 text-sky-200",
  Savings: "bg-emerald-400/12 text-emerald-200",
  Yield: "bg-pink-400/12 text-pink-200",
  Remittance: "bg-orange-400/12 text-orange-200",
};

export function ExploreLayer({ onLaunch, onBuild }: { onLaunch: (app: LaunchableMiniApp) => void; onBuild: () => void }) {
  const [tab, setTab] = useState<"explore" | "mine">("explore");
  const [category, setCategory] = useState("All");
  const { authenticated, configured, login } = useSeraPrivy();
  const approved = trpc.miniApps.listApproved.useQuery(undefined, { retry: false });
  const mine = trpc.miniApps.listMine.useQuery(undefined, { enabled: authenticated, retry: false });
  const utils = trpc.useUtils();
  const favorite = trpc.miniApps.setFavorite.useMutation({ onSuccess: () => utils.miniApps.listMine.invalidate() });
  const recordLaunch = trpc.miniApps.recordLaunch.useMutation({ onSuccess: () => utils.miniApps.listMine.invalidate() });
  const apps = (approved.data ?? []) as ListedMiniApp[];
  const myApps = (mine.data ?? []) as ListedMiniApp[];
  const categories = useMemo(() => ["All", ...Array.from(new Set(apps.map(app => app.category)))], [apps]);
  const visibleApps = tab === "explore" ? apps.filter(app => category === "All" || app.category === category) : myApps;
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
    <section className="mx-auto max-w-[1240px] pb-6">
      <header className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[radial-gradient(circle_at_85%_0%,rgba(179,255,62,0.14),transparent_32%),#111815] px-5 py-6 sm:px-7 sm:py-8">
        <div className="absolute right-6 top-5 grid h-12 w-12 place-items-center rounded-2xl bg-[#b3ff3e]/10 text-[#b3ff3e]"><Sparkles className="h-5 w-5" /></div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b3ff3e]">SeraPay ecosystem</p>
        <h1 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">A wallet that becomes more useful with every app.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/48">Discover verified SeraPay mini-apps, launch them inside your wallet, and keep your favorite tools close without granting access to your keys.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={() => setTab("explore")} className={cn("h-10 rounded-xl px-4 text-xs", tab === "explore" ? "bg-[#b3ff3e] text-[#0b1a0e] hover:bg-[#c6ff66]" : "bg-white/[0.06] text-white hover:bg-white/[0.1]")}>Explore apps</Button>
          <Button onClick={openMine} variant="outline" className="h-10 rounded-xl border-white/[0.10] bg-transparent px-4 text-xs text-white/75 hover:bg-white/[0.06] hover:text-white">My mini apps</Button>
          <Button onClick={onBuild} variant="outline" className="h-10 rounded-xl border-white/[0.10] bg-transparent px-4 text-xs text-white/75 hover:bg-white/[0.06] hover:text-white"><Plus className="mr-1.5 h-3.5 w-3.5" />Developer build</Button>
        </div>
      </header>

      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
          <TabButton active={tab === "explore"} onClick={() => setTab("explore")}>Explore</TabButton>
          <TabButton active={tab === "mine"} onClick={openMine}>My mini apps</TabButton>
        </div>
        {tab === "mine" && authenticated ? <Badge className="border-[#b3ff3e]/20 bg-[#b3ff3e]/10 text-[#d8ff9d] hover:bg-[#b3ff3e]/10">Favorites & recent</Badge> : null}
      </div>

      {tab === "explore" ? <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{categories.map(item => <button key={item} onClick={() => setCategory(item)} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs transition", category === item ? "border-[#b3ff3e]/30 bg-[#b3ff3e]/10 text-[#d9ff9b]" : "border-white/[0.08] bg-white/[0.03] text-white/45 hover:text-white/80")}>{item}</button>)}</div> : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? <div className="col-span-full rounded-3xl border border-white/[0.08] bg-white/[0.02] px-5 py-14 text-center text-sm text-white/45">Loading verified mini-apps…</div> : null}
        {!loading && !visibleApps.length ? <EmptyMiniApps tab={tab} configured={configured} onSignIn={signIn} /> : null}
        {!loading ? visibleApps.map(app => <MiniAppCard app={app} key={app.id} onFavorite={() => toggleFavorite(app)} onLaunch={() => launch(app)} />) : null}
      </div>
    </section>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return <button onClick={onClick} className={cn("rounded-lg px-3 py-2 text-xs transition", active ? "bg-white/[0.09] text-white" : "text-white/42 hover:text-white/75")}>{children}</button>;
}

function MiniAppCard({ app, onFavorite, onLaunch }: { app: ListedMiniApp; onFavorite: () => void; onLaunch: () => void }) {
  return (
    <article className="group flex min-h-[238px] flex-col rounded-3xl border border-white/[0.08] bg-[#111815] p-5 transition hover:-translate-y-0.5 hover:border-white/[0.15]">
      <div className="flex items-start justify-between gap-4">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#b3ff3e] to-[#52c06d] text-[#0b1a0e]"><Layers3 className="h-5 w-5" /></div>
        <div className="flex gap-2"><Badge className={cn("border-0", categoryTone[app.category] ?? "bg-white/[0.06] text-white/65")}>{app.category}</Badge><button aria-label={`Favorite ${app.name}`} onClick={onFavorite} className={cn("grid h-7 w-7 place-items-center rounded-lg border transition", app.isFavorite ? "border-[#b3ff3e]/30 bg-[#b3ff3e]/10 text-[#b3ff3e]" : "border-white/[0.09] text-white/35 hover:text-white")}><Heart className={cn("h-3.5 w-3.5", app.isFavorite && "fill-current")} /></button></div>
      </div>
      <div className="mt-5"><div className="flex items-center gap-2"><h2 className="font-medium text-white">{app.name}</h2><ShieldCheck className="h-3.5 w-3.5 text-[#b3ff3e]" /></div><p className="mt-2 line-clamp-3 text-sm leading-5 text-white/42">{app.description}</p></div>
      <div className="mt-auto pt-5"><div className="flex items-center justify-between text-[11px] text-white/35"><span>{app.developerIdentity}</span><span>{app.visitCount ? `${app.visitCount} launches` : `${app.permissions.length} permissions`}</span></div><Button onClick={onLaunch} className="mt-4 h-10 w-full rounded-xl bg-white/[0.07] text-xs text-white hover:bg-[#b3ff3e] hover:text-[#0b1a0e]"><Play className="mr-1.5 h-3.5 w-3.5" />Launch securely</Button></div>
    </article>
  );
}

function EmptyMiniApps({ tab, configured, onSignIn }: { tab: "explore" | "mine"; configured: boolean; onSignIn: () => void }) {
  return <div className="col-span-full rounded-3xl border border-dashed border-white/[0.14] bg-white/[0.02] px-5 py-14 text-center"><Heart className="mx-auto h-5 w-5 text-[#b3ff3e]" /><h2 className="mt-3 text-base font-medium text-white">{tab === "mine" ? "Your mini-app shelf is ready" : "No verified mini-apps yet"}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/42">{tab === "mine" ? "Launch an app or tap its heart to build your personal collection of wallet tools." : "Approved apps appear here immediately after owner review."}</p>{tab === "mine" && configured ? <Button onClick={onSignIn} className="mt-5 rounded-xl bg-[#b3ff3e] text-[#0b1a0e] hover:bg-[#c6ff66]">Continue with Privy</Button> : null}</div>;
}
