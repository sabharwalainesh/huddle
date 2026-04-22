import { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2, TrendingUp, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

type Theme = { label: string; count: number; sentiment: "positive" | "negative" | "neutral" };

interface Props {
  businessId: string;
  businessName: string;
  reviews: { rating: number; comment: string }[];
}

const sentimentColor = (s: Theme["sentiment"]) => {
  if (s === "positive") return "bg-emerald-500";
  if (s === "negative") return "bg-destructive";
  return "bg-muted-foreground/50";
};

const sentimentEmoji = (s: Theme["sentiment"]) => {
  if (s === "positive") return "👍";
  if (s === "negative") return "⚠️";
  return "💬";
};

const sentimentLabel = (s: Theme["sentiment"]) => {
  if (s === "positive") return "Positive";
  if (s === "negative") return "Needs attention";
  return "Mentioned";
};

export const ReviewThemes = ({ businessId: _businessId, businessName, reviews }: Props) => {
  const [themes, setThemes] = useState<Theme[] | null>(null);
  const [loading, setLoading] = useState(false);
  const hasAutoRun = useRef(false);

  const analyze = async () => {
    if (reviews.length === 0) {
      toast({ title: "No reviews to analyze yet" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("review-themes", {
        body: { business_name: businessName, reviews: reviews.map((r) => ({ rating: r.rating, comment: r.comment })) },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      const list = ((data as { themes?: Theme[] })?.themes ?? []).sort((a, b) => b.count - a.count);
      setThemes(list);
    } catch (e) {
      toast({ title: "Couldn't analyze reviews", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Auto-analyze on mount when there are enough reviews to produce meaningful themes
  useEffect(() => {
    if (!hasAutoRun.current && reviews.length >= 2) {
      hasAutoRun.current = true;
      analyze();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxCount = themes && themes.length > 0 ? Math.max(...themes.map((t) => t.count)) : 1;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" /> What people mention
        </CardTitle>
        {themes && !loading && (
          <Button onClick={analyze} variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground">
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Analyzing {reviews.length} review{reviews.length === 1 ? "" : "s"}…</span>
            </div>
            <div className="space-y-2.5">
              {[80, 60, 45, 70].map((w, i) => (
                <div key={i} className="space-y-1">
                  <div className="h-3 rounded bg-muted animate-pulse" style={{ width: `${w}%` }} />
                  <div className="h-2 rounded-full bg-muted animate-pulse opacity-60" />
                </div>
              ))}
            </div>
          </div>
        ) : !themes ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Use AI to extract recurring themes from {reviews.length} review{reviews.length === 1 ? "" : "s"}.
            </p>
            <Button onClick={analyze} disabled={reviews.length === 0} variant="outline" className="gap-2">
              <Sparkles className="h-4 w-4" /> Analyze themes
            </Button>
          </div>
        ) : themes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No clear themes found yet — more reviews will help.</p>
        ) : (
          <ul className="space-y-3">
            {themes.map((t) => {
              const widthPct = (t.count / maxCount) * 100;
              return (
                <li key={t.label} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium capitalize flex items-center gap-1.5">
                      <span>{sentimentEmoji(t.sentiment)}</span>
                      {t.label}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {t.count} mention{t.count === 1 ? "" : "s"} · {sentimentLabel(t.sentiment)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${sentimentColor(t.sentiment)}`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
