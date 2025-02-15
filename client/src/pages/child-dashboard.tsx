import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Coin, GameTimePurchase } from "@shared/schema";

type Balance = {
  balance: number;
};

export default function ChildDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [requestDays, setRequestDays] = useState("");
  const [purchaseDays, setPurchaseDays] = useState("");

  const { data: balance } = useQuery<Balance>({
    queryKey: [`/api/coins/balance/${user?.id}`],
    enabled: !!user?.id,
  });

  const { data: gameDayBalance } = useQuery<Balance>({
    queryKey: [`/api/game-time/balance/${user?.id}`],
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
      queryClient.invalidateQueries({ queryKey: [`/api/game-time/balance/${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/game-time/purchases/${user?.id}`] });
      toast({
        title: "게임 일수 구매",
        description: `${data.purchase.days}일의 게임 시간을 구매했습니다`,
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">자녀 대시보드</h1>
          <Button variant="outline" onClick={() => logoutMutation.mutate()}>
            로그아웃
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>게임 일수</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-lg font-medium">남은 일수</p>
                  <p className="text-4xl font-bold">{gameDayBalance?.balance || 0}일</p>
                </div>
                <div>
                  <p className="text-lg font-medium mb-2">코인으로 구매</p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={purchaseDays}
                      onChange={(e) => setPurchaseDays(e.target.value)}
                      placeholder="일"
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
                            title: "코인 부족",
                            description: `${coinsRequired}코인이 필요합니다`,
                            variant: "destructive",
                          });
                          return;
                        }
                        purchaseGameDaysMutation.mutate(days);
                      }}
                      disabled={purchaseGameDaysMutation.isPending}
                    >
                      구매 (1코인/일)
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-lg font-medium mb-2">부모님께 요청</p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={requestDays}
                      onChange={(e) => setRequestDays(e.target.value)}
                      placeholder="일"
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
                    >
                      요청하기
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>코인 현황</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mb-4">{balance?.balance || 0}코인</div>
              <div className="space-y-2">
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
              <CardTitle>구매 내역</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {purchases?.map((purchase: GameTimePurchase) => (
                  <div key={purchase.id} className="flex justify-between items-center">
                    <span>{purchase.days}일</span>
                    <span className="text-red-600">-{purchase.coinsSpent}코인</span>
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