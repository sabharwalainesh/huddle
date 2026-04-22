import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { toast } from "@/hooks/use-toast";
import { VideoFeedItem } from "@/components/VideoFeedItem";
import { VideoUploadDialog } from "@/components/VideoUploadDialog";
import { rankForYou, type FeedVideo } from "@/lib/videoRanking";

type FeedMode = "fyp" | "recent";

const Feed = () => {
  const { user } = useAuth();
  const { prefs } = useUserPreferences();
  const [videos, setVideos] = useState<FeedVideo[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<FeedMode>("fyp");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Get geolocation for ranking (best-effort)
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords(null),
      { enableHighAccuracy: false, maximumAge: 5 * 60_000, timeout: 5000 },
    );
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("videos")
      .select("id, user_id, business_id, video_url, thumbnail_url, caption, category, lat, lng, like_count, view_count, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      toast({ title: "Couldn't load feed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as FeedVideo[];

    // Hydrate business + author info in parallel
    const businessIds = Array.from(new Set(rows.map((r) => r.business_id).filter(Boolean) as string[]));
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));

    const [bizRes, profRes, likeRes] = await Promise.all([
      businessIds.length
        ? supabase.from("businesses").select("id, name, category").in("id", businessIds)
        : Promise.resolve({ data: [] as { id: string; name: string; category: string }[] }),
      userIds.length
        ? supabase.from("profiles").select("user_id, display_name").in("user_id", userIds)
        : Promise.resolve({ data: [] as { user_id: string; display_name: string }[] }),
      user
        ? supabase.from("video_likes").select("video_id").eq("user_id", user.id)
        : Promise.resolve({ data: [] as { video_id: string }[] }),
    ]);

    const bizMap = new Map((bizRes.data ?? []).map((b) => [b.id, b]));
    const profMap = new Map((profRes.data ?? []).map((p) => [p.user_id, p]));

    const enriched = rows.map((r) => ({
      ...r,
      business: r.business_id ? bizMap.get(r.business_id) ?? null : null,
      author: profMap.get(r.user_id) ?? null,
    }));

    setVideos(enriched);
    setLikedIds(new Set((likeRes.data ?? []).map((l) => l.video_id)));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const ordered = useMemo(() => {
    if (mode === "recent") return videos;
    return rankForYou(videos, { prefs, coords });
  }, [videos, mode, prefs, coords]);

  // Track which slide is in view
  useEffect(() => {
    const root = containerRef.current;
    if (!root || ordered.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            if (!Number.isNaN(idx)) setActiveIndex(idx);
          }
        });
      },
      { root, threshold: [0.6] },
    );
    itemRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ordered]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main id="main" className="flex-1 flex flex-col">
        <div className="container py-3 flex items-center justify-between gap-2">
          <Tabs value={mode} onValueChange={(v) => setMode(v as FeedMode)}>
            <TabsList>
              <TabsTrigger value="fyp">For You</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setUploadOpen(true)} size="sm">
            <Plus className="h-4 w-4" /> Post
          </Button>
        </div>

        <div className="flex-1 flex justify-center bg-muted/30">
          <div
            ref={containerRef}
            className="relative w-full max-w-md h-[calc(100vh-9rem)] overflow-y-scroll snap-y snap-mandatory rounded-lg bg-black"
          >
            {loading ? (
              <div className="h-full flex items-center justify-center text-white">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : ordered.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-white px-6 text-center">
                <p className="text-lg font-semibold">No videos yet</p>
                <p className="text-sm text-white/70">Be the first to post a clip from a local business.</p>
                <Button onClick={() => setUploadOpen(true)} variant="secondary" size="sm">
                  <Plus className="h-4 w-4" /> Post a video
                </Button>
              </div>
            ) : (
              ordered.map((v, i) => (
                <div
                  key={v.id}
                  data-index={i}
                  ref={(el) => {
                    if (el) itemRefs.current.set(v.id, el);
                    else itemRefs.current.delete(v.id);
                  }}
                  className="h-full w-full snap-start"
                >
                  <VideoFeedItem
                    video={v}
                    active={i === activeIndex}
                    initiallyLiked={likedIds.has(v.id)}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <VideoUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onPosted={load}
      />
    </div>
  );
};

export default Feed;
