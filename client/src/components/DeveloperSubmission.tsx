import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSeraPrivy } from "@/contexts/PrivyContext";
import { trpc } from "@/lib/trpc";
import { miniAppCategories, miniAppPermissions, type MiniAppPermission } from "@shared/miniApps";
import { Check, ChevronLeft, ChevronRight, Code2, FileCheck2, Loader2, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

type Step = 1 | 2 | 3 | 4;
type DraftState = {
  name: string;
  developerIdentity: string;
  description: string;
  launchUrl: string;
  manifestUrl: string;
  logoUrl: string;
  version: string;
  category: (typeof miniAppCategories)[number];
  supportedCurrencies: string;
};

const steps: Array<{ id: Step; label: string; title: string; description: string }> = [
  { id: 1, label: "Basics", title: "Name your mini app", description: "Give users a clear identity and explain the job it helps them complete." },
  { id: 2, label: "Launch", title: "Connect the experience", description: "Add the URL and market details Pocket Sera needs to open the app safely." },
  { id: 3, label: "Access", title: "Set trust boundaries", description: "Add manifest metadata and request only the wallet permissions you need." },
  { id: 4, label: "Review", title: "Review before publishing", description: "Validate the draft, then send it to the owner review queue." },
];

const emptyDraft: DraftState = {
  name: "",
  developerIdentity: "",
  description: "",
  launchUrl: "",
  manifestUrl: "",
  logoUrl: "",
  version: "",
  category: "Utilities",
  supportedCurrencies: "",
};

function Field({ label, name, children, hint, className = "" }: { label: string; name?: string; children: React.ReactNode; hint?: string; className?: string }) {
  return <div className={className}><Label htmlFor={name} className="text-sm font-medium text-white/80">{label}</Label>{children}{hint ? <p className="mt-1.5 text-xs leading-5 text-white/45">{hint}</p> : null}</div>;
}

export function DeveloperSubmission() {
  const { authenticated, configured, login } = useSeraPrivy();
  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [permissions, setPermissions] = useState<MiniAppPermission[]>(["wallet.read"]);
  const [readiness, setReadiness] = useState<"idle" | "ready" | "needs-attention">("idle");
  const submission = trpc.miniApps.submit.useMutation();
  const draftValidation = trpc.miniApps.validateDraft.useMutation();

  const requireSignIn = () => {
    if (authenticated) return true;
    if (configured) {
      toast.message("Sign in to continue", { description: "Your mini-app draft will stay on this device." });
      login();
    } else {
      toast.error("Developer sign-in is not configured", { description: "Add VITE_PRIVY_APP_ID before publishing a mini app." });
    }
    return false;
  };

  const buildDraft = () => ({
    ...draft,
    name: draft.name.trim(),
    description: draft.description.trim(),
    logoUrl: draft.logoUrl.trim(),
    launchUrl: draft.launchUrl.trim(),
    manifestUrl: draft.manifestUrl.trim(),
    developerIdentity: draft.developerIdentity.trim(),
    version: draft.version.trim(),
    permissions,
    supportedCurrencies: draft.supportedCurrencies.split(",").map(value => value.trim().toUpperCase()).filter(Boolean),
  });

  const updateDraft = <K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    setReadiness("idle");
    setDraft(current => ({ ...current, [key]: value }));
  };

  const validateCurrentStep = (form: HTMLFormElement) => form.reportValidity();

  const handleNext = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateCurrentStep(event.currentTarget)) return;
    setStep(current => Math.min(4, current + 1) as Step);
  };

  const handleBack = () => setStep(current => Math.max(1, current - 1) as Step);

  const validateDraft = async () => {
    if (!requireSignIn()) return;
    try {
      await draftValidation.mutateAsync(buildDraft());
      setReadiness("ready");
      toast.success("Draft ready for review", { description: "URLs, manifest metadata, and permissions passed validation." });
    } catch (error) {
      setReadiness("needs-attention");
      toast.error("Draft needs attention", { description: error instanceof Error ? error.message : "Check the previous steps and try again." });
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (readiness !== "ready") {
      toast.message("Validate your draft first", { description: "Pocket Sera checks the URLs and manifest before submission." });
      return;
    }
    if (!requireSignIn()) return;
    try {
      await submission.mutateAsync(buildDraft());
      setDraft(emptyDraft);
      setPermissions(["wallet.read"]);
      setReadiness("idle");
      setStep(1);
      toast.success("Mini app submitted", { description: "It is now waiting for owner review." });
    } catch (error) {
      toast.error("Submission failed", { description: error instanceof Error ? error.message : "We could not save the submission. Try again." });
    }
  };

  const togglePermission = (permission: MiniAppPermission) => {
    setReadiness("idle");
    setPermissions(current => current.includes(permission) ? current.filter(item => item !== permission) : [...current, permission]);
  };

  const currentStep = steps[step - 1];
  return <section className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-6">
    <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#7161DF]/35 bg-[#7161DF]/12 text-[#b8b0ff]"><Code2 className="h-4 w-4" /></span><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b8b0ff]">Developer console</p><h2 className="mt-1 text-xl font-semibold text-white">Publish a mini app</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/55">Complete one focused step at a time. You can move back to edit any detail before submitting.</p></div></div>

    <ol className="mt-6 grid grid-cols-4 gap-1.5" aria-label="Publishing progress">{steps.map(item => <li key={item.id} className="min-w-0"><div className={`h-1.5 rounded-full ${item.id <= step ? "bg-[#7161DF]" : "bg-white/10"}`} /><p className={`mt-2 truncate text-[10px] font-medium uppercase tracking-[0.1em] ${item.id === step ? "text-[#b8b0ff]" : "text-white/35"}`}>{item.label}</p></li>)}</ol>

    <form onSubmit={step === 4 ? submit : handleNext} className="mt-6 space-y-6">
      <div><p className="text-base font-semibold text-white">Step {step} · {currentStep.title}</p><p className="mt-1 text-sm leading-5 text-white/50">{currentStep.description}</p></div>

      {step === 1 ? <div className="space-y-5"><Field label="App name" name="name"><Input id="name" value={draft.name} onChange={event => updateDraft("name", event.target.value)} required maxLength={80} placeholder="Utility desk" className="field-input mt-2 w-full" /></Field><Field label="Developer identity" name="developerIdentity"><Input id="developerIdentity" value={draft.developerIdentity} onChange={event => updateDraft("developerIdentity", event.target.value)} required maxLength={120} placeholder="Example Labs" className="field-input mt-2 w-full" /></Field><Field label="What does it help users do?" name="description" hint="20–500 characters. Write the real user task, not a feature list."><Textarea id="description" value={draft.description} onChange={event => updateDraft("description", event.target.value)} required minLength={20} maxLength={500} placeholder="Help users pay a utility bill in their local currency." className="field-input mt-2 min-h-32 w-full resize-y" /></Field></div> : null}

      {step === 2 ? <div className="space-y-5"><Field label="Launch URL" name="launchUrl" hint="Use a public HTTPS URL or local loopback URL for development."><Input id="launchUrl" value={draft.launchUrl} onChange={event => updateDraft("launchUrl", event.target.value)} required type="url" placeholder="https://app.example.com" className="field-input mt-2 w-full" /></Field><div className="grid gap-5 sm:grid-cols-2"><Field label="Version" name="version"><Input id="version" value={draft.version} onChange={event => updateDraft("version", event.target.value)} required pattern="^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$" placeholder="1.0.0" className="field-input mt-2 w-full" /></Field><Field label="Category" name="category"><Select value={draft.category} onValueChange={value => updateDraft("category", value as DraftState["category"])}><SelectTrigger id="category" className="field-input mt-2 w-full"><SelectValue /></SelectTrigger><SelectContent className="border-border bg-popover text-popover-foreground">{miniAppCategories.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field></div><Field label="Supported currencies" name="supportedCurrencies" hint="Comma-separated ISO codes."><Input id="supportedCurrencies" value={draft.supportedCurrencies} onChange={event => updateDraft("supportedCurrencies", event.target.value)} required placeholder="USD, NGN, EUR" className="field-input mt-2 w-full" /></Field></div> : null}

      {step === 3 ? <div className="space-y-5"><div className="grid gap-5 sm:grid-cols-2"><Field label="Manifest URL" name="manifestUrl" hint="The manifest should match the app name, developer, version, and permissions."><Input id="manifestUrl" value={draft.manifestUrl} onChange={event => updateDraft("manifestUrl", event.target.value)} required type="url" placeholder="https://app.example.com/manifest.json" className="field-input mt-2 w-full" /></Field><Field label="Logo URL" name="logoUrl"><Input id="logoUrl" value={draft.logoUrl} onChange={event => updateDraft("logoUrl", event.target.value)} required type="url" placeholder="https://app.example.com/logo.svg" className="field-input mt-2 w-full" /></Field></div><div><Label className="text-sm font-medium text-white/80">Wallet permissions</Label><p className="mt-1.5 text-xs leading-5 text-white/45">Request only what the mini app needs. Users approve sensitive actions in the host wallet.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{miniAppPermissions.map(permission => <button type="button" key={permission} aria-pressed={permissions.includes(permission)} onClick={() => togglePermission(permission)} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-left text-xs transition ${permissions.includes(permission) ? "border-[#7161DF] bg-[#7161DF]/18 text-white" : "border-white/12 bg-black/20 text-white/60 hover:border-[#7161DF]/60 hover:text-white"}`}>{permissions.includes(permission) ? <Check className="h-3.5 w-3.5 text-[#b8b0ff]" /> : <span className="h-3.5 w-3.5 rounded-full border border-white/25" />}{permission}</button>)}</div></div></div> : null}

      {step === 4 ? <div className="space-y-4"><div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs text-white/40">App</dt><dd className="mt-1 text-white">{draft.name || "—"}</dd></div><div><dt className="text-xs text-white/40">Developer</dt><dd className="mt-1 text-white">{draft.developerIdentity || "—"}</dd></div><div><dt className="text-xs text-white/40">Launch URL</dt><dd className="mt-1 truncate text-white">{draft.launchUrl || "—"}</dd></div><div><dt className="text-xs text-white/40">Permissions</dt><dd className="mt-1 text-white">{permissions.join(", ") || "None"}</dd></div></dl></div>{readiness !== "idle" ? <div className={`rounded-xl border p-3 text-sm ${readiness === "ready" ? "border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-100" : "border-amber-300/25 bg-amber-300/[0.08] text-amber-100"}`} role="status" aria-live="polite"><div className="flex items-start gap-2">{readiness === "ready" ? <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0" /> : <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />}<div><p className="font-medium">{readiness === "ready" ? "Ready to submit" : "Needs attention"}</p><p className="mt-1 text-xs leading-5 opacity-80">{readiness === "ready" ? "Validation passed. Submit when you are ready for owner review." : "Update the previous steps, then validate again."}</p></div></div></div> : <p className="text-xs leading-5 text-white/45">Validate your draft to check the URLs, manifest metadata, and requested permissions before sending it to owner review.</p>}</div> : null}

      <div className="flex flex-col-reverse gap-2 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-2">{step > 1 ? <Button type="button" variant="ghost" onClick={handleBack} className="min-h-11 text-white/65 hover:bg-white/[0.08] hover:text-white"><ChevronLeft className="mr-1 h-4 w-4" />Back</Button> : null}</div><div className="grid gap-2 sm:flex">{step === 4 ? <><Button type="button" variant="outline" onClick={() => void validateDraft()} disabled={draftValidation.isPending} className="min-h-11 border-white/15 text-white hover:bg-[#7161DF]/15 hover:text-white">{draftValidation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Validate draft</Button><Button type="submit" disabled={submission.isPending || readiness !== "ready"} className="min-h-11 bg-[#7161DF] text-white hover:bg-[#6656d4]">{submission.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck2 className="mr-2 h-4 w-4" />}Submit for review</Button></> : <Button type="submit" className="min-h-11 bg-[#7161DF] text-white hover:bg-[#6656d4]">Continue<ChevronRight className="ml-1 h-4 w-4" /></Button>}</div></div>
    </form>
  </section>;
}
