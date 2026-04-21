import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2, RefreshCw } from "lucide-react";

interface Props {
  onVerifiedChange: (verified: boolean) => void;
}

// "Verify Visit" puzzle — a simple sequence test that's harder than the bot CAPTCHA.
// User must continue an arithmetic sequence; only humans who actually read it get the right answer.
const generate = () => {
  const start = Math.floor(Math.random() * 5) + 2;
  const step = Math.floor(Math.random() * 4) + 2;
  const seq = [start, start + step, start + 2 * step, start + 3 * step];
  return { seq, answer: start + 4 * step };
};

export const VerifyVisitPuzzle = ({ onVerifiedChange }: Props) => {
  const [puzzle, setPuzzle] = useState(generate);
  const [value, setValue] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const ok = value !== "" && Number(value) === puzzle.answer;
    setVerified(ok);
    onVerifiedChange(ok);
  }, [value, puzzle, onVerifiedChange]);

  return (
    <div className="rounded-md border bg-accent/5 p-3 space-y-2">
      <Label className="flex items-center gap-2 text-xs">
        <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
        Verify your visit (optional — earns a Verified badge)
      </Label>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-sm bg-background border rounded px-3 py-2 select-none">
          {puzzle.seq.join(", ")}, ?
        </span>
        <Input
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
          className="w-24"
          aria-label="Next number in sequence"
          placeholder="Next"
        />
        <Button type="button" size="icon" variant="ghost" onClick={() => { setPuzzle(generate()); setValue(""); }} aria-label="New puzzle">
          <RefreshCw className="h-4 w-4" />
        </Button>
        {verified && <span className="text-xs text-success font-medium">✓ Visit verified</span>}
      </div>
    </div>
  );
};
