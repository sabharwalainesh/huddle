import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useA11y, useT } from "@/contexts/A11yContext";
import { Navbar } from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

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

const Ask = () => {
  const t = useT();
  const { lang } = useA11y();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{ role: "assistant", content: t("ask.greeting") }]);
  }, [t]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

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
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <Navbar />
      <main id="main" className="container max-w-3xl flex-1 flex flex-col py-6 gap-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4.5 w-4.5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-tight">{t("ask.title")}</h1>
            <p className="text-xs text-muted-foreground">Powered by local data</p>
          </div>
        </div>

        {/* Chat window — outer shell */}
        <div className="flex-1 flex flex-col p-[5px] rounded-[1.5rem] bg-foreground/[0.03] border border-border/50 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.06)] min-h-0">
          {/* Inner core */}
          <div className="flex-1 rounded-[calc(1.5rem-5px)] bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] flex flex-col overflow-hidden min-h-0">

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  {m.role === "assistant" && (
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mr-2.5 mt-0.5">
                      <Sparkles className="h-3 w-3 text-primary" strokeWidth={1.5} />
                    </div>
                  )}
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[80%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm leading-relaxed"
                        : "max-w-[80%] rounded-2xl rounded-bl-sm bg-muted/60 border border-border/40 px-4 py-2.5 text-sm prose prose-sm dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-a:text-primary leading-relaxed"
                    }
                  >
                    {m.role === "assistant" ? <ReactMarkdown>{m.content}</ReactMarkdown> : m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start items-start gap-2.5">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-3 w-3 text-primary" strokeWidth={1.5} />
                  </div>
                  <div className="rounded-2xl rounded-bl-sm bg-muted/60 border border-border/40 px-4 py-2.5 text-sm flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">{t("ask.thinking")}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Suggestion pills */}
            {messages.length <= 1 && (
              <div className="px-5 pb-3 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-xs rounded-full border border-border/60 bg-muted/40 px-3.5 py-1.5 font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="border-t border-border/60 p-3 flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("ask.placeholder")}
                disabled={loading}
                aria-label={t("ask.title")}
                className="rounded-full border-border/50 text-sm"
              />
              <Button
                type="submit"
                disabled={loading || !input.trim()}
                size="icon"
                aria-label={t("ask.send")}
                className="rounded-full shrink-0 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.95]"
              >
                <Send className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Ask;
