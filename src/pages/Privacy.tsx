import { Footer } from "@/components/Footer";
import { Shield } from "lucide-react";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
    <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">{children}</div>
  </div>
);

const Privacy = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <section className="relative overflow-hidden border-b">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-accent/8" />
      <div className="container py-16 md:py-24">
        <div className="max-w-2xl space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            <Shield className="h-3 w-3" /> Legal
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-muted-foreground text-lg">Last updated: June 26, 2026</p>
        </div>
      </div>
    </section>

    <main id="main" className="container py-16 flex-1">
      <div className="max-w-2xl space-y-10">

        <Section title="Overview">
          <p>
            Huddle ("we," "us," or "our") is committed to protecting your personal information. This Privacy Policy
            explains what data we collect, how we use it, and what rights you have over it. By using Huddle, you agree
            to the practices described here.
          </p>
        </Section>

        <Section title="Information We Collect">
          <p><strong className="text-foreground">Account data</strong> — When you sign up, we collect your email address and a
          display name of your choosing. This is stored securely via Supabase Auth.</p>
          <p><strong className="text-foreground">Business listings</strong> — If you register a business, we collect the business
          name, address, phone number, website, hours, photos, and any other details you provide.</p>
          <p><strong className="text-foreground">Reviews &amp; ratings</strong> — Reviews you write are stored with your user ID
          and made publicly visible on the relevant business page.</p>
          <p><strong className="text-foreground">Photos</strong> — Community photos you upload are stored in Supabase Storage and
          displayed publicly.</p>
          <p><strong className="text-foreground">Usage data</strong> — We log business page views (anonymous counts) to power the
          Insights dashboard for business owners. No personal browsing history is sold or shared.</p>
          <p><strong className="text-foreground">Location</strong> — If you enable location access in your browser, we use it
          solely to sort nearby businesses. We do not store your coordinates.</p>
        </Section>

        <Section title="How We Use Your Information">
          <p>We use the data we collect to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide and improve the Huddle platform</li>
            <li>Display your reviews, ratings, and saved businesses</li>
            <li>Send transactional notifications (new deals, verification updates)</li>
            <li>Give business owners anonymized analytics about their listings</li>
            <li>Prevent spam and fraudulent activity via reCAPTCHA and document verification</li>
          </ul>
          <p>We do not sell your personal data to third parties.</p>
        </Section>

        <Section title="Data Storage &amp; Security">
          <p>
            All data is stored in Supabase (PostgreSQL) with Row-Level Security (RLS) policies ensuring users can only
            access data they are authorized to see. Data is encrypted at rest and in transit (TLS).
          </p>
          <p>
            Authentication tokens are stored in secure, httpOnly session cookies managed by Supabase Auth.
          </p>
        </Section>

        <Section title="Third-Party Services">
          <p>Huddle uses the following third-party services, each with their own privacy practices:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-foreground">Supabase</strong> — database, auth, storage</li>
            <li><strong className="text-foreground">Google Maps / Places API</strong> — business search and address autocomplete</li>
            <li><strong className="text-foreground">Google reCAPTCHA v2</strong> — bot prevention on review and verification forms</li>
            <li><strong className="text-foreground">Mapbox</strong> — map rendering on business detail pages</li>
            <li><strong className="text-foreground">Google Gemini AI</strong> — AI-powered Q&A, review themes, and receipt verification</li>
            <li><strong className="text-foreground">Vercel</strong> — hosting and edge network</li>
          </ul>
        </Section>

        <Section title="Your Rights">
          <p>You may at any time:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Access and download your account data from the Account settings page</li>
            <li>Delete your reviews or photos from the relevant business pages</li>
            <li>Delete your account entirely by contacting us at <a href="mailto:hello@huddle.local" className="text-primary underline underline-offset-2">hello@huddle.local</a></li>
          </ul>
          <p>Account deletion removes all personally identifiable data within 30 days.</p>
        </Section>

        <Section title="Children's Privacy">
          <p>
            Huddle is not directed at children under 13. We do not knowingly collect personal information from children
            under 13. If you believe a child has provided us personal data, contact us immediately.
          </p>
        </Section>

        <Section title="Changes to This Policy">
          <p>
            We may update this policy from time to time. We will notify registered users of material changes via
            in-app notification. Continued use of Huddle after changes constitutes acceptance.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this policy? Email us at{" "}
            <a href="mailto:hello@huddle.local" className="text-primary underline underline-offset-2">hello@huddle.local</a>.
          </p>
        </Section>

      </div>
    </main>
    <Footer />
  </div>
);

export default Privacy;
