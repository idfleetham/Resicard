import { useEffect, useState } from "react";
import { Share, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISSED_KEY = "install_prompt_dismissed";

/** Chrome fires this so a page can offer installation at a moment of its choosing. */
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS Safari does not report display-mode; it sets navigator.standalone instead.
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIosSafari(): boolean {
  const ua = window.navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && "ontouchend" in document);
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return ios && !otherBrowser;
}

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDismissed() {
  try {
    window.localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // A private window will not keep it. It only means the prompt comes back.
  }
}

/**
 * Invites the resident to keep Resicard on their home screen. Chrome and Edge
 * can install in one tap; iOS has no such API, so it gets the Share menu steps.
 * Hidden once installed or once dismissed.
 */
export function InstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [showIosSteps, setShowIosSteps] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandalone() || readDismissed()) return;
    if (isIosSafari()) {
      setHidden(false);
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (hidden) return null;

  const dismiss = () => {
    writeDismissed();
    setHidden(true);
  };

  const install = async () => {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    writeDismissed();
    setHidden(true);
  };

  return (
    <div className="bg-sea text-foam rounded-2xl p-5 relative">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Hide this"
        className="absolute right-3 top-3 h-8 w-8 rounded-full flex items-center justify-center text-[#F2F5F4]/70 hover:text-foam"
      >
        <X className="h-4 w-4" />
      </button>

      <h2 className="font-display font-bold text-xl tracking-[-0.02em] pr-8">Keep Resicard on your phone</h2>
      <p className="text-sm mt-1.5 text-[#F2F5F4]/85">
        Add it to your home screen and it opens like an app. Nothing to download.
      </p>

      {event ? (
        <Button variant="buoy" className="mt-4 h-11 w-full" onClick={install}>
          Add to home screen
        </Button>
      ) : showIosSteps ? (
        <ol className="mt-4 space-y-2.5 text-sm">
          <li className="flex items-center gap-3">
            <span className="h-7 w-7 rounded-full bg-[#F2F5F4]/15 flex items-center justify-center shrink-0">
              <Share className="h-4 w-4" />
            </span>
            Tap the Share button in Safari.
          </li>
          <li className="flex items-center gap-3">
            <span className="h-7 w-7 rounded-full bg-[#F2F5F4]/15 flex items-center justify-center shrink-0">
              <Plus className="h-4 w-4" />
            </span>
            Choose "Add to Home Screen", then Add.
          </li>
        </ol>
      ) : (
        <Button variant="buoy" className="mt-4 h-11 w-full" onClick={() => setShowIosSteps(true)}>
          Show me how
        </Button>
      )}
    </div>
  );
}
