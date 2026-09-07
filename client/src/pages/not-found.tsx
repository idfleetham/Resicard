import { Link } from "wouter";
import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-foam text-sea">
      <Navigation />
      <main className="max-w-md mx-auto px-5 py-16">
        <div className="bg-white rounded-2xl p-8 text-center">
          <p className="font-display font-extrabold text-[64px] leading-none tracking-[-0.03em] text-sand">404</p>
          <h1 className="font-display font-bold text-2xl tracking-[-0.02em] mt-3">Page not found</h1>
          <p className="text-sm text-slate-brand mt-2">
            That link does not go anywhere. If you scanned a code, try scanning it again.
          </p>
          <Button asChild className="mt-6 h-12 px-8">
            <Link href="/">Go to the home page</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
