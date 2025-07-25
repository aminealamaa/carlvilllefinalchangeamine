import { BrowserRouter as Router } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { AppRoutes } from "./routes/AppRoutes";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { ReactNode, useState, useEffect } from "react";
import { Toaster, toast } from "sonner";
import { checkSession, refreshSession } from "./lib/supabase";
import "./App.css";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnMount: false, // Don't refetch when components mount to prevent unexpected reloads
    },
  },
});

// Session monitor to detect and fix auth issues
const SessionMonitor = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Set up an interval to regularly check session status
    const checkInterval = setInterval(async () => {
      const session = await checkSession();
      if (!session && isAuthenticated) {
        console.log(
          "Session check failed but auth context shows authenticated - trying refresh"
        );
        const refreshed = await refreshSession();

        if (refreshed) {
          console.log("Session refreshed successfully");
          // Invalidate all queries to trigger refetching with new session
          queryClient.invalidateQueries();
        } else {
          console.error("Session refresh failed - showing notification");
          toast.error(
            "Your session has expired. Please refresh the page or login again.",
            {
              duration: 10000,
              action: {
                label: "Refresh Now",
                onClick: () => window.location.reload(),
              },
            }
          );
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkInterval);
  }, [queryClient, isAuthenticated]);

  return null;
};

// Wrap the app content with auth loading check
const AuthenticatedApp = ({ children }: { children: ReactNode }) => {
  const { isLoading } = useAuth();
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    // Mark initial loading as complete after first auth check
    if (!isLoading && !initialLoadComplete) {
      setInitialLoadComplete(true);
    }
  }, [isLoading, initialLoadComplete]);

  // Show loading screen only on initial load, not during tab switches
  if (isLoading && !initialLoadComplete) {
    return <div className="app-loading">Loading...</div>;
  }

  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <Toaster position="top-right" richColors />
              <SessionMonitor />
              <AuthenticatedApp>
                <AppLayout>
                  <AppRoutes />
                </AppLayout>
              </AuthenticatedApp>
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </Router>
  );
}

export default App;
