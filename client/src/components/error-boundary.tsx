import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-foam text-sea flex items-center justify-center p-5">
          <div className="w-full max-w-md flex flex-col items-center gap-6">
            <Logo size={28} />
            <div className="w-full bg-white rounded-2xl p-5 sm:p-8 text-center flex flex-col gap-4">
              <h1 className="font-display font-bold text-2xl tracking-[-0.02em]">Something went wrong</h1>
              <p className="text-sm text-slate-brand">
                The app hit an error. It may be a connection problem or your session may have run out.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Button onClick={this.handleReload} className="w-full h-12 text-base">
                  Reload the page
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/login'}
                  className="w-full h-12"
                >
                  Go to log in
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
