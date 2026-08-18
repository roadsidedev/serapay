import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

const PREFERENCES_KEY = "pocket-sera-profile-preferences";
const LEGACY_PREFERENCES_KEY = "serapay-profile-preferences";

export function ProfilePreferences() {
  const [currency, setCurrency] = useState("USD");
  const [privacyMode, setPrivacyMode] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? window.localStorage.getItem(LEGACY_PREFERENCES_KEY) ?? "{}");
      if (stored.currency === "USD" || stored.currency === "EUR" || stored.currency === "GBP") setCurrency(stored.currency);
      if (typeof stored.privacyMode === "boolean") setPrivacyMode(stored.privacyMode);
    } catch {
      // Use the secure defaults when local preferences cannot be read.
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ currency, privacyMode }));
  }, [currency, privacyMode]);

  return <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-4"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-white"><SlidersHorizontal className="h-4 w-4" /></div><div><p className="text-sm font-medium text-white">Display preferences</p><p className="mt-1 max-w-lg text-xs leading-5 text-white/48">Choose your default display currency and obscure amounts at a glance. These preferences stay on this device.</p></div></div><div className="flex items-center gap-3"><div><Label className="text-[10px] uppercase tracking-[0.14em] text-white/45">Display</Label><Select value={currency} onValueChange={setCurrency}><SelectTrigger className="mt-1 h-9 w-[104px] border-white/15 bg-white/[0.03] text-xs text-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem></SelectContent></Select></div><div className="pt-4"><Switch checked={privacyMode} onCheckedChange={setPrivacyMode} aria-label="Obscure wallet amounts" /></div></div></div>;
}
