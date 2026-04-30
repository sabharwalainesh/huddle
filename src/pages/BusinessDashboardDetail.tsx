import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Eye, Bookmark, MapPin, Star, Loader2, ArrowLeft,
  ExternalLink, BarChart3, ChevronRight, Save, X,
  MessageSquare, Building2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
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
});

type EditForm = z.infer<typeof editSchema>;

const CATEGORIES = ["food", "retail", "services", "health", "entertainment", "other"];

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm<EditForm>({ resolver: zodResolver(editSchema) });
  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isDirty } } = form;

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      setLoading(true);
      const [bizRes, statsRes, revRes] = await Promise.all([
        supabase.from("businesses").select("*").eq("id", id).eq("owner_id", user.id).maybeSingle(),
        supabase.from("business_insights_summary").select("*").eq("business_id", id).maybeSingle(),
        supabase.from("reviews").select("*").eq("business_id", id).order("created_at", { ascending: false }),
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

      reset({
        name: biz.name,
        description: biz.description ?? "",
        category: biz.category,
        address: biz.address ?? "",
        phone: biz.phone ?? "",
        website: biz.website ?? "",
        tags: (biz.tags ?? []).join(", "),
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
    }).eq("id", business.id);
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Listing updated" });
    setBusiness((prev) => prev ? { ...prev, ...data, tags } : prev);
    reset(data);
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
      <Navbar />

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
            </Tabs>
          </>
        ) : null}
      </main>

      <Footer />
    </div>
  );
};

export default BusinessDashboardDetail;
