import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { translations, type Lang, type TranslationKey } from "@/lib/i18n";

interface A11yContextType {
  highVisibility: boolean;
  toggleHighVisibility: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
  speakPage: () => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  ttsSupported: boolean;
}

const A11yContext = createContext<A11yContextType>({
  highVisibility: false,
  toggleHighVisibility: () => {},
  darkMode: false,
  toggleDarkMode: () => {},
  lang: "en",
  setLang: () => {},
  t: (k) => k,
  speakPage: () => {},
  stopSpeaking: () => {},
  isSpeaking: false,
  ttsSupported: false,
});

const HV_KEY = "huddle:high-visibility";
const DARK_KEY = "huddle:dark-mode";
const LANG_KEY = "huddle:lang";

export const A11yProvider = ({ children }: { children: ReactNode }) => {
  const [highVisibility, setHighVisibility] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [lang, setLangState] = useState<Lang>("en");
  const [isSpeaking, setIsSpeaking] = useState(false);

  const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  // Load persisted prefs
  useEffect(() => {
    try {
      setHighVisibility(localStorage.getItem(HV_KEY) === "1");
      const storedDark = localStorage.getItem(DARK_KEY);
      const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
      setDarkMode(storedDark === null ? !!prefersDark : storedDark === "1");
      const storedLang = localStorage.getItem(LANG_KEY);
      if (storedLang === "es" || storedLang === "en") setLangState(storedLang);
    } catch {
      /* noop */
    }
  }, []);

  // Apply high-visibility
  useEffect(() => {
    document.documentElement.classList.toggle("high-visibility", highVisibility);
    try { localStorage.setItem(HV_KEY, highVisibility ? "1" : "0"); } catch { /* noop */ }
  }, [highVisibility]);

  // Apply dark mode
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    try { localStorage.setItem(DARK_KEY, darkMode ? "1" : "0"); } catch { /* noop */ }
  }, [darkMode]);

  // Apply lang attribute
  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* noop */ }
  }, [lang]);

  const toggleHighVisibility = useCallback(() => setHighVisibility((v) => !v), []);
  const toggleDarkMode = useCallback(() => setDarkMode((v) => !v), []);
  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return (translations[lang][key] as string) ?? (translations.en[key] as string) ?? key;
    },
    [lang],
  );

  const stopSpeaking = useCallback(() => {
    if (!ttsSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [ttsSupported]);

  const speakPage = useCallback(() => {
    if (!ttsSupported) return;
    window.speechSynthesis.cancel();
    const main = document.getElementById("main") ?? document.querySelector("main") ?? document.body;
    const text = (main?.innerText ?? "").replace(/\s+/g, " ").trim().slice(0, 5000);
    if (!text) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang === "es" ? "es-ES" : "en-US";
    utter.rate = 1;
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utter);
  }, [lang, ttsSupported]);

  // Stop speech on unmount/route change cleanup
  useEffect(() => {
    return () => {
      if (ttsSupported) window.speechSynthesis.cancel();
    };
  }, [ttsSupported]);

  // Global keyboard shortcuts
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
    <A11yContext.Provider
      value={{
        highVisibility,
        toggleHighVisibility,
        darkMode,
        toggleDarkMode,
        lang,
        setLang,
        t,
        speakPage,
        stopSpeaking,
        isSpeaking,
        ttsSupported,
      }}
    >
      {children}
    </A11yContext.Provider>
  );
};

export const useA11y = () => useContext(A11yContext);
export const useT = () => useContext(A11yContext).t;
