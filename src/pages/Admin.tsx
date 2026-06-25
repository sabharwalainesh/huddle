import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, FileText, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { FeaturedManager } from "@/components/FeaturedManager";

type Business = Tables<"businesses">;

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();
  const [pending, setPending] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("businesses")
      .select("*")
      .in("status", ["pending", "under_review"])
      .order("submitted_at", { ascending: true, nullsFirst: false });
    setPending((data ?? []) as Business[]);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  if (authLoading || rolesLoading) return null;
  if (!user) return null;
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">

        <main className="container py-8">
          <Alert>
            <AlertDescription>You need admin access to view this page.</AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">

      <main className="container max-w-5xl py-8 space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Admin panel</h1>
        </div>

        <Tabs defaultValue="queue">
          <TabsList>
            <TabsTrigger value="queue">Approval queue ({pending.length})</TabsTrigger>
            <TabsTrigger value="featured">Business of the Week</TabsTrigger>
            <TabsTrigger value="roles">Manage roles</TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="space-y-3 mt-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : pending.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">Queue is empty 🎉</CardContent></Card>
            ) : (
              pending.map((b) => <ReviewCard key={b.id} biz={b} onChange={load} />)
            )}
          </TabsContent>

          <TabsContent value="featured" className="mt-4">
            <FeaturedManager />
          </TabsContent>

          <TabsContent value="roles" className="mt-4">
            <RoleManager />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

const ReviewCard = ({ biz, onChange }: { biz: Business; onChange: () => void }) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!biz.proof_document_url) return;
    (async () => {
      const { data } = await supabase.storage
        .from("business-proofs")
        .createSignedUrl(biz.proof_document_url!, 60 * 10);
      setSignedUrl(data?.signedUrl ?? null);
    })();
  }, [biz.proof_document_url]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("businesses")
      .update({
        status: approve ? "approved" : "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id ?? null,
        rejection_reason: approve ? null : reason || "Did not meet listing requirements.",
      })
      .eq("id", biz.id);
    setBusy(false);
    if (error) {
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
      return;
    }
    // Grant business_owner role on first approval
    if (approve && biz.owner_id) {
      await supabase.from("user_roles").insert({ user_id: biz.owner_id, role: "business_owner" });
    }
    toast({ title: approve ? "Approved" : "Rejected" });
    onChange();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{biz.name}</CardTitle>
            <CardDescription className="capitalize">
              {biz.category} · {biz.address ?? "no address"} · {biz.phone ?? "no phone"}
            </CardDescription>
          </div>
          <Badge
            variant={biz.ai_review_status === "passed" ? "default" : biz.ai_review_status === "flagged" ? "destructive" : "secondary"}
          >
            AI: {biz.ai_review_status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {biz.description && <p className="text-sm">{biz.description}</p>}
        {biz.ai_review_notes && (
          <div className="text-sm bg-muted/50 rounded-md p-3 border">
            <p className="font-medium mb-1 text-xs uppercase tracking-wide text-muted-foreground">AI notes</p>
            {biz.ai_review_notes}
          </div>
        )}
        {biz.proof_document_url && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" /> Proof document
            </p>
            {signedUrl ? (
              signedUrl.match(/\.pdf(\?|$)/i) ? (
                <a href={signedUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                  Open PDF
                </a>
              ) : (
                <img src={signedUrl} alt="Proof document" className="max-h-64 rounded-md border" />
              )
            ) : (
              <p className="text-xs text-muted-foreground">Loading...</p>
            )}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor={`reason-${biz.id}`} className="text-xs">Rejection reason (optional)</Label>
          <Textarea
            id={`reason-${biz.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Shown to the owner if rejected."
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="destructive" onClick={() => decide(false)} disabled={busy}>
            <XCircle className="h-4 w-4" /> Reject
          </Button>
          <Button onClick={() => decide(true)} disabled={busy}>
            <CheckCircle2 className="h-4 w-4" /> Approve
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const RoleManager = () => {
  const [admins, setAdmins] = useState<{ user_id: string; display_name: string }[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    const ids = (roles ?? []).map((r) => r.user_id);
    if (!ids.length) {
      setAdmins([]);
      return;
    }
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", ids);
    setAdmins((profs ?? []) as { user_id: string; display_name: string }[]);
  };
  useEffect(() => {
    load();
  }, []);

  const promote = async () => {
    if (!email.trim()) return;
    setBusy(true);
    // Find profile by display_name OR look up via auth — we don't expose auth.users client-side,
    // so we ask owners to share their display name. Simpler: search by display_name.
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .ilike("display_name", email.trim())
      .maybeSingle();
    if (!profile) {
      setBusy(false);
      toast({
        title: "User not found",
        description: "Enter the user's exact display name (case-insensitive). Email lookup isn't available client-side.",
        variant: "destructive",
      });
      return;
    }
    const { error } = await supabase.from("user_roles").insert({ user_id: profile.user_id, role: "admin" });
    setBusy(false);
    if (error) {
      toast({ title: "Promotion failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Promoted to admin" });
    setEmail("");
    load();
  };

  const revoke = async (userId: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Admin revoked" });
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin users</CardTitle>
        <CardDescription>Promote any registered user to admin by their display name.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="User's display name"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button onClick={promote} disabled={busy}>Promote</Button>
        </div>
        <div className="space-y-2">
          {admins.length === 0 ? (
            <p className="text-sm text-muted-foreground">No admins yet.</p>
          ) : (
            admins.map((a) => (
              <div key={a.user_id} className="flex items-center justify-between p-2 rounded-md border">
                <span className="text-sm font-medium">{a.display_name}</span>
                <Button variant="ghost" size="sm" onClick={() => revoke(a.user_id)}>Revoke</Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Admin;
