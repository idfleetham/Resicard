import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isSubscribed, pushSupported, subscribeToPush, unsubscribeFromPush } from "@/lib/push";
import { errorMessage } from "./format";

/**
 * What an outlet may send a resident, and how.
 *
 * The two channels are not the same promise. Notifications on the phone are
 * granted by the browser's own prompt, so this only ever turns them off again.
 * Marketing email is direct marketing, so it is off until the resident turns it
 * on here — nothing is pre-ticked, and every campaign email carries a link that
 * unsubscribes in one click without signing in.
 */

interface Preferences {
  marketingEmailOptIn: boolean;
  optOutAll: boolean;
  optedOutMerchantIds: string[];
  outlets: { id: string; name: string }[];
  pushConfigured: boolean;
  pushDevices: number;
}

const KEY = ["/api/campaign-preferences"] as const;

function Row({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-[#E6E9E8] last:border-0">
      <div>
        <p className="text-sm font-semibold text-sea">{title}</p>
        <p className="text-xs text-[#0F3B47]/70 mt-0.5">{note}</p>
      </div>
      <div className="shrink-0 pt-1">{children}</div>
    </div>
  );
}

export default function NotificationPreferences() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<Preferences>({ queryKey: [...KEY] });
  const [pushOn, setPushOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void isSubscribed().then(setPushOn);
  }, []);

  const save = useMutation({
    mutationFn: async (values: Partial<Preferences>) => {
      const response = await apiRequest("PUT", "/api/campaign-preferences", values);
      return (await response.json()) as Preferences;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData([...KEY], updated);
    },
    onError: (error) => toast({ title: "Not saved", description: errorMessage(error), variant: "destructive" }),
  });

  async function togglePush(next: boolean) {
    setBusy(true);
    try {
      if (!next) {
        await unsubscribeFromPush();
        setPushOn(false);
        return;
      }
      const result = await subscribeToPush();
      setPushOn(result === "subscribed");
      if (result === "denied") {
        toast({
          title: "Notifications are blocked",
          description: "Your browser is refusing them. Change it in the site settings if you change your mind.",
          variant: "destructive",
        });
      } else if (result !== "subscribed") {
        toast({ title: "Not available", description: "This browser cannot show notifications." });
      }
    } finally {
      setBusy(false);
    }
  }

  if (isLoading || !data) return <div className="bg-white rounded-2xl h-40 animate-pulse" />;

  const outletOptOut = (id: string, muted: boolean) => {
    const next = muted
      ? Array.from(new Set([...data.optedOutMerchantIds, id]))
      : data.optedOutMerchantIds.filter((m) => m !== id);
    save.mutate({ optedOutMerchantIds: next });
  };

  return (
    <div className="bg-white rounded-2xl p-5 space-y-1">
      <h2 className="font-display font-bold text-2xl tracking-[-0.02em] text-sea mb-2">Offers from outlets</h2>
      <p className="text-sm text-[#0F3B47]/70 pb-2">
        Outlets can send you one short line about an offer, at most once a week each, and never late at night.
      </p>

      <Row
        title="Notifications on this device"
        note={
          !pushSupported()
            ? "This browser cannot show notifications."
            : data.pushConfigured
              ? "Your browser asks first. Turning this off stops them here."
              : "Not available yet."
        }
      >
        <Switch
          checked={pushOn}
          disabled={busy || !pushSupported() || !data.pushConfigured}
          onCheckedChange={(v) => void togglePush(v)}
          aria-label="Notifications on this device"
        />
      </Row>

      <Row title="Offers by email" note="Off unless you turn it on. Every email has a one-click unsubscribe.">
        <Switch
          checked={data.marketingEmailOptIn}
          disabled={save.isPending}
          onCheckedChange={(v) => save.mutate({ marketingEmailOptIn: v })}
          aria-label="Offers by email"
        />
      </Row>

      <Row title="Stop all of it" note="No outlet can reach you, whatever you have granted.">
        <Switch
          checked={data.optOutAll}
          disabled={save.isPending}
          onCheckedChange={(v) => save.mutate({ optOutAll: v })}
          aria-label="Stop all of it"
        />
      </Row>

      {data.outlets.length > 0 && (
        <div className="pt-4">
          <p className="text-sm font-semibold text-sea mb-2">Outlets you hear from</p>
          <div className="space-y-2">
            {data.outlets.map((outlet) => {
              const muted = data.optedOutMerchantIds.includes(outlet.id);
              return (
                <div key={outlet.id} className="flex items-center justify-between gap-4">
                  <span className={`text-sm ${muted ? "text-[#0F3B47]/70" : "text-sea"}`}>{outlet.name}</span>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 px-4 text-xs"
                    disabled={save.isPending}
                    onClick={() => outletOptOut(outlet.id, !muted)}
                  >
                    {muted ? "Turn back on" : "Turn off"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
