import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useT } from "@/contexts/A11yContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PreferencesDialog } from "@/components/PreferencesDialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Building2, ShieldCheck, Plus, Sparkles, Pencil, ArrowRight, UserCircle } from "lucide-react";
import { PREF_CATEGORIES, type UserPreferences } from "@/lib/preferences";
import type { Tables } from "@/integrations/supabase/types";

type Business = Tables<"businesses">;

const statusColor: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
  draft: "outline",
  pending: "secondary",
  under_review: "secondary",
  approved: "default",
  rejected: "destructive",
};

const Account = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useUserRoles();
  const t = useT();
  const navigate = useNavigate();
  const [ownsBusiness, setOwnsBusiness] = useState(false);
  const [myBusinesses, setMyBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const { prefs, hasRow: hasPrefRow, save: savePrefs } = useUserPreferences();
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const handlePrefsSave = async (next: UserPreferences) => {
    setSavingPrefs(true);
    const { error } = await savePrefs(next);
    setSavingPrefs(false);
    if (error) {
      toast({ title: "Couldn't save preferences", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Preferences updated" });
    setPrefsOpen(false);
  };

  const categoryLabel = (value: string) =>
    PREF_CATEGORIES.find((c) => c.value === value)?.label ?? value;

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [profile, biz] = await Promise.all([
        supabase.from("profiles").select("owns_business").eq("user_id", user.id).maybeSingle(),
        supabase.from("businesses").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }),
      ]);
      setOwnsBusiness(Boolean(profile.data?.owns_business));
      setMyBusinesses((biz.data ?? []) as Business[]);
      setLoading(false);
    })();
  }, [user]);

  const toggleOwnership = async (next: boolean) => {
    if (!user) return;
    setOwnsBusiness(next);
    const { error } = await supabase.from("profiles").update({ owns_business: next }).eq("user_id", user.id);
    if (error) {
      setOwnsBusiness(!next);
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      return;
    }
    if (next && myBusinesses.length === 0) {
      toast({ title: "Let's set it up", description: "Walking you through business onboarding now." });
      navigate("/business/onboarding");
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main id="main" className="container max-w-2xl py-10 space-y-5 flex-1">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center">
            <UserCircle className="h-4.5 w-4.5 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t("account.title")}</h1>
        </div>

        {/* Admin badge */}
        {isAdmin && (
          <div className="p-[5px] rounded-[1.5rem] bg-primary/6 border border-primary/15">
            <div className="rounded-[calc(1.5rem-5px)] bg-background px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-4.5 w-4.5 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{t("account.adminBadge")}</p>
                  <p className="text-xs text-muted-foreground">{t("account.adminHint")}</p>
                </div>
              </div>
              <Button
                asChild
                size="sm"
                className="rounded-full px-4 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
              >
                <Link to="/admin">{t("account.openAdmin")}</Link>
              </Button>
            </div>
          </div>
        )}

        {/* Preferences */}
        <div className="p-[5px] rounded-[1.5rem] bg-foreground/[0.03] border border-border/50">
          <div className="rounded-[calc(1.5rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <div className="px-6 pt-6 pb-5 border-b border-border/60 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="h-4.5 w-4.5 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-semibold tracking-tight">Your preferences</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                    We use these to surface places you'll love first.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPrefsOpen(true)}
                className="rounded-full px-4 gap-2 shrink-0"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                {hasPrefRow ? "Edit" : "Set up"}
              </Button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2.5">
                  Categories
                </p>
                {prefs.categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No categories picked yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {prefs.categories.map((c) => (
                      <Badge key={c} variant="secondary" className="rounded-full px-3 py-0.5 text-xs">
                        {categoryLabel(c)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2.5">
                  Vibes
                </p>
                {prefs.vibes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No vibes picked yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {prefs.vibes.map((v) => (
                      <Badge key={v} variant="outline" className="capitalize rounded-full px-3 py-0.5 text-xs">
                        {v}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <PreferencesDialog
          open={prefsOpen}
          initial={prefs}
          saving={savingPrefs}
          onOpenChange={setPrefsOpen}
          onSave={handlePrefsSave}
        />

        {/* Business ownership toggle */}
        <div className="p-[5px] rounded-[1.5rem] bg-foreground/[0.03] border border-border/50">
          <div className="rounded-[calc(1.5rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <div className="px-6 pt-6 pb-5 border-b border-border/60">
              <p className="font-semibold tracking-tight">{t("account.businessOwner")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("account.businessOwnerHint")}</p>
            </div>
            <div className="px-6 py-5 flex items-center justify-between">
              <Label htmlFor="owns" className="cursor-pointer text-sm font-medium">{t("account.iOwn")}</Label>
              <Switch id="owns" checked={ownsBusiness} onCheckedChange={toggleOwnership} />
            </div>
          </div>
        </div>

        {/* My businesses */}
        {ownsBusiness && (
          <div className="p-[5px] rounded-[1.5rem] bg-foreground/[0.03] border border-border/50">
            <div className="rounded-[calc(1.5rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <div className="px-6 pt-6 pb-5 border-b border-border/60 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Building2 className="h-4.5 w-4.5 text-foreground/70" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-semibold tracking-tight">{t("account.myBusinesses")}</p>
                    <p className="text-xs text-muted-foreground">{t("account.myBusinessesHint")}</p>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="rounded-full px-4 gap-2 shrink-0">
                  <Link to="/business/onboarding">
                    <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {t("account.addAnother")}
                  </Link>
                </Button>
              </div>

              <div className="p-3">
                {loading ? (
                  <div className="px-3 py-4 text-sm text-muted-foreground">{t("common.loading")}</div>
                ) : myBusinesses.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground space-y-2">
                    <p>{t("account.noBusinesses")}</p>
                    <Link to="/business/onboarding" className="text-primary font-medium hover:underline">
                      {t("account.startOnboarding")}
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {myBusinesses.map((b) => (
                      <Link
                        to={`/business/${b.id}`}
                        key={b.id}
                        className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors duration-200 group"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{b.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{b.category}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant={statusColor[b.status] ?? "secondary"}
                            className="capitalize rounded-full text-[10px] px-2.5"
                          >
                            {b.status.replace("_", " ")}
                          </Badge>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 -translate-x-1 group-hover:translate-x-0 transition-transform" strokeWidth={1.5} />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Account;
