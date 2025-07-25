export type InsuranceDocumentType = "policy" | "claim" | "invoice" | "other";
export type InsuranceStatus = "pending" | "active" | "expired" | "cancelled";

export interface InsuranceDocument {
  id: string;
  name: string;
  type: InsuranceDocumentType;
  description?: string;
  vehicle_id: string;
  vehicle_name?: string; // Derived from vehicle data
  client_id: string;
  client_name?: string; // Derived from client data
  created_at: string;
  expires_at?: string;
  status: InsuranceStatus;
  signed: boolean;
  repair_cost?: number;
  payment_amount?: number;
  balance_due?: number;
  policy_number?: string;
  images: string[];
  document_url?: string;
  user_id: string;
}

export interface InsuranceTemplate {
  id: string;
  name: string;
  type: InsuranceDocumentType;
  template_url?: string;
  content?: string;
  updated_at: string;
  user_id: string;
}

export interface InsuranceFormData {
  name: string;
  type: InsuranceDocumentType;
  description?: string;
  vehicle_id: string;
  client_id: string;
  expires_at?: string;
  status: InsuranceStatus;
  signed: boolean;
  repair_cost?: number;
  payment_amount?: number;
  balance_due?: number;
  policy_number?: string;
}

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  name?: string; // Computed brand + model
  plate_number: string;
  status: "available" | "booked" | "maintenance";
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}
