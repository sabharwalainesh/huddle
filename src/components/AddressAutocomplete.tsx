import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Suggestion = {
  place_id: string;
  text: string;
  mainText: string;
  secondaryText: string;
};

interface Props {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  onSelect?: (full: { address: string; lat: number | null; lng: number | null }) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

// Generate a session token (used by Places to bill autocomplete + details as one)
const newSessionToken = () =>
  crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

export const AddressAutocomplete = ({
  id,
  value,
  onChange,
  onSelect,
  placeholder = "Start typing an address...",
  maxLength = 200,
  className,
}: Props) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState<number>(-1);
  const sessionToken = useRef<string>(newSessionToken());
  const debounceRef = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const justSelectedRef = useRef(false);

  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (value.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const coords = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
          if (!navigator.geolocation) return resolve(null);
          navigator.geolocation.getCurrentPosition(
            (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
            () => resolve(null),
            { timeout: 3000, maximumAge: 5 * 60 * 1000 },
          );
        });
        const { data, error } = await supabase.functions.invoke("google-address-autocomplete", {
          body: {
            input: value.trim(),
            sessionToken: sessionToken.current,
            lat: coords?.lat ?? null,
            lng: coords?.lng ?? null,
          },
        });
        if (error) throw error;
        const list = ((data as { suggestions?: Suggestion[] })?.suggestions ?? []);
        setSuggestions(list);
        setOpen(list.length > 0);
        setHighlight(-1);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = async (s: Suggestion) => {
    justSelectedRef.current = true;
    onChange(s.text);
    setOpen(false);
    setSuggestions([]);
    try {
      const { data } = await supabase.functions.invoke("google-address-autocomplete", {
        body: {
          input: s.text,
          place_id: s.place_id,
          sessionToken: sessionToken.current,
        },
      });
      const full = data as { address?: string; lat?: number | null; lng?: number | null } | null;
      if (full?.address) {
        justSelectedRef.current = true;
        onChange(full.address);
        onSelect?.({
          address: full.address,
          lat: full.lat ?? null,
          lng: full.lng ?? null,
        });
      } else {
        onSelect?.({ address: s.text, lat: null, lng: null });
      }
    } catch {
      onSelect?.({ address: s.text, lat: null, lng: null });
    } finally {
      // Start a new session for next autocomplete cycle
      sessionToken.current = newSessionToken();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (highlight >= 0) {
        e.preventDefault();
        pick(suggestions[highlight]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete="off"
        className={className}
      />
      {loading && (
        <Loader2 className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-64 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={s.place_id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(s)}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full text-left px-3 py-2 text-sm flex items-start gap-2 transition-colors ${
                highlight === i ? "bg-muted" : "hover:bg-muted/60"
              }`}
            >
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium truncate">{s.mainText || s.text}</span>
                {s.secondaryText && (
                  <span className="block text-xs text-muted-foreground truncate">{s.secondaryText}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
