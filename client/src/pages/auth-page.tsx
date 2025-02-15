import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { insertUserSchema, type User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import chickenImage from "@/assets/Stardew Valley Chicken.jpg";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();

  const registerForm = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      role: "parent",
      username: "",
      password: "",
    }
  });

  const { data: parents } = useQuery<User[]>({
    queryKey: ["/api/parents"],
    enabled: registerForm.watch("role") === "child",
  });

  const loginForm = useForm({
    resolver: zodResolver(insertUserSchema.pick({ username: true, password: true })),
    defaultValues: {
      username: "",
      password: "",
    }
  });

  useEffect(() => {
    if (user) {
      setLocation(user.role === "parent" ? "/parent-dashboard" : "/child-dashboard");
    }
  }, [user, setLocation]);

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <div className="flex justify-center mb-4">
              <img 
                src={chickenImage} 
                alt="Stardew Valley Chicken" 
                className="w-24 h-24 object-cover rounded-full border-4 border-primary"
              />
            </div>
            <h1 className="text-3xl font-bold">밸리코인 대시보드</h1>
            <p className="text-muted-foreground">
              자녀의 게임 시간을 효과적으로 관리하세요
            </p>
          </div>

          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="login">로그인</TabsTrigger>
              <TabsTrigger value="register">회원가입</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>로그인</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>아이디</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>비밀번호</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                        {loginMutation.isPending ? "로그인 중..." : "로그인"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>회원가입</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>아이디</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>비밀번호</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>회원 유형</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="회원 유형을 선택하세요" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="parent">부모님</SelectItem>
                                <SelectItem value="child">자녀</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {registerForm.watch("role") === "child" && parents && parents.length > 0 && (
                        <FormField
                          control={registerForm.control}
                          name="parentId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>부모님 계정</FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(parseInt(value))}
                                defaultValue={field.value?.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="부모님 계정을 선택하세요" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {parents.map((parent) => (
                                    <SelectItem key={parent.id} value={parent.id.toString()}>
                                      {parent.username}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                        {registerMutation.isPending ? "계정 생성 중..." : "계정 생성"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="hidden md:block">
          <div className="rounded-lg bg-muted p-8 h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <img 
                src={chickenImage} 
                alt="Stardew Valley Chicken" 
                className="w-48 h-48 object-cover rounded-lg mx-auto mb-6"
              />
              <h2 className="text-2xl font-bold">밸리코인 대시보드에 오신 것을 환영합니다</h2>
              <p className="text-muted-foreground">
                자녀의 게임 시간을 안전하고 재미있게 관리하세요.
                밸리코인으로 게임 시간을 관리하고, 좋은 행동에 대한 보상을 제공하세요.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}