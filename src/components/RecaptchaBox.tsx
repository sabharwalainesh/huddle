import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecaptchaBoxProps {
  onVerifiedChange: (verified: boolean) => void;
  className?: string;
}

/**
 * reCAPTCHA-style "I'm not a robot" checkbox.
 * Visual placeholder that mimics Google's widget — wire to real reCAPTCHA later
 * by adding RECAPTCHA_SITE_KEY + a token-verifying edge function.
 */
export const RecaptchaBox = ({ onVerifiedChange, className }: RecaptchaBoxProps) => {
  const [state, setState] = useState<"idle" | "checking" | "verified">("idle");

  useEffect(() => {
    onVerifiedChange(state === "verified");
  }, [state, onVerifiedChange]);

  const handleClick = () => {
    if (state !== "idle") return;
    setState("checking");
    // Simulate the network-style delay of a real reCAPTCHA challenge.
    setTimeout(() => setState("verified"), 700);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border bg-background px-3 py-3 shadow-sm select-none",
        className,
      )}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={state !== "idle"}
        aria-label="I'm not a robot"
        aria-checked={state === "verified"}
        role="checkbox"
        className={cn(
          "h-7 w-7 shrink-0 rounded-sm border-2 flex items-center justify-center transition-colors",
          state === "verified"
            ? "bg-success/10 border-success"
            : "bg-background border-muted-foreground/40 hover:border-muted-foreground",
        )}
      >
        {state === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {state === "verified" && <Check className="h-5 w-5 text-success" strokeWidth={3} />}
      </button>
      <span className="text-sm flex-1">I'm not a robot</span>
      <div className="flex flex-col items-center text-[10px] text-muted-foreground leading-tight">
        <span className="font-bold tracking-tight text-xs text-foreground/70">reCAPTCHA</span>
        <span>Privacy · Terms</span>
      </div>
    </div>
  );
};
