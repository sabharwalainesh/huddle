import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/contexts/A11yContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PulseRow {
  business_id: string;
  name: string;
  category: string;
  image_url: string | null;
  avg_rating: number;
  recent_check_ins: number;
  recent_bookmarks: number;
  pulse_score: number;
}

export const PulseWidget = () => {
  const [rows, setRows] = useState<PulseRow[]>([]);
  const t = useT();

  const load = async () => {
    const { data } = await supabase.from("trending_pulse").select("*").limit(5);
    setRows((data ?? []) as PulseRow[]);
  };

  useEffect(() => {
    load();
    const tm = setInterval(load, 30_000);
    return () => clearInterval(tm);
  }, []);

  if (!rows.length) return null;

  const max = Math.max(...rows.map((r) => r.pulse_score), 1);

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Flame className="h-4 w-4 text-primary" />
          {t("pulse.title")}
          <Badge variant="secondary" className="ml-auto text-xs">{t("pulse.lastHour")}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((r) => {
          const pct = Math.round((r.pulse_score / max) * 100);
          return (
            <Link
              key={r.business_id}
              to={`/business/${r.business_id}`}
              className="block group"
            >
              <div className="flex items-center justify-between text-sm gap-3">
                <span className="truncate font-medium group-hover:text-primary transition-colors">{r.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {r.recent_check_ins} {t("pulse.checkIns")} · {r.recent_bookmarks} {t("pulse.saves")}
                </span>
              </div>
              <div className="h-1.5 mt-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-primary transition-all"
                  style={{ width: `${pct}%` }}
                  aria-label={`Pulse score ${r.pulse_score}`}
                />
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
};
