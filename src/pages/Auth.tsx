import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/contexts/A11yContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Users, MapPin, Star, ArrowRight, Eye, EyeOff, MessageSquare } from "lucide-react";
import { RecaptchaBox } from "@/components/RecaptchaBox";

const signUpSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z
    .string()
    .min(8, "At least 8 characters required")
    .max(72, "Password too long")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  displayName: z
    .string()
    .trim()
    .min(2, "At least 2 characters required")
    .max(50, "50 characters max")
    .regex(/[a-zA-Z]/, "Must contain at least one letter"),
});

const signInSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(1, "Password required").max(72),
});

type SignUpForm = z.infer<typeof signUpSchema>;
type SignInForm = z.infer<typeof signInSchema>;

// Compute password strength score 0-4 based on: length>=8, uppercase, lowercase, digit
function passwordStrength(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  return score;
}

const strengthColors = ["bg-destructive", "bg-destructive", "bg-amber-400", "bg-amber-400", "bg-emerald-500"];
const strengthLabels = ["", "Weak", "Weak", "Fair", "Strong"];

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [ownsBusiness, setOwnsBusiness] = useState(false);
  const [signInHuman, setSignInHuman] = useState(false);
  const [signUpHuman, setSignUpHuman] = useState(false);
  const [heroStats, setHeroStats] = useState<{ businesses: number; reviews: number } | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("businesses").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("reviews").select("id", { count: "exact", head: true }),
    ]).then(([bRes, rRes]) => {
      setHeroStats({ businesses: bRes.count ?? 0, reviews: rRes.count ?? 0 });
    });
  }, []);

  const signUpForm = useForm<SignUpForm>({ resolver: zodResolver(signUpSchema) });
  const signInForm = useForm<SignInForm>({ resolver: zodResolver(signInSchema) });

  const {
    register: registerUp,
    handleSubmit: handleSubmitUp,
    watch: watchUp,
    formState: { errors: errorsUp },
  } = signUpForm;

  const {
    register: registerIn,
    handleSubmit: handleSubmitIn,
    formState: { errors: errorsIn },
  } = signInForm;

  const signUpPassword = watchUp("password") ?? "";
  const [showSignInPw, setShowSignInPw] = useState(false);
  const [showSignUpPw, setShowSignUpPw] = useState(false);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
  };

  const handleSignUp = handleSubmitUp(async (data) => {
    if (!signUpHuman) {
      toast({ title: "Please confirm you're not a robot", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          display_name: data.displayName,
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
  });

  const handleSignIn = handleSubmitIn(async (data) => {
    if (!signInHuman) {
      toast({ title: "Please confirm you're not a robot", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
      return;
    }
    navigate("/");
  });

  const pwScore = passwordStrength(signUpPassword);

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
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-3.5 py-1.5 text-sm font-medium">
              <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              {heroStats
                ? `${heroStats.businesses.toLocaleString()} local business${heroStats.businesses !== 1 ? "es" : ""} — & more to come`
                : "Local businesses — & more to come"}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-3.5 py-1.5 text-sm font-medium">
              <MessageSquare className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              {heroStats
                ? `${heroStats.reviews.toLocaleString()} real review${heroStats.reviews !== 1 ? "s" : ""}`
                : "Real reviews"}
            </div>
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
                    type="email"
                    {...registerIn("email")}
                    className="rounded-xl h-11"
                    placeholder="you@example.com"
                  />
                  {errorsIn.email && (
                    <p className="text-[11px] text-destructive font-medium mt-1">{errorsIn.email.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="si-password" className="text-sm font-medium">{t("auth.password")}</Label>
                  <div className="relative">
                    <Input
                      id="si-password"
                      type={showSignInPw ? "text" : "password"}
                      {...registerIn("password")}
                      className="rounded-xl h-11 pr-11"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showSignInPw ? "Hide password" : "Show password"}
                    >
                      {showSignInPw ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                    </button>
                  </div>
                  {errorsIn.password && (
                    <p className="text-[11px] text-destructive font-medium mt-1">{errorsIn.password.message}</p>
                  )}
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
                    {...registerUp("displayName")}
                    className="rounded-xl h-11"
                    placeholder="Your name"
                  />
                  {errorsUp.displayName && (
                    <p className="text-[11px] text-destructive font-medium mt-1">{errorsUp.displayName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-email" className="text-sm font-medium">{t("auth.email")}</Label>
                  <Input
                    id="su-email"
                    type="email"
                    {...registerUp("email")}
                    className="rounded-xl h-11"
                    placeholder="you@example.com"
                  />
                  {errorsUp.email && (
                    <p className="text-[11px] text-destructive font-medium mt-1">{errorsUp.email.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-password" className="text-sm font-medium">{t("auth.password")}</Label>
                  <div className="relative">
                    <Input
                      id="su-password"
                      type={showSignUpPw ? "text" : "password"}
                      {...registerUp("password")}
                      className="rounded-xl h-11 pr-11"
                      placeholder="8+ characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showSignUpPw ? "Hide password" : "Show password"}
                    >
                      {showSignUpPw ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                    </button>
                  </div>
                  {errorsUp.password && (
                    <p className="text-[11px] text-destructive font-medium mt-1">{errorsUp.password.message}</p>
                  )}
                  {/* Password strength bar */}
                  {signUpPassword.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <div className="flex gap-1">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                              i < pwScore ? strengthColors[pwScore] : "bg-border"
                            }`}
                          />
                        ))}
                      </div>
                      {pwScore > 0 && (
                        <p className={`text-[11px] font-medium ${pwScore >= 4 ? "text-emerald-600" : pwScore >= 3 ? "text-amber-600" : "text-destructive"}`}>
                          {strengthLabels[pwScore]}
                        </p>
                      )}
                    </div>
                  )}
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
