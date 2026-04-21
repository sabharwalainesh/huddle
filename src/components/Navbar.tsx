import { Link, useNavigate } from "react-router-dom";
import { Users, LogOut, Plus, Bookmark, BarChart3, Sparkles, ShieldCheck, UserCircle } from "lucide-react";
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

  return (
    <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-40">
      <a href="#main" className="skip-link">{t("nav.skipToContent")}</a>
      <div className="container flex items-center justify-between h-16 gap-2">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <Users className="h-6 w-6 text-primary" />
          <span>Huddle</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/ask"><Sparkles className="h-4 w-4" /> <span className="hidden sm:inline">{t("nav.ask")}</span></Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard"><BarChart3 className="h-4 w-4" /> <span className="hidden sm:inline">{t("nav.insights")}</span></Link>
          </Button>
          <AccessibilityPanel />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">{t("nav.account")}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild>
                  <Link to="/account"><UserCircle className="h-4 w-4" /> {t("nav.myAccount")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/my-huddle"><Bookmark className="h-4 w-4" /> {t("nav.myHuddle")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/business/onboarding"><Plus className="h-4 w-4" /> {t("nav.listBusiness")}</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin"><ShieldCheck className="h-4 w-4" /> {t("nav.adminPanel")}</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await signOut(); navigate("/"); }}>
                  <LogOut className="h-4 w-4" /> {t("nav.signout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">{t("nav.signin")}</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
};
