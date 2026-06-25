import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Eye, Bookmark, MapPin, Star, Loader2, ArrowLeft,
  ExternalLink, BarChart3, ChevronRight, Save, X,
  MessageSquare, Building2, Tag, Plus, Trash2, AlertCircle, UserCircle, Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Business = Tables<"businesses">;
type Review = Tables<"reviews"> & { profiles?: { display_name: string } | null };
type Coupon = Tables<"coupons">;

const couponSchema = z.object({
  title:       z.string().trim().min(2, "Title required").max(80),
  description: z.string().trim().max(200).optional(),
  discount:    z.string().trim().max(30).optional(),
  code:        z.string().trim().max(30).optional(),
  expires_at:  z.string().min(1, "Expiry date required"),
});
type CouponForm = z.infer<typeof couponSchema>;

interface InsightRow {
  business_id: string;
  avg_rating: number | null;
  review_count: number | null;
  total_views: number | null;
  unique_viewers: number | null;
  views_30d: number | null;
  total_bookmarks: number | null;
  total_check_ins: number | null;
  check_ins_30d: number | null;
}

const editSchema = z.object({
  name: z
    .string().trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "100 characters max"),
  description: z
    .string().trim()
    .max(2000, "2000 characters max")
    .optional(),
  category: z.string().min(1, "Category is required"),
  address: z
    .string().trim()
    .max(300, "300 characters max")
    .optional(),
  phone: z
    .string().trim()
    .refine(
      (v) => !v || /^\+?[\d\s\-().]{7,20}$/.test(v),
      "Enter a valid phone number (7–20 digits)"
    )
    .optional(),
  website: z
    .string().trim()
    .url("Must be a valid URL starting with https://")
    .optional()
    .or(z.literal("")),
  tags: z
    .string().trim()
    .refine(
      (v) => !v || v.split(",").map((t) => t.trim()).filter(Boolean).length <= 10,
      "Maximum 10 tags allowed"
    )
    .refine(
      (v) => !v || v.split(",").map((t) => t.trim()).every((t) => t.length <= 30),
      "Each tag must be 30 characters or fewer"
    )
    .optional(),
  founder_name:      z.string().trim().max(80).optional(),
  founder_bio:       z.string().trim().max(500).optional(),
  founder_photo_url: z.string().trim().url("Must be a valid image URL").optional().or(z.literal("")),
});

type EditForm = z.infer<typeof editSchema>;

const CATEGORIES = ["food", "retail", "services", "health", "entertainment", "other"];

const EDITORIAL_TAG_OPTIONS = [
  "Hidden Gem", "Community Favorite", "Family-Owned", "Women-Owned",
  "Veteran-Owned", "Minority-Owned", "Eco-Friendly", "Locally Sourced",
  "Long-Standing", "Best in Neighborhood", "Dog-Friendly", "Cash Only",
] as const;

const statusConfig: Record<string, { label: string; className: string }> = {
  approved:     { label: "Approved",     className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25" },
  pending:      { label: "Pending",      className: "bg-amber-500/15  text-amber-600  border-amber-500/25" },
  under_review: { label: "Under Review", className: "bg-amber-500/15  text-amber-600  border-amber-500/25" },
  draft:        { label: "Draft",        className: "bg-zinc-500/10   text-zinc-500   border-zinc-400/25" },
  rejected:     { label: "Rejected",     className: "bg-red-500/15    text-red-600    border-red-500/25" },
};

// ── Stat pill used in the overview strip ──────────────────────────────────────
const StatPill = ({
  icon: Icon, label, value, sub,
}: { icon: React.ElementType; label: string; value: string | number; sub?: string }) => (
  <div className="flex flex-col gap-0.5 py-5 px-6">
    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1">
      <Icon className="h-3 w-3" strokeWidth={1.5} />
      {label}
    </div>
    <p className="text-2xl font-bold tabular-nums tracking-tight">{value}</p>
    {sub && <p className="text-[11px] text-muted-foreground tabular-nums">{sub}</p>}
  </div>
);

// ── Field wrapper for the edit form ──────────────────────────────────────────
const Field = ({
  label, error, children, hint,
}: { label: string; error?: string; children: React.ReactNode; hint?: string }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
      {label}
    </Label>
    {children}
    {hint && !error && <p className="text-[10px] text-muted-foreground text-right">{hint}</p>}
    {error && <p className="text-[11px] text-destructive font-medium">{error}</p>}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────

const BusinessDashboardDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [business, setBusiness] = useState<Business | null>(null);
  const [stats, setStats] = useState<InsightRow | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [hoursReports, setHoursReports] = useState<{ id: string; message: string; created_at: string }[]>([]);
  const [editorialTags, setEditorialTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [couponSaving, setCouponSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const form = useForm<EditForm>({ resolver: zodResolver(editSchema) });
  const couponForm = useForm<CouponForm>({ resolver: zodResolver(couponSchema) });
  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isDirty } } = form;

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      setLoading(true);
      const [bizRes, statsRes, revRes, cpRes, hrRes] = await Promise.all([
        supabase.from("businesses").select("*").eq("id", id).eq("owner_id", user.id).maybeSingle(),
        supabase.from("business_insights_summary").select("*").eq("business_id", id).maybeSingle(),
        supabase.from("reviews").select("*").eq("business_id", id).order("created_at", { ascending: false }),
        supabase.from("coupons").select("*").eq("business_id", id).order("expires_at", { ascending: true }),
        supabase.from("hours_reports").select("id, message, created_at").eq("business_id", id).order("created_at", { ascending: false }).limit(10),
      ]);
      if (!bizRes.data) { navigate("/business-dashboard"); return; }
      const biz = bizRes.data as Business;
      setBusiness(biz);
      setStats((statsRes.data ?? null) as InsightRow | null);

      const reviewRows = (revRes.data ?? []) as Review[];
      const userIds = Array.from(new Set(reviewRows.map((r) => r.user_id)));
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
        const map = new Map((profs ?? []).map((p) => [p.user_id, p.display_name]));
        reviewRows.forEach((r) => { r.profiles = { display_name: map.get(r.user_id) ?? "Member" }; });
      }
      setReviews(reviewRows);
      setCoupons((cpRes.data ?? []) as Coupon[]);
      setHoursReports((hrRes.data ?? []) as { id: string; message: string; created_at: string }[]);

      setEditorialTags(biz.editorial_tags ?? []);
      reset({
        name: biz.name,
        description: biz.description ?? "",
        category: biz.category,
        address: biz.address ?? "",
        phone: biz.phone ?? "",
        website: biz.website ?? "",
        tags: (biz.tags ?? []).join(", "),
        founder_name:      biz.founder_name ?? "",
        founder_bio:       biz.founder_bio ?? "",
        founder_photo_url: biz.founder_photo_url ?? "",
      });
      setLoading(false);
    })();
  }, [user, id, navigate, reset]);

  const onSave = async (data: EditForm) => {
    if (!business) return;
    setSaving(true);
    const tags = data.tags
      ? data.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];
    const { error } = await supabase.from("businesses").update({
      name: data.name,
      description: data.description ?? "",
      category: data.category,
      address: data.address ?? null,
      phone: data.phone ?? null,
      website: data.website || null,
      tags,
      founder_name:      data.founder_name?.trim() || null,
      founder_bio:       data.founder_bio?.trim() || null,
      founder_photo_url: data.founder_photo_url?.trim() || null,
      editorial_tags:    editorialTags,
    }).eq("id", business.id);
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Listing updated" });
    setBusiness((prev) => prev ? {
      ...prev, ...data, tags,
      founder_name:      data.founder_name?.trim() || null,
      founder_bio:       data.founder_bio?.trim() || null,
      founder_photo_url: data.founder_photo_url?.trim() || null,
      editorial_tags:    editorialTags,
    } : prev);
    reset(data);
  };

  const onCreateCoupon = async (data: CouponForm) => {
    if (!business || !user) return;
    setCouponSaving(true);
    const { data: row, error } = await supabase.from("coupons").insert({
      business_id: business.id,
      owner_id: user.id,
      title: data.title,
      description: data.description ?? "",
      discount: data.discount || null,
      code: data.code || null,
      expires_at: new Date(data.expires_at).toISOString(),
    }).select().single();
    setCouponSaving(false);
    if (error) return toast({ title: "Couldn't create deal", description: error.message, variant: "destructive" });
    setCoupons((prev) => [...prev, row as Coupon]);
    couponForm.reset();
    toast({ title: "Deal created" });
  };

  const deleteCoupon = async (cpId: string) => {
    setDeletingId(cpId);
    const { error } = await supabase.from("coupons").delete().eq("id", cpId);
    setDeletingId(null);
    if (error) return toast({ title: "Couldn't delete deal", description: error.message, variant: "destructive" });
    setCoupons((prev) => prev.filter((c) => c.id !== cpId));
    toast({ title: "Deal removed" });
  };

  if (!user) return null;

  const sc = business ? (statusConfig[business.status] ?? statusConfig.draft) : statusConfig.draft;

  // Character count watch values
  const watchedName = watch("name") ?? "";
  const watchedDescription = watch("description") ?? "";
  const watchedTags = watch("tags") ?? "";
  const tagCount = watchedTags
    ? watchedTags.split(",").map((t) => t.trim()).filter(Boolean).length
    : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">


      <main id="main" className="container max-w-4xl py-10 flex-1 space-y-6">

        {/* Back */}
        <Link
          to="/business-dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" strokeWidth={1.5} />
          All businesses
        </Link>

        {loading ? (
          <div className="flex items-center justify-center py-40 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : business ? (
          <>
            {/* ── Hero ──────────────────────────────────────────────────────── */}
            <div className="rounded-[2rem] overflow-hidden border border-border/50 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)]">
              <div className="relative h-52 bg-gradient-to-br from-primary/25 via-primary/12 to-accent/15 overflow-hidden">
                {business.image_url && (
                  <img
                    src={business.image_url}
                    alt={business.name}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />

                <div className="absolute bottom-5 left-6 right-6 flex items-end justify-between gap-4">
                  <div>
                    <span className={`inline-flex text-[10px] font-semibold px-2.5 py-1 rounded-full border capitalize backdrop-blur-sm ${sc.className}`}>
                      {sc.label}
                    </span>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mt-2 leading-tight">
                      {business.name}
                    </h1>
                    <p className="text-sm text-white/65 capitalize mt-0.5">{business.category}</p>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="rounded-full px-4 gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm shrink-0"
                  >
                    <Link to={`/business/${business.id}`} target="_blank">
                      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                      View listing
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Tabs ──────────────────────────────────────────────────────── */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="h-10 rounded-full bg-muted/40 border border-border/50 p-1 gap-0.5">
                <TabsTrigger value="overview"  className="rounded-full text-xs font-semibold px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="edit"      className="rounded-full text-xs font-semibold px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all">
                  Edit Listing
                </TabsTrigger>
                <TabsTrigger value="reviews"   className="rounded-full text-xs font-semibold px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all">
                  Reviews
                  {reviews.length > 0 && (
                    <span className="ml-1.5 text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-semibold tabular-nums">
                      {reviews.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="deals" className="rounded-full text-xs font-semibold px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all">
                  Deals
                  {coupons.length > 0 && (
                    <span className="ml-1.5 text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-semibold tabular-nums">
                      {coupons.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* ── OVERVIEW TAB ────────────────────────────────────────────── */}
              <TabsContent value="overview" className="space-y-5 mt-0">

                {/* Quick stats strip */}
                <div className="rounded-[1.5rem] border border-border/50 bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] overflow-hidden">
                  <div className="flex items-stretch divide-x divide-border/40 overflow-x-auto">
                    <StatPill icon={Eye}      label="Total views"    value={(stats?.total_views ?? 0).toLocaleString()}    sub={`${stats?.views_30d ?? 0} this month`} />
                    <StatPill icon={Bookmark} label="Saves"          value={(stats?.total_bookmarks ?? 0).toLocaleString()} />
                    <StatPill icon={MapPin}   label="Check-ins"      value={(stats?.total_check_ins ?? 0).toLocaleString()} sub={`${stats?.check_ins_30d ?? 0} this month`} />
                    <StatPill icon={Star}     label="Avg rating"     value={stats?.avg_rating ? Number(stats.avg_rating).toFixed(1) : "—"} sub={`${stats?.review_count ?? 0} review${(stats?.review_count ?? 0) !== 1 ? "s" : ""}`} />
                  </div>
                </div>

                {/* Insights card — links to /insights, no duplication */}
                <Link
                  to="/insights"
                  className="group block p-[5px] rounded-[1.75rem] bg-gradient-to-br from-primary/8 to-accent/6 border border-primary/20 hover:border-primary/40 hover:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.12)] transition-all duration-300"
                >
                  <div className="rounded-[calc(1.75rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] px-7 py-6 flex items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                        <BarChart3 className="h-6 w-6 text-primary" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="font-semibold tracking-tight">Full Insights Dashboard</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Charts, health score, AI summary, and export — all in one place.
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" strokeWidth={1.5} />
                  </div>
                </Link>

                {/* Listing details read-only */}
                {(business.address || business.phone || business.website || business.description) && (
                  <div className="rounded-[1.5rem] border border-border/50 bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] overflow-hidden">
                    <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Listing details</p>
                      <Link
                        to="#"
                        onClick={(e) => {
                          e.preventDefault();
                          const trigger = document.querySelector('[value="edit"]') as HTMLElement | null;
                          trigger?.click();
                        }}
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        Edit
                      </Link>
                    </div>
                    <div className="divide-y divide-border/40">
                      {[
                        { label: "Description", value: business.description },
                        { label: "Address",     value: business.address },
                        { label: "Phone",       value: business.phone },
                        { label: "Website",     value: business.website },
                      ].filter(({ value }) => value).map(({ label, value }) => (
                        <div key={label} className="flex gap-6 px-6 py-3.5">
                          <span className="text-xs text-muted-foreground w-24 shrink-0 pt-0.5">{label}</span>
                          <span className="text-sm text-foreground/80 leading-relaxed break-all">{value}</span>
                        </div>
                      ))}
                      {business.tags?.length > 0 && (
                        <div className="flex gap-6 px-6 py-3.5">
                          <span className="text-xs text-muted-foreground w-24 shrink-0 pt-0.5">Tags</span>
                          <div className="flex flex-wrap gap-1.5">
                            {business.tags.map((t) => (
                              <Badge key={t} variant="secondary" className="rounded-full text-[11px] px-2.5">{t}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Hours reports from community */}
                {hoursReports.length > 0 && (
                  <div className="p-[5px] rounded-[1.5rem] bg-amber-500/[0.04] border border-amber-500/20">
                    <div className="rounded-[calc(1.5rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                      <div className="px-6 pt-5 pb-4 border-b border-border/60 flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-xl bg-amber-500/10 flex items-center justify-center">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-500" strokeWidth={1.5} />
                        </div>
                        <div>
                          <span className="font-semibold text-sm">Hours reports from visitors</span>
                          <p className="text-xs text-muted-foreground mt-0.5">Customers flagged your hours may be incorrect</p>
                        </div>
                        <span className="ml-auto text-xs font-semibold bg-amber-500/15 text-amber-600 px-2 py-0.5 rounded-full">{hoursReports.length}</span>
                      </div>
                      <div className="divide-y divide-border/40">
                        {hoursReports.map((r) => (
                          <div key={r.id} className="px-6 py-3 flex items-start justify-between gap-4">
                            <p className="text-sm text-foreground/80">{r.message || "Hours may have changed."}</p>
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                              {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ── EDIT LISTING TAB ────────────────────────────────────────── */}
              <TabsContent value="edit" className="mt-0">
                <form onSubmit={handleSubmit(onSave)}>
                  <div className="rounded-[1.75rem] border border-border/50 bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] overflow-hidden">

                    <div className="px-7 py-5 border-b border-border/50 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold tracking-tight">Edit listing</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Changes go live after saving.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full gap-2"
                          disabled={!isDirty || saving}
                          onClick={() => reset()}
                        >
                          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                          Discard
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          className="rounded-full gap-2"
                          disabled={!isDirty || saving}
                        >
                          {saving
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Save className="h-3.5 w-3.5" strokeWidth={1.5} />}
                          {saving ? "Saving…" : "Save changes"}
                        </Button>
                      </div>
                    </div>

                    <div className="px-7 py-7 grid md:grid-cols-2 gap-6">
                      {/* Name */}
                      <Field
                        label="Business name"
                        error={errors.name?.message}
                        hint={`${watchedName.length}/100`}
                      >
                        <Input
                          {...register("name")}
                          className="rounded-xl"
                          placeholder="e.g. Blue Bottle Coffee"
                        />
                      </Field>

                      {/* Category */}
                      <Field label="Category" error={errors.category?.message}>
                        <Select
                          value={watch("category")}
                          onValueChange={(v) => setValue("category", v, { shouldDirty: true })}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      {/* Description — full width */}
                      <div className="md:col-span-2">
                        <Field
                          label="Description"
                          error={errors.description?.message}
                          hint={`${watchedDescription.length}/2000`}
                        >
                          <Textarea
                            {...register("description")}
                            rows={3}
                            className="rounded-xl resize-none"
                            placeholder="Tell people what makes your business special…"
                          />
                        </Field>
                      </div>

                      {/* Address */}
                      <Field label="Address" error={errors.address?.message}>
                        <Input
                          {...register("address")}
                          className="rounded-xl"
                          placeholder="123 Main St, City, State"
                        />
                      </Field>

                      {/* Phone */}
                      <Field label="Phone" error={errors.phone?.message}>
                        <Input
                          {...register("phone")}
                          className="rounded-xl"
                          placeholder="+1 (555) 000-0000"
                        />
                      </Field>

                      {/* Website */}
                      <Field label="Website" error={errors.website?.message}>
                        <Input
                          {...register("website")}
                          className="rounded-xl"
                          placeholder="https://yourbusiness.com"
                        />
                      </Field>

                      {/* Tags */}
                      <Field
                        label="Tags"
                        error={errors.tags?.message}
                        hint={`${tagCount}/10 tags`}
                      >
                        <Input
                          {...register("tags")}
                          className="rounded-xl"
                          placeholder="vegan, family-friendly, wifi"
                        />
                      </Field>
                    </div>

                    {/* ── Founder profile ──────────────────────────────────── */}
                    <div className="px-7 pb-7 pt-2 border-t border-border/50 mt-2 space-y-5">
                      <div className="flex items-center gap-2 pt-5">
                        <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
                          <UserCircle className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                        </div>
                        <p className="text-sm font-semibold tracking-tight">Founder profile</p>
                        <p className="text-xs text-muted-foreground">· Shown on your public listing</p>
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <Field label="Founder name" error={errors.founder_name?.message}>
                          <Input
                            {...register("founder_name")}
                            className="rounded-xl"
                            placeholder="e.g. Maria Chen"
                          />
                        </Field>
                        <Field label="Founder photo URL" error={errors.founder_photo_url?.message}>
                          <Input
                            {...register("founder_photo_url")}
                            className="rounded-xl"
                            placeholder="https://example.com/photo.jpg"
                          />
                        </Field>
                        <div className="md:col-span-2">
                          <Field
                            label="Founder bio"
                            error={errors.founder_bio?.message}
                            hint={`${(watch("founder_bio") ?? "").length}/500`}
                          >
                            <Textarea
                              {...register("founder_bio")}
                              rows={3}
                              className="rounded-xl resize-none"
                              placeholder="Share the story behind the business — who you are and why you started it…"
                            />
                          </Field>
                        </div>
                      </div>
                    </div>

                    {/* ── Editorial tags ───────────────────────────────────── */}
                    <div className="px-7 pb-7 pt-2 border-t border-border/50 space-y-4">
                      <div className="flex items-center gap-2 pt-5">
                        <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                        </div>
                        <p className="text-sm font-semibold tracking-tight">Community badges</p>
                        <p className="text-xs text-muted-foreground">· Select all that apply</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {EDITORIAL_TAG_OPTIONS.map((tag) => {
                          const active = editorialTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() =>
                                setEditorialTags((prev) =>
                                  active ? prev.filter((t) => t !== tag) : [...prev, tag]
                                )
                              }
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                active
                                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                  : "bg-background text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground"
                              }`}
                            >
                              {active && <Sparkles className="h-3 w-3" strokeWidth={1.5} />}
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Status notice */}
                    {business.status !== "approved" && (
                      <div className="mx-7 mb-7 px-4 py-3.5 rounded-xl bg-amber-500/8 border border-amber-500/20">
                        <p className="text-xs text-amber-700 leading-relaxed">
                          <span className="font-semibold">Status: {sc.label}.</span>
                          {" "}Your listing is currently under review. Edits are saved but won't be visible until approved.
                        </p>
                      </div>
                    )}
                  </div>
                </form>
              </TabsContent>

              {/* ── REVIEWS TAB ─────────────────────────────────────────────── */}
              <TabsContent value="reviews" className="mt-0">
                <div className="rounded-[1.75rem] border border-border/50 bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] overflow-hidden">
                  <div className="px-7 py-5 border-b border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-amber-500" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="font-semibold tracking-tight">Community reviews</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{reviews.length} total</p>
                      </div>
                    </div>
                    {(stats?.avg_rating ?? 0) > 0 && (
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${i < Math.round(Number(stats!.avg_rating)) ? "text-amber-400 fill-amber-400" : "text-border"}`}
                            strokeWidth={1}
                          />
                        ))}
                        <span className="text-sm font-semibold ml-1.5 tabular-nums">
                          {Number(stats!.avg_rating).toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-2.5">
                    {reviews.length === 0 ? (
                      <div className="flex flex-col items-center gap-4 py-16 text-center">
                        <div className="h-14 w-14 rounded-3xl bg-muted flex items-center justify-center">
                          <Building2 className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">No reviews yet</p>
                          <p className="text-sm text-muted-foreground mt-1">Share your listing link to get your first review.</p>
                        </div>
                        <Button asChild variant="outline" size="sm" className="rounded-full gap-2">
                          <Link to={`/business/${business.id}`} target="_blank">
                            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                            View listing
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      reviews.map((r) => (
                        <div
                          key={r.id}
                          className="px-5 py-4 rounded-2xl bg-muted/25 border border-border/40 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{r.profiles?.display_name ?? "Member"}</span>
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${i < (r.rating ?? 0) ? "text-amber-400 fill-amber-400" : "text-border"}`}
                                    strokeWidth={1}
                                  />
                                ))}
                              </div>
                              {(r as { verified?: boolean }).verified && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] py-0 h-5 bg-emerald-500/15 text-emerald-600 border-emerald-500/25 rounded-full px-2"
                                >
                                  Verified
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                              {new Date(r.created_at).toLocaleDateString("en-US", {
                                month: "short", day: "numeric", year: "numeric",
                              })}
                            </span>
                          </div>
                          {r.comment && (
                            <p className="text-sm text-foreground/80 leading-relaxed">{r.comment}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>
              {/* ── DEALS TAB ───────────────────────────────────────────────── */}
              <TabsContent value="deals" className="mt-0 space-y-5">

                {/* Create deal form */}
                <div className="p-[5px] rounded-[1.5rem] bg-foreground/[0.03] border border-border/50">
                  <div className="rounded-[calc(1.5rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    <div className="px-6 pt-5 pb-4 border-b border-border/60 flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Plus className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                      </div>
                      <span className="font-semibold text-sm">Create a deal</span>
                    </div>
                    <form onSubmit={couponForm.handleSubmit(onCreateCoupon)} className="px-6 py-5 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Title *</Label>
                          <Input {...couponForm.register("title")} placeholder="e.g. 20% off your first order" className="rounded-xl" />
                          {couponForm.formState.errors.title && (
                            <p className="text-[11px] text-destructive font-medium">{couponForm.formState.errors.title.message}</p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Discount label</Label>
                          <Input {...couponForm.register("discount")} placeholder="e.g. 20% OFF, BOGO, Free coffee" className="rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Promo code</Label>
                          <Input {...couponForm.register("code")} placeholder="e.g. HUDDLE20 (optional)" className="rounded-xl font-mono" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Expires *</Label>
                          <Input
                            {...couponForm.register("expires_at")}
                            type="date"
                            min={new Date().toISOString().slice(0, 10)}
                            className="rounded-xl"
                          />
                          {couponForm.formState.errors.expires_at && (
                            <p className="text-[11px] text-destructive font-medium">{couponForm.formState.errors.expires_at.message}</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Description</Label>
                        <Input {...couponForm.register("description")} placeholder="Any extra details (terms, limits, etc.)" className="rounded-xl" />
                      </div>
                      <Button type="submit" disabled={couponSaving} className="rounded-full gap-2">
                        {couponSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Tag className="h-3.5 w-3.5" strokeWidth={1.5} />}
                        {couponSaving ? "Creating…" : "Create deal"}
                      </Button>
                    </form>
                  </div>
                </div>

                {/* Existing deals */}
                <div className="space-y-3">
                  {coupons.length === 0 ? (
                    <div className="p-[5px] rounded-[1.5rem] bg-foreground/[0.03] border border-border/50">
                      <div className="rounded-[calc(1.5rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] px-6 py-10 text-center space-y-1">
                        <Tag className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" strokeWidth={1.5} />
                        <p className="text-sm font-medium text-muted-foreground">No active deals yet</p>
                        <p className="text-xs text-muted-foreground/70">Create one above — it shows to customers on your listing.</p>
                      </div>
                    </div>
                  ) : (
                    coupons.map((c) => {
                      const expired = new Date(c.expires_at) < new Date();
                      return (
                        <div
                          key={c.id}
                          className={`p-[5px] rounded-[1.5rem] border ${expired ? "border-border/30 bg-foreground/[0.01]" : "border-primary/15 bg-primary/[0.02]"}`}
                        >
                          <div className={`rounded-[calc(1.5rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] px-5 py-4 flex items-start justify-between gap-4`}>
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${expired ? "bg-muted" : "bg-primary/10"}`}>
                                <Tag className={`h-3.5 w-3.5 ${expired ? "text-muted-foreground" : "text-primary"}`} strokeWidth={1.5} />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className={`font-semibold text-sm ${expired ? "text-muted-foreground line-through" : ""}`}>{c.title}</p>
                                  {c.discount && <Badge className="rounded-full text-[10px] h-5 px-2 shrink-0">{c.discount}</Badge>}
                                  {expired && <Badge variant="outline" className="rounded-full text-[10px] h-5 px-2 text-destructive border-destructive/30">Expired</Badge>}
                                </div>
                                {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                                <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-2 flex-wrap">
                                  {c.code && <span className="font-mono font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded">{c.code}</span>}
                                  <span>Expires {new Date(c.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteCoupon(c.id)}
                              disabled={deletingId === c.id}
                              className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                              aria-label="Delete deal"
                            >
                              {deletingId === c.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>

            </Tabs>
          </>
        ) : null}
      </main>

      <Footer />
    </div>
  );
};

export default BusinessDashboardDetail;
