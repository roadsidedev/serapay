import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { readWalletActivity, type WalletActivityEntry } from "@/lib/walletActivity";
import { cn } from "@/lib/utils";
import { Loader2, ReceiptText, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";

type ActivityJournalProps = {
  address: string | null;
  isAuthenticated: boolean;
};

function ActivityEmptyState({ title, copy }: { title: string; copy: string }) {
  return <div className="grid place-items-center px-6 py-24 text-center"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.05] text-white/38"><WalletCards className="h-5 w-5" /></div><h2 className="mt-5 text-base font-medium text-white">{title}</h2><p className="mt-2 max-w-md text-sm leading-6 text-white/42">{copy}</p></div>;
}

export function ActivityJournal({ address, isAuthenticated }: ActivityJournalProps) {
  const [localEntries, setLocalEntries] = useState<WalletActivityEntry[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const activityQuery = trpc.sera.activity.useQuery(address ?? "", {
    enabled: Boolean(address && isAuthenticated),
    retry: false,
    refetchInterval: 5000,
  });

  useEffect(() => setLocalEntries(readWalletActivity()), []);

  const seraEntries = [
    ...(activityQuery.data?.orders ?? []).map(entry => ({ id: entry.id, label: "Sera order", status: entry.status, createdAt: entry.createdAt, kind: "order" })),
    ...(activityQuery.data?.fills ?? []).map(entry => ({ id: entry.id, label: "Sera fill", status: entry.status, createdAt: entry.createdAt, kind: "fill" })),
  ];
  const entries = [...localEntries, ...seraEntries].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const pageCount = Math.max(1, Math.ceil(entries.length / pageSize));
  const visibleEntries = entries.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(current => Math.min(current, pageCount)), [pageCount]);

  return <section className="mx-auto max-w-[1100px] animate-in fade-in duration-300"><p className="text-xs font-medium uppercase tracking-[0.2em] text-[#b3ff3e]">Execution journal</p><div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-3xl font-semibold text-white">Activity</h1><p className="mt-2 text-sm text-white/45">Sera orders and fills refresh every five seconds while wallet broadcasts remain visible on this device.</p></div><Badge className="w-fit border-white/[0.09] bg-white/[0.04] text-white/55 hover:bg-white/[0.04]">{entries.length} records</Badge></div><div className="mt-7 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#101714]">{activityQuery.isLoading ? <div className="grid place-items-center py-24 text-sm text-white/45"><Loader2 className="mb-2 h-5 w-5 animate-spin text-[#b3ff3e]" />Reading activity…</div> : !address ? <ActivityEmptyState title="Connect your wallet to see activity" copy="SeraPay keeps wallet and Sera records connected to the address you choose." /> : !isAuthenticated ? <ActivityEmptyState title="Sign in to unlock protected Sera reads" copy="Orders and fills use server-only Sera API credentials paired with your authenticated SeraPay profile." /> : activityQuery.error && !localEntries.length ? <ActivityEmptyState title="Sera activity is not available yet" copy={activityQuery.error.message} /> : !entries.length ? <ActivityEmptyState title="No activity has been recorded yet" copy="New Sera orders, fills, swaps, and direct sends will appear here." /> : <div>{visibleEntries.map(entry => <div key={`${entry.kind}-${entry.id}`} className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4 last:border-b-0"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.05] text-[#b3ff3e]"><ReceiptText className="h-4 w-4" /></span><div><p className="text-sm font-medium text-white">{entry.label}</p><p className="mt-1 max-w-[180px] truncate font-mono text-xs text-white/36">{entry.id}</p></div></div><div className="text-right"><Badge className={cn("border", entry.status === "submitted" ? "border-amber-300/15 bg-amber-300/10 text-amber-200" : "border-emerald-300/15 bg-emerald-300/10 text-emerald-200")}>{entry.status}</Badge><p className="mt-1.5 text-[11px] text-white/34">{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "Pending timestamp"}</p></div></div>)}<div className="flex items-center justify-between px-5 py-3 text-xs text-white/45"><span>Page {page} of {pageCount}</span><div className="flex gap-2"><Button onClick={() => setPage(current => Math.max(1, current - 1))} disabled={page === 1} variant="ghost" className="h-8 px-2 text-xs text-white/65 hover:bg-white/[0.06] hover:text-white">Previous</Button><Button onClick={() => setPage(current => Math.min(pageCount, current + 1))} disabled={page === pageCount} variant="ghost" className="h-8 px-2 text-xs text-white/65 hover:bg-white/[0.06] hover:text-white">Next</Button></div></div></div>}</div></section>;
}
