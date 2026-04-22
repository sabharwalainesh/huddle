import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Loader2, Video as VideoIcon, Square, Circle, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const CATEGORIES = ["food", "retail", "services", "health", "entertainment", "other"] as const;
const MAX_BYTES = 100 * 1024 * 1024; // 100MB
const MAX_RECORD_MS = 60_000; // 60s

const PostSchema = z.object({
  caption: z.string().trim().max(500, "Caption must be 500 characters or fewer"),
  category: z.string().optional(),
  business_id: z.string().uuid().optional().nullable(),
});

interface BusinessOption {
  id: string;
  name: string;
  category: string;
  lat: number | null;
  lng: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPosted?: () => void;
}

export const VideoUploadDialog = ({ open, onOpenChange, onPosted }: Props) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<"record" | "upload">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState<string>("");
  const [businessId, setBusinessId] = useState<string>("");
  const [businessQuery, setBusinessQuery] = useState("");
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Recording state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const recordTimerRef = useRef<number | null>(null);

  // Search businesses
  useEffect(() => {
    if (!open) return;
    const q = businessQuery.trim();
    let cancelled = false;
    (async () => {
      const builder = supabase
        .from("businesses")
        .select("id, name, category, lat, lng")
        .eq("status", "approved")
        .order("name")
        .limit(20);
      const { data } = q ? await builder.ilike("name", `%${q}%`) : await builder;
      if (!cancelled) setBusinesses((data ?? []) as BusinessOption[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, businessQuery]);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      stopCamera();
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const resetForm = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCaption("");
    setCategory("");
    setBusinessId("");
    setBusinessQuery("");
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 1280 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not access camera";
      toast({ title: "Camera unavailable", description: msg, variant: "destructive" });
    }
  };

  const stopCamera = () => {
    if (recordTimerRef.current) {
      window.clearTimeout(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    recorderRef.current?.state === "recording" && recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRecording(false);
    setCameraReady(false);
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm";
    const recorder = new MediaRecorder(streamRef.current, { mimeType: mime });
    recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const recordedFile = new File([blob], `recording-${Date.now()}.webm`, { type: "video/webm" });
      setFile(recordedFile);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
      stopCamera();
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
    recordTimerRef.current = window.setTimeout(() => {
      recorder.state === "recording" && recorder.stop();
    }, MAX_RECORD_MS);
  };

  const stopRecording = () => {
    if (recordTimerRef.current) {
      window.clearTimeout(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      toast({ title: "Pick a video file", variant: "destructive" });
      return;
    }
    if (f.size > MAX_BYTES) {
      toast({ title: "File too large", description: "Max 100MB.", variant: "destructive" });
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!user) {
      toast({ title: "Sign in to post", variant: "destructive" });
      return;
    }
    if (!file) {
      toast({ title: "Add a video first", variant: "destructive" });
      return;
    }

    const parsed = PostSchema.safeParse({
      caption,
      category: category || undefined,
      business_id: businessId || null,
    });
    if (!parsed.success) {
      toast({
        title: "Check your input",
        description: parsed.error.errors[0]?.message ?? "Invalid input",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "webm";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("videos").upload(path, file, {
        contentType: file.type || "video/webm",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("videos").getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      const chosen = businesses.find((b) => b.id === businessId);
      const insertCategory = parsed.data.category || chosen?.category || null;

      const { error: insErr } = await supabase.from("videos").insert({
        user_id: user.id,
        business_id: parsed.data.business_id ?? null,
        video_url: publicUrl,
        caption: parsed.data.caption,
        category: insertCategory,
        lat: chosen?.lat ?? null,
        lng: chosen?.lng ?? null,
      });
      if (insErr) throw insErr;

      toast({ title: "Posted!", description: "Your video is live in the feed." });
      onPosted?.();
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Couldn't post", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Post a video</DialogTitle>
          <DialogDescription>
            Share a quick clip from a local business or a product review.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "record" | "upload")}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="upload"><Upload className="h-4 w-4" /> Upload</TabsTrigger>
            <TabsTrigger value="record"><VideoIcon className="h-4 w-4" /> Record</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-3">
            <Input type="file" accept="video/*" onChange={onPickFile} />
            <p className="text-xs text-muted-foreground">Max 100MB. mp4, webm, or mov.</p>
          </TabsContent>

          <TabsContent value="record" className="space-y-3">
            <div className="aspect-[9/16] max-h-[50vh] bg-muted rounded-md overflow-hidden flex items-center justify-center">
              {cameraReady ? (
                <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
              ) : (
                <span className="text-sm text-muted-foreground px-4 text-center">
                  Start your camera to record (up to 60s).
                </span>
              )}
            </div>
            <div className="flex justify-center gap-2">
              {!cameraReady ? (
                <Button onClick={startCamera} type="button">
                  <VideoIcon className="h-4 w-4" /> Start camera
                </Button>
              ) : !recording ? (
                <>
                  <Button onClick={startRecording} type="button">
                    <Circle className="h-4 w-4 fill-current" /> Record
                  </Button>
                  <Button onClick={stopCamera} type="button" variant="outline">
                    <X className="h-4 w-4" /> Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={stopRecording} type="button" variant="destructive">
                  <Square className="h-4 w-4 fill-current" /> Stop
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {previewUrl && (
          <div className="space-y-2">
            <Label>Preview</Label>
            <video src={previewUrl} controls className="w-full rounded-md max-h-64 bg-black" />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="caption">Caption</Label>
          <Textarea
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Say something about it..."
            maxLength={500}
            rows={3}
          />
          <p className="text-xs text-muted-foreground text-right">{caption.length}/500</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tag a business</Label>
            <Input
              placeholder="Search business..."
              value={businessQuery}
              onChange={(e) => setBusinessQuery(e.target.value)}
            />
          </div>
        </div>

        {businesses.length > 0 && (
          <div className="max-h-40 overflow-y-auto rounded-md border">
            {businesses.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBusinessId(b.id === businessId ? "" : b.id)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                  b.id === businessId ? "bg-accent" : ""
                }`}
              >
                <div className="font-medium">{b.name}</div>
                <div className="text-xs text-muted-foreground">{b.category}</div>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || !file}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Post video
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
