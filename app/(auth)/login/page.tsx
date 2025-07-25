'use client'

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Car, Mail, Lock, Eye, EyeOff } from "lucide-react";
import "./login.css";

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [localLoading, setLocalLoading] = useState(false);

  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (localLoading || isLoading) return;

    if (!email || !password) {
      setError(t("login.enterBoth"));
      return;
    }

    try {
      setError("");
      setLocalLoading(true);

      await login(email, password);
      // Router will handle redirect via useEffect
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t("login.invalidCredentials");
      setError(errorMessage);
    } finally {
      setLocalLoading(false);
    }
  };

  // Don't show login form if we're still checking auth state
  if (isLoading && !localLoading) {
    return <div className="app-loading">{t("common.loading")}</div>;
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-branding">
          <div className="logo">
            <Car size={32} className="logo-icon" />
            <h1 className="logo-text">{t("branding.appName")}</h1>
          </div>
          <p className="branding-tagline">{t("branding.tagline")}</p>
        </div>

        <div className="login-form-container">
          <h2 className="login-heading">{t("login.welcomeBack")}</h2>
          <p className="login-subheading">{t("login.loginSubheading")}</p>

          {error && <div className="error-message">{error}</div>}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                {t("login.email")}
              </label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  id="email"
                  className="form-input"
                  placeholder={t("login.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                {t("login.password")}
              </label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  className="form-input"
                  placeholder={t("login.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                />
                <span>{t("login.rememberMe")}</span>
              </label>

              <a href="#forgot-password" className="forgot-password">
                {t("login.forgotPassword")}
              </a>
            </div>

            <button
              type="submit"
              className={`login-button ${localLoading ? "loading" : ""}`}
              disabled={localLoading}
            >
              {localLoading ? t("login.loggingIn") : t("login.loginButton")}
            </button>
          </form>

          <div className="login-footer">
            <p>
              {t("login.noAccount")}{" "}
              <a href="#contact-admin">{t("login.contactAdmin")}</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}