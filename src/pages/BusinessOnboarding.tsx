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
import { Loader2, Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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

const BusinessOnboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("details");
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState("food");
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<{ verdict: "passed" | "flagged"; reason: string } | null>(null);

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

  const onSubmitDetails = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const f = new FormData(e.currentTarget);
    const raw = {
      name: String(f.get("name") ?? ""),
      category,
      phone: String(f.get("phone") ?? ""),
      description: String(f.get("description") ?? ""),
      address: String(f.get("address") ?? ""),
      website: String(f.get("website") ?? ""),
      image_url: String(f.get("image_url") ?? ""),
    };
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

    // Mark profile so navbar/account pages know they're an owner
    await supabase.from("profiles").update({ owns_business: true }).eq("user_id", user.id);

    // Geocode address in the background so the business appears on the heat map
    if (id && parsed.data.address) {
      supabase.functions
        .invoke("geocode-address", { body: { business_id: id, address: parsed.data.address } })
        .catch(() => {
          /* silent — admin can fix later */
        });
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
          <Card>
            <CardHeader><CardTitle>Business details</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={onSubmitDetails} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="name">Business name *</Label>
                    <Input id="name" name="name" required maxLength={100} />
                  </div>
                  <div className="space-y-2">
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
                  <div className="space-y-2">
                    <Label htmlFor="phone">Business phone *</Label>
                    <Input id="phone" name="phone" required maxLength={30} placeholder="+1 555 555 5555" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" name="address" maxLength={200} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input id="website" name="website" type="url" placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="image_url">Image URL</Label>
                    <Input id="image_url" name="image_url" type="url" placeholder="https://..." />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" name="description" maxLength={1000} rows={4} />
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
