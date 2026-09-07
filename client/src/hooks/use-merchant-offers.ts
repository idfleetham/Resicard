import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InsertOffer, Offer } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { errorMessage } from "@/components/resident/format";

export const OFFERS_KEY = ["/api/merchant/offers"] as const;

export function useMerchantOffers() {
  return useQuery<Offer[]>({ queryKey: [...OFFERS_KEY] });
}

export function useMerchantOffer(id: string | undefined) {
  return useQuery<Offer>({ queryKey: [`/api/merchant/offers/${id}`], enabled: !!id });
}

function useInvalidateOffers() {
  const queryClient = useQueryClient();
  return async (id?: string) => {
    await queryClient.invalidateQueries({ queryKey: [...OFFERS_KEY] });
    if (id) await queryClient.invalidateQueries({ queryKey: [`/api/merchant/offers/${id}`] });
    await queryClient.invalidateQueries({ queryKey: ["/api/merchant/redemptions/summary"] });
  };
}

export function useCreateOffer() {
  const invalidate = useInvalidateOffers();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: InsertOffer) =>
      (await apiRequest("POST", "/api/merchant/offers", data)).json() as Promise<Offer>,
    onSuccess: async () => {
      await invalidate();
    },
    onError: (err) => toast({ title: "Could not save offer", description: errorMessage(err), variant: "destructive" }),
  });
}

export function useUpdateOffer() {
  const invalidate = useInvalidateOffers();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertOffer> }) =>
      (await apiRequest("PUT", `/api/merchant/offers/${id}`, data)).json() as Promise<Offer>,
    onSuccess: async (offer) => {
      await invalidate(offer.id);
    },
    onError: (err) => toast({ title: "Could not save offer", description: errorMessage(err), variant: "destructive" }),
  });
}

export function useToggleOffer() {
  const invalidate = useInvalidateOffers();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiRequest("POST", `/api/merchant/offers/${id}/toggle`)).json() as Promise<Offer>,
    onSuccess: async (offer) => {
      await invalidate(offer.id);
      toast({ title: offer.active ? "Offer is live" : "Offer paused" });
    },
    onError: (err) => toast({ title: "Could not update offer", description: errorMessage(err), variant: "destructive" }),
  });
}

export function useArchiveOffer() {
  const invalidate = useInvalidateOffers();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiRequest("POST", `/api/merchant/offers/${id}/archive`)).json() as Promise<Offer>,
    onSuccess: async (offer) => {
      await invalidate(offer.id);
      toast({ title: "Offer archived" });
    },
    onError: (err) => toast({ title: "Could not archive offer", description: errorMessage(err), variant: "destructive" }),
  });
}

/** Multipart upload with the bearer token (apiRequest only sends JSON). */
export async function uploadMerchantFile(url: string, field: string, file: File): Promise<Response> {
  const token = localStorage.getItem("auth_token");
  const body = new FormData();
  body.append(field, file);
  const res = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
    credentials: "include",
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()) || res.statusText}`);
  return res;
}

export function useUploadOfferImage() {
  const invalidate = useInvalidateOffers();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) =>
      (await uploadMerchantFile(`/api/merchant/offers/${id}/image`, "image", file)).json() as Promise<{ imageUrl: string }>,
    onSuccess: async (_res, vars) => {
      await invalidate(vars.id);
    },
    onError: (err) => toast({ title: "Image upload failed", description: errorMessage(err), variant: "destructive" }),
  });
}
