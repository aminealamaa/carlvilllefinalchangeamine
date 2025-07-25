import { User as SupabaseUser } from "@supabase/supabase-js";
import { User as AppUser } from "../contexts/AuthContext";

// Type for users that could be either Supabase User or our App User
type AnyUser = SupabaseUser | AppUser | null;

// Interface for resources that can be permission-controlled
export interface OwnedResource {
  user_id?: string | null;
  agent_id?: string | null;
}

/**
 * Get the role from either a Supabase User or App User
 */
const getRole = (user: AnyUser): string | undefined => {
  if (!user) return undefined;

  // If it's our AppUser
  if ("role" in user && user.role) {
    return user.role;
  }

  // If it's a Supabase User
  if ("user_metadata" in user && user.user_metadata) {
    return user.user_metadata.role as string | undefined;
  }

  return undefined;
};

/**
 * Get the user ID from either a Supabase User or App User
 */
const getUserId = (user: AnyUser): string | undefined => {
  if (!user) return undefined;

  return user.id;
};

/**
 * Check if a user has admin privileges
 */
export const isAdmin = (user: AnyUser): boolean => {
  if (!user) return false;

  const role = getRole(user);
  return role === "admin";
};

/**
 * Check if a user has agent privileges
 */
export const isAgent = (user: AnyUser): boolean => {
  if (!user) return false;

  const role = getRole(user);
  return role === "agent";
};

/**
 * Check if a user has commercial privileges
 */
export const isCommercial = (user: AnyUser): boolean => {
  if (!user) return false;

  const role = getRole(user);
  return role === "commercial";
};

/**
 * Check if a user can edit a specific resource
 * Admins can edit anything
 * Agents and Commercials can only edit their own resources
 */
export const canEditResource = (
  user: AnyUser,
  resource: OwnedResource | null
): boolean => {
  // If no user or no resource, deny permission
  if (!user || !resource) return false;

  // Admins can edit anything
  if (isAdmin(user)) return true;

  // For agents and commercials, they can only edit resources they own
  if (isAgent(user) || isCommercial(user)) {
    const userId = getUserId(user);
    // Check if the resource is owned by this user
    return resource.user_id === userId || resource.agent_id === userId;
  }

  // By default, deny permission
  return false;
};

/**
 * Check if a user can view a specific resource
 * All authenticated users can view resources
 */
export const canViewResource = (user: AnyUser): boolean => {
  // All authenticated users can view resources
  return !!user;
};

/**
 * Check if a user can create a resource
 * All authenticated users can create resources
 */
export const canCreateResource = (user: AnyUser): boolean => {
  // All authenticated users can create resources
  return !!user;
};
