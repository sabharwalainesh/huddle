import { Footer } from "@/components/Footer";
import { FileText } from "lucide-react";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
    <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">{children}</div>
  </div>
);

const Terms = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <section className="relative overflow-hidden border-b">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-accent/8" />
      <div className="container py-16 md:py-24">
        <div className="max-w-2xl space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            <FileText className="h-3 w-3" /> Legal
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-muted-foreground text-lg">Last updated: June 26, 2026</p>
        </div>
      </div>
    </section>

    <main id="main" className="container py-16 flex-1">
      <div className="max-w-2xl space-y-10">

        <Section title="Acceptance of Terms">
          <p>
            By accessing or using Huddle ("the Platform"), you agree to be bound by these Terms of Service. If you do
            not agree, do not use the Platform. These terms apply to all visitors, users, and business owners.
          </p>
        </Section>

        <Section title="Eligibility">
          <p>
            You must be at least 13 years old to use Huddle. By using the Platform you represent that you meet this
            requirement. Business owners must be authorized to represent the business they list.
          </p>
        </Section>

        <Section title="User Accounts">
          <p>You are responsible for keeping your account credentials secure. You agree to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide accurate information when registering</li>
            <li>Not share your credentials with others</li>
            <li>Notify us immediately if you suspect unauthorized access</li>
          </ul>
          <p>We reserve the right to suspend or terminate accounts that violate these terms.</p>
        </Section>

        <Section title="Business Listings">
          <p>
            Business owners who register a listing on Huddle agree that all information provided — name, address,
            hours, photos, and description — is accurate and they are authorized to represent the business.
          </p>
          <p>
            Huddle may remove or suspend listings that contain false information, violate applicable laws, or are
            reported as fraudulent. Verification documents submitted to Huddle are used solely to confirm legitimate
            business ownership and are not shared publicly.
          </p>
        </Section>

        <Section title="Reviews &amp; User Content">
          <p>By submitting a review, photo, or other content, you agree that:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Your content is your original work and does not infringe any third-party rights</li>
            <li>Your review reflects a genuine experience with the business</li>
            <li>You will not post defamatory, hateful, or spam content</li>
            <li>You grant Huddle a non-exclusive license to display your content on the Platform</li>
          </ul>
          <p>
            Huddle may remove any content that violates these terms at its discretion.
          </p>
        </Section>

        <Section title="Prohibited Conduct">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use the Platform for any unlawful purpose</li>
            <li>Submit fake reviews, ratings, or verification documents</li>
            <li>Attempt to manipulate business ratings or rankings</li>
            <li>Scrape, crawl, or harvest data from the Platform without permission</li>
            <li>Circumvent any bot-prevention or security measures</li>
            <li>Impersonate another person or business</li>
          </ul>
        </Section>

        <Section title="Deals &amp; Coupons">
          <p>
            Business owners are solely responsible for the accuracy and redemption of deals and coupons posted on their
            listing. Huddle does not guarantee that deals will be honored and is not liable for any dispute arising
            from coupon redemption.
          </p>
        </Section>

        <Section title="AI Features">
          <p>
            Huddle uses AI (Ask Huddle) to answer questions about local businesses and provide recommendations.
            AI-generated responses may be inaccurate. Do not rely solely on AI responses for safety-critical or
            financial decisions. Huddle disclaims liability for errors in AI-generated content.
          </p>
        </Section>

        <Section title="Disclaimers &amp; Limitation of Liability">
          <p>
            The Platform is provided "as is" without warranties of any kind. Huddle is not responsible for the accuracy
            of business listings, user reviews, or third-party data (including Google Places). To the maximum extent
            permitted by law, Huddle's total liability for any claim arising out of use of the Platform is limited to
            $0 (the Platform is provided free of charge).
          </p>
        </Section>

        <Section title="Changes to Terms">
          <p>
            We may modify these Terms at any time. Material changes will be communicated via in-app notification.
            Continued use after the effective date constitutes acceptance of the updated Terms.
          </p>
        </Section>

        <Section title="Governing Law">
          <p>
            These Terms are governed by the laws of the State of New York, without regard to conflict of law
            principles.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these Terms? Email us at{" "}
            <a href="mailto:hello@huddle.local" className="text-primary underline underline-offset-2">hello@huddle.local</a>.
          </p>
        </Section>

      </div>
    </main>
    <Footer />
  </div>
);

export default Terms;
