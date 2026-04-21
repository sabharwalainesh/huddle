import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

interface A11yContextType {
  highVisibility: boolean;
  toggleHighVisibility: () => void;
}

const A11yContext = createContext<A11yContextType>({ highVisibility: false, toggleHighVisibility: () => {} });

const STORAGE_KEY = "huddle:high-visibility";

export const A11yProvider = ({ children }: { children: ReactNode }) => {
  const [highVisibility, setHighVisibility] = useState(false);

  useEffect(() => {
    try {
      setHighVisibility(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("high-visibility", highVisibility);
    try { localStorage.setItem(STORAGE_KEY, highVisibility ? "1" : "0"); } catch { /* noop */ }
  }, [highVisibility]);

  const toggleHighVisibility = useCallback(() => setHighVisibility((v) => !v), []);

  // Global keyboard shortcuts: "/" focus search, "g h" Home, "g m" My Huddle, "g d" Dashboard, "g a" Ask Bot, "?" toggles high-visibility
  useEffect(() => {
    let lastG = 0;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if (e.key === "/" && !isTyping) {
        const search = document.getElementById("search") as HTMLInputElement | null;
        if (search) { e.preventDefault(); search.focus(); }
        return;
      }

      if (isTyping) return;

      if (e.key === "?" && e.shiftKey) {
        e.preventDefault();
        toggleHighVisibility();
        return;
      }

      if (e.key.toLowerCase() === "g") { lastG = Date.now(); return; }

      if (Date.now() - lastG < 800) {
        const k = e.key.toLowerCase();
        const map: Record<string, string> = { h: "/", m: "/my-huddle", d: "/dashboard", a: "/ask" };
        if (map[k]) { e.preventDefault(); window.location.assign(map[k]); }
        lastG = 0;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleHighVisibility]);

  return (
    <A11yContext.Provider value={{ highVisibility, toggleHighVisibility }}>
      {children}
    </A11yContext.Provider>
  );
};

export const useA11y = () => useContext(A11yContext);
