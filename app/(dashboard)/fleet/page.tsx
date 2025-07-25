'use client'

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  Filter,
  Plus,
  Grid,
  List,
  Car,
  Calendar,
  Settings,
  Users,
} from "lucide-react";
import {
  AddVehicleModal,
  VehicleFormData,
} from "@/components/vehicles/AddVehicleModal";
import { supabase, getCurrentUser, ensureAuthenticated } from "@/lib/supabase";
import { useQuery, useMutation } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@/utils/permissionUtils";
import "@/pages/Fleet.css";

// Define the DB vehicle interface which includes our new fields
interface DBVehicle {
  id: string;
  brand: string;
  car_img: string | null;
  created_at: string | null;
  fuel_type: string | null;
  model: string;
  plate_number: string;
  price: number;
  status: string;
  transmission: string | null;
  user_id: string | null;
  year: string | null;
  // New fields
  kilometrage?: string | number;
  next_vidange?: string;
}

interface Vehicle {
  id: string;
  name: string;
  brand: string;
  year: number;
  plateNumber: string;
  status: "available" | "booked" | "maintenance" | "LLD";
  fuelType: "gasoline" | "diesel" | "electric";
  transmission: "automatic" | "manual";
  rate: number;
  image: string;
  userId?: string | null;
  kilometrage?: number;
  nextVidange?: string; // ISO date string
}

interface FilterOptions {
  status: {
    available: boolean;
    booked: boolean;
    maintenance: boolean;
    LLD: boolean;
  };
  brand: string;
}

export default function FleetPage() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    status: {
      available: true,
      booked: true,
      maintenance: true,
      LLD: true,
    },
    brand: "",
  });

  // Fetch vehicles from Supabase
  const {
    data: vehicles = [],
    isLoading,
    error: fetchError,
    refetch: refetchVehicles,
  } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      try {
        console.log("Fetching vehicles data...");

        // Ensure we have a valid session before proceeding
        const isAuthenticated = await ensureAuthenticated();
        if (!isAuthenticated) {
          console.error("Authentication failed, cannot fetch vehicles");
          toast.error(
            "Authentication error. Please try refreshing the page or login again."
          );
          return [];
        }

        // Skip loading toast to make initial load faster
        const { data, error } = await supabase
          .from("vehicles")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Supabase query error:", error);

          // Special handling for auth errors
          if (error.code === "PGRST301" || error.message.includes("JWT")) {
            toast.error("Session expired. Please refresh the page.");
            return [];
          }

          toast.error("Failed to load vehicles");
          throw error;
        }

        if (!data || data.length === 0) {
          console.log("No vehicles found in the database");
          return [];
        }

        console.log("Fetched vehicles:", data);

        // Transform data to match our Vehicle interface with added data validation
        return data.map((vehicle: DBVehicle) => {
          try {
            // Default to using the model for year if year doesn't exist
            const yearValue = vehicle.year
              ? parseInt(vehicle.year)
              : vehicle.model
              ? parseInt(vehicle.model)
              : new Date().getFullYear();

            return {
              id:
                vehicle.id || `temp-${Math.random().toString(36).substr(2, 9)}`,
              name: `${vehicle.brand || "Unknown"} ${
                vehicle.model || ""
              }`.trim(),
              brand: vehicle.brand || "Unknown",
              year: isNaN(yearValue) ? new Date().getFullYear() : yearValue,
              plateNumber: vehicle.plate_number || "No plate",
              status:
                (vehicle.status as
                  | "available"
                  | "booked"
                  | "maintenance"
                  | "LLD") || "available",
              fuelType: vehicle.fuel_type || "gasoline",
              transmission: vehicle.transmission || "automatic",
              rate: vehicle.price || 0,
              userId: vehicle.user_id,
              image:
                vehicle.car_img ||
                "https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=800",
              kilometrage: vehicle.kilometrage
                ? Number(vehicle.kilometrage)
                : undefined,
              nextVidange: vehicle.next_vidange || undefined,
            };
          } catch (err) {
            console.error("Error processing vehicle:", err, vehicle);
            // Return a minimal valid vehicle object if we can't process this one properly
            return {
              id:
                vehicle.id ||
                `error-${Math.random().toString(36).substr(2, 9)}`,
              name: "Error Processing Vehicle",
              brand: "Unknown",
              year: new Date().getFullYear(),
              plateNumber: "Error",
              status: "available" as const,
              fuelType: "unknown",
              transmission: "unknown",
              rate: 0,
              image:
                "https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=800",
              kilometrage: undefined,
              nextVidange: undefined,
            };
          }
        });
      } catch (error) {
        console.error("Error in vehicle query:", error);
        toast.error("Failed to load vehicles");
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  const filteredVehicles = React.useMemo(() => {
    // Don't attempt filtering if vehicles is loading or undefined
    if (isLoading || !vehicles) {
      console.log("Vehicles data is loading or undefined, skipping filter");
      return [];
    }

    if (vehicles.length === 0) {
      console.log("No vehicles to filter");
      return [];
    }

    try {
      const filtered = (vehicles as Vehicle[]).filter((vehicle: Vehicle) => {
        // Skip completely invalid vehicles
        if (!vehicle) return false;

        // For vehicles with missing properties, be more permissive
        const matchesSearch =
          !searchTerm ||
          (vehicle.name &&
            vehicle.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (vehicle.plateNumber &&
            vehicle.plateNumber
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          (vehicle.brand &&
            vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()));

        // Handle missing status - treat as if it matches any status filter
        const matchesStatus =
          !vehicle.status ||
          filterOptions.status[
            vehicle.status as keyof FilterOptions["status"]
          ] ||
          false;

        // Handle missing brand - treat as if it matches any brand filter
        const matchesBrand =
          !filterOptions.brand ||
          (vehicle.brand && vehicle.brand === filterOptions.brand) ||
          false;

        return matchesSearch && matchesStatus && matchesBrand;
      });

      console.log("Filtered vehicles count:", filtered.length);
      return filtered;
    } catch (error) {
      console.error("Error filtering vehicles:", error);
      // Return all vehicles if filter operation fails
      return vehicles as Vehicle[];
    }
  }, [vehicles, searchTerm, filterOptions, isLoading]);

  // Debug when vehicles or filtered vehicles change
  useEffect(() => {
    if (vehicles?.length > 0 && filteredVehicles.length === 0) {
      console.log(
        "Warning: All vehicles are being filtered out. Filter state:",
        JSON.stringify(filterOptions),
        "Search term:",
        searchTerm
      );

      // Safety measure: if filtering produces no results,
      // automatically clear the filters to show all vehicles
      if (
        searchTerm ||
        filterOptions.brand ||
        !filterOptions.status.available ||
        !filterOptions.status.booked ||
        !filterOptions.status.maintenance ||
        !filterOptions.status.LLD
      ) {
        console.log("Auto-clearing filters to show all vehicles");
        setSearchTerm("");
        setFilterOptions({
          status: {
            available: true,
            booked: true,
            maintenance: true,
            LLD: true,
          },
          brand: "",
        });

        // Show a toast to inform the user
        toast.info("Filters have been reset to show all vehicles");
      }
    }
  }, [vehicles, filteredVehicles, filterOptions, searchTerm]);

  // Debug effect to validate vehicle data structure
  React.useEffect(() => {
    if (vehicles && vehicles.length > 0) {
      // Check for vehicles with missing required properties
      const invalidVehicles = (vehicles as Vehicle[]).filter(
        (vehicle) => !vehicle || !vehicle.id || !vehicle.name || !vehicle.brand
      );

      if (invalidVehicles.length > 0) {
        console.warn(
          `Found ${invalidVehicles.length} vehicles with missing fields:`,
          invalidVehicles
        );
      }
    }
  }, [vehicles]);

  // Add effect to handle empty data detection
  React.useEffect(() => {
    if (!isLoading && vehicles && vehicles.length === 0) {
      // If we have no vehicles but we're not in loading state, this might be an auth issue
      console.log(
        "Empty vehicles array detected when not loading, might be auth issue"
      );

      // Check if we can manually refresh the auth and retry
      const retryFetch = async () => {
        const isAuthenticated = await ensureAuthenticated();
        if (isAuthenticated) {
          console.log("Authentication renewed, retrying vehicle fetch");
          setTimeout(() => {
            refetchVehicles();
          }, 1000);
        } else {
          console.error("Failed to authenticate after retry");
        }
      };

      retryFetch();
    }
  }, [vehicles, isLoading, refetchVehicles]);

  // Handle query errors outside the query config
  useEffect(() => {
    if (fetchError) {
      console.error("Error fetching vehicles:", fetchError);
      toast.error("Failed to load vehicles. Please try again later.");
    }
  }, [fetchError]);

  // Extract unique brands for filter dropdown
  const brandOptions = React.useMemo(() => {
    if (!vehicles || !vehicles.length) return [];

    const brands = new Set<string>();
    (vehicles as Vehicle[]).forEach((vehicle) => {
      if (vehicle.brand) brands.add(vehicle.brand);
    });

    return Array.from(brands).sort();
  }, [vehicles]);

  // Upload image to Supabase Storage
  const uploadVehicleImage = async (file: File): Promise<string> => {
    try {
      setIsUploading(true);
      const toastId = toast.loading("Uploading image...");

      const fileExt = file.name.split(".").pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `vehicles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("fleet")
        .upload(filePath, file);

      if (uploadError) {
        toast.dismiss(toastId);
        toast.error(`Failed to upload image: ${uploadError.message}`);
        throw uploadError;
      }

      // Get public URL
      const { data } = supabase.storage.from("fleet").getPublicUrl(filePath);

      toast.dismiss(toastId);
      toast.success("Image uploaded successfully");
      return data.publicUrl;
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error("Failed to upload image. Please try again.");
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // Create or update vehicle mutation
  const { mutate: saveVehicle, isPending: isSaving } = useMutation({
    mutationFn: async (data: {
      formData: VehicleFormData;
      imageFile?: File;
    }) => {
      const { formData, imageFile } = data;

      try {
        const toastId = toast.loading(
          selectedVehicle ? "Updating vehicle..." : "Adding new vehicle..."
        );

        // Get current user
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          toast.dismiss(toastId);
          toast.error("You must be logged in to add or edit vehicles");
          throw new Error("User not authenticated");
        }

        // Upload image if provided
        let imageUrl = undefined;
        if (imageFile) {
          imageUrl = await uploadVehicleImage(imageFile);
        }

        // Extract brand from name (first word)
        const brandName = formData.name.split(" ")[0];

        // Prepare vehicle data for Supabase
        const vehicleData: Partial<DBVehicle> = {
          brand: brandName,
          model: formData.name.replace(brandName, "").trim(),
          plate_number: formData.plateNumber,
          status: formData.status,
          fuel_type: formData.fuelType,
          transmission: formData.transmission,
          price: formData.rate,
          year: formData.year.toString(),
          user_id: currentUser.id,
        };

        // Only add optional fields if they exist
        if (formData.kilometrage !== undefined) {
          vehicleData.kilometrage = formData.kilometrage;
        }

        if (formData.nextVidange) {
          vehicleData.next_vidange = formData.nextVidange;
        }

        // Only update image if a new one was uploaded
        if (imageUrl) {
          vehicleData.car_img = imageUrl;
        }

        console.log("Saving vehicle data:", vehicleData);

        if (selectedVehicle) {
          // Update existing vehicle
          const { error } = await supabase
            .from("vehicles")
            .update(vehicleData)
            .eq("id", selectedVehicle.id);

          if (error) {
            toast.dismiss(toastId);
            toast.error(`Failed to update vehicle: ${error.message}`);
            throw error;
          }

          toast.dismiss(toastId);
          toast.success("Vehicle updated successfully");
          return { success: true, updated: true };
        } else {
          // Create new vehicle
          const { error, data } = await supabase
            .from("vehicles")
            .insert(vehicleData)
            .select();

          console.log("Insert result:", { error, data });

          if (error) {
            toast.dismiss(toastId);
            toast.error(`Failed to add vehicle: ${error.message}`);
            throw error;
          }

          toast.dismiss(toastId);
          toast.success("Vehicle added successfully");
          return { success: true, inserted: true, data };
        }
      } catch (error: unknown) {
        console.error("Error saving vehicle:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "An error occurred while saving the vehicle";
        toast.error(errorMessage);
        throw error;
      }
    },
    onSuccess: (result) => {
      // Immediately refetch the vehicles data
      console.log("Vehicle saved successfully, refetching data...", result);
      refetchVehicles();

      // Close the modal and reset selection
      setIsModalOpen(false);
      setSelectedVehicle(undefined);
    },
    onError: (error: unknown) => {
      console.error("Mutation error:", error);
    },
  });

  const handleAddVehicle = async (
    formData: VehicleFormData,
    imageFile?: File
  ) => {
    saveVehicle({ formData, imageFile });
  };

  const handleEditClick = (vehicle: Vehicle) => {
    // Check if the user has permission to edit this vehicle
    if (!isAdmin(user) && user?.id !== vehicle.userId) {
      toast.error("You don't have permission to edit this vehicle");
      return;
    }

    setSelectedVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedVehicle(undefined);
    setIsModalOpen(false);
  };

  // Handle status filter changes
  const handleStatusFilterChange = (status: keyof FilterOptions["status"]) => {
    setFilterOptions((prev) => ({
      ...prev,
      status: {
        ...prev.status,
        [status]: !prev.status[status],
      },
    }));
  };

  // Handle brand filter changes
  const handleBrandFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterOptions((prev) => ({
      ...prev,
      brand: e.target.value,
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilterOptions({
      status: {
        available: true,
        booked: true,
        maintenance: true,
        LLD: true,
      },
      brand: "",
    });
  };

  // Manual refetch handler
  const handleRefresh = () => {
    refetchVehicles();
  };

  if (fetchError) {
    return (
      <div className="error-container">
        <h2>Error Loading Vehicles</h2>
        <p>
          There was a problem loading the vehicle data. Please try again later.
        </p>
        <button className="btn btn-primary" onClick={() => refetchVehicles()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="fleet-page">
      <div className="fleet-header">
        <h1>{t("fleet.fleetManagement")}</h1>
        <div className="fleet-actions">
          <button className="btn btn-secondary mr-2" onClick={handleRefresh}>
            {t("fleet.refresh")}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={16} />
            <span>{t("fleet.addVehicle")}</span>
          </button>
        </div>
      </div>

      <div className="fleet-toolbar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder={t("fleet.searchVehicles")}
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="toolbar-actions">
          <button
            className={`filter-button ${showFilters ? "active" : ""}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            <span>{t("fleet.filters")}</span>
          </button>

          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${
                viewMode === "grid" ? "active" : ""
              }`}
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
            >
              <Grid size={16} />
            </button>
            <button
              className={`view-toggle-btn ${
                viewMode === "list" ? "active" : ""
              }`}
              onClick={() => setViewMode("list")}
              aria-label="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="filter-panel">
          <div className="filter-group">
            <label className="filter-label">{t("fleet.status")}</label>
            <div className="filter-options">
              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filterOptions.status.available}
                  onChange={() => handleStatusFilterChange("available")}
                />
                <span>{t("fleet.available")}</span>
              </label>
              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filterOptions.status.booked}
                  onChange={() => handleStatusFilterChange("booked")}
                />
                <span>{t("fleet.booked")}</span>
              </label>
              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filterOptions.status.maintenance}
                  onChange={() => handleStatusFilterChange("maintenance")}
                />
                <span>{t("fleet.maintenance")}</span>
              </label>
              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filterOptions.status.LLD}
                  onChange={() => handleStatusFilterChange("LLD")}
                />
                <span>{t("fleet.LLD")}</span>
              </label>
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">{t("fleet.brand")}</label>
            <select
              className="form-input"
              value={filterOptions.brand}
              onChange={handleBrandFilterChange}
            >
              <option value="">{t("fleet.allBrands")}</option>
              {brandOptions.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-buttons">
            <button className="btn btn-secondary" onClick={clearFilters}>
              {t("fleet.clear")}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>{t("fleet.loadingVehicles")}</p>
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="no-results">
          <p>{t("fleet.noVehiclesFound")}</p>
          <p className="no-results-sub">
            {vehicles.length === 0
              ? t("fleet.noVehiclesInDb")
              : t("fleet.adjustFilters")}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="vehicle-grid">
          {filteredVehicles.map((vehicle: Vehicle) => (
            <div key={vehicle.id} className="vehicle-card">
              <div className="vehicle-image">
                <img src={vehicle.image} alt={vehicle.name} />
                <div
                  className={`vehicle-status ${vehicle.status || "unknown"}`}
                >
                  {vehicle.status
                    ? vehicle.status.charAt(0).toUpperCase() +
                      vehicle.status.slice(1)
                    : "Unknown"}
                </div>
              </div>
              <div className="vehicle-info">
                <h3 className="vehicle-name">{vehicle.name}</h3>
                <div className="vehicle-meta">
                  <span className="vehicle-year">{vehicle.year}</span>
                  <span className="separator">•</span>
                  <span className="vehicle-plate">{vehicle.plateNumber}</span>
                </div>
                <div className="vehicle-specs">
                  <div className="vehicle-spec">
                    <Car size={16} />
                    <span>{vehicle.transmission}</span>
                  </div>
                  <div className="vehicle-spec">
                    <Settings size={16} />
                    <span>{vehicle.fuelType}</span>
                  </div>
                </div>
                <div className="vehicle-specs">
                  <div className="vehicle-spec">
                    <span>Km:</span>
                    <span>
                      {vehicle.kilometrage
                        ? `${vehicle.kilometrage} ${t("fleet.km")}`
                        : t("fleet.NA")}
                    </span>
                  </div>
                  <div className="vehicle-spec">
                    <span>{t("fleet.nextService")}:</span>
                    <span>
                      {vehicle.nextVidange
                        ? new Date(vehicle.nextVidange).toLocaleDateString()
                        : t("fleet.NA")}
                    </span>
                  </div>
                </div>
                <div className="vehicle-footer">
                  <div className="vehicle-rate">
                    <span className="rate-value">${vehicle.rate}</span>
                    <span className="rate-period">/{t("fleet.day")}</span>
                  </div>
                  <div className="vehicle-actions">
                    <button className="vehicle-action-btn">
                      <Calendar size={16} />
                    </button>
                    <button
                      className="vehicle-action-btn"
                      onClick={() => handleEditClick(vehicle)}
                    >
                      <Users size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="vehicle-list-container">
          <table className="vehicle-list-table">
            <thead>
              <tr>
                <th>{t("fleet.image")}</th>
                <th>{t("fleet.vehicle")}</th>
                <th>{t("fleet.year")}</th>
                <th>{t("fleet.plateNumber")}</th>
                <th>{t("fleet.status")}</th>
                <th>{t("fleet.kilometrage")}</th>
                <th>{t("fleet.nextOilChange")}</th>
                <th>{t("fleet.fuelType")}</th>
                <th>{t("fleet.transmission")}</th>
                <th>{t("fleet.rate")}</th>
                <th>{t("fleet.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map((vehicle: Vehicle) => (
                <tr key={vehicle.id}>
                  <td>
                    <div className="vehicle-list-image">
                      <img src={vehicle.image} alt={vehicle.name} />
                    </div>
                  </td>
                  <td>
                    <div className="vehicle-list-name">
                      <span className="brand">{vehicle.brand}</span>
                      <span className="model">{vehicle.name}</span>
                    </div>
                  </td>
                  <td>{vehicle.year}</td>
                  <td>{vehicle.plateNumber}</td>
                  <td>
                    <span
                      className={`vehicle-status-badge ${
                        vehicle.status || "unknown"
                      }`}
                    >
                      {vehicle.status
                        ? vehicle.status.charAt(0).toUpperCase() +
                          vehicle.status.slice(1)
                        : "Unknown"}
                    </span>
                  </td>
                  <td>
                    {vehicle.kilometrage
                      ? `${vehicle.kilometrage} ${t("fleet.km")}`
                      : t("fleet.NA")}
                  </td>
                  <td>
                    {vehicle.nextVidange
                      ? new Date(vehicle.nextVidange).toLocaleDateString()
                      : t("fleet.NA")}
                  </td>
                  <td>{vehicle.fuelType}</td>
                  <td>{vehicle.transmission}</td>
                  <td>
                    ${vehicle.rate}/{t("fleet.day")}
                  </td>
                  <td>
                    <div className="vehicle-list-actions">
                      <button className="action-btn view">
                        {t("fleet.view")}
                      </button>
                      <button
                        className="action-btn edit"
                        onClick={() => handleEditClick(vehicle)}
                      >
                        {t("fleet.edit")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddVehicleModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleAddVehicle}
        vehicle={selectedVehicle}
        isSubmitting={isSaving || isUploading}
      />
    </div>
  );
}