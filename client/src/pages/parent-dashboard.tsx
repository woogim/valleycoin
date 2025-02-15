import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { GameTimeRequest } from "@shared/schema";
import { Separator } from "@/components/ui/separator";
import { Coins, Clock, LogOut } from "lucide-react";

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
        title: "새로운 게임 일수 요청",
        description: "자녀가 게임 일수를 요청했습니다",
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
    <div className="min-h-screen bg-background">
      <div className="flex flex-col">
        {/* Header */}
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">부모 대시보드</h1>
              <Button variant="outline" onClick={() => logoutMutation.mutate()} className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                로그아웃
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-primary" />
                  <CardTitle>코인 지급</CardTitle>
                </div>
                <CardDescription>자녀에게 보상으로 코인을 지급합니다</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">자녀 선택</label>
                    <select 
                      className="w-full border rounded-md p-2 bg-background"
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
                    <label className="block text-sm font-medium mb-1">코인 수량</label>
                    <Input
                      type="number"
                      value={coinAmount}
                      onChange={(e) => setCoinAmount(e.target.value)}
                      placeholder="지급할 코인 수량 입력"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">지급 사유</label>
                    <Input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="예: 숙제 완료, 방 청소"
                      className="w-full"
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
                    {addCoinsMutation.isPending ? "처리 중..." : "코인 지급"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <CardTitle>게임 일수 요청</CardTitle>
                </div>
                <CardDescription>자녀의 게임 시간 요청을 관리합니다</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {requests?.map((request: GameTimeRequest) => (
                    <div key={request.id} className="bg-muted rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">
                            {children?.find((child: any) => child.id === request.childId)?.username}님의 요청
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(request.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                          {request.days}일
                        </span>
                      </div>
                      {request.status === "pending" && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="default"
                            className="flex-1"
                            onClick={() => respondToRequestMutation.mutate({
                              requestId: request.id,
                              status: "approved"
                            })}
                          >
                            승인
                          </Button>
                          <Button
                            variant="destructive"
                            className="flex-1"
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
                    <div className="text-center py-8 text-muted-foreground">
                      대기 중인 요청이 없습니다
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}