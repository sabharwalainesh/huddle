import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  className?: string;
}

export const StarRating = ({ value, onChange, size = 18, className }: Props) => {
  const interactive = !!onChange;
  return (
    <div className={cn("inline-flex items-center gap-0.5", className)} role={interactive ? "radiogroup" : undefined}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        const Cmp = interactive ? "button" : "span";
        return (
          <Cmp
            key={n}
            type={interactive ? "button" : undefined}
            onClick={interactive ? () => onChange!(n) : undefined}
            aria-label={interactive ? `Rate ${n} stars` : undefined}
            className={cn(interactive && "cursor-pointer hover:scale-110 transition-transform")}
          >
            <Star
              style={{ width: size, height: size }}
              className={cn(filled ? "fill-warning text-warning" : "text-muted-foreground/40")}
            />
          </Cmp>
        );
      })}
    </div>
  );
};
