import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { ExternalLink, Link2, MessageCircle, Copy, Check, Trash2, Star } from "lucide-react";
import type { Token, Channel } from "@shared/schema";

interface TokenCardProps {
  token: Token;
  showChannels?: boolean;
  channels?: (Channel & { discoveredAt: Date })[];
  channel?: string;
  messageId?: string;
}

export default function TokenCard({ token, showChannels = false, channels = [], channel, messageId }: TokenCardProps) {
  const [copied, setCopied] = useState(false);
  // Remove local state and use token.isFavorite directly
  const { toast } = useToast();

  const deleteTokenMutation = useMutation({
    mutationFn: async (tokenId: number) => {
      const response = await fetch(`/api/tokens/${tokenId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete token');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Token Deleted",
        description: "Token has been removed from the database",
      });
      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ["/api/channels/with-tokens"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tokens/common"] });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete token from database",
        variant: "destructive",
      });
    }
  });

  const favoriteTokenMutation = useMutation({
    mutationFn: async (contract: string) => {
      const response = await fetch(`/api/tokens/${contract}/favorite`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to update favorite status');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: token.isFavorite ? "Removed from Favorites" : "Added to Favorites",
        description: token.isFavorite ? "Token has been removed from favorites" : "Token has been added to favorites",
      });
      // Invalidate all queries that might contain this token
      queryClient.invalidateQueries({ queryKey: ["/api/tokens/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/channels/with-tokens"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tokens/common"] });
    },
    onError: () => {
      toast({
        title: "Action Failed",
        description: "Failed to update favorite status",
        variant: "destructive",
      });
    }
  });

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(token.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Address Copied",
        description: "Token address has been copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy address to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleOpenMevxWeb = () => {
    if (token.address) {
      const url = `https://mevx.io/solana/${token.address}`;
      window.open(url, '_blank');
    } else {
      toast({
        title: "MEVX Link Unavailable",
        description: "Token address not available for this token",
        variant: "destructive",
      });
    }
  };

  const handleOpenTelegram = () => {
    if (channel && messageId) {
      const url = `https://t.me/${channel}/${messageId}`;
      window.open(url, '_blank');
    } else {
      toast({
        title: "Telegram Link Unavailable",
        description: "Channel or message ID not available for this token",
        variant: "destructive",
      });
    }
  };

  const handleDeleteToken = () => {
    if (confirm(`Are you sure you want to delete ${token.symbol}?`)) {
      deleteTokenMutation.mutate(token.id);
    }
  };

  const handleFavoriteToggle = () => {
    favoriteTokenMutation.mutate(token.address);
  };

  const formatCurrency = (value: string | null, decimals = 2) => {
    if (!value) return "N/A";
    const num = parseFloat(value);
    if (num >= 1e9) return `$${(num / 1e9).toFixed(decimals)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(decimals)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(decimals)}K`;
    return `$${num.toFixed(decimals)}`;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimeAgo = (date: Date | string | null) => {
    if (!date) return "N/A";
    const now = new Date();
    const past = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

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
    <div className="token-card bg-card border border-border rounded-lg p-3 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-foreground text-sm">{token.symbol}</span>
            <Badge variant="secondary" className="text-xs">
              {token.name}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-1 font-mono">
            {formatAddress(token.address)}
          </div>
          
          {/* Channel indicators for common tokens */}
          {showChannels && channels.length > 0 && (
            <div className="flex items-center space-x-1 mt-2">
              <span className="text-xs text-muted-foreground">Found in:</span>
              <div className="flex space-x-1">
                {channels.map((channel) => (
                  <div
                    key={channel.id}
                    className={`w-2 h-2 rounded-full ${getChannelColor(channel.color)}`}
                    title={channel.name}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                ({channels.length} {channels.length === 1 ? 'channel' : 'channels'})
              </span>
            </div>
          )}
        </div>
        <div className="flex space-x-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenTelegram}
            className="h-7 w-7 p-0"
            title="View Telegram Message"
          >
            <MessageCircle className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyAddress}
            className="h-7 w-7 p-0"
            title="Copy Address"
          >
            {copied ? (
              <Check className="h-3 w-3 text-success" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={handleOpenMevxWeb}
            className="h-7 w-7 p-0"
            title="View on MEVX"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDeleteToken}
            disabled={deleteTokenMutation.isPending}
            className="h-7 w-7 p-0"
            title="Delete Token"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant={token.isFavorite ? "default" : "outline"}
            onClick={handleFavoriteToggle}
            disabled={favoriteTokenMutation.isPending}
            className={`h-7 w-7 p-0 transition-colors ${token.isFavorite ? 'bg-yellow-500 hover:bg-yellow-600 border-yellow-500' : 'hover:border-yellow-500 hover:text-yellow-500'}`}
            title={token.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          >
            <Star className={`h-3 w-3 transition-all ${token.isFavorite ? 'fill-white' : 'fill-none stroke-current'}`} />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Market Cap:</span>
          <div className={`font-semibold ${
            parseFloat(token.marketcap || "0") >= parseFloat(token.marketcapCall || "0") 
              ? "text-success" 
              : "text-destructive"
          }`}>
            {formatCurrency(token.marketcap)}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">MC Call:</span>
          <div className="font-semibold text-foreground">
            {formatCurrency(token.marketcapCall)}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">ATH:</span>
          <div className="font-semibold text-warning">
            {token.ath ? `${formatCurrency(token.ath)}` : "N/A"}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Low:</span>
          <div className="font-semibold text-destructive">
            {token.low ? `${formatCurrency(token.low)}` : "N/A"}
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
        <div className="text-xs text-muted-foreground">
          Called: <span>{formatTimeAgo(token.createdAt)}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          ATH: <span>{formatTimeAgo(token.athAt)}</span> | Low: <span>{formatTimeAgo(token.lowAt)}</span>
        </div>
      </div>
    </div>
  );
}