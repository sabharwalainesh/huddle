import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Building2, ShieldCheck, Plus } from "lucide-react";
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
  const navigate = useNavigate();
  const [ownsBusiness, setOwnsBusiness] = useState(false);
  const [myBusinesses, setMyBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container max-w-3xl py-8 space-y-6">
        <h1 className="text-2xl font-bold">Account</h1>

        {isAdmin && (
          <Card className="border-primary/40">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">You're an admin</p>
                  <p className="text-xs text-muted-foreground">Review pending businesses and manage user roles.</p>
                </div>
              </div>
              <Button asChild size="sm">
                <Link to="/admin">Open admin panel</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Business owner</CardTitle>
            <CardDescription>Toggle this if you own a local business you want to list on Huddle.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <Label htmlFor="owns" className="cursor-pointer">I own a business</Label>
            <Switch id="owns" checked={ownsBusiness} onCheckedChange={toggleOwnership} />
          </CardContent>
        </Card>

        {ownsBusiness && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> My businesses</CardTitle>
                <CardDescription>Pending listings are only visible to you and admins until approved.</CardDescription>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/business/onboarding"><Plus className="h-4 w-4" /> Add another</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : myBusinesses.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No businesses yet.{" "}
                  <Link to="/business/onboarding" className="text-primary underline">Start onboarding →</Link>
                </div>
              ) : (
                myBusinesses.map((b) => (
                  <Link
                    to={`/business/${b.id}`}
                    key={b.id}
                    className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{b.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{b.category}</p>
                    </div>
                    <Badge variant={statusColor[b.status] ?? "secondary"} className="capitalize">
                      {b.status.replace("_", " ")}
                    </Badge>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Account;
