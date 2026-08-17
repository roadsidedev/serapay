import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSeraPrivy } from "@/contexts/PrivyContext";
import { trpc } from "@/lib/trpc";
import { miniAppCategories, miniAppPermissions, type MiniAppPermission } from "@shared/miniApps";
import { Check, ChevronDown, Code2, FileCheck2, Loader2, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

function Field({ label, name, children, hint, className = "" }: { label: string; name?: string; children: React.ReactNode; hint?: string; className?: string }) {
  return <div className={className}><Label htmlFor={name} className="text-sm font-medium text-white/80">{label}</Label>{children}{hint ? <p className="mt-1.5 text-xs leading-5 text-white/45">{hint}</p> : null}</div>;
}

export function DeveloperSubmission() {
  const { authenticated, configured, login } = useSeraPrivy();
  const [permissions, setPermissions] = useState<MiniAppPermission[]>(["wallet.read"]);
  const [category, setCategory] = useState<(typeof miniAppCategories)[number]>("Utilities");
  const [readiness, setReadiness] = useState<"idle" | "ready" | "needs-attention">("idle");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const submission = trpc.miniApps.submit.useMutation();
  const draftValidation = trpc.miniApps.validateDraft.useMutation();

  const buildDraft = (form: HTMLFormElement) => {
    const data = new FormData(form);
    return {
      name: String(data.get("name") ?? "").trim(),
      description: String(data.get("description") ?? "").trim(),
      logoUrl: String(data.get("logoUrl") ?? "").trim(),
      launchUrl: String(data.get("launchUrl") ?? "").trim(),
      manifestUrl: String(data.get("manifestUrl") ?? "").trim(),
      developerIdentity: String(data.get("developerIdentity") ?? "").trim(),
      version: String(data.get("version") ?? "").trim(),
      category,
      permissions,
      supportedCurrencies: String(data.get("supportedCurrencies") ?? "").split(",").map(value => value.trim().toUpperCase()).filter(Boolean),
    };
  };

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

  const validateDraft = async (form: HTMLFormElement) => {
    if (!form.reportValidity() || !requireSignIn()) return;
    try {
      await draftValidation.mutateAsync(buildDraft(form));
      setReadiness("ready");
      toast.success("Draft ready for review", { description: "URLs, manifest metadata, and requested permissions passed validation." });
    } catch (error) {
      setReadiness("needs-attention");
      toast.error("Draft needs attention", { description: error instanceof Error ? error.message : "Check the highlighted details and try again." });
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity() || !requireSignIn()) return;
    try {
      await submission.mutateAsync(buildDraft(event.currentTarget));
      event.currentTarget.reset();
      setPermissions(["wallet.read"]);
      setReadiness("idle");
      setAdvancedOpen(false);
      toast.success("Mini app submitted", { description: "It is now waiting for owner review." });
    } catch (error) {
      toast.error("Submission failed", { description: error instanceof Error ? error.message : "We could not save the submission. Try again." });
    }
  };

  const togglePermission = (permission: MiniAppPermission) => {
    setReadiness("idle");
    setPermissions(current => current.includes(permission) ? current.filter(item => item !== permission) : [...current, permission]);
  };

  return <section className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-6">
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#7161DF]/35 bg-[#7161DF]/12 text-[#b8b0ff]"><Code2 className="h-4 w-4" /></span>
      <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b8b0ff]">Developer console</p><h2 className="mt-1 text-xl font-semibold text-white">Publish a mini app</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/55">Add the essentials first. Advanced links and wallet permissions stay grouped until you need them.</p></div>
    </div>

    <form onSubmit={submit} className="mt-6 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="App name" name="name"><Input id="name" name="name" required maxLength={80} placeholder="Utility desk" className="field-input mt-2 w-full" /></Field>
        <Field label="Developer identity" name="developerIdentity"><Input id="developerIdentity" name="developerIdentity" required maxLength={120} placeholder="Example Labs" className="field-input mt-2 w-full" /></Field>
        <Field label="Launch URL" name="launchUrl" hint="Use a public HTTPS URL or local loopback URL for development."><Input id="launchUrl" name="launchUrl" required type="url" placeholder="https://app.example.com" className="field-input mt-2 w-full" /></Field>
        <Field label="Version" name="version"><Input id="version" name="version" required pattern="^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$" placeholder="1.0.0" className="field-input mt-2 w-full" /></Field>
        <Field label="Category" name="category"><Select value={category} onValueChange={value => setCategory(value as typeof category)}><SelectTrigger id="category" className="field-input mt-2 w-full"><SelectValue /></SelectTrigger><SelectContent>{miniAppCategories.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Supported currencies" name="supportedCurrencies" hint="Comma-separated ISO codes."><Input id="supportedCurrencies" name="supportedCurrencies" required placeholder="USD, NGN, EUR" className="field-input mt-2 w-full" /></Field>
      </div>

      <Field label="What does it help users do?" name="description" hint="20–500 characters. Write the real user task, not a feature list."><Textarea id="description" name="description" required minLength={20} maxLength={500} placeholder="Help users pay a utility bill in their local currency." className="field-input mt-2 min-h-28 w-full resize-y" /></Field>

      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3 sm:p-4">
        <button type="button" onClick={() => setAdvancedOpen(open => !open)} aria-expanded={advancedOpen} className="flex min-h-11 w-full items-center justify-between gap-3 text-left"><span><span className="block text-sm font-medium text-white">Advanced setup</span><span className="mt-1 block text-xs text-white/45">Manifest, logo, and wallet access.</span></span><ChevronDown className={`h-4 w-4 text-white/55 transition-transform ${advancedOpen ? "rotate-180" : ""}`} /></button>
        {advancedOpen ? <div className="mt-4 space-y-5 border-t border-white/10 pt-4">
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Manifest URL" name="manifestUrl"><Input id="manifestUrl" name="manifestUrl" required type="url" placeholder="https://app.example.com/manifest.json" className="field-input mt-2 w-full" /></Field><Field label="Logo URL" name="logoUrl"><Input id="logoUrl" name="logoUrl" required type="url" placeholder="https://app.example.com/logo.svg" className="field-input mt-2 w-full" /></Field></div>
          <div><Label className="text-sm font-medium text-white/80">Wallet permissions</Label><p className="mt-1.5 text-xs leading-5 text-white/45">Request only what the mini app needs. Users approve sensitive actions in the host wallet.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{miniAppPermissions.map(permission => <button type="button" key={permission} aria-pressed={permissions.includes(permission)} onClick={() => togglePermission(permission)} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-left text-xs transition ${permissions.includes(permission) ? "border-[#7161DF] bg-[#7161DF]/18 text-white" : "border-white/12 bg-black/20 text-white/60 hover:border-[#7161DF]/60 hover:text-white"}`}>{permissions.includes(permission) ? <Check className="h-3.5 w-3.5 text-[#b8b0ff]" /> : <span className="h-3.5 w-3.5 rounded-full border border-white/25" />}{permission}</button>)}</div></div>
        </div> : null}
      </div>

      {readiness !== "idle" ? <div className={`rounded-xl border p-3 text-sm ${readiness === "ready" ? "border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-100" : "border-amber-300/25 bg-amber-300/[0.08] text-amber-100"}`} role="status" aria-live="polite"><div className="flex items-start gap-2">{readiness === "ready" ? <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0" /> : <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />}<div><p className="font-medium">{readiness === "ready" ? "Ready to submit" : "Needs attention"}</p><p className="mt-1 text-xs leading-5 opacity-80">{readiness === "ready" ? "Validation passed. Submit when you are ready for owner review." : "Update the details above, then run validation again."}</p></div></div></div> : null}

      <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-xl text-xs leading-5 text-white/45">Sensitive wallet operations require explicit user approval. SeraPay never receives private keys or seed phrases.</p><div className="grid gap-2 sm:flex sm:shrink-0"><Button type="button" variant="outline" onClick={event => { const form = event.currentTarget.form; if (form) void validateDraft(form); }} disabled={draftValidation.isPending} className="min-h-11 border-white/15 text-white hover:bg-[#7161DF]/15 hover:text-white">{draftValidation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Validate draft</Button><Button type="submit" disabled={submission.isPending} className="min-h-11 bg-[#7161DF] text-white hover:bg-[#6656d4]">{submission.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck2 className="mr-2 h-4 w-4" />}Submit for review</Button></div></div>
    </form>
  </section>;
}
