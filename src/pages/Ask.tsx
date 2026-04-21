import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface Msg { role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  "Where can I find gluten-free bread?",
  "Best highly-rated coffee spots",
  "Recommend a family-friendly restaurant",
];

const Ask = () => {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I'm **Huddle Bot** 🤖. Ask me anything about local businesses — I'll match you with the best ones from our directory." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

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
        body: { question, businesses: businesses ?? [] },
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
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="container max-w-3xl flex-1 flex flex-col py-6 gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Ask Huddle Bot</h1>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden shadow-card">
          <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-2 text-sm"
                        : "max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2 text-sm prose prose-sm dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-a:text-primary"
                    }
                  >
                    {m.role === "assistant" ? <ReactMarkdown>{m.content}</ReactMarkdown> : m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-2 text-sm flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking...
                  </div>
                </div>
              )}
            </div>

            {messages.length <= 1 && (
              <div className="px-4 pb-2 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
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
              className="border-t p-3 flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about local businesses..."
                disabled={loading}
                aria-label="Ask Huddle Bot"
              />
              <Button type="submit" disabled={loading || !input.trim()} size="icon" aria-label="Send">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Ask;
