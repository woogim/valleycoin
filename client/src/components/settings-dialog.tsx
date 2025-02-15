import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Settings } from "lucide-react";

export function SettingsDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newUsername, setNewUsername] = useState(user?.username || "");
  const [isOpen, setIsOpen] = useState(false);

  const updateUsernameMutation = useMutation({
    mutationFn: async (username: string) => {
      const res = await apiRequest("POST", "/api/user/update-username", { username });
      return await res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "닉네임 변경 완료",
        description: "닉네임이 성공적으로 변경되었습니다.",
      });
      setIsOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "닉네임 변경 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/user/request-delete");
    },
    onSuccess: () => {
      toast({
        title: user?.role === "child" ? "회원탈퇴 요청 완료" : "회원탈퇴 완료",
        description: user?.role === "child" 
          ? "부모님의 승인을 기다려주세요."
          : "계정이 성공적으로 삭제되었습니다.",
      });
      setIsOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "회원탈퇴 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline"
          className="flex items-center gap-2 border-2 border-[#b58d3c] hover:bg-[#f0d499]"
        >
          <Settings className="w-4 h-4" />
          설정
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#faf1d6] border-4 border-[#b58d3c]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#5c4a21]">설정</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#5c4a21]">닉네임 설정</h3>
            <div className="flex gap-2">
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="flex-1 border-2 border-[#b58d3c] bg-[#fdf6e3]"
              />
              <Button
                onClick={() => updateUsernameMutation.mutate(newUsername)}
                disabled={updateUsernameMutation.isPending || newUsername === user?.username}
                className="bg-[#b58d3c] hover:bg-[#8b6b35] text-white"
              >
                변경
              </Button>
            </div>
          </div>

          <div className="pt-6 border-t-2 border-[#b58d3c]">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  회원탈퇴
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#faf1d6] border-4 border-[#b58d3c]">
                <AlertDialogHeader>
                  <AlertDialogTitle>정말 탈퇴하시겠습니까?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {user?.role === "parent" ? (
                      "계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다. 자녀 계정도 함께 삭제됩니다."
                    ) : (
                      "계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다. 부모님의 승인이 필요합니다."
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-2 border-[#b58d3c] hover:bg-[#f0d499]">
                    취소
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground"
                    onClick={() => deleteRequestMutation.mutate()}
                  >
                    회원탈퇴
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
