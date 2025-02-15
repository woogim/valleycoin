import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Coin } from "@shared/schema";

export default function ChildDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [requestMinutes, setRequestMinutes] = useState("");

  const { data: balance } = useQuery({
    queryKey: [`/api/coins/balance/${user?.id}`],
  });

  const { data: history } = useQuery({
    queryKey: [`/api/coins/history/${user?.id}`],
  });

  useWebSocket((data) => {
    if (data.type === "COIN_UPDATE") {
      queryClient.invalidateQueries({ queryKey: [`/api/coins/balance/${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/coins/history/${user?.id}`] });
      toast({
        title: "Coins Updated",
        description: `${data.coin.amount} coins ${data.coin.amount > 0 ? "added" : "removed"}`,
      });
    } else if (data.type === "GAME_TIME_RESPONSE") {
      toast({
        title: "Game Time Request",
        description: `Your request was ${data.request.status}`,
      });
    }
  });

  const requestGameTimeMutation = useMutation({
    mutationFn: async (minutes: number) => {
      await apiRequest("POST", "/api/game-time/request", {
        childId: user?.id,
        parentId: user?.parentId,
        minutes,
      });
    },
    onSuccess: () => {
      setRequestMinutes("");
      toast({
        title: "Success",
        description: "Game time request sent",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Child Dashboard</h1>
          <Button variant="outline" onClick={() => logoutMutation.mutate()}>
            Logout
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Coin Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{balance?.balance || 0}</div>
              <div className="mt-4 space-y-2">
                {history?.map((coin: Coin) => (
                  <div key={coin.id} className="flex justify-between items-center">
                    <span>{coin.reason}</span>
                    <span className={coin.amount > 0 ? "text-green-600" : "text-red-600"}>
                      {coin.amount > 0 ? "+" : ""}{coin.amount}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Request Game Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Minutes</label>
                  <Input
                    type="number"
                    value={requestMinutes}
                    onChange={(e) => setRequestMinutes(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => requestGameTimeMutation.mutate(parseInt(requestMinutes))}
                  disabled={requestGameTimeMutation.isPending}
                >
                  Request Time
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
