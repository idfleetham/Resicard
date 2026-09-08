import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { errorMessage } from "@/components/resident/format";

interface FavouriteButtonProps {
  merchantId: string;
  isFavourite: boolean;
  /** "icon" for a list row, "labelled" for the outlet page. */
  variant?: "icon" | "labelled";
}

/** Star toggle for an outlet. Updates the cached lists straight away, then refetches. */
export default function FavouriteButton({ merchantId, isFavourite, variant = "icon" }: FavouriteButtonProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const outletKey = [`/api/outlets/${merchantId}`];

  const toggle = useMutation({
    mutationFn: async (next: boolean) => {
      await apiRequest(next ? "PUT" : "DELETE", `/api/favourites/${merchantId}`);
      return next;
    },
    onMutate: async (next: boolean) => {
      await queryClient.cancelQueries({ queryKey: ["/api/outlets"] });
      const outlets = queryClient.getQueryData<{ id: string; isFavourite: boolean }[]>(["/api/outlets"]);
      if (outlets) {
        queryClient.setQueryData(
          ["/api/outlets"],
          outlets.map((o) => (o.id === merchantId ? { ...o, isFavourite: next } : o)),
        );
      }
      const one = queryClient.getQueryData<{ isFavourite: boolean }>(outletKey);
      if (one) queryClient.setQueryData(outletKey, { ...one, isFavourite: next });
      return { outlets, one };
    },
    onError: (err, _next, context) => {
      if (context?.outlets) queryClient.setQueryData(["/api/outlets"], context.outlets);
      if (context?.one) queryClient.setQueryData(outletKey, context.one);
      toast({ title: "Could not update", description: errorMessage(err), variant: "destructive" });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/outlets"] });
      void queryClient.invalidateQueries({ queryKey: outletKey });
    },
  });

  const label = isFavourite ? "Remove from your places" : "Add to your places";
  const icon = (
    <Star
      className={`h-5 w-5 ${isFavourite ? "text-buoy" : "text-slate-brand"}`}
      strokeWidth={2}
      fill={isFavourite ? "#E4572E" : "none"}
    />
  );
  const press = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle.mutate(!isFavourite);
  };

  if (variant === "labelled") {
    return (
      <button
        type="button"
        onClick={press}
        aria-pressed={isFavourite}
        className="inline-flex items-center gap-2 h-12 px-5 rounded-full border border-[#E6E9E8] bg-white font-bold text-sea hover:bg-foam disabled:opacity-60"
        disabled={toggle.isPending}
      >
        {icon}
        {isFavourite ? "Saved" : "Save to your places"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={press}
      aria-label={label}
      aria-pressed={isFavourite}
      className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center hover:bg-foam disabled:opacity-60"
      disabled={toggle.isPending}
    >
      {icon}
    </button>
  );
}
