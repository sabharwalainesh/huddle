import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Volume2, VolumeX, MapPin, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { FeedVideo } from "@/lib/videoRanking";

interface Props {
  video: FeedVideo;
  active: boolean;
  initiallyLiked?: boolean;
}

export const VideoFeedItem = ({ video, active, initiallyLiked = false }: Props) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(initiallyLiked);
  const [likeCount, setLikeCount] = useState(video.like_count);
  const viewedRef = useRef(false);

  useEffect(() => setLiked(initiallyLiked), [initiallyLiked]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (active) {
      el.currentTime = 0;
      el.play().catch(() => {});
      if (!viewedRef.current) {
        viewedRef.current = true;
        supabase.from("video_views").insert({
          video_id: video.id,
          viewer_id: user?.id ?? null,
        });
      }
    } else {
      el.pause();
    }
  }, [active, video.id, user?.id]);

  const toggleLike = async () => {
    if (!user) {
      toast({ title: "Sign in to like videos", variant: "destructive" });
      return;
    }
    if (liked) {
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
      const { error } = await supabase
        .from("video_likes")
        .delete()
        .eq("video_id", video.id)
        .eq("user_id", user.id);
      if (error) {
        setLiked(true);
        setLikeCount((c) => c + 1);
      }
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      const { error } = await supabase
        .from("video_likes")
        .insert({ video_id: video.id, user_id: user.id });
      if (error) {
        setLiked(false);
        setLikeCount((c) => Math.max(0, c - 1));
      }
    }
  };

  return (
    <section className="relative h-full w-full snap-start snap-always flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        src={video.video_url}
        className="max-h-full max-w-full object-contain"
        loop
        playsInline
        muted={muted}
        onClick={() => {
          const el = videoRef.current;
          if (!el) return;
          el.paused ? el.play() : el.pause();
        }}
      />

      {/* Mute toggle */}
      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        className="absolute top-4 right-4 h-10 w-10 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      {/* Right action rail */}
      <div className="absolute right-3 bottom-24 flex flex-col gap-4 items-center text-white">
        <button
          type="button"
          onClick={toggleLike}
          className="flex flex-col items-center gap-1"
          aria-label="Like"
        >
          <span className="h-12 w-12 rounded-full bg-black/50 flex items-center justify-center backdrop-blur">
            <Heart className={`h-6 w-6 ${liked ? "fill-primary text-primary" : ""}`} />
          </span>
          <span className="text-xs font-medium">{likeCount}</span>
        </button>
        <div className="flex flex-col items-center gap-1">
          <span className="h-12 w-12 rounded-full bg-black/50 flex items-center justify-center backdrop-blur">
            <Eye className="h-6 w-6" />
          </span>
          <span className="text-xs font-medium">{video.view_count}</span>
        </div>
      </div>

      {/* Bottom caption + business tag */}
      <div className="absolute left-0 right-16 bottom-0 p-4 text-white bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <div className="text-sm font-semibold mb-1">
          @{video.author?.display_name || "huddler"}
        </div>
        {video.caption && <p className="text-sm mb-2 line-clamp-3">{video.caption}</p>}
        {video.business && (
          <Link
            to={`/business/${video.business.id}`}
            className="inline-flex items-center gap-1 text-xs bg-white/15 backdrop-blur px-2 py-1 rounded-full hover:bg-white/25 transition-colors"
          >
            <MapPin className="h-3 w-3" />
            {video.business.name}
          </Link>
        )}
      </div>
    </section>
  );
};
