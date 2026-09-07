import { Component, ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

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
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center gap-2 justify-center text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-muted-foreground">
                The application encountered an error. This might be due to a connection issue or expired session.
              </p>
              <div className="space-y-2">
                <Button onClick={this.handleReload} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/login'}
                  className="w-full"
                >
                  Go to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}