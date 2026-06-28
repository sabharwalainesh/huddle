import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, ShoppingBag, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Reveal } from "@/components/Reveal";

type ShowcaseItem = {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  price: string | null;
  image_url: string | null;
  is_available: boolean;
  created_at: string;
  businesses: { name: string; category: string };
};

const CATEGORIES = ["all", "food", "retail", "services", "health", "entertainment", "other"] as const;

const Showcase = () => {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("showcase_items")
        .select("*, businesses(name, category)")
        .eq("is_available", true)
        .order("created_at", { ascending: false });
      setItems((data ?? []) as unknown as ShowcaseItem[]);
      setLoading(false);
    })();
  }, []);

  // honour ?business_id= deep-link from business detail page
  const filterBizId = searchParams.get("business_id");

  const filtered = items.filter((item) => {
    if (filterBizId && item.business_id !== filterBizId) return false;
    const matchesCategory = category === "all" || item.businesses?.category === category;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.businesses?.name.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main id="main" className="container py-10 flex-1 space-y-8">
        {/* Header */}
        <Reveal>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center animate-bounce-in">
              <ShoppingBag className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Showcase</h1>
              <p className="text-sm text-muted-foreground">Products &amp; services from local businesses</p>
            </div>
          </div>
        </Reveal>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <Input
              placeholder="Search products or businesses…"
              className="pl-9 rounded-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors border capitalize ${
                  category === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {cat === "all" ? "All" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground/40" strokeWidth={1.5} />
            <p className="font-semibold text-muted-foreground">No items found</p>
            <p className="text-sm text-muted-foreground/70">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((item, i) => (
              <Link
                key={item.id}
                to={`/business/${item.business_id}`}
                className="group flex flex-col rounded-2xl border border-border/50 bg-card overflow-hidden hover:border-primary/30 hover:shadow-md transition-all duration-200 card-shine animate-slide-up"
                style={{ animationDelay: `${(i % 8) * 50}ms` }}
              >
                <div className="aspect-square bg-muted/40 overflow-hidden">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="h-10 w-10 text-muted-foreground/30" strokeWidth={1} />
                    </div>
                  )}
                </div>
                <div className="p-3 flex flex-col gap-1 flex-1">
                  <p className="font-semibold text-sm leading-snug line-clamp-2">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-auto pt-2">
                    {item.price ? (
                      <span className="font-bold text-sm text-primary">{item.price}</span>
                    ) : (
                      <span />
                    )}
                    <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[120px]">
                      {item.businesses?.name}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Showcase;
