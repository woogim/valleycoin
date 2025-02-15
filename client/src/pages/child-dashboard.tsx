import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Coin, GameTimePurchase } from "@shared/schema";
import { Coins, Clock, History, LogOut } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Balance = {
  balance: number;
};

export default function ChildDashboard() {
  const { user, logoutMutation, deleteAccountMutation } = useAuth();
  const { toast } = useToast();
  const [requestDays, setRequestDays] = useState("");
  const [purchaseDays, setPurchaseDays] = useState("");

  const { data: balance } = useQuery<Balance>({
    queryKey: [`/api/coins/balance/${user?.id}`],
    enabled: !!user?.id,
  });

  const { data: history } = useQuery<Coin[]>({
    queryKey: [`/api/coins/history/${user?.id}`],
    enabled: !!user?.id,
  });

  const { data: purchases } = useQuery<GameTimePurchase[]>({
    queryKey: [`/api/game-time/purchases/${user?.id}`],
    enabled: !!user?.id,
  });

  useWebSocket((data) => {
    if (data.type === "COIN_UPDATE") {
      queryClient.invalidateQueries({ queryKey: [`/api/coins/balance/${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/coins/history/${user?.id}`] });
      toast({
        title: "코인 업데이트",
        description: `${data.coin.amount} 코인이 ${data.coin.amount > 0 ? "추가" : "차감"}되었습니다`,
      });
    } else if (data.type === "GAME_TIME_RESPONSE") {
      toast({
        title: "게임 일수 요청",
        description: `요청이 ${data.request.status === 'approved' ? '승인' : '거절'}되었습니다`,
      });
    } else if (data.type === "GAME_TIME_PURCHASED") {
      queryClient.invalidateQueries({ queryKey: [`/api/game-time/purchases/${user?.id}`] });
      toast({
        title: "게임 일수 구매",
        description: `${data.purchase.days}일의 게임을 구매했습니다`,
      });
    }
  });

  const purchaseGameDaysMutation = useMutation({
    mutationFn: async (days: number) => {
      const coinsRequired = days; // 1코인 = 1일
      await apiRequest("POST", "/api/game-time/purchase", {
        days,
        coinsSpent: coinsRequired,
      });
    },
    onSuccess: () => {
      setPurchaseDays("");
      toast({
        title: "성공",
        description: "게임 일수 구매가 완료되었습니다",
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

  const requestGameDaysMutation = useMutation({
    mutationFn: async (days: number) => {
      if (!user?.id || !user?.parentId) {
        throw new Error("부모 정보가 없습니다");
      }
      await apiRequest("POST", "/api/game-time/request", {
        childId: user.id,
        parentId: user.parentId,
        days,
      });
    },
    onSuccess: () => {
      setRequestDays("");
      toast({
        title: "성공",
        description: "게임 일수 요청이 전송되었습니다",
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
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive"
                      className="flex items-center gap-2"
                    >
                      회원탈퇴
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>정말 탈퇴하시겠습니까?</AlertDialogTitle>
                      <AlertDialogDescription>
                        계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
                        보유한 밸리코인과 게임 시간도 모두 삭제됩니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground"
                        onClick={() => deleteAccountMutation.mutate()}
                      >
                        회원탈퇴
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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
            <div className="space-y-6">
              <Card className="border-4 border-[#b58d3c] bg-[#faf1d6] shadow-lg transform hover:scale-[1.02] transition-transform">
                <CardHeader className="bg-[#f0d499] border-b-4 border-[#b58d3c]">
                  <div className="flex items-center gap-3">
                    <Coins className="w-8 h-8 text-[#b58d3c]" />
                    <div>
                      <CardTitle className="text-2xl text-[#5c4a21]">보유 밸리코인</CardTitle>
                      <CardDescription className="text-[#8b6b35]">
                        현재 보유한 밸리코인으로 게임 시간을 구매할 수 있습니다
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="text-5xl font-bold text-[#b58d3c] text-center mb-4 font-pixel">
                    {balance?.balance || 0} 밸리코인
                  </div>
                </CardContent>
              </Card>

              <Card className="border-4 border-[#b58d3c] bg-[#faf1d6] shadow-lg">
                <CardHeader className="bg-[#f0d499] border-b-4 border-[#b58d3c]">
                  <div className="flex items-center gap-3">
                    <Clock className="w-8 h-8 text-[#b58d3c]" />
                    <div>
                      <CardTitle className="text-2xl text-[#5c4a21]">게임 시간 관리</CardTitle>
                      <CardDescription className="text-[#8b6b35]">
                        밸리코인으로 게임 시간을 구매하거나 부모님께 요청할 수 있습니다
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    <div className="bg-[#f9e4bc] p-4 rounded-lg border-2 border-[#b58d3c]">
                      <h3 className="text-lg font-bold text-[#5c4a21] mb-3">밸리코인으로 구매</h3>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={purchaseDays}
                          onChange={(e) => setPurchaseDays(e.target.value)}
                          placeholder="일"
                          className="flex-1 border-2 border-[#b58d3c] bg-[#fdf6e3]"
                        />
                        <Button
                          onClick={() => {
                            const days = parseInt(purchaseDays);
                            if (isNaN(days) || days <= 0) {
                              toast({
                                title: "잘못된 입력",
                                description: "올바른 일수를 입력해주세요",
                                variant: "destructive",
                              });
                              return;
                            }
                            const coinsRequired = days;
                            if (balance?.balance < coinsRequired) {
                              toast({
                                title: "밸리코인 부족",
                                description: `${coinsRequired}밸리코인이 필요합니다`,
                                variant: "destructive",
                              });
                              return;
                            }
                            purchaseGameDaysMutation.mutate(days);
                          }}
                          disabled={purchaseGameDaysMutation.isPending}
                          className="bg-[#b58d3c] hover:bg-[#8b6b35] text-white font-bold"
                        >
                          구매 (1밸리코인/일)
                        </Button>
                      </div>
                    </div>

                    <div className="bg-[#f9e4bc] p-4 rounded-lg border-2 border-[#b58d3c]">
                      <h3 className="text-lg font-bold text-[#5c4a21] mb-3">부모님께 요청</h3>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={requestDays}
                          onChange={(e) => setRequestDays(e.target.value)}
                          placeholder="일"
                          className="flex-1 border-2 border-[#b58d3c] bg-[#fdf6e3]"
                        />
                        <Button
                          onClick={() => {
                            const days = parseInt(requestDays);
                            if (isNaN(days) || days <= 0) {
                              toast({
                                title: "잘못된 입력",
                                description: "올바른 일수를 입력해주세요",
                                variant: "destructive",
                              });
                              return;
                            }
                            requestGameDaysMutation.mutate(days);
                          }}
                          disabled={requestGameDaysMutation.isPending || !user?.parentId}
                          className="bg-[#b58d3c] hover:bg-[#8b6b35] text-white font-bold"
                        >
                          요청하기
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-4 border-[#b58d3c] bg-[#faf1d6] shadow-lg">
              <CardHeader className="bg-[#f0d499] border-b-4 border-[#b58d3c]">
                <div className="flex items-center gap-3">
                  <History className="w-8 h-8 text-[#b58d3c]" />
                  <div>
                    <CardTitle className="text-2xl text-[#5c4a21]">활동 내역</CardTitle>
                    <CardDescription className="text-[#8b6b35]">
                      밸리코인 획득/사용 및 게임 시간 구매 내역
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-[#5c4a21] mb-3">밸리코인 내역</h3>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                      {history?.map((coin: Coin) => (
                        <div key={coin.id} className="flex flex-col bg-[#f9e4bc] rounded-lg p-4 border-2 border-[#b58d3c]">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-[#5c4a21]">{coin.reason}</span>
                            <span className={`font-bold ${coin.amount > 0 ? "text-green-700" : "text-red-700"}`}>
                              {coin.amount > 0 ? "+" : ""}{coin.amount} 밸리코인
                            </span>
                          </div>
                          <span className="text-sm text-[#8b6b35] mt-1">
                            {new Date(coin.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-[#5c4a21] mb-3">구매 내역</h3>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                      {purchases?.map((purchase: GameTimePurchase) => (
                        <div key={purchase.id} className="flex flex-col bg-[#f9e4bc] rounded-lg p-4 border-2 border-[#b58d3c]">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-[#5c4a21]">{purchase.days}일 구매</span>
                            <span className="font-bold text-red-700">
                              -{purchase.coinsSpent} 밸리코인
                            </span>
                          </div>
                          <span className="text-sm text-[#8b6b35] mt-1">
                            {new Date(purchase.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}