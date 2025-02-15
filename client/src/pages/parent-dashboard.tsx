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
import { Coins, Clock, LogOut } from "lucide-react";
import { SettingsDialog } from "@/components/settings-dialog";

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
        description: "밸리코인이 지급되었습니다",
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
    <div className="min-h-screen bg-[#fdf6e3]">
      <div className="flex flex-col">
        {/* Header */}
        <header className="border-b-4 border-[#b58d3c] bg-[#f9e4bc] shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-4xl font-bold text-[#5c4a21] font-pixel">밸리코인 대시보드</h1>
              <div className="flex gap-2">
                <SettingsDialog />
                <Button 
                  variant="outline" 
                  onClick={() => logoutMutation.mutate()} 
                  className="flex items-center gap-2 border-2 border-[#b58d3c] hover:bg-[#f0d499]"
                >
                  <LogOut className="w-4 h-4" />
                  로그아웃
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-4 border-[#b58d3c] bg-[#faf1d6] shadow-lg transform hover:scale-[1.02] transition-transform">
              <CardHeader className="bg-[#f0d499] border-b-4 border-[#b58d3c]">
                <div className="flex items-center gap-3">
                  <Coins className="w-8 h-8 text-[#b58d3c]" />
                  <div>
                    <CardTitle className="text-2xl text-[#5c4a21]">밸리코인 지급</CardTitle>
                    <CardDescription className="text-[#8b6b35]">
                      자녀에게 보상으로 밸리코인을 지급합니다
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="bg-[#f9e4bc] p-4 rounded-lg border-2 border-[#b58d3c]">
                    <label className="block text-lg font-bold text-[#5c4a21] mb-2">자녀 선택</label>
                    <select 
                      className="w-full border-2 border-[#b58d3c] rounded-md p-2 bg-[#fdf6e3] text-[#5c4a21]"
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
                  <div className="bg-[#f9e4bc] p-4 rounded-lg border-2 border-[#b58d3c]">
                    <label className="block text-lg font-bold text-[#5c4a21] mb-2">밸리코인 수량</label>
                    <Input
                      type="number"
                      value={coinAmount}
                      onChange={(e) => setCoinAmount(e.target.value)}
                      placeholder="지급할 밸리코인 수량 입력"
                      className="border-2 border-[#b58d3c] bg-[#fdf6e3]"
                    />
                  </div>
                  <div className="bg-[#f9e4bc] p-4 rounded-lg border-2 border-[#b58d3c]">
                    <label className="block text-lg font-bold text-[#5c4a21] mb-2">지급 사유</label>
                    <Input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="예: 숙제 완료, 방 청소"
                      className="border-2 border-[#b58d3c] bg-[#fdf6e3]"
                    />
                  </div>
                  <Button
                    className="w-full bg-[#b58d3c] hover:bg-[#8b6b35] text-white font-bold text-lg py-6"
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
                          description: "올바른 밸리코인 수량을 입력해주세요",
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
                    {addCoinsMutation.isPending ? "처리 중..." : "밸리코인 지급"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-4 border-[#b58d3c] bg-[#faf1d6] shadow-lg">
              <CardHeader className="bg-[#f0d499] border-b-4 border-[#b58d3c]">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-[#b58d3c]" />
                  <div>
                    <CardTitle className="text-2xl text-[#5c4a21]">게임 일수 요청</CardTitle>
                    <CardDescription className="text-[#8b6b35]">
                      자녀의 게임 시간 요청을 관리합니다
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {requests?.map((request: GameTimeRequest) => (
                    <div key={request.id} className="bg-[#f9e4bc] rounded-lg p-4 border-2 border-[#b58d3c]">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-lg font-bold text-[#5c4a21]">
                            {children?.find((child: any) => child.id === request.childId)?.username}님의 요청
                          </p>
                          <p className="text-sm text-[#8b6b35]">
                            {new Date(request.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span className="px-3 py-1 text-sm font-bold rounded-full bg-[#b58d3c] text-white">
                          {request.days}일
                        </span>
                      </div>
                      {request.status === "pending" && (
                        <div className="flex gap-2 mt-4">
                          <Button
                            variant="default"
                            className="flex-1 bg-[#b58d3c] hover:bg-[#8b6b35] text-white font-bold"
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
                    <div className="text-center py-8 text-[#8b6b35] bg-[#f9e4bc] rounded-lg border-2 border-[#b58d3c]">
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