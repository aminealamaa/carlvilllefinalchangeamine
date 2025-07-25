'use client'

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Search, Plus, MapPin, Mail, Phone, RefreshCw } from "lucide-react";
import {
  AddClientModal,
  ClientFormData,
} from "@/components/clients/AddClientModal";
import { supabase, ensureAuthenticated } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@/utils/permissionUtils";
import { toast } from "sonner";
import "@/pages/Clients.css";

// Make sure this matches the ClientFormData interface from AddClientModal
interface Client {
  id: string;
  fullName: string;
  email: string; // Changed from string | undefined to string
  phone: string;
  idCardNumber: string;
  paymentMethod: "cash" | "card" | "site";
  avatar?: string;
  bookings: number;
  spent: number;
  status: "active" | "inactive";
  userId?: string | null; // Added userId field to track ownership
}

export default function ClientsPage() {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fonction pour récupérer les clients depuis Supabase
  const fetchClients = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching clients data...");

      // Ensure we have a valid session before proceeding
      const isAuthenticated = await ensureAuthenticated();
      if (!isAuthenticated) {
        console.error("Authentication failed, cannot fetch clients");
        toast.error(
          "Authentication error. Please try refreshing the page or login again."
        );
        setIsLoading(false);
        return;
      }

      // First get all clients
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("*");

      console.log({ data: clientsData, error: clientsError });

      if (clientsError) {
        // Special handling for auth errors
        if (
          clientsError.code === "PGRST301" ||
          clientsError.message.includes("JWT")
        ) {
          toast.error("Session expired. Please refresh the page.");
          setIsLoading(false);
          return;
        }

        throw clientsError;
      }

      if (!clientsData || clientsData.length === 0) {
        console.log("No clients found in database");
        setClients([]);
        setIsLoading(false);
        return;
      }

      // Then get bookings in a separate query
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*");

      if (bookingsError) {
        console.error("Error fetching bookings:", bookingsError);
        // Continue with client data even if bookings fail
      }

      // Transform Supabase data to match our Client interface
      const transformedClients = clientsData.map((client) => {
        try {
          // Find bookings for this client
          const clientBookings =
            bookingsData?.filter(
              (booking) => booking.client_id === client.id
            ) || [];

          // Ensure all required fields exist
          return {
            id:
              client.id ||
              `unknown-${Math.random().toString(36).substr(2, 9)}`,
            fullName:
              `${client.first_name || ""} ${client.last_name || ""}`.trim() ||
              "Unknown Client",
            email: client.email || "",
            phone: client.phone || "",
            idCardNumber: client.id_card_number || "",
            paymentMethod:
              (client.payment_method as "cash" | "card" | "site") || "cash",
            avatar: client.avatar_url || "",
            bookings: clientBookings.length,
            spent: clientBookings.reduce(
              (sum, booking) => sum + (Number(booking.amount) || 0),
              0
            ),
            status: (client.status as "active" | "inactive") || "active",
            userId: client.user_id,
          };
        } catch (err) {
          console.error("Error processing client:", err, client);
          // Return a minimal valid client object if we can't process this one properly
          return {
            id:
              client.id || `error-${Math.random().toString(36).substr(2, 9)}`,
            fullName: "Error Processing Client",
            email: "",
            phone: "",
            idCardNumber: "",
            paymentMethod: "cash" as const,
            avatar: "",
            bookings: 0,
            spent: 0,
            status: "inactive" as const,
            userId: null,
          };
        }
      });

      setClients(transformedClients);
      toast.success("Clients mis à jour avec succès");
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Erreur lors du chargement des clients");
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les clients au montage du composant
  useEffect(() => {
    fetchClients();
  }, []);

  // Create or update client mutation
  const { mutate: saveClient, isPending: isSaving } = useMutation({
    mutationFn: async (formData: ClientFormData) => {
      try {
        // Extract first and last name from fullName
        const nameParts = formData.fullName.split(" ");
        const lastName = nameParts.pop() || "";
        const firstName = nameParts.join(" ");

        // Create a minimal client object with only the required fields
        const clientData = {
          first_name: firstName,
          last_name: lastName,
          email:
            formData.email ||
            `${firstName.toLowerCase()}.${lastName.toLowerCase()}@placeholder.com`,
        };

        // Add optional fields
        const fullClientData = {
          ...clientData,
          phone: formData.phone,
          id_card_number: formData.idCardNumber,
          payment_method: formData.paymentMethod,
          status: "active",
          user_id: user?.id,
        };

        console.log("clientData to submit:", fullClientData);

        if (selectedClient) {
          // Update existing client
          console.log("Updating client:", selectedClient.id);
          const { data, error } = await supabase
            .from("clients")
            .update(fullClientData)
            .eq("id", selectedClient.id)
            .select("*")
            .single();

          console.log("Update result:", { data, error });

          if (error) {
            console.error("Error updating client:", error);
            throw error;
          }

          console.log("Client updated successfully");
          return data;
        } else {
          console.log("Creating new client with data:", fullClientData);

          // First try a simpler insert with just the required fields
          const simpleInsertResult = await supabase
            .from("clients")
            .insert(clientData);

          console.log("Simple insert result:", simpleInsertResult);

          if (simpleInsertResult.error) {
            console.error("Simple insert error:", simpleInsertResult.error);
            throw simpleInsertResult.error;
          }

          // If simple insert succeeded, try to update with full data
          const { data: insertedIds } = await supabase
            .from("clients")
            .select("id")
            .eq("first_name", firstName)
            .eq("last_name", lastName)
            .eq("email", clientData.email);

          if (insertedIds && insertedIds.length > 0) {
            const newId = insertedIds[0].id;
            console.log("Found new client ID:", newId);

            // Update with full data
            const { data: updatedClient, error: updateError } = await supabase
              .from("clients")
              .update(fullClientData)
              .eq("id", newId)
              .select("*")
              .single();

            if (updateError) {
              console.error("Error updating new client:", updateError);
              // Continue anyway since basic client is created
            } else {
              console.log("Client fully updated:", updatedClient);
              return updatedClient;
            }

            // Fetch the client regardless
            const { data: finalClient } = await supabase
              .from("clients")
              .select("*")
              .eq("id", newId)
              .single();

            return finalClient;
          }

          // Fallback - just return that we created something
          return {
            id: "new",
            first_name: firstName,
            last_name: lastName,
            email: clientData.email,
          };
        }
      } catch (error) {
        console.error("Unexpected error in saveClient:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Client saved successfully:", data);
      // Refresh clients data after successful save
      fetchClients();
      setIsModalOpen(false);
    },
    onError: (error) => {
      console.error("Error saving client:", error);
      alert(
        `Failed to save client: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    },
  });

  const handleAddClient = async (formData: ClientFormData) => {
    try {
      console.log("handleAddClient called with:", formData);
      saveClient(formData);
    } catch (e) {
      console.error("Error in handleAddClient:", e);
    }
  };

  const handleEditClick = (client: Client) => {
    // Check if the user has permission to edit this client
    if (!isAdmin(user) && user?.id !== client.userId) {
      toast.error("You don't have permission to edit this client");
      return;
    }

    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedClient(undefined);
    setIsModalOpen(false);
  };

  // Filter clients based on search term and status
  const filteredClients = React.useMemo(() => {
    // If clients is null, undefined, or empty, return empty array
    if (!clients || clients.length === 0) {
      console.log("No clients data available for filtering");
      return [];
    }

    try {
      return clients.filter((client) => {
        // Skip invalid clients
        if (!client) {
          console.log("Skipping null/undefined client");
          return false;
        }

        // Be permissive with missing properties
        const clientFullName = client.fullName || "";
        const clientEmail = client.email || "";
        const clientPhone = client.phone || "";
        const clientStatus = client.status || "active"; // Default to active if missing

        const matchesSearch =
          !searchTerm ||
          clientFullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          clientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
          clientPhone.includes(searchTerm);

        const matchesStatus =
          statusFilter === "all" || clientStatus === statusFilter;

        return matchesSearch && matchesStatus;
      });
    } catch (error) {
      console.error("Error filtering clients:", error);
      // Return all clients if filtering fails
      return clients;
    }
  }, [clients, searchTerm, statusFilter]);

  React.useEffect(() => {
    if (clients && clients.length > 0) {
      // Check for any clients with critical missing properties
      const problemClients = clients.filter((client) => {
        return !client || !client.id || client.fullName === "Unknown Client";
      });

      if (problemClients.length > 0) {
        console.warn(
          `Found ${problemClients.length} problematic clients:`,
          problemClients
        );
      }

      // Log if we have clients but filteredClients is empty
      if (
        clients.length > 0 &&
        (!filteredClients || filteredClients.length === 0)
      ) {
        console.warn(
          "Filtering issue detected: Have clients but filteredClients is empty.",
          { clients, searchTerm, statusFilter }
        );

        // Safety measure: if filtering produces no results,
        // automatically clear the filters to show all clients
        if (searchTerm || statusFilter !== "all") {
          console.log("Auto-clearing filters to show all clients");
          setSearchTerm("");
          setStatusFilter("all");

          // Add a toast notification
          toast.info("Filters have been reset to show all clients", {
            duration: 3000,
          });
        }
      }
    }
  }, [clients, filteredClients, searchTerm, statusFilter]);

  return (
    <div className="clients-page">
      <div className="clients-header">
        <h1>{t("clients.clientManagement")}</h1>
        <div className="clients-actions">
          <button
            className="btn btn-secondary mr-2"
            onClick={fetchClients}
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? "spinning" : ""} />
            <span>{isLoading ? "Chargement..." : "Actualiser"}</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={16} />
            <span>{t("clients.addClient")}</span>
          </button>
        </div>
      </div>

      <div className="clients-toolbar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder={t("clients.searchClients")}
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="clients-filters">
          <select
            className="status-filter"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "active" | "inactive")
            }
          >
            <option value="all">{t("clients.allStatus")}</option>
            <option value="active">{t("clients.active")}</option>
            <option value="inactive">{t("clients.inactive")}</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>{t("clients.loadingClients")}</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="no-results">
          <p>{t("clients.noClientsFound")}</p>
          <p className="no-results-sub">
            {clients.length === 0
              ? t("clients.noClientsInDb")
              : t("clients.adjustFilters")}
          </p>
        </div>
      ) : (
        <div className="clients-grid">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className={`client-card ${
                client.status === "inactive" ? "inactive" : ""
              }`}
            >
              <div className="client-header">
                <div className="client-avatar">
                  {client.avatar ? (
                    <img src={client.avatar} alt={client.fullName} />
                  ) : (
                    <div className="avatar-placeholder">
                      {(client.fullName && client.fullName.charAt(0)) || "?"}
                    </div>
                  )}
                </div>
                <div className="client-name-info">
                  <h3 className="client-name">
                    {client.fullName || t("clients.unknown")}
                  </h3>
                  <span
                    className={`client-status ${client.status || "unknown"}`}
                  >
                    {(client.status &&
                      client.status.charAt(0).toUpperCase() +
                        client.status.slice(1)) ||
                      t("clients.unknown")}
                  </span>
                </div>
              </div>

              <div className="client-stats">
                <div className="client-stat-item">
                  <span className="stat-label">{t("clients.bookings")}</span>
                  <span className="stat-value">{client.bookings || 0}</span>
                </div>
                <div className="client-stat-item">
                  <span className="stat-label">{t("clients.totalSpent")}</span>
                  <span className="stat-value">${client.spent || 0}</span>
                </div>
              </div>

              <div className="client-contact">
                <div className="contact-item">
                  <Mail size={16} />
                  <span>{client.email || t("clients.noEmail")}</span>
                </div>
                <div className="contact-item">
                  <Phone size={16} />
                  <span>{client.phone || t("clients.noPhone")}</span>
                </div>
                <div className="contact-item">
                  <MapPin size={16} />
                  <span>
                    {t("clients.id")}:{" "}
                    {client.idCardNumber || t("clients.notAvailable")}
                  </span>
                </div>
              </div>

              <div className="client-actions">
                <button className="client-action-btn view">
                  {t("clients.viewProfile")}
                </button>
                {(isAdmin(user) || user?.id === client.userId) && (
                  <button
                    className="client-action-btn edit"
                    onClick={() => handleEditClick(client)}
                  >
                    {t("clients.edit")}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddClientModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleAddClient}
        client={selectedClient}
        isSubmitting={isSaving}
      />
    </div>
  );
}