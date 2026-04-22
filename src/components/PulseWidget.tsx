import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/contexts/A11yContext";

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
    <div className="p-[5px] rounded-[1.5rem] bg-foreground/[0.03] border border-border/50 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.06)]">
      <div className="rounded-[calc(1.5rem-5px)] bg-background overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center">
              <Flame className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
            </div>
            <span className="font-semibold text-sm tracking-tight">{t("pulse.title")}</span>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("pulse.lastHour")}
          </span>
        </div>

        {/* List */}
        <div className="p-4 space-y-1">
          {rows.map((r, idx) => {
            const pct = Math.round((r.pulse_score / max) * 100);
            return (
              <Link
                key={r.business_id}
                to={`/business/${r.business_id}`}
                className="block group rounded-xl px-3 py-3 transition-colors duration-200 hover:bg-muted/50"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[10px] font-mono text-muted-foreground/50 tabular-nums w-4 shrink-0">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate text-sm font-medium group-hover:text-primary transition-colors duration-200">
                      {r.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                    {r.recent_check_ins} {t("pulse.checkIns")} · {r.recent_bookmarks} {t("pulse.saves")}
                  </span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden ml-6">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary-glow rounded-full transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
                    style={{ width: `${pct}%` }}
                    aria-label={`Pulse score ${r.pulse_score}`}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
