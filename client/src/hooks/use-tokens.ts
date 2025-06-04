import { useQuery } from "@tanstack/react-query";
import type { ChannelWithTokens, TokenWithChannels, Token } from "@shared/schema";
import axios from "axios";

export function useChannelsWithTokens() {
  return useQuery<ChannelWithTokens[]>({
    queryKey: ["/api/channels/with-tokens"],
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 10000, // Refetch every 10 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true
  });
}

export function useCommonTokens(minChannels: number = 2) {
  return useQuery<TokenWithChannels[]>({
    queryKey: ["/api/tokens/common", minChannels],
    staleTime: 30000,
    refetchInterval: 10000, // Refetch every 10 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true
  });
}

export function useSearchTokens(contract: string, channelName?: string) {
  return useQuery<Token[]>({
    queryKey: ["/api/tokens/search", contract, channelName], 
    queryFn: async () => {
      const params = new URLSearchParams();
      if (contract) params.append("contract", contract);
      if (channelName) params.append("channel", channelName);
      
      const response = await axios.get(`/api/tokens/search?${params.toString()}`);
      return response.data;
    },
    enabled: contract.length > 0, // Only run query if there's a search term
    staleTime: 10000, // Search results are fresher
    refetchInterval: 10000, // Refetch every 10 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true
  });
}

export function useChannelTokens(channelId: number) {
  return useQuery<ChannelWithTokens>({
    queryKey: ["/api/channels", channelId, "tokens"],
    staleTime: 30000,
    refetchInterval: 10000, // Refetch every 10 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true
  });
}

export function useFavoriteTokens() {
  return useQuery<TokenWithChannels[]>({
    queryKey: ["/api/tokens/favorites"],
    staleTime: 30000,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true
  });
}
