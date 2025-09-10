import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import "./lib/i18n";

import Login from "@/pages/login";
import Register from "@/pages/register";
import PatientDashboard from "@/pages/patient-dashboard";
import DoctorDashboard from "@/pages/doctor-dashboard";
import NotFound from "@/pages/not-found";

// Protected route wrapper
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

// Dashboard router based on user role
function DashboardRouter() {
  const { user } = useAuth();
  
  if (user?.role === "doctor") {
    return <DoctorDashboard />;
  } else {
    return <PatientDashboard />;
  }
}

function Router() {
  const { user } = useAuth();

  return (
    <Switch>
      <Route path="/login">
        {user ? <Redirect to="/dashboard" /> : <Login />}
      </Route>
      
      <Route path="/register">
        {user ? <Redirect to="/dashboard" /> : <Register />}
      </Route>
      
      <Route path="/dashboard">
        <ProtectedRoute>
          <DashboardRouter />
        </ProtectedRoute>
      </Route>
      
      <Route path="/">
        {user ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
