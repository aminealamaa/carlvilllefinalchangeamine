import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { Agent } from "../../pages/Agents";
import "./AddAgentModal.css";

interface EditAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AgentFormData) => void;
  isSubmitting: boolean;
  agent: Agent;
}

export interface AgentFormData {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

const roleOptions = ["agent", "commercant"];

export const EditAgentModal = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  agent,
}: EditAgentModalProps) => {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AgentFormData>({
    defaultValues: {
      firstName: agent.first_name,
      lastName: agent.last_name,
      email: agent.email,
      role: agent.role,
    },
  });

  useEffect(() => {
    if (isOpen && agent) {
      reset({
        firstName: agent.first_name,
        lastName: agent.last_name,
        email: agent.email,
        role: agent.role,
      });
    }
  }, [isOpen, agent, reset]);

  const onFormSubmit = async (data: AgentFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error("Error updating agent:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h2>{t("agentDialog.editAgent")}</h2>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label" htmlFor="firstName">
                {t("agentDialog.firstName")}
              </label>
              <input
                id="firstName"
                className="form-input"
                {...register("firstName", {
                  required: "First name is required",
                })}
              />
              {errors.firstName && (
                <span className="error-message">
                  {errors.firstName.message}
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="lastName">
                {t("agentDialog.lastName")}
              </label>
              <input
                id="lastName"
                className="form-input"
                {...register("lastName", { required: "Last name is required" })}
              />
              {errors.lastName && (
                <span className="error-message">{errors.lastName.message}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">
                {t("agentDialog.email")}
              </label>
              <input
                type="email"
                id="email"
                className="form-input"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address",
                  },
                })}
              />
              {errors.email && (
                <span className="error-message">{errors.email.message}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="role">
                {t("agentDialog.role")}
              </label>
              <select
                id="role"
                className="form-select"
                {...register("role", { required: "Please select a role" })}
              >
                <option value="">Select a role</option>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
              {errors.role && (
                <span className="error-message">{errors.role.message}</span>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              {t("agentDialog.cancel")}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? t("agentDialog.saving") : t("agentDialog.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
