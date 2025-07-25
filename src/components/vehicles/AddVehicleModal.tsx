import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import "./AddVehicleModal.css";

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: VehicleFormData, imageFile?: File) => Promise<void>;
  vehicle?: Vehicle;
  isSubmitting?: boolean;
}

export interface VehicleFormData {
  name: string;
  year: number;
  plateNumber: string;
  status: "available" | "booked" | "maintenance" | "LLD";
  fuelType: "gasoline" | "diesel" | "electric";
  transmission: "automatic" | "manual";
  rate: number;
  kilometrage?: number;
  nextVidange?: string;
}

interface Vehicle extends VehicleFormData {
  id: string;
  brand: string;
  image?: string;
}

export const AddVehicleModal = ({
  isOpen,
  onClose,
  onSubmit,
  vehicle,
  isSubmitting = false,
}: AddVehicleModalProps) => {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<VehicleFormData & { image?: FileList }>({
    defaultValues: vehicle
      ? {
          name: vehicle.name,
          year: vehicle.year,
          plateNumber: vehicle.plateNumber,
          status: vehicle.status,
          fuelType: vehicle.fuelType,
          transmission: vehicle.transmission,
          rate: vehicle.rate,
          kilometrage: vehicle.kilometrage,
          nextVidange: vehicle.nextVidange,
        }
      : {
          status: "available",
          fuelType: "gasoline",
          transmission: "automatic",
        },
  });

  const currentYear = new Date().getFullYear();
  const [imagePreview, setImagePreview] = useState<string | null>(
    vehicle?.image || null
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    if (vehicle) {
      Object.entries(vehicle).forEach(([key, value]) => {
        if (key !== "id" && key !== "image" && key !== "brand") {
          setValue(key as keyof VehicleFormData, value);
        }
      });
      setImagePreview(vehicle.image || null);
    } else {
      reset({
        status: "available",
        fuelType: "gasoline",
        transmission: "automatic",
      });
      setImagePreview(null);
      setSelectedFile(null);
    }

    // Reset error state when modal opens/closes
    setImageError(null);
  }, [vehicle, setValue, reset, isOpen]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setImageError(null);

    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setImageError("Image size exceeds 5MB limit");
        return;
      }

      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/jpg"];
      if (!validTypes.includes(file.type)) {
        setImageError("Only JPG and PNG images are allowed");
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setImagePreview(vehicle?.image || null);
    }
  };

  const onFormSubmit = async (data: VehicleFormData & { image?: FileList }) => {
    try {
      await onSubmit(data, selectedFile || undefined);
      reset();
      onClose();
    } catch (error) {
      console.error("Error submitting vehicle:", error);
      // Error handling is now done in the parent component
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) =>
        e.target === e.currentTarget && !isSubmitting && onClose()
      }
    >
      <div className={`modal-content ${isSubmitting ? "submitting" : ""}`}>
        <div className="modal-header">
          <h2>
            {vehicle
              ? t("fleetDialog.editVehicle")
              : t("fleetDialog.addVehicle")}
          </h2>
          <button
            className="close-button"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)}>
          <div className="modal-body">
            {isSubmitting && (
              <div className="form-overlay">
                <div className="form-loading">
                  <Loader2 size={30} className="spinner-icon" />
                  <p>Processing your request...</p>
                </div>
              </div>
            )}

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="name">
                  {t("fleetDialog.name")}
                </label>
                <input
                  type="text"
                  id="name"
                  className={`form-input ${errors.name ? "error" : ""}`}
                  disabled={isSubmitting}
                  placeholder={t("fleetDialog.vehicleName")}
                  {...register("name", {
                    required: "Vehicle name is required",
                    minLength: {
                      value: 2,
                      message: "Name must be at least 2 characters",
                    },
                    maxLength: {
                      value: 50,
                      message: "Name must not exceed 50 characters",
                    },
                  })}
                />
                {errors.name && (
                  <span className="error-message">{errors.name.message}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="year">
                  {t("fleetDialog.year")}
                </label>
                <input
                  type="number"
                  id="year"
                  className={`form-input ${errors.year ? "error" : ""}`}
                  disabled={isSubmitting}
                  {...register("year", {
                    required: "Year is required",
                    min: { value: 1900, message: "Year must be 1900 or later" },
                    max: {
                      value: currentYear,
                      message: `Year must not exceed ${currentYear}`,
                    },
                    valueAsNumber: true,
                  })}
                />
                {errors.year && (
                  <span className="error-message">{errors.year.message}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="plateNumber">
                  {t("fleetDialog.plateNumber")}
                </label>
                <input
                  type="text"
                  id="plateNumber"
                  className={`form-input ${errors.plateNumber ? "error" : ""}`}
                  disabled={isSubmitting}
                  {...register("plateNumber", {
                    required: "License plate is required",
                    pattern: {
                      value: /^[A-Z0-9]+$/,
                      message: "Please enter a valid license plate number",
                    },
                  })}
                />
                {errors.plateNumber && (
                  <span className="error-message">
                    {errors.plateNumber.message}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="status">
                  {t("fleetDialog.status")}
                </label>
                <select
                  id="status"
                  className={`form-select ${errors.status ? "error" : ""}`}
                  disabled={isSubmitting}
                  {...register("status", { required: "Status is required" })}
                >
                  <option value="available">
                    {t("fleetDialog.available")}
                  </option>
                  <option value="booked">{t("fleetDialog.booked")}</option>
                  <option value="maintenance">
                    {t("fleetDialog.maintenance")}
                  </option>
                  <option value="LLD">{t("fleetDialog.LLD")}</option>
                </select>
                {errors.status && (
                  <span className="error-message">{errors.status.message}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="fuelType">
                  {t("fleetDialog.fuelType")}
                </label>
                <select
                  id="fuelType"
                  className={`form-select ${errors.fuelType ? "error" : ""}`}
                  disabled={isSubmitting}
                  {...register("fuelType", {
                    required: "Fuel type is required",
                  })}
                >
                  <option value="gasoline">{t("fleetDialog.gasoline")}</option>
                  <option value="diesel">{t("fleetDialog.diesel")}</option>
                  <option value="electric">{t("fleetDialog.electric")}</option>
                </select>
                {errors.fuelType && (
                  <span className="error-message">
                    {errors.fuelType.message}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="transmission">
                  {t("fleetDialog.transmission")}
                </label>
                <select
                  id="transmission"
                  className={`form-select ${
                    errors.transmission ? "error" : ""
                  }`}
                  disabled={isSubmitting}
                  {...register("transmission", {
                    required: "Transmission type is required",
                  })}
                >
                  <option value="automatic">
                    {t("fleetDialog.automatic")}
                  </option>
                  <option value="manual">{t("fleetDialog.manual")}</option>
                </select>
                {errors.transmission && (
                  <span className="error-message">
                    {errors.transmission.message}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="rate">
                  {t("fleetDialog.rate")}
                </label>
                <input
                  type="number"
                  id="rate"
                  step="0.01"
                  min="0"
                  className={`form-input ${errors.rate ? "error" : ""}`}
                  disabled={isSubmitting}
                  {...register("rate", {
                    required: "Rate is required",
                    min: {
                      value: 0,
                      message: "Rate must be a positive number",
                    },
                    valueAsNumber: true,
                  })}
                />
                {errors.rate && (
                  <span className="error-message">{errors.rate.message}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="kilometrage">
                  {t("fleetDialog.kilometrage")}
                </label>
                <input
                  type="number"
                  id="kilometrage"
                  step="1"
                  min="0"
                  className={`form-input ${errors.kilometrage ? "error" : ""}`}
                  disabled={isSubmitting}
                  {...register("kilometrage", {
                    min: {
                      value: 0,
                      message: "Kilometrage must be a positive number",
                    },
                    valueAsNumber: true,
                  })}
                />
                {errors.kilometrage && (
                  <span className="error-message">
                    {errors.kilometrage.message}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="nextVidange">
                  {t("fleetDialog.nextOilChange")}
                </label>
                <input
                  type="date"
                  id="nextVidange"
                  className={`form-input ${errors.nextVidange ? "error" : ""}`}
                  disabled={isSubmitting}
                  {...register("nextVidange")}
                />
                {errors.nextVidange && (
                  <span className="error-message">
                    {errors.nextVidange.message}
                  </span>
                )}
              </div>

              <div className="form-group full-width">
                <label className="form-label">{t("fleetDialog.image")}</label>
                <div
                  className={`image-upload-container ${
                    imageError ? "has-error" : ""
                  }`}
                >
                  <input
                    type="file"
                    id="image"
                    accept="image/png, image/jpeg, image/jpg"
                    className="file-input"
                    disabled={isSubmitting}
                    onChange={handleImageChange}
                  />
                  <div className="file-upload-label">
                    {imagePreview ? (
                      <div className="image-preview">
                        <img src={imagePreview} alt="Vehicle preview" />
                      </div>
                    ) : (
                      <>
                        <span className="upload-icon">+</span>
                        <span>{t("fleetDialog.dropImage")}</span>
                      </>
                    )}
                  </div>
                </div>
                {imageError && (
                  <span className="error-message">{imageError}</span>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t("fleetDialog.cancel")}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? t("fleetDialog.saving") : t("fleetDialog.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
