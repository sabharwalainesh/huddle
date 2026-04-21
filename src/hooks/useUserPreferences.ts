import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { EMPTY_PREFS, type UserPreferences } from "@/lib/preferences";

interface UsePreferencesResult {
  prefs: UserPreferences;
  loading: boolean;
  hasRow: boolean; // true once user has explicitly saved at least once
  save: (next: UserPreferences) => Promise<{ error: string | null }>;
  refresh: () => Promise<void>;
}

export function useUserPreferences(): UsePreferencesResult {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<UserPreferences>(EMPTY_PREFS);
  const [hasRow, setHasRow] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setPrefs(EMPTY_PREFS);
      setHasRow(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("user_preferences")
      .select("categories, vibes")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!error && data) {
      setPrefs({
        categories: (data.categories ?? []) as string[],
        vibes: (data.vibes ?? []) as string[],
      });
      setHasRow(true);
    } else {
      setPrefs(EMPTY_PREFS);
      setHasRow(false);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (next: UserPreferences) => {
      if (!user) return { error: "Not signed in" };
      const { error } = await supabase
        .from("user_preferences")
        .upsert(
          { user_id: user.id, categories: next.categories, vibes: next.vibes },
          { onConflict: "user_id" },
        );
      if (error) return { error: error.message };
      setPrefs(next);
      setHasRow(true);
      return { error: null };
    },
    [user],
  );

  return { prefs, loading, hasRow, save, refresh: load };
}
