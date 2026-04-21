import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, BookmarkCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { BusinessCard } from "@/components/BusinessCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import type { Business } from "@/lib/sorting";

// Huddle Match: pick top 3 unsaved businesses from the user's most-bookmarked categories.
const huddleMatch = (saved: Business[], all: Business[]): Business[] => {
  if (!saved.length) return [];
  const counts = new Map<string, number>();
  saved.forEach((b) => counts.set(b.category, (counts.get(b.category) ?? 0) + 1));
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const savedIds = new Set(saved.map((b) => b.id));
  const candidates = all.filter((b) => !savedIds.has(b.id) && ranked.includes(b.category));
  // Score: category preference rank + rating
  return candidates
    .map((b) => ({
      b,
      score: (ranked.length - ranked.indexOf(b.category)) * 2 + Number(b.avg_rating),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.b);
};

const MyHuddle = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState<Business[]>([]);
  const [all, setAll] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [bm, allRes] = await Promise.all([
        supabase.from("bookmarks").select("business_id").eq("user_id", user.id),
        supabase.from("businesses").select("*").limit(500),
      ]);
      if (bm.error || allRes.error) {
        toast({ title: "Couldn't load your huddle", variant: "destructive" });
        setLoading(false);
        return;
      }
      const ids = new Set((bm.data ?? []).map((r) => r.business_id));
      const allRows = (allRes.data ?? []) as Business[];
      setSaved(allRows.filter((b) => ids.has(b.id)));
      setAll(allRows);
      setLoading(false);
    })();
  }, [user]);

  const matches = useMemo(() => huddleMatch(saved, all), [saved, all]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8 space-y-8">
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BookmarkCheck className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">My Huddle</h1>
          </div>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : saved.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              You haven't bookmarked any businesses yet. Save a few to unlock recommendations!
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {saved.map((b) => <BusinessCard key={b.id} b={b} />)}
            </div>
          )}
        </section>

        {matches.length > 0 && (
          <section>
            <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Huddle Match — picked for you
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Based on the categories you bookmark most.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {matches.map((b) => <BusinessCard key={b.id} b={b} />)}
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
};

export default MyHuddle;
