import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/contexts/A11yContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Users, MapPin, Star, ArrowRight } from "lucide-react";
import { RecaptchaBox } from "@/components/RecaptchaBox";

const signUpSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
  displayName: z.string().trim().min(2, "At least 2 characters").max(50),
});
const signInSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(1, "Password required").max(72),
});

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [ownsBusiness, setOwnsBusiness] = useState(false);
  const [signInHuman, setSignInHuman] = useState(false);
  const [signUpHuman, setSignUpHuman] = useState(false);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!signUpHuman) {
      toast({ title: "Please confirm you're not a robot", variant: "destructive" });
      return;
    }
    const form = new FormData(e.currentTarget);
    const data = {
      email: String(form.get("email")),
      password: String(form.get("password")),
      displayName: String(form.get("displayName")),
    };
    const parsed = signUpSchema.safeParse(data);
    if (!parsed.success) {
      toast({ title: "Check your inputs", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          display_name: parsed.data.displayName,
          owns_business: ownsBusiness,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      return;
    }
    // session is null when Supabase requires email confirmation
    if (!signUpData.session) {
      toast({
        title: "Check your email",
        description: "We sent you a confirmation link. Click it to finish creating your account.",
      });
      return;
    }
    if (ownsBusiness) {
      toast({ title: "Account created", description: "Let's set up your business listing." });
      navigate("/business/onboarding");
    } else {
      toast({ title: "Welcome to Huddle!" });
      navigate("/");
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!signInHuman) {
      toast({ title: "Please confirm you're not a robot", variant: "destructive" });
      return;
    }
    const form = new FormData(e.currentTarget);
    const data = { email: String(form.get("email")), password: String(form.get("password")) };
    const parsed = signInSchema.safeParse(data);
    if (!parsed.success) {
      toast({ title: "Check your inputs", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
      return;
    }
    navigate("/");
  };

  return (
    <main id="main" className="min-h-[100dvh] bg-background flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-gradient-hero flex-col justify-between p-14">
        {/* Ambient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white/10 blur-[80px] -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/8 blur-[60px] translate-y-1/4 -translate-x-1/4" />
        </div>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 text-primary-foreground relative z-10">
          <div className="h-9 w-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
            <Users className="h-4.5 w-4.5" strokeWidth={2} />
          </div>
          <span className="text-xl font-bold tracking-tight">Huddle</span>
        </Link>

        {/* Tagline */}
        <div className="relative z-10 space-y-6 text-primary-foreground">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-[1.1]">
            Your neighborhood,<br />all in one place.
          </h2>
          <p className="text-base opacity-80 leading-relaxed max-w-sm">
            Discover, review, and support the local businesses that make your block worth living on.
          </p>

          {/* Mini stat pills */}
          <div className="flex flex-wrap gap-2.5 pt-2">
            {[
              { icon: MapPin, label: "2,847 local businesses" },
              { icon: Star, label: "14k+ real reviews" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-3.5 py-1.5 text-sm font-medium"
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-base lg:hidden">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-white" strokeWidth={2} />
            </div>
            <span className="tracking-tight">Huddle</span>
          </Link>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">{t("auth.welcome")}</h1>
            <p className="text-sm text-muted-foreground">{t("auth.subtitle")}</p>
          </div>

          {/* Google sign-in */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full h-11 rounded-full border border-border/60 bg-background hover:bg-muted/40 flex items-center justify-center gap-3 text-sm font-medium transition-all duration-300 active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-border/60" />
            <span className="text-[11px] text-muted-foreground uppercase tracking-[0.12em]">or</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          <Tabs
            defaultValue="signin"
            className="space-y-6"
            onValueChange={() => { setSignInHuman(false); setSignUpHuman(false); }}
          >
            <TabsList className="grid w-full grid-cols-2 rounded-full p-1 h-11 bg-muted/60 border border-border/50">
              <TabsTrigger
                value="signin"
                className="rounded-full text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)]"
              >
                {t("auth.signIn")}
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="rounded-full text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)]"
              >
                {t("auth.signUp")}
              </TabsTrigger>
            </TabsList>

            {/* Sign In */}
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="si-email" className="text-sm font-medium">{t("auth.email")}</Label>
                  <Input
                    id="si-email"
                    name="email"
                    type="email"
                    required
                    className="rounded-xl h-11"
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="si-password" className="text-sm font-medium">{t("auth.password")}</Label>
                  <Input
                    id="si-password"
                    name="password"
                    type="password"
                    required
                    className="rounded-xl h-11"
                    placeholder="••••••••"
                  />
                </div>
                <RecaptchaBox onVerifiedChange={setSignInHuman} />
                <Button
                  type="submit"
                  className="w-full rounded-full h-11 pl-6 pr-2 gap-3 group transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                  disabled={loading || !signInHuman}
                >
                  {loading ? t("auth.signingIn") : t("auth.signIn")}
                  {!loading && (
                    <span className="h-7 w-7 rounded-full bg-primary-foreground/20 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105 ml-auto">
                      <ArrowRight className="h-3 w-3" strokeWidth={2} />
                    </span>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Sign Up */}
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="su-name" className="text-sm font-medium">{t("auth.displayName")}</Label>
                  <Input
                    id="su-name"
                    name="displayName"
                    required
                    maxLength={50}
                    className="rounded-xl h-11"
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-email" className="text-sm font-medium">{t("auth.email")}</Label>
                  <Input
                    id="su-email"
                    name="email"
                    type="email"
                    required
                    className="rounded-xl h-11"
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-password" className="text-sm font-medium">{t("auth.password")}</Label>
                  <Input
                    id="su-password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    className="rounded-xl h-11"
                    placeholder="8+ characters"
                  />
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4">
                  <Checkbox
                    id="owns-business"
                    checked={ownsBusiness}
                    onCheckedChange={(c) => setOwnsBusiness(Boolean(c))}
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="owns-business" className="cursor-pointer font-medium text-sm">
                      {t("auth.ownsBusiness")}
                    </Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t("auth.ownsBusinessHint")}
                    </p>
                  </div>
                </div>
                <RecaptchaBox onVerifiedChange={setSignUpHuman} />
                <Button
                  type="submit"
                  className="w-full rounded-full h-11 pl-6 pr-2 gap-3 group transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                  disabled={loading || !signUpHuman}
                >
                  {loading ? t("auth.creating") : t("auth.createAccount")}
                  {!loading && (
                    <span className="h-7 w-7 rounded-full bg-primary-foreground/20 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105 ml-auto">
                      <ArrowRight className="h-3 w-3" strokeWidth={2} />
                    </span>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
};

export default Auth;
