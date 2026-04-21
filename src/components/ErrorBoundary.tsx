import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

// Zero-Error Fail-Safe: catches any render error and shows recovery instructions.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Huddle ErrorBoundary caught:", error, info);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border rounded-xl p-6 shadow-elegant text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-warning/15 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-warning" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Something hiccupped.</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Huddle hit an unexpected snag — your data is safe. Try one of the steps below.
            </p>
          </div>
          <ul className="text-sm text-left text-muted-foreground list-disc pl-5 space-y-1">
            <li>Click <strong>Try again</strong> to reload this view.</li>
            <li>If it keeps happening, return <strong>Home</strong> and re-open the page.</li>
            <li>Still stuck? Refresh your browser to reset the session.</li>
          </ul>
          {this.state.error?.message && (
            <p className="text-xs font-mono bg-muted/50 p-2 rounded text-left break-words">
              {this.state.error.message}
            </p>
          )}
          <div className="flex gap-2 justify-center">
            <Button onClick={this.reset}><RotateCcw className="h-4 w-4" /> Try again</Button>
            <Button variant="outline" asChild><a href="/"><Home className="h-4 w-4" /> Home</a></Button>
          </div>
        </div>
      </div>
    );
  }
}
