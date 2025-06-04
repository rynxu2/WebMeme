import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TrendingUp, RefreshCw, Radio } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useQueryClient } from "@tanstack/react-query";
import { useChannelsWithTokens } from "@/hooks/use-tokens";

export default function Header() {
  const [currentTime, setCurrentTime] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const { dataUpdatedAt } = useChannelsWithTokens();

  useEffect(() => {
    setCurrentTime(0); // Reset timer when data is updated
    const interval = setInterval(() => {
      setCurrentTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [dataUpdatedAt]); // Reset when data updates

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.refetchQueries();
    setIsRefreshing(false);
  };

  const formatTimer = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const padZero = (num: number) => num.toString().padStart(2, '0');
    return `${padZero(minutes)}:${padZero(remainingSeconds)}`;
  };

  return (
    <header className="bg-card shadow-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-primary mr-3" />
            <h1 className="text-xl font-semibold text-foreground">
              Crypto Token Dashboard
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm text-muted-foreground">
              <Radio className="h-4 w-4 mr-2" />
              <span>Last update: {formatTimer(currentTime)}</span>
            </div>
            <Button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
