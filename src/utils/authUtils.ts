import { supabase } from "../lib/supabase";

// Type for creating a new user
interface CreateUserData {
  email: string;
  password: string;
  name: string;
  avatarUrl?: string;
}

/**
 * Admin function to create a new user
 * This should only be called by admin users
 */
export const createUser = async (userData: CreateUserData) => {
  // First, check if the current user is an admin
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("You must be logged in to perform this action");
  }

  // Get the current user's role
  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (!currentUserProfile || currentUserProfile.role !== "admin") {
    throw new Error("Only administrators can create new users");
  }

  // Create the new user
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
    });

  if (authError) {
    throw authError;
  }

  if (!authData.user) {
    throw new Error("Failed to create user");
  }

  // Create the user profile
  const { error: profileError } = await supabase.from("profiles").insert({
    id: authData.user.id,
    name: userData.name,
    avatar_url: userData.avatarUrl,
  });

  if (profileError) {
    // Attempt to clean up the auth user if profile creation fails
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw profileError;
  }

  return authData.user;
};

/**
 * Get all users (admin only)
 */
export const getAllUsers = async () => {
  // Check if the current user is an admin
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("You must be logged in to perform this action");
  }

  // Get the current user's role
  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (!currentUserProfile || currentUserProfile.role !== "admin") {
    throw new Error("Only administrators can view all users");
  }

  // Get all user profiles
  const { data: profiles, error } = await supabase.from("profiles").select("*");

  if (error) {
    throw error;
  }

  return profiles;
};

/**
 * Update a user's profile (admin or self)
 */
export const updateUserProfile = async (
  userId: string,
  updates: Partial<Omit<CreateUserData, "password">>
) => {
  // Check if the current user is an admin or the user themselves
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("You must be logged in to perform this action");
  }

  // Get the current user's role
  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (!currentUserProfile) {
    throw new Error("User profile not found");
  }

  // Only allow admins to update other users, or users to update themselves
  if (session.user.id !== userId && currentUserProfile.role !== "admin") {
    throw new Error("You do not have permission to update this user");
  }

  // Only allow admins to change roles
  if (session.user.id !== userId && currentUserProfile.role !== "admin") {
    throw new Error("Only administrators can change user roles");
  }

  // Update the profile
  const { error } = await supabase
    .from("profiles")
    .update({
      name: updates.name,
      avatar_url: updates.avatarUrl,
    })
    .eq("id", userId);

  if (error) {
    throw error;
  }

  return true;
};

/**
 * Delete a user (admin only)
 */
export const deleteUser = async (userId: string) => {
  // Check if the current user is an admin
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("You must be logged in to perform this action");
  }

  // Get the current user's role
  const { data: currentUserProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (!currentUserProfile || currentUserProfile.role !== "admin") {
    throw new Error("Only administrators can delete users");
  }

  // Prevent admins from deleting themselves
  if (session.user.id === userId) {
    throw new Error("You cannot delete your own account");
  }

  // Delete the user
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    throw error;
  }

  return true;
};
