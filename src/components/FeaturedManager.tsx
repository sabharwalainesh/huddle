import { useEffect, useState } from "react";
import { Award, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface FeatureRow {
  id: string;
  business_id: string;
  starts_at: string;
  ends_at: string;
  note: string | null;
}

interface BizOption { id: string; name: string }

export const FeaturedManager = () => {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<BizOption[]>([]);
  const [features, setFeatures] = useState<(FeatureRow & { name?: string })[]>([]);
  const [bizId, setBizId] = useState<string>("");
  const [days, setDays] = useState(7);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [b, f] = await Promise.all([
      supabase.from("businesses").select("id, name").eq("status", "approved").order("name"),
      supabase.from("featured_businesses").select("*").order("starts_at", { ascending: false }),
    ]);
    const bizList = (b.data ?? []) as BizOption[];
    const map = new Map(bizList.map((x) => [x.id, x.name]));
    setBusinesses(bizList);
    setFeatures(((f.data ?? []) as FeatureRow[]).map((r) => ({ ...r, name: map.get(r.business_id) })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!bizId || !user) return;
    setBusy(true);
    const startsAt = new Date();
    const endsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const { error } = await supabase.from("featured_businesses").insert({
      business_id: bizId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      note: note.trim() || null,
      created_by: user.id,
    });
    setBusy(false);
    if (error) return toast({ title: "Couldn't feature business", description: error.message, variant: "destructive" });
    toast({ title: "Featured", description: `Showing for ${days} day${days > 1 ? "s" : ""}` });
    setBizId(""); setNote(""); setDays(7);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("featured_businesses").delete().eq("id", id);
    if (error) return toast({ title: "Couldn't remove", description: error.message, variant: "destructive" });
    load();
  };

  const now = Date.now();
  const isActive = (f: FeatureRow) =>
    new Date(f.starts_at).getTime() <= now && new Date(f.ends_at).getTime() > now;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" /> Feature a business
          </CardTitle>
          <CardDescription>
            The active pick shows on the home page. If none is active, the top trending business is used automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-[1fr_120px] gap-3">
            <div className="space-y-1.5">
              <Label>Business</Label>
              <Select value={bizId} onValueChange={setBizId}>
                <SelectTrigger><SelectValue placeholder="Choose a business" /></SelectTrigger>
                <SelectContent>
                  {businesses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Days</Label>
              <Input type="number" min={1} max={30} value={days} onChange={(e) => setDays(Math.max(1, Math.min(30, Number(e.target.value) || 7)))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Note (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why this one? Shown under the business name."
              rows={2}
              maxLength={240}
            />
          </div>
          <Button onClick={create} disabled={!bizId || busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
            Feature
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent features</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : features.length === 0 ? (
            <p className="text-sm text-muted-foreground">No features yet.</p>
          ) : (
            <ul className="divide-y">
              {features.map((f) => (
                <li key={f.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate flex items-center gap-2">
                      {f.name ?? f.business_id}
                      {isActive(f) && (
                        <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                          Active
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(f.starts_at).toLocaleDateString()} → {new Date(f.ends_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => remove(f.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
