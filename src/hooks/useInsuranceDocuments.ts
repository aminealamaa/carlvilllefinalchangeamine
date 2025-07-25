import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase, getCurrentUser } from "../lib/supabase";
import {
  InsuranceDocument,
  InsuranceFormData,
  InsuranceDocumentType,
} from "../types/insurance";
import { v4 as uuidv4 } from "uuid";

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
  vehicles?: {
    id: string;
    brand: string;
    model: string;
    plate_number: string;
    status: string;
  };
  clients?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
  };
}

/**
 * Hook for fetching and managing insurance documents
 */
export function useInsuranceDocuments() {
  const queryClient = useQueryClient();

  // Fetch insurance documents with related data
  const {
    data: documents = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["insurance-documents"],
    queryFn: async () => {
      const toastId = toast.loading("Loading insurance documents...");

      try {
        console.log("Fetching insurance documents...");

        // Fetch documents with related data
        const { data, error } = await supabase
          .from("insurance_documents")
          .select(
            `
            id, name, type, description, 
            vehicle_id, client_id, created_at, expires_at, 
            status, signed, repair_cost, payment_amount, 
            balance_due, policy_number, images, document_url, user_id,
            vehicles:vehicle_id (id, brand, model, plate_number, status),
            clients:client_id (id, first_name, last_name, email)
          `
          )
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching insurance documents:", error);
          toast.dismiss(toastId);
          toast.error(`Failed to load documents: ${error.message}`);
          throw error;
        }

        toast.dismiss(toastId);

        if (!data || data.length === 0) {
          console.log("No insurance documents found");
          return [];
        }

        console.log(`Successfully fetched ${data.length} insurance documents`);

        // Map the raw data to our InsuranceDocument interface
        return data.map((doc: unknown) => {
          const rawDoc = doc as RawInsuranceDocument;
          const vehicle = rawDoc.vehicles;
          const client = rawDoc.clients;

          return {
            id: rawDoc.id,
            name: rawDoc.name,
            type: rawDoc.type as InsuranceDocumentType,
            description: rawDoc.description,
            vehicle_id: rawDoc.vehicle_id,
            vehicle_name: vehicle
              ? `${vehicle.brand} ${vehicle.model} (${vehicle.plate_number})`
              : "Unknown",
            client_id: rawDoc.client_id,
            client_name: client
              ? `${client.first_name} ${client.last_name}`
              : "Unknown",
            created_at: rawDoc.created_at,
            expires_at: rawDoc.expires_at,
            status: rawDoc.status,
            signed: rawDoc.signed,
            repair_cost: rawDoc.repair_cost,
            payment_amount: rawDoc.payment_amount,
            balance_due: rawDoc.balance_due,
            policy_number: rawDoc.policy_number,
            images: rawDoc.images || [],
            document_url: rawDoc.document_url,
            user_id: rawDoc.user_id,
          } as InsuranceDocument;
        });
      } catch (error) {
        console.error("Error fetching insurance documents:", error);
        toast.dismiss(toastId);
        throw error;
      }
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // Upload images to Supabase Storage
  const uploadImages = async (files: File[]): Promise<string[]> => {
    try {
      const toastId = toast.loading("Uploading images...");

      // Check if fleet bucket exists, create if needed
      const { data: buckets, error: bucketsError } =
        await supabase.storage.listBuckets();
      if (bucketsError) {
        console.error("Error checking storage buckets:", bucketsError);
        toast.dismiss(toastId);
        toast.error(`Storage error: ${bucketsError.message}`);
        throw bucketsError;
      }

      const fleetBucket = buckets?.find((bucket) => bucket.name === "fleet");
      if (!fleetBucket) {
        console.log("Fleet bucket not found, creating a new one");
        const { error: createBucketError } =
          await supabase.storage.createBucket("fleet", {
            public: true,
            fileSizeLimit: 10485760, // 10MB
          });

        if (createBucketError) {
          console.error("Error creating fleet bucket:", createBucketError);
          toast.dismiss(toastId);
          toast.error(`Failed to create storage: ${createBucketError.message}`);
          throw createBucketError;
        }
      }

      // Upload each file
      const uploadPromises = files.map(async (file) => {
        const fileExt = file.name.split(".").pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `insurance/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("fleet")
          .upload(filePath, file);

        if (uploadError) {
          console.error("Error uploading image:", uploadError);
          throw uploadError;
        }

        const { data } = supabase.storage.from("fleet").getPublicUrl(filePath);
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
    }
  };

  // Create or update insurance document
  const saveDocument = useMutation({
    mutationFn: async ({
      formData,
      imageFiles,
      documentToUpdate,
    }: {
      formData: InsuranceFormData;
      imageFiles?: File[];
      documentToUpdate?: InsuranceDocument;
    }) => {
      const toastId = toast.loading(
        documentToUpdate ? "Updating document..." : "Adding new document..."
      );

      try {
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
            imageUrls = await uploadImages(imageFiles);
          } catch (uploadError) {
            console.error("Failed to upload images:", uploadError);
            toast.dismiss(toastId);
            toast.error("Failed to upload images. Document not saved.");
            throw uploadError;
          }
        }

        // Prepare document data
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

        // Handle images
        if (imageUrls.length > 0) {
          if (documentToUpdate) {
            // In case of update, append to existing images
            documentData.images = [
              ...(documentToUpdate.images || []),
              ...imageUrls,
            ];
          } else {
            // In case of new document
            documentData.images = imageUrls;
          }
        }

        // Create or update in Supabase
        let result;
        if (documentToUpdate) {
          // Update existing document
          console.log("Updating document with ID:", documentToUpdate.id);
          const { error, data } = await supabase
            .from("insurance_documents")
            .update(documentData)
            .eq("id", documentToUpdate.id)
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
          documentToUpdate
            ? "Document updated successfully"
            : "Document added successfully"
        );

        return result;
      } catch (error) {
        console.error("Error saving document:", error);
        toast.dismiss(toastId);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to save document";
        toast.error(`Error: ${errorMessage}`);
        throw error;
      }
    },
    onSuccess: () => {
      // Refetch documents
      queryClient.invalidateQueries({ queryKey: ["insurance-documents"] });
    },
  });

  // Delete insurance document
  const deleteDocument = useMutation({
    mutationFn: async (documentId: string) => {
      const toastId = toast.loading("Deleting document...");

      try {
        const { error } = await supabase
          .from("insurance_documents")
          .delete()
          .eq("id", documentId);

        if (error) {
          console.error("Error deleting document:", error);
          toast.dismiss(toastId);
          toast.error(`Failed to delete document: ${error.message}`);
          throw error;
        }

        toast.dismiss(toastId);
        toast.success("Document deleted successfully");
        return { success: true };
      } catch (error) {
        console.error("Error deleting document:", error);
        toast.dismiss(toastId);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to delete document";
        toast.error(`Error: ${errorMessage}`);
        throw error;
      }
    },
    onSuccess: () => {
      // Refetch documents
      queryClient.invalidateQueries({ queryKey: ["insurance-documents"] });
    },
  });

  return {
    documents,
    isLoading,
    error,
    refetch,
    saveDocument,
    deleteDocument,
    uploadImages,
  };
}

export default useInsuranceDocuments;
