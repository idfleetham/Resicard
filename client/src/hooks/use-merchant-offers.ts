import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export const useToggleOffer = () => {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', `/api/merchant/offers/${id}/toggle`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["merchant", "offers"] });
      toast({
        title: "Offer Updated",
        description: `Offer ${data.isActive ? 'activated' : 'paused'} successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update offer",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateOffer = () => {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/merchant/offers/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant", "offers"] });
      toast({
        title: "Offer Updated",
        description: "Offer updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update offer",
        variant: "destructive",
      });
    },
  });
};

export const useOffer = (id: string) => {
  return useQuery({
    queryKey: ["merchant", "offers", id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/merchant/offers/${id}`);
      return response.json();
    },
    enabled: !!id,
  });
};

export const useOffers = () => {
  return useQuery({
    queryKey: ["merchant", "offers"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/deals/my-deals');
      return response.json();
    },
  });
};