import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCw, ShieldCheck } from "lucide-react";

interface CaptchaProps {
  onVerifiedChange: (verified: boolean) => void;
}

// Multi-level bot verification: arithmetic puzzle the user must solve.
const generate = () => {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const op = Math.random() > 0.5 ? "+" : "×";
  return { a, b, op, answer: op === "+" ? a + b : a * b };
};

export const Captcha = ({ onVerifiedChange }: CaptchaProps) => {
  const [puzzle, setPuzzle] = useState(generate);
  const [value, setValue] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const ok = Number(value) === puzzle.answer && value !== "";
    setVerified(ok);
    onVerifiedChange(ok);
  }, [value, puzzle, onVerifiedChange]);

  const refresh = () => {
    setPuzzle(generate());
    setValue("");
  };

  return (
    <div className="rounded-md border bg-muted/40 p-3 space-y-2">
      <Label className="flex items-center gap-2 text-xs">
        <ShieldCheck className="h-3.5 w-3.5 text-accent" />
        Quick check — prove you're human
      </Label>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm bg-background border rounded px-3 py-2 select-none">
          {puzzle.a} {puzzle.op} {puzzle.b} = ?
        </span>
        <Input
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
          className="w-24"
          aria-label="Captcha answer"
        />
        <Button type="button" size="icon" variant="ghost" onClick={refresh} aria-label="New puzzle">
          <RefreshCw className="h-4 w-4" />
        </Button>
        {verified && <span className="text-xs text-success font-medium">✓ Verified</span>}
      </div>
    </div>
  );
};
