import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Users, LogOut, Plus, Bookmark, BarChart3, ShieldCheck, UserCircle, Info, Building2, MapPin, Bell, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/contexts/A11yContext";
import { useUserRoles } from "@/hooks/useUserRoles";
import { AccessibilityPanel } from "@/components/AccessibilityPanel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";

type Notification = { id: string; message: string; is_read: boolean; created_at: string };

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRoles();
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";

  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [bellOpen, setBellOpen] = useState(false);

  const seenHintRef = useRef(false);
  const prevIsHomeRef = useRef(isHome);
  const brandRef = useRef<HTMLDivElement>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const [hintPos, setHintPos] = useState<{ top: number; left: number } | null>(null);

  // Only show when transitioning FROM home → non-home, once per page load
  useEffect(() => {
    const wasHome = prevIsHomeRef.current;
    prevIsHomeRef.current = isHome;
    if (!isHome && wasHome && !seenHintRef.current) {
      seenHintRef.current = true;
      if (brandRef.current) {
        const r = brandRef.current.getBoundingClientRect();
        setHintPos({ top: r.bottom + 10, left: r.left });
      }
      setHintVisible(true);
    }
    if (isHome) setHintVisible(false);
  }, [isHome]);

  useEffect(() => {
    if (!hintVisible) return;
    const timer = setTimeout(() => setHintVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [hintVisible]);

  useEffect(() => {
    if (!user) { setUnread(0); setNotifications([]); return; }
    const fetch = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, message, is_read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      const rows = (data ?? []) as Notification[];
      setNotifications(rows);
      setUnread(rows.filter((n) => !n.is_read).length);
    };
    fetch();
    const channel = supabase
      .channel(`notif:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  };

  return (
    <>
    <header className="sticky top-0 z-40 px-4 py-3 pointer-events-none">
      <a href="#main" className="skip-link" style={{ pointerEvents: "auto" }}>
        {t("nav.skipToContent")}
      </a>
      <div className="max-w-3xl mx-auto flex items-center justify-between h-14 px-3 rounded-full bg-background/90 backdrop-blur-xl border border-border/50 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08),0_1px_4px_-1px_rgba(0,0,0,0.04)] pointer-events-auto">

        {/* Brand */}
        <div ref={brandRef} className="shrink-0">
          <Link to="/" className="flex items-center gap-2 font-bold text-base pl-1" onClick={() => setHintVisible(false)}>
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
              <Users className="h-3.5 w-3.5 text-white" strokeWidth={2} />
            </div>
            <span className="tracking-tight">Huddle</span>
          </Link>
        </div>

        {/* Center nav links — hidden on mobile */}
        <nav className="hidden md:flex items-center gap-0.5">
          <NavPill to="/about" icon={<Info className="h-3.5 w-3.5" strokeWidth={1.5} />} label={t("nav.about")} />
          <NavPill to="/discover" icon={<MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />} label={t("nav.discover")} />
          {user && (
            <NavPill to="/my-huddle" icon={<Bookmark className="h-3.5 w-3.5" strokeWidth={1.5} />} label={t("nav.myHuddle")} />
          )}
          {user && (
            <NavPill to="/business-dashboard" icon={<Building2 className="h-3.5 w-3.5" strokeWidth={1.5} />} label={t("nav.myBusinesses")} />
          )}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-1.5 pr-1">
          <AccessibilityPanel />
          {user && (
            <DropdownMenu open={bellOpen} onOpenChange={(o) => { setBellOpen(o); if (o) markAllRead(); }}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="relative h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" strokeWidth={1.5} />
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center px-1 tabular-nums">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 rounded-2xl p-1.5 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12)]">
                <div className="px-3 py-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{t("nav.notifications")}</p>
                </div>
                <DropdownMenuSeparator className="my-1" />
                {notifications.length === 0 ? (
                  <div className="px-3 py-5 text-center text-sm text-muted-foreground">{t("nav.noNotifications")}</div>
                ) : (
                  notifications.slice(0, 8).map((n) => (
                    <div
                      key={n.id}
                      className={`px-3 py-2.5 rounded-xl text-sm leading-snug ${n.is_read ? "text-muted-foreground" : "text-foreground font-medium bg-primary/5"}`}
                    >
                      {n.message}
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-normal">
                        {new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="rounded-full px-4 text-sm font-medium transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]"
                >
                  {t("nav.account")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12)]">
                <DropdownMenuItem asChild className="rounded-xl gap-2">
                  <Link to="/account"><UserCircle className="h-4 w-4" strokeWidth={1.5} /> {t("nav.myAccount")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl gap-2">
                  <Link to="/business-dashboard"><BarChart3 className="h-4 w-4" strokeWidth={1.5} /> {t("nav.myBusinesses")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl gap-2">
                  <Link to="/insights"><TrendingUp className="h-4 w-4" strokeWidth={1.5} /> {t("nav.myInsights")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl gap-2">
                  <Link to="/business/onboarding"><Plus className="h-4 w-4" strokeWidth={1.5} /> {t("nav.listBusiness")}</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild className="rounded-xl gap-2">
                    <Link to="/admin"><ShieldCheck className="h-4 w-4" strokeWidth={1.5} /> {t("nav.adminPanel")}</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  onClick={async () => { await signOut(); navigate("/"); }}
                  className="rounded-xl gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.5} /> {t("nav.signout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              asChild
              size="sm"
              className="rounded-full px-4 text-sm font-medium transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]"
            >
              <Link to="/auth">{t("nav.signin")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>

    {/* Home hint — portalled to body so backdrop-blur can't clip it */}
    {hintPos && createPortal(
      <div
        className={`fixed z-[9999] pointer-events-none select-none flex items-center gap-2 transition-all duration-500 ${
          hintVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
        }`}
        style={{ top: hintPos.top, left: hintPos.left }}
        aria-hidden={!hintVisible}
      >
        {/* Text pill */}
        <div className="rounded-xl border border-foreground/15 bg-background/90 backdrop-blur-sm shadow-md px-3 py-2 max-w-[108px]">
          <p className="text-[10.5px] italic text-foreground/65 leading-snug">
            {t("nav.homeHint")}
          </p>
        </div>

        {/* Curved arrow: tail bottom-left → tip upper-right */}
        <svg width="62" height="48" viewBox="0 0 62 48" fill="none" className="shrink-0 text-foreground/50" aria-hidden="true">
          <path d="M 3 38 Q 18 4 57 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 48 2 L 57 9 L 47 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>,
      document.body
    )}
  </>
  );
};

const NavPill = ({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) => (
  <Button
    asChild
    variant="ghost"
    size="sm"
    className="rounded-full gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-300"
  >
    <Link to={to}>
      {icon}
      {label}
    </Link>
  </Button>
);
