import { Link } from "react-router-dom";
import { Users, Mail, MapPin, Twitter, Instagram, Facebook, Github, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export const Footer = () => {
  const year = new Date().getFullYear();

  const onSubscribe = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      toast({ title: "Enter a valid email", variant: "destructive" });
      return;
    }
    toast({ title: "You're on the list", description: "We'll send a monthly local roundup." });
    e.currentTarget.reset();
  };

  return (
    <footer className="mt-16">
      {/* CTA strip */}
      <div className="bg-gradient-hero text-primary-foreground">
        <div className="container py-12 flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Own a local business?</h2>
            <p className="text-sm opacity-80 font-medium">List on Huddle in minutes — free for local owners.</p>
          </div>
          <Button
            asChild
            variant="secondary"
            size="lg"
            className="rounded-full pl-7 pr-2.5 gap-3 self-start md:self-auto group whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
          >
            <Link to="/business/onboarding">
              List your business
              <span className="h-8 w-8 rounded-full bg-foreground/8 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105">
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Main body */}
      <div className="border-t bg-muted/15">
        <div className="container py-16 grid gap-12 md:grid-cols-12">

          {/* Brand + contact */}
          <div className="md:col-span-4 space-y-5">
            <Link to="/" className="flex items-center gap-2 font-bold text-base">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
                <Users className="h-3.5 w-3.5 text-white" strokeWidth={2} />
              </div>
              <span className="tracking-tight">Huddle</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[26ch]">
              Discover and support local businesses. Real reviews from real neighbors.
            </p>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/60" strokeWidth={1.5} />
                <span>Brooklyn, NY 11201</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-3.5 w-3.5 shrink-0 text-primary/60" strokeWidth={1.5} />
                <a href="mailto:hello@huddle.local" className="hover:text-foreground transition-colors duration-200">
                  hello@huddle.local
                </a>
              </li>
            </ul>
          </div>

          {/* Explore links */}
          <div className="md:col-span-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/50 mb-4">
              Explore
            </h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {[
                { to: "/", label: "Home" },
                { to: "/ask", label: "Ask Huddle" },
                { to: "/my-huddle", label: "My Huddle" },
                { to: "/about", label: "About" },
              ].map((l) => (
                <li key={l.to + l.label}>
                  <Link to={l.to} className="hover:text-foreground transition-colors duration-200">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Business links */}
          <div className="md:col-span-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/50 mb-4">
              For business
            </h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {[
                { to: "/business/onboarding", label: "List your business" },
                { to: "/insights", label: "Owner insights" },
                { to: "/account", label: "Account" },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="hover:text-foreground transition-colors duration-200">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="md:col-span-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/50 mb-4">
              Local roundup
            </h3>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              One email a month. New spots, neighbor picks, no spam.
            </p>
            <form onSubmit={onSubscribe} className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="footer-email" className="sr-only">Email address</Label>
                <Input
                  id="footer-email"
                  name="email"
                  type="email"
                  placeholder="you@neighborhood.com"
                  required
                  className="rounded-full text-sm"
                />
              </div>
              <Button type="submit" className="rounded-full px-5 text-sm shrink-0">
                Subscribe
              </Button>
            </form>
            <div className="flex items-center gap-1.5 mt-5">
              <SocialLink href="https://twitter.com" label="Twitter">
                <Twitter className="h-3.5 w-3.5" strokeWidth={1.5} />
              </SocialLink>
              <SocialLink href="https://instagram.com" label="Instagram">
                <Instagram className="h-3.5 w-3.5" strokeWidth={1.5} />
              </SocialLink>
              <SocialLink href="https://facebook.com" label="Facebook">
                <Facebook className="h-3.5 w-3.5" strokeWidth={1.5} />
              </SocialLink>
              <SocialLink href="https://github.com" label="GitHub">
                <Github className="h-3.5 w-3.5" strokeWidth={1.5} />
              </SocialLink>
            </div>
          </div>
        </div>

        {/* Legal bar */}
        <div className="border-t">
          <div className="container py-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-xs text-muted-foreground">
            <p>© {year} Huddle. All rights reserved.</p>
            <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-1">
              {["Privacy Policy", "Terms of Service", "Cookie Policy", "Accessibility"].map((item) => (
                <Link key={item} to="/about" className="hover:text-foreground transition-colors duration-200">
                  {item}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
};

const SocialLink = ({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    className="h-8 w-8 grid place-items-center rounded-full border border-border/60 bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
  >
    {children}
  </a>
);
