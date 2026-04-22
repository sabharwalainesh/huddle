import { Link, useLocation, useNavigate } from "react-router-dom";
import { Users, LogOut, Plus, Bookmark, BarChart3, ShieldCheck, UserCircle, Info, Home } from "lucide-react";
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

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRoles();
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <header className="sticky top-0 z-40 px-4 py-3 pointer-events-none">
      <a href="#main" className="skip-link" style={{ pointerEvents: "auto" }}>
        {t("nav.skipToContent")}
      </a>
      <div className="max-w-3xl mx-auto flex items-center justify-between h-14 px-3 rounded-full bg-background/90 backdrop-blur-xl border border-border/50 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08),0_1px_4px_-1px_rgba(0,0,0,0.04)] pointer-events-auto">

        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 font-bold text-base pl-1 shrink-0">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
            <Users className="h-3.5 w-3.5 text-white" strokeWidth={2} />
          </div>
          <span className="tracking-tight">Huddle</span>
        </Link>

        {/* Center nav links — hidden on mobile */}
        <nav className="hidden md:flex items-center gap-0.5">
          {!isHome && (
            <NavPill to="/" icon={<Home className="h-3.5 w-3.5" strokeWidth={1.5} />} label="Home" />
          )}
          {user && (
            <NavPill
              to={isAdmin ? "/dashboard" : "/insights"}
              icon={<BarChart3 className="h-3.5 w-3.5" strokeWidth={1.5} />}
              label={t("nav.insights")}
            />
          )}
          <NavPill to="/about" icon={<Info className="h-3.5 w-3.5" strokeWidth={1.5} />} label="About" />
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-1.5 pr-1">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden md:inline-flex rounded-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-300"
          >
            <Link to="/discover">Discover</Link>
          </Button>
          <AccessibilityPanel />
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
                  <Link to="/my-huddle"><Bookmark className="h-4 w-4" strokeWidth={1.5} /> {t("nav.myHuddle")}</Link>
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
