import { useState, useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { PreferencesDialog } from "@/components/PreferencesDialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { UserPreferences } from "@/lib/preferences";

const DISMISS_KEY = "huddle.prefBannerDismissed";

export const PreferencesBanner = () => {
  const { user } = useAuth();
  const { prefs, hasRow, loading, save } = useUserPreferences();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const handleSave = async (next: UserPreferences) => {
    setSaving(true);
    const { error } = await save(next);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save preferences", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Got it!", description: "We'll surface places you'll love." });
    setOpen(false);
  };

  if (!user || loading || hasRow || dismissed) return null;

  return (
    <>
      <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 p-4 flex items-center gap-3 shadow-card">
        <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center shadow-elegant shrink-0">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Make Huddle yours</p>
          <p className="text-xs text-muted-foreground">
            Tell us what you like and we'll put your favorite kinds of places first.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          Pick your vibe
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={dismiss}
          aria-label="Dismiss"
          className="h-8 w-8 shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <PreferencesDialog
        open={open}
        initial={prefs}
        saving={saving}
        onOpenChange={setOpen}
        onSave={handleSave}
      />
    </>
  );
};
