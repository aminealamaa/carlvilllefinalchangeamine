'use client'

import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { supabase, checkSession, getCurrentUser } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export type UserRole = "admin" | "agent" | "commercial" | "user";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: UserRole;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define useAuth hook - exported separately
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Auth Provider Component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [sessionChecked, setSessionChecked] = useState(false);
  const [cachedSession, setCachedSession] = useState<boolean>(false);
  const router = useRouter();

  // Function to get user data from profile
  const fetchUserProfile = async (): Promise<User | null> => {
    // First check if we have a session
    const session = await checkSession();
    if (!session) {
      return null;
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return null;
    }

    try {
      // Get user profile from profiles table
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      console.log({ profile });
      // If profile doesn't exist, create one
      if (error && error.code === "PGRST116") {
        // Profile not found, create it
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: currentUser.id,
            name: currentUser.email?.split("@")[0] || "User",
            email: currentUser.email,
            role: "user", // Default role
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating user profile:", insertError);
          return null;
        }

        return {
          id: currentUser.id,
          name: newProfile.name || currentUser.email?.split("@")[0] || "",
          email: currentUser.email || "",
          avatar: newProfile.avatar_url,
          role: newProfile.role || "user",
        };
      }

      if (error) {
        console.error("Error fetching user profile:", error);
        return null;
      }

      if (!profile) {
        return null;
      }

      return {
        id: currentUser.id,
        name: profile.name || currentUser.email?.split("@")[0] || "",
        email: profile.email || currentUser.email || "",
        avatar: profile.avatar_url,
        role: profile.job_title,
      };
    } catch (error) {
      console.error("Unexpected error in user fetch:", error);
      return null;
    }
  };

  // Use react-query to fetch and cache the user profile
  const {
    data: user,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["user"],
    queryFn: fetchUserProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    gcTime: 0, // Don't cache between browser sessions
    refetchOnMount: true,
    enabled: sessionChecked, // Only run the query after we've checked for a session
  });

  // Check for session when component mounts
  useEffect(() => {
    const checkForSession = async () => {
      setIsLoading(true);
      try {
        // Check for locally cached session first
        if (typeof window !== 'undefined') {
          const cachedUserStr = localStorage.getItem("carlaville-user-cache");
          if (cachedUserStr) {
            try {
              setCachedSession(true);
              setIsLoading(false);
            } catch {
              localStorage.removeItem("carlaville-user-cache");
            }
          }
        }

        // Explicitly call getSession to check for an existing session
        const session = await checkSession();
        console.log("Session check:", !!session);
        setSessionChecked(true);
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
        if (!cachedSession) {
          setIsLoading(false);
        }
      }
    };

    checkForSession();
  }, [cachedSession]);

  // Cache user data when it changes
  useEffect(() => {
    if (user && typeof window !== 'undefined') {
      localStorage.setItem("carlaville-user-cache", JSON.stringify(user));
    } else if (sessionChecked && !user && typeof window !== 'undefined') {
      localStorage.removeItem("carlaville-user-cache");
    }
  }, [user, sessionChecked]);

  // Set up auth state change listener
  useEffect(() => {
    if (!sessionChecked) return;

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event, !!session);
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await refetch();
      } else if (event === "SIGNED_OUT") {
        if (typeof window !== 'undefined') {
          localStorage.removeItem("carlaville-user-cache");
        }
        await refetch();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [sessionChecked, refetch]);

  // Listen for visibility changes (tab switching)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        // Just do a quick session check without setting loading state
        const session = await checkSession();
        if (session) {
          // Only refetch if we actually have a session
          await refetch();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refetch]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      console.log({ error, data });

      if (error) {
        throw error;
      }

      await refetch();
    } catch (error) {
      setIsLoading(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem("carlaville-user-cache");
      }
      await supabase.auth.signOut();
      await refetch();
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  // Memoize context value to prevent unnecessary re-renders
  const value = React.useMemo(
    () => ({
      user: user ?? null,
      isAuthenticated: !!user,
      isLoading: isLoading && isFetching,
      login,
      logout,
    }),
    [user, isLoading, isFetching]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};