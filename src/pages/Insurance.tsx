import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Plus,
  Download,
  Upload,
  Search,
  Check,
  Trash,
  Camera,
} from "lucide-react";
import "./Insurance.css";
import {
  InsuranceDocument,
  InsuranceFormData,
  InsuranceDocumentType,
} from "../types/insurance";
import { AddInsuranceDocumentModal } from "../components/insurance/AddInsuranceDocumentModal";
import { supabase, getCurrentUser } from "../lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { isAdmin } from "../utils/permissionUtils";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

// Define a type for the raw document data from Supabase
interface RawInsuranceDocument {
  id: string;
  name: string;
  type: string;
  description?: string;
  vehicle_id: string;
  client_id: string;
  created_at: string;
  expires_at?: string;
  status: string;
  signed: boolean;
  repair_cost?: number;
  payment_amount?: number;
  balance_due?: number;
  policy_number?: string;
  images?: string[];
  document_url?: string;
  user_id: string;
  vehicles: {
    id: string;
    brand: string;
    model: string;
    plate_number: string;
    status: string;
  } | null;
  clients: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
  } | null;
}

export const Insurance = () => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<
    InsuranceDocument | undefined
  >();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch insurance documents from Supabase
  const {
    data: documents = [],
    isLoading: isLoadingDocuments,
    error: documentsError,
    refetch: refetchDocuments,
  } = useQuery({
    queryKey: ["insurance-documents"],
    queryFn: async () => {
      const toastId = toast.loading("Loading insurance documents...");
      try {
        console.log("Fetching insurance documents...");

        // Fetch insurance documents with related data
        const { data, error } = await supabase
          .from("insurance_documents")
          .select(
            `
            id,
            name,
            type,
            description,
            vehicle_id,
            client_id,
            created_at,
            expires_at,
            status,
            signed,
            repair_cost,
            payment_amount,
            balance_due,
            policy_number,
            images,
            document_url,
            user_id,
            vehicles:vehicle_id (
              id, 
              brand, 
              model, 
              plate_number, 
              status
            ),
            clients:client_id (
              id, 
              first_name,
              last_name, 
              email
            )
          `
          )
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching insurance documents:", error);
          toast.dismiss(toastId);
          toast.error(`Failed to load insurance documents: ${error.message}`);
          throw error;
        }

        toast.dismiss(toastId);

        if (!data || data.length === 0) {
          console.log("No insurance documents found");
          return [];
        }

        console.log("Fetched insurance documents:", data);
        console.log("First document sample:", data[0]);

        // Format the data to match our InsuranceDocument interface
        return data.map((docData: unknown) => {
          // Cast the document to our expected shape
          const doc = docData as RawInsuranceDocument;

          // Access vehicles and clients objects directly
          const vehicle = doc.vehicles;
          console.log("Vehicle info:", vehicle);

          const client = doc.clients;
          console.log("Client info:", client);

          return {
            id: doc.id,
            name: doc.name,
            type: doc.type as InsuranceDocumentType,
            description: doc.description,
            vehicle_id: doc.vehicle_id,
            vehicle_name: vehicle
              ? `${vehicle.brand} ${vehicle.model} (${vehicle.plate_number})`
              : "Unknown",
            client_id: doc.client_id,
            client_name: client
              ? `${client.first_name} ${client.last_name}`
              : "Unknown",
            created_at: doc.created_at,
            expires_at: doc.expires_at,
            status: doc.status,
            signed: doc.signed,
            repair_cost: doc.repair_cost,
            payment_amount: doc.payment_amount,
            balance_due: doc.balance_due,
            policy_number: doc.policy_number,
            images: doc.images || [],
            document_url: doc.document_url,
            user_id: doc.user_id,
          };
        });
      } catch (error) {
        console.error("Error in queryFn:", error);
        toast.dismiss(toastId);
        throw error;
      }
    },
    staleTime: 60 * 1000, // 1 minute - reduced to refresh more often
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Enable refetching when window gets focus
    retry: 2, // Retry failed requests twice
  });

  // Upload images to Supabase Storage
  const uploadInsuranceImages = async (files: File[]): Promise<string[]> => {
    try {
      setIsUploading(true);
      const toastId = toast.loading("Uploading images...");

      const uploadPromises = files.map(async (file) => {
        const fileExt = file.name.split(".").pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `insurance/${fileName}`;

        // First try to upload
        const { error: uploadError } = await supabase.storage
          .from("insurance")
          .upload(filePath, file);

        if (uploadError) {
          console.error("Error uploading image:", uploadError);
          throw uploadError;
        }

        // Get public URL
        const { data } = supabase.storage
          .from("insurance")
          .getPublicUrl(filePath);
        return data.publicUrl;
      });

      const imageUrls = await Promise.all(uploadPromises);
      toast.dismiss(toastId);
      toast.success(`Successfully uploaded ${files.length} images`);
      return imageUrls;
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error("Failed to upload one or more images. Please try again.");
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // Create or update insurance document mutation
  const { mutate: saveInsuranceDocument, isPending: isSaving } = useMutation({
    mutationFn: async (data: {
      formData: InsuranceFormData;
      imageFiles?: File[];
    }) => {
      const { formData, imageFiles } = data;

      try {
        const toastId = toast.loading(
          selectedDocument ? "Updating document..." : "Adding new document..."
        );

        // Get current user
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          toast.dismiss(toastId);
          toast.error("You must be logged in to add or edit documents");
          throw new Error("User not authenticated");
        }

        // Upload images if provided
        let imageUrls: string[] = [];
        if (imageFiles && imageFiles.length > 0) {
          try {
            imageUrls = await uploadInsuranceImages(imageFiles);
            console.log("Uploaded image URLs:", imageUrls);
          } catch (uploadError) {
            console.error("Failed to upload images:", uploadError);
            toast.dismiss(toastId);
            toast.error("Failed to upload images. Document not saved.");
            throw uploadError;
          }
        }

        // Prepare document data for Supabase
        const documentData: Record<string, unknown> = {
          name: formData.name,
          type: formData.type,
          description: formData.description,
          vehicle_id: formData.vehicle_id,
          client_id: formData.client_id,
          status: formData.status,
          signed: formData.signed,
          repair_cost: formData.repair_cost,
          payment_amount: formData.payment_amount,
          balance_due: formData.balance_due,
          policy_number: formData.policy_number,
          user_id: currentUser.id,
        };

        console.log("Document data being saved:", documentData);

        // Add expiry date if provided
        if (formData.expires_at) {
          documentData.expires_at = formData.expires_at;
        }

        // Only update images if new ones were uploaded
        if (imageUrls.length > 0) {
          if (selectedDocument) {
            // In case of update, we append to existing images
            documentData.images = [
              ...(selectedDocument.images || []),
              ...imageUrls,
            ];
          } else {
            // In case of new document
            documentData.images = imageUrls;
          }
        }

        // Create or update document in Supabase
        let result;
        if (selectedDocument) {
          // Update existing document
          console.log("Updating document with ID:", selectedDocument.id);
          const { error, data } = await supabase
            .from("insurance_documents")
            .update(documentData)
            .eq("id", selectedDocument.id)
            .select();

          if (error) {
            console.error("Error updating document:", error);
            toast.dismiss(toastId);
            toast.error(`Failed to update document: ${error.message}`);
            throw error;
          }

          console.log("Document updated successfully:", data);
          result = { success: true, updated: true, data };
        } else {
          // Create new document
          console.log("Creating new document");
          const { error, data } = await supabase
            .from("insurance_documents")
            .insert(documentData)
            .select();

          console.log("Insert result:", { error, data });

          if (error) {
            console.error("Error creating document:", error);
            toast.dismiss(toastId);
            toast.error(`Failed to add document: ${error.message}`);
            throw error;
          }

          console.log("Document added successfully:", data);
          result = { success: true, inserted: true, data };
        }

        toast.dismiss(toastId);
        toast.success(
          selectedDocument
            ? "Document updated successfully"
            : "Document added successfully"
        );
        return result;
      } catch (error: unknown) {
        console.error("Error saving document:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to save document";
        toast.error(`Error: ${errorMessage}`);
        throw error;
      }
    },
    onSuccess: (result) => {
      console.log("Operation successful, invalidating queries", result);
      // Refetch documents when a document is added or updated
      queryClient.invalidateQueries({ queryKey: ["insurance-documents"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles-for-insurance"] });
      queryClient.invalidateQueries({ queryKey: ["clients-for-insurance"] });
      handleCloseModal();
    },
    onError: (error) => {
      console.error("Mutation error:", error);
    },
  });

  // Delete document mutation
  const { mutate: deleteDocument, isPending: isDeleting } = useMutation({
    mutationFn: async (documentId: string) => {
      try {
        const toastId = toast.loading("Deleting document...");

        // Delete the document
        const { error } = await supabase
          .from("insurance_documents")
          .delete()
          .eq("id", documentId);

        if (error) {
          toast.dismiss(toastId);
          toast.error(`Failed to delete document: ${error.message}`);
          throw error;
        }

        toast.dismiss(toastId);
        toast.success("Document deleted successfully");
        return { success: true };
      } catch (error: unknown) {
        console.error("Error deleting document:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to delete document";
        toast.error(`Error: ${errorMessage}`);
        throw error;
      }
    },
    onSuccess: () => {
      // Refetch documents when a document is deleted
      queryClient.invalidateQueries({ queryKey: ["insurance-documents"] });
    },
  });

  const handleAddDocumentClick = () => {
    setSelectedDocument(undefined);
    setIsModalOpen(true);
  };

  const handleEditClick = (document: InsuranceDocument) => {
    // Check if the user has permission to edit this document
    if (!isAdmin(user) && user?.id !== document.user_id) {
      toast.error("You don't have permission to edit this document");
      return;
    }

    setSelectedDocument(document);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (documentId: string, userId: string) => {
    // Check if the user has permission to delete this document
    if (!isAdmin(user) && user?.id !== userId) {
      toast.error("You don't have permission to delete this document");
      return;
    }

    if (window.confirm("Are you sure you want to delete this document?")) {
      deleteDocument(documentId);
    }
  };

  const handleCloseModal = () => {
    setSelectedDocument(undefined);
    setIsModalOpen(false);
  };

  const handleSubmitDocument = (
    formData: InsuranceFormData,
    imageFiles?: File[]
  ) => {
    saveInsuranceDocument({ formData, imageFiles });
  };

  const handleRefresh = () => {
    refetchDocuments();
  };

  // Filter documents based on search and filters
  const filteredDocuments = React.useMemo(() => {
    return (documents as InsuranceDocument[]).filter((doc) => {
      // Search term filter
      const matchesSearch =
        !searchTerm ||
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.description || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (doc.policy_number || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (doc.client_name || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (doc.vehicle_name || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      // Type filter
      const matchesType = typeFilter === "all" || doc.type === typeFilter;

      // Status filter
      const matchesStatus =
        statusFilter === "all" || doc.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [documents, searchTerm, typeFilter, statusFilter]);

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  // Calculate financial metrics
  const financialMetrics = React.useMemo(() => {
    let totalRepairCost = 0;
    let totalPaymentAmount = 0;
    let totalBalanceDue = 0;

    (documents as InsuranceDocument[]).forEach((doc) => {
      totalRepairCost += doc.repair_cost || 0;
      totalPaymentAmount += doc.payment_amount || 0;
      totalBalanceDue += doc.balance_due || 0;
    });

    return {
      totalRepairCost,
      totalPaymentAmount,
      totalBalanceDue,
    };
  }, [documents]);

  // Handle document download
  const handleDownloadDocument = (document: InsuranceDocument) => {
    if (document.document_url) {
      window.open(document.document_url, "_blank");
    } else {
      toast.error("No document available for download");
    }
  };

  // Handle view document images
  const handleViewImages = (document: InsuranceDocument) => {
    if (document.images && document.images.length > 0) {
      // Open the first image in a new tab - in a real app, you'd implement a gallery
      window.open(document.images[0], "_blank");
    } else {
      toast.error("No images available for this document");
    }
  };

  // Show any errors
  useEffect(() => {
    if (documentsError) {
      console.error("Error fetching documents:", documentsError);
      toast.error("Failed to load documents. Please try again later.");
    }
  }, [documentsError]);

  return (
    <div className="insurance-page">
      <div className="insurance-header">
        <h1>{t("insurance.insuranceManagement")}</h1>
        <div className="insurance-actions">
          <button className="btn btn-secondary mr-2" onClick={handleRefresh}>
            {t("insurance.refresh")}
          </button>
          <button className="btn btn-primary" onClick={handleAddDocumentClick}>
            <Plus size={16} />
            <span>{t("insurance.createDocument")}</span>
          </button>
        </div>
      </div>

      {/* Financial summary cards */}
      <div className="financial-summary">
        <div className="summary-card">
          <h3>{t("insurance.totalRepairCosts")}</h3>
          <p className="amount">
            ${financialMetrics.totalRepairCost.toFixed(2)}
          </p>
        </div>
        <div className="summary-card">
          <h3>{t("insurance.totalPayments")}</h3>
          <p className="amount">
            ${financialMetrics.totalPaymentAmount.toFixed(2)}
          </p>
        </div>
        <div className="summary-card">
          <h3>{t("insurance.totalBalanceDue")}</h3>
          <p className="amount">
            ${financialMetrics.totalBalanceDue.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="insurance-content">
        <div className="documents-toolbar">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder={t("insurance.searchDocuments")}
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="document-filters">
            <select
              className="document-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">{t("insurance.allTypes")}</option>
              <option value="policy">{t("insurance.policy")}</option>
              <option value="claim">{t("insurance.claim")}</option>
              <option value="invoice">{t("insurance.invoice")}</option>
              <option value="other">{t("insurance.other")}</option>
            </select>

            <select
              className="document-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{t("insurance.allStatus")}</option>
              <option value="active">{t("insurance.active")}</option>
              <option value="pending">{t("insurance.pending")}</option>
              <option value="expired">{t("insurance.expired")}</option>
              <option value="cancelled">{t("insurance.cancelled")}</option>
            </select>
          </div>
        </div>

        {isLoadingDocuments ? (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <p>{t("insurance.loadingDocuments")}</p>
          </div>
        ) : documentsError ? (
          <div className="no-results">
            <p>{t("insurance.errorLoadingDocuments")}</p>
            <p className="no-results-sub">
              {`${
                documentsError instanceof Error
                  ? documentsError.message
                  : "An unknown error occurred"
              }`}
            </p>
            <button
              className="btn btn-primary mt-4"
              onClick={() => refetchDocuments()}
            >
              {t("insurance.tryAgain")}
            </button>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="no-results">
            <p>{t("insurance.noDocumentsFound")}</p>
            <p className="no-results-sub">
              {documents.length === 0
                ? t("insurance.noDocumentsInDb")
                : t("insurance.adjustFilters")}
            </p>
          </div>
        ) : (
          <div className="documents-table-container">
            <table className="documents-table">
              <thead>
                <tr>
                  <th>{t("insurance.document")}</th>
                  <th>{t("insurance.type")}</th>
                  <th>{t("insurance.client")}</th>
                  <th>{t("insurance.vehicle")}</th>
                  <th>{t("insurance.created")}</th>
                  <th>{t("insurance.expires")}</th>
                  <th>{t("insurance.status")}</th>
                  <th>{t("insurance.signed")}</th>
                  <th>{t("insurance.repairCost")}</th>
                  <th>{t("insurance.payment")}</th>
                  <th>{t("insurance.balance")}</th>
                  <th>{t("insurance.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id}>
                    <td className="document-name">
                      <FileText
                        size={16}
                        className={`document-icon ${doc.type}`}
                      />
                      <span>{doc.name}</span>
                    </td>
                    <td>
                      <span className="document-type">
                        {doc.type.charAt(0).toUpperCase() + doc.type.slice(1)}
                      </span>
                    </td>
                    <td>
                      <span className="client-name">{doc.client_name}</span>
                    </td>
                    <td>
                      <span className="vehicle-name">{doc.vehicle_name}</span>
                    </td>
                    <td>{formatDate(doc.created_at)}</td>
                    <td>{formatDate(doc.expires_at)}</td>
                    <td>
                      <span className={`status-badge ${doc.status}`}>
                        {doc.status.charAt(0).toUpperCase() +
                          doc.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      {doc.signed ? (
                        <span className="signed-status signed">
                          <Check size={16} />
                          <span>{t("insurance.signed")}</span>
                        </span>
                      ) : (
                        <span className="signed-status unsigned">
                          <span>{t("insurance.unsigned")}</span>
                        </span>
                      )}
                    </td>
                    <td>
                      ${doc.repair_cost ? doc.repair_cost.toFixed(2) : "0.00"}
                    </td>
                    <td>
                      $
                      {doc.payment_amount
                        ? doc.payment_amount.toFixed(2)
                        : "0.00"}
                    </td>
                    <td>
                      ${doc.balance_due ? doc.balance_due.toFixed(2) : "0.00"}
                    </td>
                    <td>
                      <div className="document-actions">
                        {doc.document_url && (
                          <button
                            className="action-icon-btn"
                            onClick={() => handleDownloadDocument(doc)}
                            title="Download document"
                          >
                            <Download size={16} />
                          </button>
                        )}
                        {doc.images && doc.images.length > 0 && (
                          <button
                            className="action-icon-btn"
                            onClick={() => handleViewImages(doc)}
                            title="View images"
                          >
                            <Camera size={16} />
                          </button>
                        )}
                        {(isAdmin(user) || user?.id === doc.user_id) && (
                          <>
                            <button
                              className="action-icon-btn"
                              onClick={() => handleEditClick(doc)}
                              title="Edit document"
                            >
                              <Upload size={16} />
                            </button>
                            <button
                              className="action-icon-btn danger"
                              onClick={() =>
                                handleDeleteClick(doc.id, doc.user_id)
                              }
                              title="Delete document"
                            >
                              <Trash size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddInsuranceDocumentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmitDocument}
        document={selectedDocument}
        isSubmitting={isSaving || isUploading || isDeleting}
      />
    </div>
  );
};
