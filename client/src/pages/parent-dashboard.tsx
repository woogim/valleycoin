import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { GameTimeRequest, Coin } from "@shared/schema";

export default function ParentDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [coinAmount, setCoinAmount] = useState("");
  const [reason, setReason] = useState("");

  const { data: children } = useQuery({
    queryKey: [`/api/children/${user?.id}`],
  });

  const { data: requests } = useQuery({
    queryKey: [`/api/game-time/requests/${user?.id}`],
  });

  useWebSocket((data) => {
    if (data.type === "NEW_GAME_TIME_REQUEST") {
      queryClient.invalidateQueries({ queryKey: [`/api/game-time/requests/${user?.id}`] });
      toast({
        title: "New Game Time Request",
        description: "A child has requested game time",
      });
    }
  });

  const addCoinsMutation = useMutation({
    mutationFn: async ({ childId, amount, reason }: { childId: number, amount: number, reason: string }) => {
      await apiRequest("POST", "/api/coins", { userId: childId, amount, reason });
    },
    onSuccess: () => {
      setCoinAmount("");
      setReason("");
      toast({
        title: "Success",
        description: "Coins added successfully",
      });
    },
  });

  const respondToRequestMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: number, status: "approved" | "rejected" }) => {
      await apiRequest("POST", `/api/game-time/respond/${requestId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/game-time/requests/${user?.id}`] });
    },
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Parent Dashboard</h1>
          <Button variant="outline" onClick={() => logoutMutation.mutate()}>
            Logout
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Add Coins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Amount</label>
                  <Input
                    type="number"
                    value={coinAmount}
                    onChange={(e) => setCoinAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Reason</label>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Child</label>
                  <select className="w-full border rounded p-2">
                    {children?.map((child: any) => (
                      <option key={child.id} value={child.id}>
                        {child.username}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    if (children?.[0]) {
                      addCoinsMutation.mutate({
                        childId: children[0].id,
                        amount: parseInt(coinAmount),
                        reason,
                      });
                    }
                  }}
                >
                  Add Coins
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Game Time Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requests?.map((request: GameTimeRequest) => (
                  <div key={request.id} className="border p-4 rounded">
                    <p>Child requested {request.minutes} minutes</p>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="default"
                        onClick={() => respondToRequestMutation.mutate({
                          requestId: request.id,
                          status: "approved"
                        })}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => respondToRequestMutation.mutate({
                          requestId: request.id,
                          status: "rejected"
                        })}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
