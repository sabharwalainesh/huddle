import { Footer } from "@/components/Footer";
import { Cookie } from "lucide-react";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
    <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">{children}</div>
  </div>
);

const CookieRow = ({ name, type, purpose, duration }: { name: string; type: string; purpose: string; duration: string }) => (
  <tr className="border-b border-border/50 last:border-0">
    <td className="py-3 pr-4 font-mono text-xs text-foreground align-top">{name}</td>
    <td className="py-3 pr-4 text-xs align-top whitespace-nowrap">{type}</td>
    <td className="py-3 pr-4 text-xs align-top">{purpose}</td>
    <td className="py-3 text-xs align-top whitespace-nowrap">{duration}</td>
  </tr>
);

const Cookies = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <section className="relative overflow-hidden border-b">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-accent/8" />
      <div className="container py-16 md:py-24">
        <div className="max-w-2xl space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            <Cookie className="h-3 w-3" /> Legal
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Cookie Policy</h1>
          <p className="text-muted-foreground text-lg">Last updated: June 26, 2026</p>
        </div>
      </div>
    </section>

    <main id="main" className="container py-16 flex-1">
      <div className="max-w-2xl space-y-10">

        <Section title="What Are Cookies">
          <p>
            Cookies are small text files stored on your device when you visit a website. They help the site remember
            your preferences and keep you signed in. Huddle uses a minimal set of cookies — only what is necessary to
            operate the service.
          </p>
        </Section>

        <Section title="Cookies We Use">
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="px-0 py-2.5 pr-4 pl-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/60">Name</th>
                  <th className="py-2.5 pr-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/60">Type</th>
                  <th className="py-2.5 pr-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/60">Purpose</th>
                  <th className="py-2.5 pr-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/60">Duration</th>
                </tr>
              </thead>
              <tbody className="pl-4">
                <CookieRow
                  name="sb-*-auth-token"
                  type="Essential"
                  purpose="Supabase authentication session — keeps you signed in"
                  duration="1 week"
                />
                <CookieRow
                  name="sb-*-auth-token-code-verifier"
                  type="Essential"
                  purpose="PKCE OAuth flow security token"
                  duration="Session"
                />
                <CookieRow
                  name="_GRECAPTCHA"
                  type="Security"
                  purpose="Google reCAPTCHA v2 — bot detection on review and verification forms"
                  duration="6 months"
                />
                <CookieRow
                  name="homeHintShown"
                  type="Functional"
                  purpose="sessionStorage flag — prevents home-hint tooltip from showing more than once"
                  duration="Session"
                />
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground/70">
            Note: <code className="bg-muted rounded px-1 py-0.5">homeHintShown</code> is stored in sessionStorage (not
            a cookie) and is cleared automatically when you close the browser tab.
          </p>
        </Section>

        <Section title="Third-Party Cookies">
          <p>
            Some third-party services we use may set their own cookies:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-foreground">Google reCAPTCHA</strong> — sets <code className="bg-muted rounded px-1 py-0.5">_GRECAPTCHA</code> to
              distinguish humans from bots. Governed by{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                Google's Privacy Policy
              </a>.
            </li>
            <li>
              <strong className="text-foreground">Mapbox</strong> — may set analytics cookies when rendering maps. Governed by{" "}
              <a href="https://www.mapbox.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                Mapbox's Privacy Policy
              </a>.
            </li>
            <li>
              <strong className="text-foreground">Vercel Speed Insights</strong> — collects anonymous performance metrics. No
              personally identifiable information is collected.
            </li>
          </ul>
        </Section>

        <Section title="How to Control Cookies">
          <p>
            You can control or delete cookies through your browser settings. Blocking essential cookies (Supabase auth)
            will prevent you from signing in. Non-essential cookies (reCAPTCHA, Mapbox) can be blocked without
            affecting core browsing functionality.
          </p>
          <p>Browser cookie settings guides:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Chrome</a></li>
            <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Firefox</a></li>
            <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Safari</a></li>
          </ul>
        </Section>

        <Section title="Changes to This Policy">
          <p>
            We may update this Cookie Policy as we add or remove services. Check this page periodically for updates.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions? Email us at{" "}
            <a href="mailto:hello@huddle.local" className="text-primary underline underline-offset-2">hello@huddle.local</a>.
          </p>
        </Section>

      </div>
    </main>
    <Footer />
  </div>
);

export default Cookies;
