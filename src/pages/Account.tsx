import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useT } from "@/contexts/A11yContext";
import { Footer } from "@/components/Footer";
import { PreferencesDialog } from "@/components/PreferencesDialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Building2, ShieldCheck, Plus, Sparkles, Pencil, ArrowRight,
  LogOut, BarChart3, MapPin, Bookmark, Star,
} from "lucide-react";
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
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin } = useUserRoles();
  const t = useT();
  const navigate = useNavigate();
  const [ownsBusiness, setOwnsBusiness] = useState(false);
  const [myBusinesses, setMyBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityStats, setActivityStats] = useState({ checkIns: 0, saved: 0, reviews: 0 });
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
      const [profile, biz, checkIns, saved, reviews] = await Promise.all([
        supabase.from("profiles").select("owns_business").eq("user_id", user.id).maybeSingle(),
        supabase.from("businesses").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }),
        supabase.from("check_ins").select("id", { count: "exact" }).eq("user_id", user.id),
        supabase.from("bookmarks").select("id", { count: "exact" }).eq("user_id", user.id),
        supabase.from("reviews").select("id", { count: "exact" }).eq("user_id", user.id),
      ]);
      setOwnsBusiness(Boolean(profile.data?.owns_business));
      setMyBusinesses((biz.data ?? []) as Business[]);
      setActivityStats({
        checkIns: checkIns.count ?? 0,
        saved: saved.count ?? 0,
        reviews: reviews.count ?? 0,
      });
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

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initials = user?.user_metadata?.display_name
    ? user.user_metadata.display_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? "??";

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">

      <main id="main" className="container max-w-2xl py-10 space-y-4 flex-1">

        {/* Profile hero */}
        <div className="p-[5px] rounded-[2rem] bg-gradient-to-br from-primary/10 via-background to-accent/5 border border-primary/15">
          <div className="rounded-[calc(2rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] px-7 py-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.12)] shrink-0">
                  <span className="text-xl font-bold text-white tracking-tight">{initials}</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight">
                    {user.user_metadata?.display_name ?? "Huddler"}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
                  {memberSince && (
                    <p className="text-xs text-muted-foreground/70 mt-1">Member since {memberSince}</p>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSignOut}
                className="rounded-full px-4 gap-2 shrink-0 text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
                Sign out
              </Button>
            </div>

            {/* Activity stats */}
            <div className="mt-6 pt-5 border-t border-border/60 grid grid-cols-3 divide-x divide-border/40">
              {[
                { icon: MapPin, label: "Check-ins", value: activityStats.checkIns },
                { icon: Bookmark, label: "Saved", value: activityStats.saved },
                { icon: Star, label: "Reviews", value: activityStats.reviews },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex flex-col items-center gap-1 px-4 first:pl-0 last:pr-0">
                  <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <span className="text-xl font-bold tabular-nums">{value}</span>
                  <span className="text-[11px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
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
              <Button asChild size="sm" className="rounded-full px-4">
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
                  <p className="text-xs text-muted-foreground mt-0.5">
                    We use these to surface places you'll love first.
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setPrefsOpen(true)} className="rounded-full px-4 gap-2 shrink-0">
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                {hasPrefRow ? "Edit" : "Set up"}
              </Button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2.5">Categories</p>
                {prefs.categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No categories picked yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {prefs.categories.map((c) => (
                      <Badge key={c} variant="secondary" className="rounded-full px-3 py-0.5 text-xs">{categoryLabel(c)}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2.5">Vibes</p>
                {prefs.vibes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No vibes picked yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {prefs.vibes.map((v) => (
                      <Badge key={v} variant="outline" className="capitalize rounded-full px-3 py-0.5 text-xs">{v}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <PreferencesDialog open={prefsOpen} initial={prefs} saving={savingPrefs} onOpenChange={setPrefsOpen} onSave={handlePrefsSave} />

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
                <div className="flex items-center gap-2 shrink-0">
                  {myBusinesses.length > 0 && (
                    <Button asChild size="sm" variant="outline" className="rounded-full px-4 gap-2">
                      <Link to="/business-dashboard">
                        <BarChart3 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Dashboard
                      </Link>
                    </Button>
                  )}
                  <Button asChild size="sm" variant="outline" className="rounded-full px-4 gap-2">
                    <Link to="/business/onboarding">
                      <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {t("account.addAnother")}
                    </Link>
                  </Button>
                </div>
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
                          <Badge variant={statusColor[b.status] ?? "secondary"} className="capitalize rounded-full text-[10px] px-2.5">
                            {b.status.replace("_", " ")}
                          </Badge>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200" strokeWidth={1.5} />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { to: "/my-huddle", icon: Bookmark, label: "My Huddle", sub: "Saved places" },
            { to: "/discover", icon: MapPin, label: "Discover", sub: "Find local spots" },
          ].map(({ to, icon: Icon, label, sub }) => (
            <Link
              key={to}
              to={to}
              className="p-[5px] rounded-[1.5rem] bg-foreground/[0.03] border border-border/50 group"
            >
              <div className="rounded-[calc(1.5rem-5px)] bg-background px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                  <Icon className="h-4.5 w-4.5 text-foreground/60 group-hover:text-primary transition-colors" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
              </div>
            </Link>
          ))}
        </div>

      </main>
      <Footer />
    </div>
  );
};

export default Account;
