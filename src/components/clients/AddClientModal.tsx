import React from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import "./AddClientModal.css";

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ClientFormData) => Promise<void>;
  client?: Client;
  isSubmitting?: boolean;
}

export interface ClientFormData {
  fullName: string;
  email: string;
  phone: string;
  idCardNumber: string;
  paymentMethod: "cash" | "card" | "site";
}

interface Client extends ClientFormData {
  id: string;
}

export const AddClientModal = ({
  isOpen,
  onClose,
  onSubmit,
  client,
  isSubmitting,
}: AddClientModalProps) => {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<ClientFormData>({
    defaultValues: client || {
      paymentMethod: "cash",
    },
  });

  React.useEffect(() => {
    if (client) {
      Object.entries(client).forEach(([key, value]) => {
        if (key !== "id") {
          setValue(key as keyof ClientFormData, value);
        }
      });
    } else {
      reset({
        paymentMethod: "cash",
      });
    }
  }, [client, setValue, reset]);

  const onFormSubmit = async (data: ClientFormData) => {
    try {
      await onSubmit(data);
      reset();
      onClose();
    } catch (error) {
      console.error("Error submitting client:", error);
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
          <h2>
            {client
              ? t("clientDialog.editClient")
              : t("clientDialog.addClient")}
          </h2>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="fullName">
                  {t("clientDialog.fullName")}
                </label>
                <input
                  type="text"
                  id="fullName"
                  className="form-input"
                  {...register("fullName", {
                    required: "Full name is required",
                  })}
                />
                {errors.fullName && (
                  <span className="error-message">
                    {errors.fullName.message}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="phone">
                  {t("clientDialog.phone")}
                </label>
                <input
                  type="tel"
                  id="phone"
                  className="form-input"
                  {...register("phone", {
                    required: "Phone number is required",
                  })}
                />
                {errors.phone && (
                  <span className="error-message">{errors.phone.message}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  {t("clientDialog.email")}
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
                <label className="form-label" htmlFor="idCardNumber">
                  {t("clientDialog.idCardNumber")}
                </label>
                <input
                  type="text"
                  id="idCardNumber"
                  className="form-input"
                  {...register("idCardNumber", {
                    required: "ID card number is required",
                  })}
                />
                {errors.idCardNumber && (
                  <span className="error-message">
                    {errors.idCardNumber.message}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="paymentMethod">
                  {t("clientDialog.paymentMethod")}
                </label>
                <select
                  id="paymentMethod"
                  className="form-select"
                  {...register("paymentMethod", {
                    required: "Payment method is required",
                  })}
                >
                  <option value="cash">{t("clientDialog.cash")}</option>
                  <option value="card">{t("clientDialog.card")}</option>
                  <option value="site">{t("clientDialog.site")}</option>
                </select>
                {errors.paymentMethod && (
                  <span className="error-message">
                    {errors.paymentMethod.message}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              {t("clientDialog.cancel")}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? t("clientDialog.saving") : t("clientDialog.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
