import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Upload, Trash } from "lucide-react";
import { InsuranceDocument, InsuranceFormData } from "../../types/insurance";
import { supabase } from "../../lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface VehicleData {
  id: string;
  brand: string;
  model: string;
  plate_number: string;
  status: string;
}

interface ClientData {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

interface AddInsuranceDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: InsuranceFormData, imageFiles?: File[]) => void;
  document?: InsuranceDocument;
  isSubmitting: boolean;
}

export const AddInsuranceDocumentModal: React.FC<
  AddInsuranceDocumentModalProps
> = ({ isOpen, onClose, onSubmit, document, isSubmitting }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<InsuranceFormData>({
    name: "",
    type: "policy",
    vehicle_id: "",
    client_id: "",
    status: "pending",
    signed: false,
    repair_cost: undefined,
    payment_amount: undefined,
    balance_due: undefined,
  });

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

  // Fetch vehicles with React Query
  const {
    data: vehicles = [],
    isLoading: isLoadingVehicles,
    error: vehiclesError,
  } = useQuery({
    queryKey: ["vehicles-for-insurance"],
    queryFn: async () => {
      console.log("Fetching vehicles for insurance form");
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, brand, model, plate_number, status");

      if (error) {
        console.error("Error fetching vehicles:", error);
        toast.error(`Failed to load vehicles: ${error.message}`);
        throw error;
      }

      return data || [];
    },
    enabled: isOpen, // Only fetch when modal is open
    staleTime: 60 * 1000, // 1 minute
    retry: 2,
  });

  // Fetch clients with React Query
  const {
    data: clients = [],
    isLoading: isLoadingClients,
    error: clientsError,
  } = useQuery({
    queryKey: ["clients-for-insurance"],
    queryFn: async () => {
      console.log("Fetching clients for insurance form");
      const { data, error } = await supabase
        .from("clients")
        .select("id, first_name, last_name, email");

      if (error) {
        console.error("Error fetching clients:", error);
        toast.error(`Failed to load clients: ${error.message}`);
        throw error;
      }

      return data || [];
    },
    enabled: isOpen, // Only fetch when modal is open
    staleTime: 60 * 1000, // 1 minute
    retry: 2,
  });

  // Show errors if any
  useEffect(() => {
    if (vehiclesError) {
      console.error("Error loading vehicles:", vehiclesError);
    }
    if (clientsError) {
      console.error("Error loading clients:", clientsError);
    }
  }, [vehiclesError, clientsError]);

  // Initialize form data when editing an existing document
  useEffect(() => {
    if (document) {
      setFormData({
        name: document.name,
        type: document.type,
        description: document.description,
        vehicle_id: document.vehicle_id,
        client_id: document.client_id,
        expires_at: document.expires_at,
        status: document.status,
        signed: document.signed,
        repair_cost: document.repair_cost,
        payment_amount: document.payment_amount,
        balance_due: document.balance_due,
        policy_number: document.policy_number,
      });
    } else {
      // Reset form for new document
      setFormData({
        name: "",
        type: "policy",
        vehicle_id: "",
        client_id: "",
        status: "pending",
        signed: false,
      });
      setImageFiles([]);
      setImagePreviewUrls([]);
    }
  }, [document]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    if (name === "repair_cost" || name === "payment_amount") {
      const numValue = value === "" ? undefined : parseFloat(value);

      // Calculate balance due
      let balance = undefined;
      if (name === "repair_cost") {
        const paymentAmount = formData.payment_amount || 0;
        balance = value === "" ? undefined : parseFloat(value) - paymentAmount;
      } else if (name === "payment_amount") {
        const repairCost = formData.repair_cost || 0;
        balance = value === "" ? undefined : repairCost - parseFloat(value);
      }

      setFormData({
        ...formData,
        [name]: numValue,
        balance_due: balance,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData({
      ...formData,
      [name]: checked,
    });
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImageFiles((prevFiles) => [...prevFiles, ...files]);

      // Create preview URLs for the new images
      const newPreviewUrls = files.map((file) => URL.createObjectURL(file));
      setImagePreviewUrls((prevUrls) => [...prevUrls, ...newPreviewUrls]);
    }
  };

  const removeImage = (index: number) => {
    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(imagePreviewUrls[index]);

    // Remove the image from the arrays
    setImageFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
    setImagePreviewUrls((prevUrls) => prevUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData, imageFiles.length > 0 ? imageFiles : undefined);
  };

  if (!isOpen) return null;

  const isLoading = isLoadingVehicles || isLoadingClients;

  return (
    <div className="modal-overlay">
      <div className="modal-container insurance-modal">
        <div className="modal-header">
          <h2>
            {document
              ? t("insurance.editDocument")
              : t("insurance.addDocument")}
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <div className="loading-indicator" style={{ padding: "2rem" }}>
            <div className="spinner"></div>
            <p>{t("insurance.loadingFormData")}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="insurance-form">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">{t("insurance.documentName")}</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={t("insurance.enterDocumentName")}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="type">{t("insurance.documentType")}</label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="form-select"
                  required
                >
                  <option value="policy">{t("insurance.policy")}</option>
                  <option value="claim">{t("insurance.claim")}</option>
                  <option value="invoice">{t("insurance.invoice")}</option>
                  <option value="other">{t("insurance.other")}</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="description">
                  {t("insurance.description")}
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description || ""}
                  onChange={handleChange}
                  placeholder={t("insurance.enterDescription")}
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <label htmlFor="client_id">{t("insurance.client")}</label>
                <select
                  id="client_id"
                  name="client_id"
                  value={formData.client_id}
                  onChange={handleChange}
                  className="form-select"
                  required
                >
                  <option value="">{t("insurance.selectClient")}</option>
                  {clients.map((client: ClientData) => (
                    <option key={client.id} value={client.id}>
                      {`${client.first_name} ${client.last_name}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="vehicle_id">{t("insurance.vehicle")}</label>
                <select
                  id="vehicle_id"
                  name="vehicle_id"
                  value={formData.vehicle_id}
                  onChange={handleChange}
                  className="form-select"
                  required
                >
                  <option value="">{t("insurance.selectVehicle")}</option>
                  {vehicles.map((vehicle: VehicleData) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {`${vehicle.brand} ${vehicle.model} (${vehicle.plate_number})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="expires_at">{t("insurance.expiryDate")}</label>
                <input
                  type="date"
                  id="expires_at"
                  name="expires_at"
                  value={formData.expires_at || ""}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="status">{t("insurance.status")}</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="form-select"
                  required
                >
                  <option value="active">{t("insurance.active")}</option>
                  <option value="pending">{t("insurance.pending")}</option>
                  <option value="expired">{t("insurance.expired")}</option>
                  <option value="cancelled">{t("insurance.cancelled")}</option>
                </select>
              </div>

              <div className="form-group checkbox-group">
                <label htmlFor="signed">
                  <input
                    type="checkbox"
                    id="signed"
                    name="signed"
                    checked={formData.signed}
                    onChange={handleCheckboxChange}
                    className="form-checkbox"
                  />
                  {t("insurance.signed")}
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="policy_number">
                  {t("insurance.policyNumber")}
                </label>
                <input
                  type="text"
                  id="policy_number"
                  name="policy_number"
                  value={formData.policy_number || ""}
                  onChange={handleChange}
                  placeholder={t("insurance.enterPolicyNumber")}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="repair_cost">{t("insurance.repairCost")}</label>
                <input
                  type="number"
                  id="repair_cost"
                  name="repair_cost"
                  value={formData.repair_cost || ""}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="form-input"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label htmlFor="payment_amount">
                  {t("insurance.paymentAmount")}
                </label>
                <input
                  type="number"
                  id="payment_amount"
                  name="payment_amount"
                  value={formData.payment_amount || ""}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="form-input"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label htmlFor="balance_due">{t("insurance.balanceDue")}</label>
                <input
                  type="number"
                  id="balance_due"
                  name="balance_due"
                  value={formData.balance_due || ""}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="form-input"
                  readOnly
                />
              </div>

              <div className="form-group full-width">
                <label>{t("insurance.images")}</label>
                <div className="file-upload-container">
                  <input
                    type="file"
                    id="document-images"
                    multiple
                    accept="image/*"
                    onChange={handleImagesChange}
                    className="file-input"
                    disabled={isSubmitting}
                  />
                  <label
                    htmlFor="document-images"
                    className="file-upload-label"
                  >
                    <Upload size={20} />
                    <span>{t("insurance.uploadImages")}</span>
                  </label>
                  <div className="upload-hint">{t("insurance.dropImages")}</div>
                </div>

                {imagePreviewUrls.length > 0 && (
                  <div className="image-previews">
                    {imagePreviewUrls.map((url, index) => (
                      <div key={index} className="image-preview-item">
                        <img src={url} alt={`Preview ${index + 1}`} />
                        <button
                          type="button"
                          className="remove-image-btn"
                          onClick={() => removeImage(index)}
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                {t("insurance.cancel")}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? t("insurance.saving") : t("insurance.save")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
