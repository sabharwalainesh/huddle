import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Upload, CheckCircle2, AlertTriangle, Search, Sparkles, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { GooglePlace } from "@/components/GooglePlaceCard";

const detailsSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  category: z.string().min(1),
  phone: z.string().trim().min(7, "Phone is required for verification").max(30),
  description: z.string().trim().max(1000).optional(),
  address: z.string().trim().max(200).optional(),
  website: z.string().trim().url("Must be a valid URL").max(200).optional().or(z.literal("")),
  image_url: z.string().trim().url("Must be a valid URL").max(500).optional().or(z.literal("")),
});

type Step = "details" | "upload" | "verifying" | "result";

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
    setName(p.name ?? "");
    setCategory(pickedCategory);
    setPhone(p.phone ?? "");
    setAddress(p.address ?? "");
    setWebsite(p.websiteUri ?? "");
    setImageUrl(p.photoUrl ?? "");
    setOriginalGoogle({
      name: p.name ?? "",
      phone: p.phone ?? "",
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
    const raw = { name, category, phone, description, address, website, image_url: imageUrl };
    const parsed = detailsSchema.safeParse(raw);
    if (!parsed.success) {
      toast({ title: "Check your inputs", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);

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
      <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Changed from Google — this can slow approval
      </p>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container max-w-2xl py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">List your business</h1>
          <p className="text-sm text-muted-foreground">
            Step {step === "details" ? 1 : 2} of 2 — your listing won't appear publicly until an admin approves it.
          </p>
        </div>

        {step === "details" && (
          <>
            {/* Google import */}
            <Card className="border-primary/30">
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
            </Card>

            <Card>
              <CardHeader><CardTitle>Business details</CardTitle></CardHeader>
              <CardContent>
                {editedPrefilled.length > 0 && (
                  <Alert className="mb-4 border-amber-500/40">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
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
                      <Input id="name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
                      {fieldHint("name")}
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
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Business phone *</Label>
                      <Input id="phone" required maxLength={30} placeholder="+1 555 555 5555" value={phone} onChange={(e) => setPhone(e.target.value)} />
                      {fieldHint("phone")}
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <Input id="address" maxLength={200} value={address} onChange={(e) => setAddress(e.target.value)} />
                      {fieldHint("address")}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="website">Website</Label>
                      <Input id="website" type="url" placeholder="https://..." value={website} onChange={(e) => setWebsite(e.target.value)} />
                      {fieldHint("website")}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="image_url">Image URL</Label>
                      <Input id="image_url" type="url" placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                      {fieldHint("image_url")}
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" maxLength={1000} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
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
                A recent utility bill, business license, lease, or tax document showing your business name or address.
                We'll do an instant AI sanity-check before sending it to an admin.
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
    </div>
  );
};

export default BusinessOnboarding;
