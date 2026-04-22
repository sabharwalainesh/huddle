import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number; // ms
  /** Animation variant */
  variant?: "fade-up" | "fade" | "scale" | "fade-left" | "fade-right";
  /** Only animate once when entering the viewport */
  once?: boolean;
  as?: keyof JSX.IntrinsicElements;
};

/**
 * Wraps children with a scroll-triggered entrance animation using IntersectionObserver.
 * Respects prefers-reduced-motion (renders immediately visible).
 */
export const Reveal = ({
  children,
  className,
  delay = 0,
  variant = "fade-up",
  once = true,
  as: Tag = "div",
}: RevealProps) => {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setVisible(false);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);

  const Comp = Tag as any;
  return (
    <Comp
      ref={ref as any}
      data-visible={visible}
      style={{ transitionDelay: `${delay}ms`, animationDelay: `${delay}ms` }}
      className={cn("reveal", `reveal-${variant}`, className)}
    >
      {children}
    </Comp>
  );
};
