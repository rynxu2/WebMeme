import { useState } from "react";
import { useSearchTokens } from "@/hooks/use-tokens";
import TokenCard from "./token-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, AlertCircle } from "lucide-react";
import type { ChannelWithTokens } from "@shared/schema";

interface ChannelColumnProps {
  channel: ChannelWithTokens;
}

export default function ChannelColumn({ channel }: ChannelColumnProps) {
  const [searchContract, setSearchContract] = useState("");
  const [sortBy, setSortBy] = useState("marketcap");
  
  const { data: searchResults, isLoading: isSearching } = useSearchTokens(searchContract, channel.name);
  
  const tokens = searchContract ? (searchResults || []) : channel.tokens;
  
  const sortedTokens = [...tokens].sort((a, b) => {
    switch (sortBy) {
      case "marketcap":
        return parseFloat(b.marketcap || "0") - parseFloat(a.marketcap || "0");
      case "ath":
        return parseFloat(b.ath || "0") - parseFloat(a.ath || "0");
      case "date":
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      case "recent":
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      default:
        return 0;
    }
  });

  const getChannelColor = (color: string) => {
    const colorMap: Record<string, string> = {
      "#00C853": "bg-success",
      "#FF9800": "bg-warning", 
      "#F44336": "bg-destructive",
      "#9C27B0": "bg-purple-500",
      "#3F51B5": "bg-indigo-500",
      "#E91E63": "bg-pink-500",
      "#009688": "bg-teal-500",
    };
    return colorMap[color] || "bg-primary";
  };

  return (
    <div className="channel-column bg-card rounded-lg shadow-sm border border-border">
      {/* Channel Header */}
      <div className="p-4 border-b border-border bg-muted/50 rounded-t-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${getChannelColor(channel.color)}`} />
            <h3 className="font-semibold text-foreground">{channel.name}</h3>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            {channel.tokenCount} tokens
          </span>
        </div>
        
        {/* Search Bar */}
        <div className="relative mb-2">
          <input
            type="text"
            placeholder="Search tokens..."
            value={searchContract}
            onChange={(e) => setSearchContract(e.target.value)}
            className="search-input"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
        
        {/* Sort Options */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="sort-select"
        >
          <option value="marketcap">Sort by Market Cap</option>
          <option value="ath">Sort by ATH</option>
          <option value="date">Sort by Date</option>
          <option value="recent">Sort by Recent</option>
        </select>
      </div>
      
      {/* Token Cards */}
      <div className="p-4 space-y-3 max-h-[1000px] overflow-y-auto">
        {isSearching ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))
        ) : sortedTokens.length > 0 ? (
          sortedTokens.map((token) => (
            <TokenCard 
              key={token.id} 
              token={token} 
              channel={(token as any).channel}
              messageId={(token as any).messageId}
            />
          ))
        ) : searchContract ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">No tokens found matching "{searchContract}"</p>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">No tokens available</p>
          </div>
        )}
      </div>
    </div>
  );
}