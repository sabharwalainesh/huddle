import { Link } from "react-router-dom";
import { Users, Mail, Phone, MapPin, Twitter, Instagram, Facebook, Github, ArrowUpRight } from "lucide-react";
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
    <footer className="border-t bg-muted/30 mt-12">
      {/* CTA strip */}
      <div className="border-b bg-gradient-hero text-primary-foreground">
        <div className="container py-8 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Own a local business?</h2>
            <p className="text-sm opacity-90 mt-1">List it on Huddle in minutes — free for local owners.</p>
          </div>
          <Button asChild variant="secondary" size="lg">
            <Link to="/business/onboarding">List your business <ArrowUpRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </div>

      <div className="container py-10 grid gap-10 md:grid-cols-12">
        {/* Brand + contact */}
        <div className="md:col-span-4 space-y-3">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <Users className="h-6 w-6 text-primary" />
            <span>Huddle</span>
          </Link>
          <p className="text-sm text-muted-foreground max-w-xs">
            Discover and support local businesses in your community. Real reviews from real neighbors.
          </p>
          <ul className="space-y-1.5 text-sm text-muted-foreground pt-2">
            <li className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              <span>123 Main Street, Brooklyn, NY 11201</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" />
              <a href="tel:+15555550199" className="hover:text-foreground">(555) 555-0199</a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" />
              <a href="mailto:hello@huddle.local" className="hover:text-foreground">hello@huddle.local</a>
            </li>
          </ul>
        </div>

        {/* Sitemap */}
        <div className="md:col-span-2">
          <h3 className="font-semibold text-sm mb-3">Explore</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground">Home</Link></li>
            <li><Link to="/ask" className="hover:text-foreground">Ask Huddle</Link></li>
            <li><Link to="/my-huddle" className="hover:text-foreground">My Huddle</Link></li>
            <li><Link to="/about" className="hover:text-foreground">About</Link></li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <h3 className="font-semibold text-sm mb-3">For business</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/business/onboarding" className="hover:text-foreground">List your business</Link></li>
            <li><Link to="/insights" className="hover:text-foreground">Owner insights</Link></li>
            <li><Link to="/account" className="hover:text-foreground">Account</Link></li>
          </ul>
        </div>

        {/* Newsletter */}
        <div className="md:col-span-4">
          <h3 className="font-semibold text-sm mb-3">Get the local roundup</h3>
          <p className="text-sm text-muted-foreground mb-3">
            One email a month. New spots, neighbor picks, no spam.
          </p>
          <form onSubmit={onSubscribe} className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="footer-email" className="sr-only">Email address</Label>
              <Input id="footer-email" name="email" type="email" placeholder="you@neighborhood.com" required />
            </div>
            <Button type="submit">Subscribe</Button>
          </form>
          <div className="flex items-center gap-2 mt-4">
            <SocialLink href="https://twitter.com" label="Twitter"><Twitter className="h-4 w-4" /></SocialLink>
            <SocialLink href="https://instagram.com" label="Instagram"><Instagram className="h-4 w-4" /></SocialLink>
            <SocialLink href="https://facebook.com" label="Facebook"><Facebook className="h-4 w-4" /></SocialLink>
            <SocialLink href="https://github.com" label="GitHub"><Github className="h-4 w-4" /></SocialLink>
          </div>
        </div>
      </div>

      {/* Legal bar */}
      <div className="border-t">
        <div className="container py-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-xs text-muted-foreground">
          <p>© {year} Huddle. All rights reserved.</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-1">
            <Link to="/about" className="hover:text-foreground">Privacy Policy</Link>
            <Link to="/about" className="hover:text-foreground">Terms of Service</Link>
            <Link to="/about" className="hover:text-foreground">Cookie Policy</Link>
            <Link to="/about" className="hover:text-foreground">Accessibility</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
};

const SocialLink = ({ href, label, children }: { href: string; label: string; children: React.ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    className="h-9 w-9 grid place-items-center rounded-md border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
  >
    {children}
  </a>
);
