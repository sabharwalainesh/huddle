import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, Receipt, Upload, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  businessId: string;
  onVerifiedChange: (verified: boolean) => void;
}

type Status =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "checking" }
  | { kind: "verified"; reason: string }
  | { kind: "failed"; reason: string };

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export const ReceiptVerifier = ({ businessId, onVerifiedChange }: Props) => {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (file: File) => {
    if (!user) {
      toast({ title: "Sign in to verify your visit", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please upload an image of your receipt", variant: "destructive" });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: "Image too large", description: "Please use a photo under 8 MB.", variant: "destructive" });
      return;
    }

    setStatus({ kind: "uploading" });
    onVerifiedChange(false);

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${businessId}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("receipts")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadErr) {
      setStatus({ kind: "failed", reason: uploadErr.message });
      return;
    }

    setStatus({ kind: "checking" });
    const { data, error } = await supabase.functions.invoke("verify-receipt", {
      body: { business_id: businessId, storage_path: path },
    });
    if (error) {
      setStatus({ kind: "failed", reason: error.message });
      return;
    }
    if (data?.error) {
      setStatus({ kind: "failed", reason: String(data.error) });
      return;
    }
    if (data?.verified) {
      setStatus({ kind: "verified", reason: data.reason ?? "Receipt looks good." });
      onVerifiedChange(true);
    } else {
      const why = !data?.is_receipt
        ? "That doesn't look like a receipt."
        : !data?.business_match
          ? "We couldn't match the business name on the receipt."
          : !data?.date_recent
            ? "The receipt isn't from the last 90 days."
            : (data?.reason ?? "Couldn't verify this receipt.");
      setStatus({ kind: "failed", reason: why });
      onVerifiedChange(false);
    }
  };

  const reset = () => {
    setStatus({ kind: "idle" });
    onVerifiedChange(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="rounded-md border bg-accent/5 p-3 space-y-2">
      <Label className="flex items-center gap-2 text-xs">
        <Receipt className="h-3.5 w-3.5 text-accent" />
        Verify your visit (optional — earns a Verified badge)
      </Label>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {status.kind === "idle" && (
        <Button type="button" variant="outline" size="sm" onClick={handlePick} className="gap-2">
          <Upload className="h-4 w-4" />
          Upload a photo of your receipt
        </Button>
      )}

      {status.kind === "uploading" && (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading receipt…
        </p>
      )}

      {status.kind === "checking" && (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> AI is checking your receipt…
        </p>
      )}

      {status.kind === "verified" && (
        <div className="flex items-start gap-2 text-xs">
          <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-success">Visit verified</p>
            <p className="text-muted-foreground">{status.reason}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={reset} className="h-7 text-xs">
            Replace
          </Button>
        </div>
      )}

      {status.kind === "failed" && (
        <div className="flex items-start gap-2 text-xs">
          <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-destructive">Couldn't verify</p>
            <p className="text-muted-foreground">{status.reason}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={reset} className="h-7 text-xs">
            Try again
          </Button>
        </div>
      )}
    </div>
  );
};
