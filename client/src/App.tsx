import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import ParentDashboard from "@/pages/parent-dashboard";
import ChildDashboard from "@/pages/child-dashboard";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/parent-dashboard" component={ParentDashboard} />
      <ProtectedRoute path="/child-dashboard" component={ChildDashboard} />
      <Route path="/" component={() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'parent') {
          window.location.href = '/parent-dashboard';
        } else if (user.role === 'child') {
          window.location.href = '/child-dashboard';
        } else {
          window.location.href = '/auth';
        }
        return null;
      }} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
