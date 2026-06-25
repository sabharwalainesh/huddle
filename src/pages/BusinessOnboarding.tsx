import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Upload, CheckCircle2, AlertTriangle, Search, Sparkles, MapPin, Info, X, Store, Globe, Instagram, Facebook, ShoppingBag, Video, MessageCircle, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import type { GooglePlace } from "@/components/GooglePlaceCard";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { formatPhoneInput, phoneError } from "@/lib/phone";

const detailsSchema = z.object({
  name: z
    .string().trim()
    .min(2, "Business name is required (min 2 characters)")
    .max(100, "100 characters max")
    .regex(/[a-zA-Z]/, "Name must contain at least one letter"),
  category: z.string().min(1, "Please select a category"),
  phone: z
    .string()
    .trim()
    .min(7, "Phone is required for verification")
    .refine((v) => {
      const digits = v.replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15;
    }, "Enter a valid phone number"),
  description: z.string().trim().max(2000, "2000 characters max").optional(),
  address: z.string().trim().max(300, "300 characters max").optional(),
  website: z
    .string().trim()
    .url("Must be a valid URL starting with https://")
    .optional()
    .or(z.literal("")),
  image_url: z
    .string().trim()
    .url("Must be a valid image URL")
    .optional()
    .or(z.literal("")),
});

type Step = "details" | "upload" | "verifying" | "result";
type BusinessMode = "google" | "niche" | null;

const NICHE_PLATFORMS = [
  { value: "facebook-marketplace", label: "Facebook Marketplace", icon: Facebook, color: "text-blue-600" },
  { value: "instagram-shop", label: "Instagram Shop", icon: Instagram, color: "text-pink-600" },
  { value: "etsy", label: "Etsy", icon: ShoppingBag, color: "text-orange-500" },
  { value: "tiktok-shop", label: "TikTok Shop", icon: Video, color: "text-zinc-800" },
  { value: "whatsapp", label: "WhatsApp Business", icon: MessageCircle, color: "text-emerald-600" },
  { value: "other", label: "Other / No online presence", icon: Globe, color: "text-muted-foreground" },
] as const;

type NichePlatform = typeof NICHE_PLATFORMS[number]["value"];

// Map a Google primaryType to our internal category buckets
const mapGoogleTypeToCategory = (primaryType?: string | null): string => {
  if (!primaryType) return "other";
  const t = primaryType.toLowerCase();
  if (/(restaurant|cafe|bakery|bar|coffee|food|pizza|brunch|breakfast|dessert|ice_cream|sandwich|pub|brewery|winery|tea|juice|donut|bagel)/.test(t)) return "food";
  if (/(store|shop|boutique|grocery|supermarket|florist|jewelry|book|gift|clothing|furniture|hardware|pet|toy|liquor|thrift)/.test(t)) return "retail";
  if (/(salon|barber|beauty|nail|spa|massage|tailor|laundry|dry_cleaner|repair|locksmith|car_wash|grooming|veterinary)/.test(t)) return "services";
  if (/(gym|yoga|fitness)/.test(t)) return "health";
  if (/(gallery|studio|venue|bowling)/.test(t)) return "entertainment";
  return "other";
};

interface PrefilledFields {
  name?: boolean;
  phone?: boolean;
  address?: boolean;
  website?: boolean;
  image_url?: boolean;
}

const BusinessOnboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [businessMode, setBusinessMode] = useState<BusinessMode>(null);
  const [nichePlatform, setNichePlatform] = useState<NichePlatform>("facebook-marketplace");
  const [step, setStep] = useState<Step>("details");
  const [submitting, setSubmitting] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<{ verdict: "passed" | "flagged"; reason: string } | null>(null);

  // Controlled form state (so we can prefill from Google)
  const [name, setName] = useState("");
  const [category, setCategory] = useState("food");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");

  // Inline field errors from schema validation
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Track which fields were filled by Google (for "less likely to be approved" warnings)
  const [prefilled, setPrefilled] = useState<PrefilledFields>({});
  const [originalGoogle, setOriginalGoogle] = useState<Record<keyof PrefilledFields, string>>({
    name: "", phone: "", address: "", website: "", image_url: "",
  });

  // Google search UI state
  const [showSearch, setShowSearch] = useState(true);
  const [googleQuery, setGoogleQuery] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleResults, setGoogleResults] = useState<GooglePlace[]>([]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // If owner already has a pending business, jump them to it
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id, status")
        .eq("owner_id", user.id)
        .in("status", ["draft", "pending", "under_review"])
        .limit(1);
      if (data?.[0]) {
        setBusinessId(data[0].id);
        if (data[0].status !== "draft") setStep("upload");
      }
    })();
  }, [user]);

  const runGoogleSearch = async () => {
    const q = googleQuery.trim();
    if (!q) return;
    setGoogleLoading(true);
    try {
      // Try to bias to the user's location, but fall back gracefully
      const coords = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => resolve(null),
          { timeout: 4000, maximumAge: 5 * 60 * 1000 },
        );
      });
      const { data, error } = await supabase.functions.invoke("google-place-search", {
        body: {
          query: q,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          maxResults: 10,
        },
      });
      if (error) throw error;
      setGoogleResults((data as { places?: GooglePlace[] })?.places ?? []);
    } catch (e) {
      toast({ title: "Google search failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setGoogleLoading(false);
    }
  };

  const applyGooglePlace = (p: GooglePlace) => {
    const pickedCategory = mapGoogleTypeToCategory(p.primaryType);
    const formattedPhone = p.phone ? formatPhoneInput(p.phone) : "";
    setName(p.name ?? "");
    setCategory(pickedCategory);
    setPhone(formattedPhone);
    setAddress(p.address ?? "");
    setWebsite(p.websiteUri ?? "");
    setImageUrl(p.photoUrl ?? "");
    if (p.description && !description) {
      setDescription(p.description);
    }
    setOriginalGoogle({
      name: p.name ?? "",
      phone: formattedPhone,
      address: p.address ?? "",
      website: p.websiteUri ?? "",
      image_url: p.photoUrl ?? "",
    });
    setPrefilled({
      name: !!p.name,
      phone: !!p.phone,
      address: !!p.address,
      website: !!p.websiteUri,
      image_url: !!p.photoUrl,
    });
    setShowSearch(false);
    setGoogleResults([]);
    setGoogleQuery("");
    toast({
      title: "Imported from Google",
      description: "Review the details and edit if needed. Changing prefilled fields may slow approval.",
    });
  };

  // Compute which originally-prefilled fields the user has since edited
  const editedPrefilled: (keyof PrefilledFields)[] = (Object.keys(prefilled) as (keyof PrefilledFields)[])
    .filter((k) => prefilled[k] && originalGoogle[k] !== currentValue(k));

  function currentValue(k: keyof PrefilledFields): string {
    switch (k) {
      case "name": return name;
      case "phone": return phone;
      case "address": return address;
      case "website": return website;
      case "image_url": return imageUrl;
    }
  }

  const onSubmitDetails = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    // Clear previous field errors on each submission attempt
    setFieldErrors({});

    const raw = { name, category, phone, description, address, website, image_url: imageUrl };
    const parsed = detailsSchema.safeParse(raw);
    if (!parsed.success) {
      // Extract all field errors
      const newErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0]);
        if (!newErrors[field]) {
          newErrors[field] = issue.message;
        }
      }
      setFieldErrors(newErrors);
      toast({ title: "Check your inputs", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);

    const nicheTags = businessMode === "niche"
      ? ["community-seller", nichePlatform]
      : [];

    const payload = {
      name: parsed.data.name,
      category: parsed.data.category,
      phone: parsed.data.phone,
      description: parsed.data.description ?? "",
      address: parsed.data.address || null,
      website: parsed.data.website || null,
      image_url: parsed.data.image_url || null,
      owner_id: user.id,
      status: "draft" as const,
      tags: nicheTags,
    };

    let id = businessId;
    if (id) {
      const { error } = await supabase.from("businesses").update(payload).eq("id", id);
      if (error) {
        setSubmitting(false);
        toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("businesses")
        .insert(payload)
        .select("id")
        .single();
      if (error || !data) {
        setSubmitting(false);
        toast({ title: "Couldn't create business", description: error?.message ?? "Unknown error", variant: "destructive" });
        return;
      }
      id = data.id;
      setBusinessId(id);
    }

    await supabase.from("profiles").update({ owns_business: true }).eq("user_id", user.id);

    if (id && parsed.data.address) {
      supabase.functions
        .invoke("geocode-address", { body: { business_id: id, address: parsed.data.address } })
        .catch(() => { /* silent — admin can fix later */ });
    }

    setSubmitting(false);
    setStep("upload");
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !businessId) return;
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 8 MB.", variant: "destructive" });
      return;
    }
    if (!/^image\//.test(file.type) && file.type !== "application/pdf") {
      toast({ title: "Unsupported file", description: "Upload an image or PDF.", variant: "destructive" });
      return;
    }
    setStep("verifying");
    setVerdict(null);

    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${user.id}/${businessId}/proof-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("business-proofs")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setStep("upload");
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      return;
    }

    const { data, error } = await supabase.functions.invoke("verify-business-doc", {
      body: { business_id: businessId, storage_path: path },
    });
    if (error) {
      setStep("upload");
      toast({ title: "Verification error", description: error.message, variant: "destructive" });
      return;
    }
    setVerdict(data as { verdict: "passed" | "flagged"; reason: string });
    setStep("result");
  };

  if (!user) return null;

  const fieldHint = (field: keyof PrefilledFields) => {
    if (!prefilled[field]) return null;
    const edited = originalGoogle[field] !== currentValue(field);
    if (!edited) {
      return (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-primary" /> Filled from Google
        </p>
      );
    }
    return (
      <p className="text-[11px] text-destructive flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Changed from Google — this can slow approval
      </p>
    );
  };

  return (
    <div className="min-h-screen bg-background">

      <main className="container max-w-2xl py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">List your business</h1>
          <p className="text-sm text-muted-foreground">
            {businessMode === null
              ? "Let's get you set up — first, tell us a bit about your business."
              : `Step ${step === "details" ? 1 : 2} of 2 — your listing won't appear publicly until an admin approves it.`}
          </p>
        </div>

        {/* Mode chooser */}
        {businessMode === null && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Where do people find your business?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setBusinessMode("google")}
                className="group text-left p-[3px] rounded-2xl bg-foreground/[0.03] border border-border/60 hover:border-primary/40 hover:bg-primary/[0.02] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="rounded-[calc(1.25rem-3px)] bg-background p-5 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Search className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm tracking-tight">My business is on Google</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Import details automatically and get approved faster.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-primary font-medium">
                    Continue <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBusinessMode("niche")}
                className="group text-left p-[3px] rounded-2xl bg-foreground/[0.03] border border-border/60 hover:border-primary/40 hover:bg-primary/[0.02] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="rounded-[calc(1.25rem-3px)] bg-background p-5 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Store className="h-4 w-4 text-amber-600" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm tracking-tight">My business isn't on Google</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Facebook Marketplace, Instagram, Etsy, pop-ups, home businesses, and more.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                    Continue <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Niche platform selector (shown above details form for niche mode) */}
        {businessMode === "niche" && step === "details" && (
          <Card className="border-amber-500/30 bg-amber-500/[0.02]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Store className="h-4 w-4 text-amber-600" strokeWidth={1.5} />
                Where do you sell?
              </CardTitle>
              <CardDescription>
                Pick your main platform. This helps customers find and contact you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {NICHE_PLATFORMS.map(({ value, label, icon: Icon, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setNichePlatform(value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-sm transition-all duration-150 ${
                      nichePlatform === value
                        ? "border-primary/50 bg-primary/5 font-medium"
                        : "border-border/50 bg-background hover:bg-muted/40"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${nichePlatform === value ? "text-primary" : color}`} strokeWidth={1.5} />
                    <span className="truncate text-xs leading-tight">{label}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setBusinessMode(null)}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 mt-1"
              >
                My business is on Google after all
              </button>
            </CardContent>
          </Card>
        )}

        {step === "details" && businessMode !== null && (
          <>
            {/* Google import — only for google mode */}
            {businessMode === "google" && <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Import from Google
                </CardTitle>
                <CardDescription>
                  Search for your business on Google to auto-fill the form. You can still edit anything afterwards.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {showSearch ? (
                  <>
                    <form
                      onSubmit={(e) => { e.preventDefault(); runGoogleSearch(); }}
                      className="flex gap-2"
                    >
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          className="pl-9"
                          placeholder="e.g. Joe's Coffee Brooklyn"
                          value={googleQuery}
                          onChange={(e) => setGoogleQuery(e.target.value)}
                        />
                      </div>
                      <Button type="submit" disabled={googleLoading || !googleQuery.trim()}>
                        {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                      </Button>
                    </form>

                    {googleResults.length > 0 && (
                      <div className="space-y-2 max-h-72 overflow-y-auto rounded-md border p-2">
                        {googleResults.map((p) => (
                          <button
                            key={p.place_id}
                            type="button"
                            onClick={() => applyGooglePlace(p)}
                            className="w-full text-left rounded-md p-2 hover:bg-muted/60 transition-colors flex gap-3"
                          >
                            {p.photoUrl ? (
                              <img src={p.photoUrl} alt="" className="h-12 w-12 rounded object-cover shrink-0" loading="lazy" />
                            ) : (
                              <div className="h-12 w-12 rounded bg-muted shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{p.name}</p>
                              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {p.address ?? "—"}
                              </p>
                              {p.rating != null && (
                                <p className="text-[11px] text-muted-foreground">
                                  ★ {p.rating} · {p.userRatingCount ?? 0} reviews
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowSearch(false)}
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                    >
                      Or fill in the form manually
                    </button>
                  </>
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowSearch(true)}>
                    <Search className="h-4 w-4" /> Search Google again
                  </Button>
                )}
              </CardContent>
            </Card>}

            <Card>
              <CardHeader>
                <CardTitle>Business details</CardTitle>
                {businessMode === "niche" && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Fill in what you have — phone is required so customers can reach you.
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {editedPrefilled.length > 0 && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Heads up</AlertTitle>
                    <AlertDescription>
                      You've changed {editedPrefilled.length === 1 ? "a field" : `${editedPrefilled.length} fields`} that came from Google
                      ({editedPrefilled.join(", ")}). Listings that don't match Google take longer to approve and are more likely to be rejected.
                    </AlertDescription>
                  </Alert>
                )}
                <form onSubmit={onSubmitDetails} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="name">Business name *</Label>
                      <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
                      {fieldErrors.name && (
                        <p className="text-[11px] text-destructive font-medium mt-1">{fieldErrors.name}</p>
                      )}
                      {!fieldErrors.name && fieldHint("name")}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Category *</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["food", "retail", "services", "health", "entertainment", "other"].map((c) => (
                            <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldErrors.category && (
                        <p className="text-[11px] text-destructive font-medium mt-1">{fieldErrors.category}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="flex items-center gap-1.5">
                        Business phone *
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                aria-label="Why we need your phone"
                                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Info className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs">
                              This phone will be used to contact you about your listing — whether or not you've signed up for a personal account.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <Input
                        id="phone"
                        required
                        inputMode="tel"
                        placeholder="(555) 123-4567"
                        value={phone}
                        onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                        aria-invalid={phone.length > 0 && phoneError(phone) !== null}
                      />
                      {fieldErrors.phone && (
                        <p className="text-[11px] text-destructive font-medium mt-1">{fieldErrors.phone}</p>
                      )}
                      {!fieldErrors.phone && phone.length > 0 && phoneError(phone) ? (
                        <p className="text-[11px] text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> {phoneError(phone)}
                        </p>
                      ) : (
                        !fieldErrors.phone && fieldHint("phone")
                      )}
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <AddressAutocomplete
                        id="address"
                        value={address}
                        onChange={setAddress}
                        placeholder="Start typing an address..."
                      />
                      {fieldErrors.address && (
                        <p className="text-[11px] text-destructive font-medium mt-1">{fieldErrors.address}</p>
                      )}
                      {!fieldErrors.address && fieldHint("address")}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="website">
                        {businessMode === "niche"
                          ? `${NICHE_PLATFORMS.find((p) => p.value === nichePlatform)?.label ?? "Listing"} URL`
                          : "Website"}
                      </Label>
                      <Input
                        id="website"
                        type="url"
                        placeholder={businessMode === "niche" ? "Paste your listing or profile link..." : "https://..."}
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                      />
                      {fieldErrors.website && (
                        <p className="text-[11px] text-destructive font-medium mt-1">{fieldErrors.website}</p>
                      )}
                      {!fieldErrors.website && fieldHint("website")}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="image_url">Business image</Label>
                      {imageUrl ? (
                        <div className="relative rounded-md border overflow-hidden bg-muted">
                          <img
                            src={imageUrl}
                            alt="Business preview"
                            className="w-full h-32 object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                          />
                          <button
                            type="button"
                            onClick={() => setImageUrl("")}
                            className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/90 hover:bg-background flex items-center justify-center shadow-sm"
                            aria-label="Remove image"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          {prefilled.image_url && originalGoogle.image_url === imageUrl && (
                            <div className="absolute bottom-1 left-1 text-[10px] bg-background/90 rounded px-1.5 py-0.5 flex items-center gap-1">
                              <Sparkles className="h-3 w-3 text-primary" /> From Google
                            </div>
                          )}
                        </div>
                      ) : (
                        <Input id="image_url" type="url" placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                      )}
                      {fieldErrors.image_url && (
                        <p className="text-[11px] text-destructive font-medium mt-1">{fieldErrors.image_url}</p>
                      )}
                      {!fieldErrors.image_url && fieldHint("image_url")}
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
                      {fieldErrors.description && (
                        <p className="text-[11px] text-destructive font-medium mt-1">{fieldErrors.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="ghost" onClick={() => navigate("/account")}>Cancel</Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Saving..." : "Save & continue"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </>
        )}

        {step === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle>Upload proof of business</CardTitle>
              <CardDescription>
                {businessMode === "niche"
                  ? "A screenshot of your marketplace listing, a photo of your products, or any document showing your name and what you sell. We'll do a quick AI check before an admin reviews it."
                  : "A recent utility bill, business license, lease, or tax document showing your business name or address. We'll do an instant AI sanity-check before sending it to an admin."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-lg p-8 cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">Click to upload an image or PDF</span>
                <span className="text-xs text-muted-foreground">Max 8 MB</span>
                <input type="file" className="hidden" accept="image/*,application/pdf" onChange={onUpload} />
              </label>
              <Button variant="ghost" onClick={() => setStep("details")}>← Edit details</Button>
            </CardContent>
          </Card>
        )}

        {step === "verifying" && (
          <Card>
            <CardContent className="p-8 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="font-medium">Checking your document...</p>
              <p className="text-sm text-muted-foreground">This usually takes a few seconds.</p>
            </CardContent>
          </Card>
        )}

        {step === "result" && verdict && (
          <Card>
            <CardContent className="p-6 space-y-4">
              {verdict.verdict === "passed" ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Sent to admin for review</AlertTitle>
                  <AlertDescription>{verdict.reason}</AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>That doesn't look right</AlertTitle>
                  <AlertDescription>{verdict.reason} Please upload an actual business document.</AlertDescription>
                </Alert>
              )}
              <div className="flex gap-2 justify-end">
                {verdict.verdict === "flagged" ? (
                  <Button onClick={() => setStep("upload")}>Try a different file</Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => navigate(`/business/${businessId}`)}>
                      Edit my listing
                    </Button>
                    <Button onClick={() => navigate("/account")}>Done</Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default BusinessOnboarding;
