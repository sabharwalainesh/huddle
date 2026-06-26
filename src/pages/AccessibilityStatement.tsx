import { Footer } from "@/components/Footer";
import { Accessibility } from "lucide-react";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
    <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">{children}</div>
  </div>
);

const AccessibilityStatement = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <section className="relative overflow-hidden border-b">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-accent/8" />
      <div className="container py-16 md:py-24">
        <div className="max-w-2xl space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            <Accessibility className="h-3 w-3" /> Legal
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Accessibility Statement</h1>
          <p className="text-muted-foreground text-lg">Last updated: June 26, 2026</p>
        </div>
      </div>
    </section>

    <main id="main" className="container py-16 flex-1">
      <div className="max-w-2xl space-y-10">

        <Section title="Our Commitment">
          <p>
            Huddle is committed to making our platform accessible to everyone, including people with disabilities. We
            aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA. Accessibility is not an
            afterthought — it is a core part of how we design and build every feature.
          </p>
        </Section>

        <Section title="Built-In Accessibility Controls">
          <p>
            Every page on Huddle includes an Accessibility Panel (the eye icon in the navigation bar) that lets you
            customize your experience:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-foreground">Font size</strong> — increase text size up to 150% without breaking the layout</li>
            <li><strong className="text-foreground">High contrast mode</strong> — boosts color contrast for users with low vision</li>
            <li><strong className="text-foreground">Language</strong> — switch the interface between English, Spanish, French, and Chinese</li>
          </ul>
          <p>Your preferences are saved locally and persist across sessions.</p>
        </Section>

        <Section title="Keyboard Navigation">
          <p>
            Huddle is fully navigable by keyboard. All interactive elements — buttons, links, form fields, dropdowns —
            are reachable and operable using Tab, Enter, Space, and arrow keys. A visible "Skip to content" link
            appears at the top of every page for keyboard users.
          </p>
        </Section>

        <Section title="Screen Reader Support">
          <p>
            We use semantic HTML5 elements, ARIA labels, and roles throughout the application to support screen
            readers such as NVDA, JAWS, and VoiceOver. Key areas tested include:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Navigation bar and dropdown menus</li>
            <li>Business search and filter controls</li>
            <li>Star rating inputs and review forms</li>
            <li>Notification badges and live regions</li>
            <li>Map and photo gallery alt text</li>
          </ul>
        </Section>

        <Section title="Color &amp; Contrast">
          <p>
            Text and interactive elements meet or exceed the WCAG 2.1 AA contrast ratio of 4.5:1 for normal text and
            3:1 for large text. High contrast mode raises these ratios further. We do not rely on color alone to convey
            information.
          </p>
        </Section>

        <Section title="Forms &amp; Input Validation">
          <p>
            All form fields include visible labels and descriptive error messages. Errors are communicated both visually
            and via ARIA live regions so screen reader users receive the same feedback.
          </p>
        </Section>

        <Section title="Images &amp; Media">
          <p>
            Decorative images use empty <code className="bg-muted rounded px-1 py-0.5">alt=""</code> attributes. Business
            photos uploaded by users are given contextual alt text where possible. Icons used as buttons always carry
            an <code className="bg-muted rounded px-1 py-0.5">aria-label</code>.
          </p>
        </Section>

        <Section title="Known Limitations">
          <p>
            We are continuously improving. Known areas we are working on:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>The interactive Mapbox map has limited screen reader support; a text-based address is always shown as an alternative</li>
            <li>Some third-party embedded content (Google reCAPTCHA) may not fully meet WCAG 2.1 AA</li>
          </ul>
        </Section>

        <Section title="Feedback &amp; Contact">
          <p>
            We welcome feedback on the accessibility of Huddle. If you experience any barrier or have suggestions,
            please email us at{" "}
            <a href="mailto:hello@huddle.local" className="text-primary underline underline-offset-2">hello@huddle.local</a>.
            We aim to respond within 2 business days and will make reasonable efforts to provide the information or
            functionality you need through an alternative means while we work on a fix.
          </p>
        </Section>

        <Section title="Standards &amp; Assessment">
          <p>
            This statement was prepared on June 26, 2026. Huddle assesses accessibility through self-evaluation and
            peer review. We plan to conduct an independent third-party audit as the platform grows.
          </p>
        </Section>

      </div>
    </main>
    <Footer />
  </div>
);

export default AccessibilityStatement;
