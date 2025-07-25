import { createClient } from "@supabase/supabase-js";

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be defined"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "carlaville-auth-token",
    storage: {
      getItem: (key) => {
        if (typeof window === 'undefined') return null;
        const value = localStorage.getItem(key);
        console.log(`Retrieved auth key ${key}: ${!!value}`);
        return value;
      },
      setItem: (key, value) => {
        if (typeof window === 'undefined') return;
        console.log(`Setting auth key ${key}`);
        localStorage.setItem(key, value);
      },
      removeItem: (key) => {
        if (typeof window === 'undefined') return;
        console.log(`Removing auth key ${key}`);
        localStorage.removeItem(key);
      },
    },
    detectSessionInUrl: true,
  },
  global: {
    fetch: (...args) => {
      console.log(`Supabase API request: ${args[0]}`);
      return fetch(...args);
    },
  },
});

// Helper function to check if there's an active session
export const checkSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("Error checking session:", error);
      return null;
    }

    console.log("Session check result:", !!data.session);
    return data.session;
  } catch (err) {
    console.error("Unexpected error in checkSession:", err);
    return null;
  }
};

// Helper to check if we have authentication and retry if needed
export const ensureAuthenticated = async () => {
  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    const session = await checkSession();
    if (session) {
      console.log("Authentication verified");
      return true;
    }

    console.log(
      `No active session found. Retry attempt ${retries + 1}/${maxRetries}`
    );
    await new Promise((resolve) => setTimeout(resolve, 500)); // Wait 500ms between retries

    // Try refreshing the session
    await refreshSession();
    retries++;
  }

  console.error("Failed to authenticate after retries");
  return false;
};

// Helper function to get the current user
export const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error("Error getting user:", error);
      return null;
    }

    console.log("Current user:", data.user?.id);
    return data.user;
  } catch (err) {
    console.error("Unexpected error in getCurrentUser:", err);
    return null;
  }
};

// Helper to refresh session if needed
export const refreshSession = async () => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error("Error refreshing session:", error);
      return null;
    }

    console.log("Session refreshed:", !!data.session);
    return data.session;
  } catch (err) {
    console.error("Unexpected error in refreshSession:", err);
    return null;
  }
};

// Test the database connection
export const testConnection = async () => {
  try {
    console.log("Testing Supabase connection...");

    // First test authorization
    const authTest = await supabase.auth.getSession();
    console.log("Auth status:", !!authTest.data.session);

    // Then test database access with a simple query
    const { data, error } = await supabase
      .from("clients")
      .select("count(*)", { count: "exact", head: true });

    if (error) {
      console.error("Database connection error:", error);
      return false;
    }

    console.log("Database connection successful. Count result:", data);
    return true;
  } catch (err) {
    console.error("Failed to test connection:", err);
    return false;
  }
};

// Call the test function on initialization
if (typeof window !== 'undefined') {
  testConnection().then((success) => {
    console.log("Connection test result:", success);
  });
}