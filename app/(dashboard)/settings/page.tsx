'use client'

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  User,
  Lock,
  Bell,
  Globe,
  Shield,
  PaintBucket,
  UploadCloud,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import "@/pages/Settings.css";

// Define the Profile type based on your database schema
interface Profile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  created_at?: string;
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [activeSection, setActiveSection] = useState("account");
  const [isUploading, setIsUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const sections = [
    {
      id: "account",
      label: t("settings.accountSettings"),
      icon: <User size={20} />,
    },
    {
      id: "security",
      label: t("settings.securitySettings"),
      icon: <Lock size={20} />,
    },
    {
      id: "notifications",
      label: t("settings.notificationSettings"),
      icon: <Bell size={20} />,
    },
    {
      id: "appearance",
      label: t("settings.appearanceSettings"),
      icon: <PaintBucket size={20} />,
    },
    {
      id: "region",
      label: t("settings.regionSettings"),
      icon: <Globe size={20} />,
    },
    {
      id: "privacy",
      label: t("settings.privacySettings"),
      icon: <Shield size={20} />,
    },
  ];

  // Fetch user profile from Supabase
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        toast.error("You must be logged in to view settings");
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (error) {
        toast.error("Failed to load profile");
        throw error;
      }

      return data as Profile;
    },
  });

  // Update profile in Supabase
  const { mutate: updateProfile, isPending: isUpdating } = useMutation({
    mutationFn: async (updatedProfile: Partial<Profile>) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        toast.error("You must be logged in to update settings");
        throw new Error("User not authenticated");
      }

      const toastId = toast.loading("Updating profile...");

      try {
        // Upload avatar if a new one was selected
        let avatarUrl = updatedProfile.avatar_url;
        if (avatarFile) {
          setIsUploading(true);
          const fileExt = avatarFile.name.split(".").pop();
          const fileName = `${uuidv4()}.${fileExt}`;
          const filePath = `avatars/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, avatarFile);

          if (uploadError) {
            toast.dismiss(toastId);
            toast.error(`Failed to upload avatar: ${uploadError.message}`);
            throw uploadError;
          }

          // Get public URL
          const { data } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);
          avatarUrl = data.publicUrl;
          setIsUploading(false);
        }

        // Update profile
        const { error } = await supabase
          .from("profiles")
          .update({
            ...updatedProfile,
            avatar_url: avatarUrl,
          })
          .eq("id", currentUser.id);

        if (error) {
          toast.dismiss(toastId);
          toast.error(`Failed to update profile: ${error.message}`);
          throw error;
        }

        toast.dismiss(toastId);
        toast.success("Profile updated successfully");

        return {
          ...updatedProfile,
          avatar_url: avatarUrl,
        };
      } catch (error) {
        console.error("Error updating profile:", error);
        setIsUploading(false);
        throw error;
      }
    },
    onSuccess: () => {
      // Refetch the profile data
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });

  // Set avatar preview when profile loads
  useEffect(() => {
    if (profile?.avatar_url) {
      setAvatarPreview(profile.avatar_url);
    }
  }, [profile]);

  // Handle file input change
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);

    // Create a preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle form submission
  const handleSaveChanges = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const updatedProfile: Partial<Profile> = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
    };

    updateProfile(updatedProfile);
  };

  // Handle remove avatar
  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
    updateProfile({ avatar_url: "" });
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>{t("settings.title")}</h1>
      </div>

      <div className="settings-container">
        <div className="settings-sidebar">
          {sections.map((section) => (
            <button
              key={section.id}
              className={`settings-nav-item ${
                activeSection === section.id ? "active" : ""
              }`}
              onClick={() => setActiveSection(section.id)}
            >
              {section.icon}
              <span>{section.label}</span>
            </button>
          ))}
        </div>

        <div className="settings-content">
          {activeSection === "account" && (
            <div className="settings-section">
              <h2 className="settings-section-title">
                {t("settings.accountSettings")}
              </h2>

              {isLoadingProfile ? (
                <div className="loading-indicator">
                  <div className="spinner"></div>
                  <p>{t("settings.loadingProfile")}</p>
                </div>
              ) : (
                <form className="form-container" onSubmit={handleSaveChanges}>
                  <div className="profile-avatar-section">
                    <div className="profile-avatar">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Profile" />
                      ) : (
                        <div className="avatar-placeholder">
                          <User size={40} />
                        </div>
                      )}
                      {isUploading && (
                        <div className="avatar-overlay">Uploading...</div>
                      )}
                    </div>
                    <div className="avatar-actions">
                      <label className="btn btn-secondary">
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={handleAvatarChange}
                          disabled={isUploading || isUpdating}
                        />
                        <UploadCloud size={16} className="icon-left" />
                        {t("settings.uploadPhoto")}
                      </label>
                      {avatarPreview && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleRemoveAvatar}
                          disabled={isUploading || isUpdating}
                        >
                          {t("settings.remove")}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="name">
                      {t("settings.fullName")}
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className="form-input"
                      defaultValue={profile?.name || ""}
                      required
                      disabled={isUpdating}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="email">
                      {t("settings.email")}
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="form-input"
                      defaultValue={profile?.email || ""}
                      required
                      disabled={isUpdating}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="phone">
                      {t("settings.phone")}
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      className="form-input"
                      defaultValue={profile?.phone || ""}
                      disabled={isUpdating}
                    />
                  </div>

                  <div className="form-actions">
                    <button
                      type="submit"
                      className="btn"
                      disabled={isUploading || isUpdating}
                    >
                      {isUpdating
                        ? t("settings.saving")
                        : t("settings.saveChanges")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() =>
                        queryClient.invalidateQueries({
                          queryKey: ["userProfile"],
                        })
                      }
                      disabled={isUploading || isUpdating}
                    >
                      {t("settings.cancel")}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeSection === "appearance" && (
            <div className="settings-section">
              <h2 className="settings-section-title">
                {t("settings.appearanceSettings")}
              </h2>

              <div className="form-container">
                <div className="theme-selector">
                  <h3>{t("settings.theme")}</h3>

                  <div className="theme-options">
                    <div
                      className={`theme-option ${
                        theme === "light" ? "active" : ""
                      }`}
                      onClick={() => theme !== "light" && toggleTheme()}
                    >
                      <div className="theme-preview light-theme">
                        <div className="preview-header"></div>
                        <div className="preview-sidebar"></div>
                        <div className="preview-content"></div>
                      </div>
                      <span>{t("settings.light")}</span>
                      {theme === "light" && (
                        <div className="active-marker"></div>
                      )}
                    </div>

                    <div
                      className={`theme-option ${
                        theme === "dark" ? "active" : ""
                      }`}
                      onClick={() => theme !== "dark" && toggleTheme()}
                    >
                      <div className="theme-preview dark-theme">
                        <div className="preview-header"></div>
                        <div className="preview-sidebar"></div>
                        <div className="preview-content"></div>
                      </div>
                      <span>{t("settings.dark")}</span>
                      {theme === "dark" && (
                        <div className="active-marker"></div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="appearance-settings">
                  <h3>{t("settings.interfaceDensity")}</h3>

                  <div className="form-group">
                    <div className="radio-option">
                      <input
                        type="radio"
                        name="density"
                        id="density-comfortable"
                        defaultChecked
                      />
                      <label htmlFor="density-comfortable">
                        {t("settings.comfortable")}
                      </label>
                    </div>
                    <div className="radio-option">
                      <input type="radio" name="density" id="density-compact" />
                      <label htmlFor="density-compact">
                        {t("settings.compact")}
                      </label>
                    </div>
                  </div>

                  <h3>{t("settings.fontSize")}</h3>

                  <div className="form-group">
                    <select className="form-input">
                      <option value="small">{t("settings.small")}</option>
                      <option value="medium" selected>
                        {t("settings.medium")}
                      </option>
                      <option value="large">{t("settings.large")}</option>
                    </select>
                  </div>
                </div>

                <div className="form-actions">
                  <button className="btn btn-primary">
                    {t("settings.saveChanges")}
                  </button>
                  <button className="btn btn-secondary">
                    {t("settings.resetToDefault")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection !== "account" && activeSection !== "appearance" && (
            <div className="settings-section">
              <h2 className="settings-section-title">
                {sections.find((s) => s.id === activeSection)?.label}
              </h2>
              <p className="settings-placeholder">
                {t("settings.underDevelopment", {
                  section:
                    sections.find((s) => s.id === activeSection)?.label ||
                    activeSection,
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}