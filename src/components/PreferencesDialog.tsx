import { useEffect, useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PREF_CATEGORIES, PREF_VIBES, type UserPreferences } from "@/lib/preferences";

interface Props {
  open: boolean;
  initial: UserPreferences;
  saving?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (next: UserPreferences) => void;
}

export const PreferencesDialog = ({ open, initial, saving, onOpenChange, onSave }: Props) => {
  const [categories, setCategories] = useState<string[]>(initial.categories);
  const [vibes, setVibes] = useState<string[]>(initial.vibes);
  const [customVibe, setCustomVibe] = useState("");

  // Reset local state whenever the dialog opens with new initial values
  useEffect(() => {
    if (open) {
      setCategories(initial.categories);
      setVibes(initial.vibes);
      setCustomVibe("");
    }
  }, [open, initial.categories, initial.vibes]);

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const addCustomVibe = () => {
    const v = customVibe.trim().toLowerCase();
    if (!v || vibes.includes(v) || v.length > 30) return;
    setVibes([...vibes, v]);
    setCustomVibe("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Pick your vibe
          </DialogTitle>
          <DialogDescription>
            Tell us what you're into and we'll show matching local spots first.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <section className="space-y-2">
            <p className="text-sm font-medium">What kinds of places?</p>
            <div className="grid grid-cols-2 gap-2">
              {PREF_CATEGORIES.map((c) => {
                const on = categories.includes(c.value);
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategories(toggle(categories, c.value))}
                    className={`flex items-center gap-2 rounded-lg border p-3 text-sm text-left transition-all ${
                      on
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border hover:bg-muted/60"
                    }`}
                  >
                    <span className="text-lg" aria-hidden>{c.emoji}</span>
                    <span className="flex-1 font-medium">{c.label}</span>
                    {on && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-sm font-medium">Any vibes you love?</p>
            <div className="flex flex-wrap gap-1.5">
              {PREF_VIBES.map((v) => {
                const on = vibes.includes(v);
                return (
                  <Badge
                    key={v}
                    role="button"
                    tabIndex={0}
                    onClick={() => setVibes(toggle(vibes, v))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setVibes(toggle(vibes, v));
                      }
                    }}
                    variant={on ? "default" : "outline"}
                    className="cursor-pointer capitalize select-none"
                  >
                    {v}
                  </Badge>
                );
              })}
            </div>
            {/* Show custom vibes the user added that aren't in the preset list */}
            {vibes.filter((v) => !(PREF_VIBES as readonly string[]).includes(v)).length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {vibes
                  .filter((v) => !(PREF_VIBES as readonly string[]).includes(v))
                  .map((v) => (
                    <Badge
                      key={v}
                      role="button"
                      tabIndex={0}
                      onClick={() => setVibes(vibes.filter((x) => x !== v))}
                      variant="default"
                      className="cursor-pointer capitalize select-none"
                    >
                      {v} ✕
                    </Badge>
                  ))}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Input
                value={customVibe}
                onChange={(e) => setCustomVibe(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomVibe();
                  }
                }}
                placeholder="Add a custom vibe (e.g. rooftop)"
                maxLength={30}
                className="text-sm"
              />
              <Button type="button" variant="outline" size="sm" onClick={addCustomVibe} disabled={!customVibe.trim()}>
                Add
              </Button>
            </div>
          </section>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => onSave({ categories, vibes })}
          >
            {saving ? "Saving..." : "Save preferences"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
