import { Link } from "wouter";
import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <main className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-6xl font-bold text-slate-300">404</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Page not found</h1>
        <p className="text-slate-600 mt-2">That link does not go anywhere. If you scanned a code, try scanning it again.</p>
        <Button asChild className="mt-6 h-12">
          <Link href="/">Go to the home page</Link>
        </Button>
      </main>
    </div>
  );
}
