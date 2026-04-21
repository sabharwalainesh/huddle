import { useState } from "react";
import { Accessibility, Moon, Sun, Eye, Volume2, Square, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useA11y } from "@/contexts/A11yContext";
import type { Lang } from "@/lib/i18n";

export const AccessibilityPanel = () => {
  const {
    t,
    lang,
    setLang,
    darkMode,
    toggleDarkMode,
    highVisibility,
    toggleHighVisibility,
    speakPage,
    stopSpeaking,
    isSpeaking,
    ttsSupported,
  } = useA11y();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("nav.accessibility")} title={t("nav.accessibility")}>
          <Accessibility className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Accessibility className="h-5 w-5 text-primary" />
            {t("a11y.title")}
          </SheetTitle>
          <SheetDescription>{t("a11y.description")}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Language */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Languages className="h-4 w-4" /> {t("a11y.language")}
            </Label>
            <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dark mode */}
          <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="dark-mode" className="flex items-center gap-2 cursor-pointer font-medium">
                {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                {t("a11y.darkMode")}
              </Label>
              <p className="text-xs text-muted-foreground">{t("a11y.darkModeHint")}</p>
            </div>
            <Switch id="dark-mode" checked={darkMode} onCheckedChange={toggleDarkMode} />
          </div>

          {/* High visibility */}
          <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="hv-mode" className="flex items-center gap-2 cursor-pointer font-medium">
                <Eye className="h-4 w-4" /> {t("a11y.highVisibility")}
              </Label>
              <p className="text-xs text-muted-foreground">{t("a11y.highVisibilityHint")}</p>
            </div>
            <Switch id="hv-mode" checked={highVisibility} onCheckedChange={toggleHighVisibility} />
          </div>

          {/* TTS */}
          <div className="space-y-2 rounded-lg border p-3">
            <Label className="flex items-center gap-2 font-medium">
              <Volume2 className="h-4 w-4" /> {t("a11y.tts")}
            </Label>
            <p className="text-xs text-muted-foreground">{t("a11y.ttsHint")}</p>
            {ttsSupported ? (
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant={isSpeaking ? "outline" : "default"}
                  onClick={speakPage}
                  disabled={isSpeaking}
                  className="flex-1"
                >
                  <Volume2 className="h-4 w-4" /> {t("a11y.ttsPlay")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={stopSpeaking}
                  disabled={!isSpeaking}
                  className="flex-1"
                >
                  <Square className="h-4 w-4" /> {t("a11y.ttsStop")}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-destructive">{t("a11y.ttsUnsupported")}</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
