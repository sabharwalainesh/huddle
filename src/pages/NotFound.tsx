import { Link } from "react-router-dom";
import { useLocation, useEffect } from "react";
import { ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] translate-x-1/3 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px] -translate-x-1/4 translate-y-1/4" />
      </div>

      <div className="text-center space-y-6 max-w-md">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="p-[5px] rounded-[1.5rem] bg-primary/8 border border-primary/15">
            <div className="rounded-[calc(1.5rem-5px)] bg-background p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <MapPin className="h-10 w-10 text-primary" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">404 — Lost</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            This block doesn't exist.
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            The page you're looking for has moved, been removed, or never existed in this neighborhood.
          </p>
        </div>

        <Button
          asChild
          size="lg"
          className="rounded-full pl-6 pr-2 gap-3 group transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
        >
          <Link to="/">
            Back to Huddle
            <span className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105">
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
