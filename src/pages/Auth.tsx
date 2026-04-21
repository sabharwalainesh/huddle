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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Users } from "lucide-react";
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

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
    const { error } = await supabase.auth.signUp({
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
    <main id="main" className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6 text-primary-foreground">
          <Users className="h-7 w-7" />
          <span className="text-2xl font-bold">Huddle</span>
        </Link>
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>{t("auth.welcome")}</CardTitle>
            <CardDescription>{t("auth.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t("auth.signIn")}</TabsTrigger>
                <TabsTrigger value="signup">{t("auth.signUp")}</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="si-email">{t("auth.email")}</Label>
                    <Input id="si-email" name="email" type="email" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="si-password">{t("auth.password")}</Label>
                    <Input id="si-password" name="password" type="password" required />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t("auth.signingIn") : t("auth.signIn")}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="su-name">{t("auth.displayName")}</Label>
                    <Input id="su-name" name="displayName" required maxLength={50} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-email">{t("auth.email")}</Label>
                    <Input id="su-email" name="email" type="email" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-password">{t("auth.password")}</Label>
                    <Input id="su-password" name="password" type="password" required minLength={8} />
                  </div>
                  <div className="flex items-start gap-3 rounded-md border p-3 bg-muted/30">
                    <Checkbox
                      id="owns-business"
                      checked={ownsBusiness}
                      onCheckedChange={(c) => setOwnsBusiness(Boolean(c))}
                      className="mt-0.5"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="owns-business" className="cursor-pointer font-medium">
                        {t("auth.ownsBusiness")}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t("auth.ownsBusinessHint")}
                      </p>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t("auth.creating") : t("auth.createAccount")}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Auth;
