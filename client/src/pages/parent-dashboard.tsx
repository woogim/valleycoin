import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { GameTimeRequest } from "@shared/schema";

export default function ParentDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [coinAmount, setCoinAmount] = useState("");
  const [reason, setReason] = useState("");
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  const { data: children } = useQuery({
    queryKey: [`/api/children/${user?.id}`],
    enabled: !!user?.id,
  });

  const { data: requests } = useQuery({
    queryKey: [`/api/game-time/requests/${user?.id}`],
    enabled: !!user?.id,
  });

  useWebSocket((data) => {
    if (data.type === "NEW_GAME_TIME_REQUEST") {
      queryClient.invalidateQueries({ queryKey: [`/api/game-time/requests/${user?.id}`] });
      toast({
        title: "새로운 게임 시간 요청",
        description: "자녀가 게임 시간을 요청했습니다",
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
        title: "성공",
        description: "코인이 추가되었습니다",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "오류",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const respondToRequestMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: number, status: "approved" | "rejected" }) => {
      await apiRequest("POST", `/api/game-time/respond/${requestId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/game-time/requests/${user?.id}`] });
      toast({
        title: "성공",
        description: "요청에 응답했습니다",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "오류",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">부모 대시보드</h1>
          <Button variant="outline" onClick={() => logoutMutation.mutate()}>
            로그아웃
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>코인 지급</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">자녀 선택</label>
                  <select 
                    className="w-full border rounded p-2"
                    value={selectedChildId || ""}
                    onChange={(e) => setSelectedChildId(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">선택하세요</option>
                    {children?.map((child: any) => (
                      <option key={child.id} value={child.id}>
                        {child.username}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">코인 수량</label>
                  <Input
                    type="number"
                    value={coinAmount}
                    onChange={(e) => setCoinAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">지급 사유</label>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    if (!selectedChildId) {
                      toast({
                        title: "오류",
                        description: "자녀를 선택해주세요",
                        variant: "destructive",
                      });
                      return;
                    }
                    const amount = parseInt(coinAmount);
                    if (isNaN(amount) || amount <= 0) {
                      toast({
                        title: "오류",
                        description: "올바른 코인 수량을 입력해주세요",
                        variant: "destructive",
                      });
                      return;
                    }
                    if (!reason) {
                      toast({
                        title: "오류",
                        description: "지급 사유를 입력해주세요",
                        variant: "destructive",
                      });
                      return;
                    }
                    addCoinsMutation.mutate({
                      childId: selectedChildId,
                      amount,
                      reason,
                    });
                  }}
                  disabled={addCoinsMutation.isPending}
                >
                  코인 지급
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>게임 시간 요청</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requests?.map((request: GameTimeRequest) => (
                  <div key={request.id} className="border p-4 rounded">
                    <p className="font-medium mb-2">
                      {children?.find((child: any) => child.id === request.childId)?.username}님의 요청
                    </p>
                    <p>요청 시간: {request.minutes}분</p>
                    <p className="text-sm text-muted-foreground">
                      요청 시각: {new Date(request.createdAt).toLocaleString()}
                    </p>
                    {request.status === "pending" && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="default"
                          onClick={() => respondToRequestMutation.mutate({
                            requestId: request.id,
                            status: "approved"
                          })}
                        >
                          승인
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => respondToRequestMutation.mutate({
                            requestId: request.id,
                            status: "rejected"
                          })}
                        >
                          거절
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {(!requests || requests.length === 0) && (
                  <p className="text-center text-muted-foreground">
                    대기 중인 요청이 없습니다
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}