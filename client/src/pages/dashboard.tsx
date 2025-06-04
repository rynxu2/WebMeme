import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChannelsWithTokens, useCommonTokens, useFavoriteTokens } from "@/hooks/use-tokens";
import Header from "@/components/header";
import ChannelColumn from "@/components/channel-column";
import TokenCard from "@/components/token-card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Layers, LayoutGrid, Slash, Star } from "lucide-react";
import type { TokenWithChannels } from "@shared/schema";

export default function Dashboard() {
  const { data: channelsWithTokens, isLoading: channelsLoading, error: channelsError } = useChannelsWithTokens();
  const { data: commonTokens, isLoading: commonLoading, error: commonError } = useCommonTokens(2);
  const [commonSearchQuery, setCommonSearchQuery] = useState("");
  const [commonSortBy, setCommonSortBy] = useState("frequency");
  const [commonMinChannels, setCommonMinChannels] = useState("2");
  const { data: favoriteTokens, isLoading: favoriteLoading, error: favoriteError } = useFavoriteTokens();
  const [favoriteSearchQuery, setFavoriteSearchQuery] = useState("");
  const [favoriteSortBy, setFavoriteSortBy] = useState("marketcap");

  if (channelsError || commonError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Failed to Load Data</h3>
              <p className="text-muted-foreground">
                Unable to fetch token data. Please check your connection and try again.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getChannelsForTab = (tabValue: string) => {
    if (!channelsWithTokens) return [];
    
    switch (tabValue) {
      case "tab1":
        return channelsWithTokens.slice(0, 3);
      case "tab2":
        return channelsWithTokens.slice(3, 7);
      default:
        return [];
    }
  };

  const getGridColumns = (tabValue: string) => {
    switch (tabValue) {
      case "tab1":
        return "grid-cols-1 lg:grid-cols-3";
      case "tab2":
        return "grid-cols-1 md:grid-cols-2 xl:grid-cols-4";
      default:
        return "";
    }
  };

  const filteredCommonTokens = commonTokens?.filter((token) => {
    const searchMatch = !commonSearchQuery || 
      token.symbol.toLowerCase().includes(commonSearchQuery.toLowerCase()) ||
      token.name.toLowerCase().includes(commonSearchQuery.toLowerCase()) ||
      token.address.toLowerCase().includes(commonSearchQuery.toLowerCase());
    
    const channelCountMatch = commonMinChannels === "all" || 
      token.channels.length >= parseInt(commonMinChannels);
    
    return searchMatch && channelCountMatch;
  }) || [];

  const filteredFavoriteTokens = favoriteTokens?.filter((token) => {
    const searchMatch = !favoriteSearchQuery || 
      token.symbol.toLowerCase().includes(favoriteSearchQuery.toLowerCase()) ||
      token.name.toLowerCase().includes(favoriteSearchQuery.toLowerCase()) ||
      token.address.toLowerCase().includes(favoriteSearchQuery.toLowerCase());
    
    return searchMatch;
  }) || [];

  const sortedCommonTokens = [...filteredCommonTokens].sort((a, b) => {
    switch (commonSortBy) {
      case "frequency":
        return b.channels.length - a.channels.length;
      case "marketcap":
        return parseFloat(b.marketcap || "0") - parseFloat(a.marketcap || "0");
      case "ath":
        return parseFloat(b.ath || "0") - parseFloat(a.ath || "0");
      case "date":
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      default:
        return 0;
    }
  });

  const sortedFavoriteTokens = [...filteredFavoriteTokens].sort((a, b) => {
    switch (favoriteSortBy) {
      case "marketcap":
        return parseFloat(b.marketcap || "0") - parseFloat(a.marketcap || "0");
      case "ath":
        return parseFloat(b.ath || "0") - parseFloat(a.ath || "0");
      case "date":
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Tabs defaultValue="tab1" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="tab1" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              3 Channels
            </TabsTrigger>
            <TabsTrigger value="tab2" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              4 Channels
            </TabsTrigger>
            <TabsTrigger value="tab3" className="flex items-center gap-2">
              <Slash className="h-4 w-4" />
              Common Tokens
            </TabsTrigger>
            <TabsTrigger value="tab4" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Favorite Tokens
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tab1" className="space-y-6">
            <div className={`grid gap-6 ${getGridColumns("tab1")}`}>
              {channelsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-lg shadow-sm border border-border">
                    <div className="p-4 border-b border-border bg-muted/50 rounded-t-lg">
                      <Skeleton className="h-6 w-32 mb-3" />
                      <Skeleton className="h-9 w-full mb-2" />
                      <Skeleton className="h-9 w-full" />
                    </div>
                    <div className="p-4 space-y-3">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <Skeleton key={j} className="h-32 w-full" />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                getChannelsForTab("tab1").map((channel) => (
                  <ChannelColumn key={channel.id} channel={channel} />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="tab2" className="space-y-6">
            <div className={`grid gap-6 ${getGridColumns("tab2")}`}>
              {channelsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-lg shadow-sm border border-border">
                    <div className="p-4 border-b border-border bg-muted/50 rounded-t-lg">
                      <Skeleton className="h-6 w-32 mb-3" />
                      <Skeleton className="h-9 w-full mb-2" />
                      <Skeleton className="h-9 w-full" />
                    </div>
                    <div className="p-4 space-y-3">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <Skeleton key={j} className="h-32 w-full" />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                getChannelsForTab("tab2").map((channel) => (
                  <ChannelColumn key={channel.id} channel={channel} />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="tab3" className="space-y-6">
            <div className="bg-card rounded-lg shadow-sm border border-border">
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground flex items-center">
                      <Slash className="h-5 w-5 mr-2 text-primary" />
                      Common Tokens (Found in 2+ Channels)
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Tokens that appear across multiple Telegram channels
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-muted-foreground">
                      Showing tokens from {commonMinChannels}+ channels
                    </span>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search common tokens..."
                        value={commonSearchQuery}
                        onChange={(e) => setCommonSearchQuery(e.target.value)}
                        className="search-input w-64"
                      />
                      <svg className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <select
                    value={commonSortBy}
                    onChange={(e) => setCommonSortBy(e.target.value)}
                    className="sort-select"
                  >
                    <option value="frequency">Sort by Frequency</option>
                    <option value="marketcap">Sort by Market Cap</option>
                    <option value="ath">Sort by ATH</option>
                    <option value="date">Sort by Date</option>
                  </select>
                  
                  <select
                    value={commonMinChannels}
                    onChange={(e) => setCommonMinChannels(e.target.value)}
                    className="sort-select"
                  >
                    <option value="2">2+ Channels</option>
                    <option value="3">3+ Channels</option>
                    <option value="4">4+ Channels</option>
                    <option value="all">All Channels</option>
                  </select>
                </div>
              </div>
              
              <div className="p-6">
                {commonLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-48 w-full" />
                    ))}
                  </div>
                ) : sortedCommonTokens.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedCommonTokens.map((token) => (
                      <TokenCard 
                        key={token.id} 
                        token={token} 
                        showChannels={true}
                        channels={token.channels}
                        channel={(token as any).channel}
                        messageId={(token as any).messageId}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Common Tokens Found</h3>
                    <p className="text-muted-foreground">
                      {commonSearchQuery 
                        ? "No tokens match your search criteria."
                        : "No tokens appear in multiple channels yet."
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tab4" className="space-y-6">
            <div className="bg-card rounded-lg shadow-sm border border-border">
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground flex items-center">
                      <Star className="h-5 w-5 mr-2 text-primary" />
                      Favorite Tokens
                    </h3>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search common tokens..."
                        value={favoriteSearchQuery}
                        onChange={(e) => setFavoriteSearchQuery(e.target.value)}
                        className="search-input w-64"
                      />
                      <svg className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <select
                    value={favoriteSortBy}
                    onChange={(e) => setFavoriteSortBy(e.target.value)}
                    className="sort-select"
                  >
                    <option value="marketcap">Sort by Market Cap</option>
                    <option value="ath">Sort by ATH</option>
                    <option value="date">Sort by Date</option>
                  </select>
                </div>
              </div>
              
              <div className="p-6">
                {favoriteLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-48 w-full" />
                    ))}
                  </div>
                ) : sortedFavoriteTokens.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedFavoriteTokens.map((token) => (
                      <TokenCard 
                        key={token.id} 
                        token={token}
                        channels={token.channels}
                        showChannels={true}
                        channel={(token as any).channel}
                        messageId={(token as any).messageId}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Favorite Tokens Found</h3>
                    <p className="text-muted-foreground">
                      {favoriteSearchQuery 
                        ? "No tokens match your search criteria."
                        : "No tokens appear in multiple channels yet."
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}