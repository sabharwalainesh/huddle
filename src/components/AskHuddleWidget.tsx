import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles, Loader2, MessageCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useA11y, useT } from "@/contexts/A11yContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Msg { role: "user" | "assistant"; content: string }

const SUGGESTIONS: Record<"en" | "es", string[]> = {
  en: [
    "Where can I find gluten-free bread?",
    "Best highly-rated coffee spots",
    "Recommend a family-friendly restaurant",
  ],
  es: [
    "¿Dónde puedo encontrar pan sin gluten?",
    "Mejores cafés con buena calificación",
    "Recomienda un restaurante familiar",
  ],
};

export const AskHuddleWidget = () => {
  const t = useT();
  const { lang } = useA11y();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{ role: "assistant", content: t("ask.greeting") }]);
  }, [t]);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  const suggestions = useMemo(() => SUGGESTIONS[lang], [lang]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || loading) return;
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setLoading(true);
    try {
      const { data: businesses, error: dErr } = await supabase
        .from("businesses")
        .select("id, name, category, description, tags, avg_rating, address")
        .limit(200);
      if (dErr) throw dErr;
      const { data, error } = await supabase.functions.invoke("huddle-bot", {
        body: { question, businesses: businesses ?? [], lang },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      const answer = (data as { answer?: string })?.answer ?? "I don't have an answer for that yet.";
      setMessages((m) => [...m, { role: "assistant", content: answer }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast({ title: "Huddle Bot couldn't reply", description: msg, variant: "destructive" });
      setMessages((m) => [...m, { role: "assistant", content: `_Sorry, I hit a snag: ${msg}_` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating launcher + hint label */}
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5">
        {/* "Ask the AI" hint pill — only when closed */}
        {!open && (
          <div className="flex items-center gap-1.5 rounded-full bg-background/95 border border-border/60 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.15)] px-3 py-1.5 backdrop-blur-sm pointer-events-none select-none">
            <MessageCircle className="h-3 w-3 text-primary shrink-0" strokeWidth={1.5} />
            <span className="text-xs font-medium text-foreground/80 whitespace-nowrap">Ask the AI</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? t("ask.send") : t("ask.title")}
          className={cn(
            "h-14 w-14 rounded-full shadow-elegant shrink-0",
            "bg-gradient-primary text-primary-foreground",
            "flex items-center justify-center transition-transform hover:scale-105 active:scale-95",
          )}
        >
          {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
        </button>
      </div>

      {/* Chat panel */}
      {open && (
        <div
          role="dialog"
          aria-label={t("ask.title")}
          className={cn(
            "fixed z-50 bg-card border border-border rounded-2xl shadow-elegant flex flex-col overflow-hidden",
            "bottom-24 right-5",
            "w-[calc(100vw-2.5rem)] sm:w-[380px]",
            "h-[min(70vh,560px)]",
          )}
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-gradient-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
            <h2 className="text-sm font-semibold flex-1">{t("ask.title")}</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="opacity-80 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-3 py-2 text-sm"
                      : "max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm prose prose-sm dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-a:text-primary"
                  }
                >
                  {m.role === "assistant" ? (
                    <ReactMarkdown
                      components={{
                        a: ({ href, children }) => {
                          if (href && href.startsWith("/")) {
                            return <Link to={href} className="text-primary underline underline-offset-2 hover:opacity-80" onClick={() => setOpen(false)}>{children}</Link>;
                          }
                          return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80">{children}</a>;
                        },
                      }}
                    >{m.content}</ReactMarkdown>
                  ) : m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("ask.thinking")}
                </div>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs rounded-full border px-3 py-1 hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="border-t p-2 flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("ask.placeholder")}
              disabled={loading}
              aria-label={t("ask.title")}
              className="h-9"
            />
            <Button type="submit" disabled={loading || !input.trim()} size="icon" aria-label={t("ask.send")} className="h-9 w-9">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
};
