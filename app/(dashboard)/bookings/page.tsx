'use client'

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  Filter,
  Plus,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import {
  AddBookingModal,
  BookingFormData,
} from "@/components/bookings/AddBookingModal";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  format,
  parseISO,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  isAfter,
  formatDistanceToNow,
} from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@/utils/permissionUtils";
import "@/pages/Bookings.css";

// Interface with dynamic timeRemaining as a function
interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  vehicleId: string;
  vehicle: string;
  startDate: string;
  endDate: string;
  status: "confirmed" | "pending" | "completed" | "cancelled";
  paymentStatus: "paid" | "pending";
  amount: number;
  agentId: string;
  agentName: string;
  userId?: string | null;
  commission?: number;
  commissionRate?: number;
  pickupLocation: string;
  returnLocation: string;
  // Calculate remaining time or passed time
  getTimeInfo: () => {
    text: string;
    status: "active" | "urgent" | "expired" | "returning-today";
    secondsOnly?: boolean;
  };
}

// Client data structure returned from the query
interface ClientData {
  id: string;
  name: string;
}

// Vehicle data structure returned from the query
interface VehicleData {
  id: string;
  name: string;
  price: number;
}

// Agent data structure returned from the query
interface AgentData {
  id: string;
  name: string;
}

// Database response types
interface ClientRecord {
  id: string;
  first_name: string;
  last_name: string;
}

interface VehicleRecord {
  id: string;
  brand: string;
  model: string;
  price: number;
}

interface AgentRecord {
  id: string;
  first_name: string;
  last_name: string;
}

// Type definition for raw database booking record
type RawBookingRecord = {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  payment_status: string;
  amount: number;
  client_id: string;
  vehicle_id: string;
  agent_id: string;
  user_id: string | null;
  pickup_location: string | null;
  return_location: string | null;
  clients:
    | {
        id: string;
        first_name: string;
        last_name: string;
      }
    | {
        id: string;
        first_name: string;
        last_name: string;
      }[];
  vehicles:
    | {
        id: string;
        brand: string;
        model: string;
      }
    | {
        id: string;
        brand: string;
        model: string;
      }[];
  agents:
    | {
        id: string;
        first_name: string;
        last_name: string;
      }
    | {
        id: string;
        first_name: string;
        last_name: string;
      }[];
};

// Format date for display
const formatDate = (dateString: string) => {
  try {
    return format(parseISO(dateString), "MMM dd, yyyy HH:mm");
  } catch {
    return dateString;
  }
};

// Create a separate function that doesn't rely on the t function directly
const calculateTimeInfo = (
  endDate: string,
  translationFn?: (key: string) => string
): {
  text: string;
  status: "active" | "urgent" | "expired" | "returning-today";
  secondsOnly?: boolean;
} => {
  try {
    const end = parseISO(endDate);
    const now = new Date();

    // Check if the end date is today
    const today = new Date();
    const endDateOnly = format(end, "yyyy-MM-dd");
    const todayOnly = format(today, "yyyy-MM-dd");

    if (endDateOnly === todayOnly) {
      // Car is returning today
      const hoursLeft = differenceInHours(end, now);
      const minutesLeft = differenceInMinutes(end, now) % 60;

      if (hoursLeft > 0) {
        return {
          text: `${hoursLeft}h ${minutesLeft}m remaining today`,
          status: "returning-today",
        };
      } else if (minutesLeft > 0) {
        return {
          text: `${minutesLeft}m remaining today`,
          status: "returning-today",
        };
      } else {
        return {
          text: "Due now",
          status: "returning-today",
        };
      }
    }

    // Check if the end date is in the past
    if (isAfter(now, end)) {
      // Time has passed, calculate how long ago
      const timePassedText = formatDistanceToNow(end, { addSuffix: true });
      return {
        text: timePassedText.replace("about ", ""), // Clean up text
        status: "expired",
      };
    }

    // Time remaining calculation (for future dates)
    const daysLeft = differenceInDays(end, now);
    const hoursLeft = differenceInHours(end, now) % 24;
    const minutesLeft = differenceInMinutes(end, now) % 60;

    // Format the remaining time based on how much is left (no seconds)
    let text = "";
    let status: "active" | "urgent" = "active";

    const remainingText = translationFn
      ? translationFn("bookings.remaining")
      : "remaining";

    if (daysLeft > 0) {
      // More than a day left
      text = `${daysLeft}d ${hoursLeft}h ${minutesLeft}m ${remainingText}`;
    } else if (hoursLeft > 0) {
      // Less than a day but more than an hour (no seconds)
      text = `${hoursLeft}h ${minutesLeft}m ${remainingText}`;
      if (hoursLeft < 2) {
        status = "urgent"; // Getting close
      }
    } else if (minutesLeft > 0) {
      // Less than an hour but more than a minute (no seconds)
      text = `${minutesLeft}m ${remainingText}`;
      status = "urgent";
    } else {
      // Very close to deadline
      text = `Due soon`;
      status = "urgent";
    }

    return { text, status };
  } catch (error) {
    console.error("Error calculating time info:", error);
    return {
      text: translationFn ? translationFn("bookings.unknown") : "Unknown",
      status: "active",
    };
  }
};

export default function BookingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [sortField, setSortField] = useState<keyof Booking>("startDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Timer to update the current time every second for more accuracy
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second (1000 ms) for more accurate countdowns

    return () => clearInterval(timer);
  }, []);

  // Fetch clients from database
  const { data: clients = [] } = useQuery<ClientData[]>({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, first_name, last_name");

      if (error) {
        toast.error("Failed to load clients");
        throw error;
      }

      return (data as ClientRecord[]).map((client) => ({
        id: client.id,
        name: `${client.first_name} ${client.last_name}`,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch vehicles from database
  const { data: vehicles = [] } = useQuery<VehicleData[]>({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, brand, model, price");

      if (error) {
        toast.error("Failed to load vehicles");
        throw error;
      }

      return (data as VehicleRecord[]).map((vehicle) => ({
        id: vehicle.id,
        name: `${vehicle.brand} ${vehicle.model}`,
        price: vehicle.price,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch agents from database
  const { data: agents = [] } = useQuery<AgentData[]>({
    queryKey: ["agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("id, first_name, last_name");

      if (error) {
        toast.error("Failed to load agents");
        throw error;
      }

      return (data as AgentRecord[]).map((agent) => ({
        id: agent.id,
        name: `${agent.first_name} ${agent.last_name}`,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Fonction pour récupérer les réservations depuis Supabase
  const fetchBookings = async () => {
    try {
      setIsRefreshing(true);
      const toastId = toast.loading("Chargement des réservations...");

      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          id, 
          start_date, 
          end_date, 
          status, 
          payment_status, 
          amount, 
          client_id, 
          vehicle_id, 
          agent_id,
          user_id,
          pickup_location,
          return_location,
          clients (id, first_name, last_name),
          vehicles (id, brand, model),
          agents (id, first_name, last_name)
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        toast.dismiss(toastId);
        toast.error("Échec du chargement des réservations");
        throw error;
      }

      if (!data) {
        toast.dismiss(toastId);
        setBookings([]);
        return;
      }

      const formattedBookings = data.map((booking: RawBookingRecord) => {
        // Handle nested objects - they could be arrays in the response
        const client = Array.isArray(booking.clients)
          ? booking.clients[0]
          : booking.clients;
        const vehicle = Array.isArray(booking.vehicles)
          ? booking.vehicles[0]
          : booking.vehicles;
        const agent = Array.isArray(booking.agents)
          ? booking.agents[0]
          : booking.agents;

        // Create a function that will calculate the time info on demand
        const createGetTimeInfoFn = (endDate: string) => {
          return () => calculateTimeInfo(endDate, t);
        };

        return {
          id: booking.id,
          clientName: client
            ? `${client.first_name} ${client.last_name}`
            : "Unknown",
          clientId: booking.client_id,
          vehicle: vehicle ? `${vehicle.brand} ${vehicle.model}` : "Unknown",
          vehicleId: booking.vehicle_id,
          startDate: booking.start_date,
          endDate: booking.end_date,
          status: booking.status as
            | "confirmed"
            | "pending"
            | "completed"
            | "cancelled",
          paymentStatus: booking.payment_status as "paid" | "pending",
          amount: booking.amount,
          agentName: agent
            ? `${agent.first_name} ${agent.last_name}`
            : "Unknown",
          agentId: booking.agent_id,
          userId: booking.user_id,
          commission: 0, // Default values since they're not stored in DB yet
          commissionRate: 0.1,
          pickupLocation: booking.pickup_location || "",
          returnLocation: booking.return_location || "",
          getTimeInfo: createGetTimeInfoFn(booking.end_date),
        };
      });

      setBookings(formattedBookings);
      toast.dismiss(toastId);
      toast.success("Réservations mises à jour avec succès");
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Erreur lors du chargement des réservations");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Charger les réservations au montage du composant
  useEffect(() => {
    fetchBookings();
  }, []);

  // Create or update booking mutation
  const { mutate: saveBooking, isPending: isSaving } = useMutation({
    mutationFn: async (formData: BookingFormData) => {
      try {
        const toastId = toast.loading(
          selectedBooking ? "Updating booking..." : "Adding new booking..."
        );

        // Get current user
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          toast.dismiss(toastId);
          toast.error("You must be logged in to add or edit bookings");
          throw new Error("User not authenticated");
        }

        // Prepare booking data for Supabase
        const bookingData = {
          start_date: formData.startDate,
          end_date: formData.endDate,
          status: formData.status,
          payment_status: formData.paymentStatus,
          amount: formData.amount,
          client_id: formData.clientId,
          vehicle_id: formData.vehicleId,
          agent_id: formData.agentId,
          commission_rate: formData.commissionRate || 0.1,
          user_id: currentUser.id,
          pickup_location: formData.pickupLocation,
          return_location: formData.returnLocation,
        };

        console.log({ bookingData });

        if (selectedBooking) {
          // Update existing booking
          const { error } = await supabase
            .from("bookings")
            .update(bookingData)
            .eq("id", selectedBooking.id);

          if (error) {
            toast.dismiss(toastId);
            toast.error(`Failed to update booking: ${error.message}`);
            throw error;
          }

          toast.dismiss(toastId);
          toast.success("Booking updated successfully");
        } else {
          // Create new booking
          const { error, data } = await supabase
            .from("bookings")
            .insert(bookingData);
          console.log({ error, data });
          if (error) {
            toast.dismiss(toastId);
            toast.error(`Failed to add booking: ${error.message}`);
            throw error;
          }

          toast.dismiss(toastId);
          toast.success("Booking added successfully");
        }
      } catch (error: unknown) {
        console.error("Error saving booking:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "An error occurred while saving the booking";
        toast.error(errorMessage);
        throw error;
      }
    },
    onSuccess: () => {
      // Refetch the bookings data
      fetchBookings();

      // Close the modal and reset selection
      setIsModalOpen(false);
      setSelectedBooking(undefined);
    },
  });

  const handleAddBooking = async (formData: BookingFormData) => {
    saveBooking(formData);
  };

  const handleEditClick = (booking: Booking) => {
    // Check if the user has permission to edit this booking
    const canEdit =
      isAdmin(user) ||
      user?.id === booking.userId ||
      user?.id === booking.agentId;

    if (!canEdit) {
      toast.error("You don't have permission to edit this booking");
      return;
    }

    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedBooking(undefined);
    setIsModalOpen(false);
  };

  const toggleSortDirection = (field: keyof Booking) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter and sort bookings
  const filteredAndSortedBookings = React.useMemo(() => {
    if (!bookings) return [];

    // First, filter bookings based on search term
    const filtered = bookings.filter((booking) => {
      if (!searchTerm) return true;

      const searchLower = searchTerm.toLowerCase();
      return (
        booking.clientName.toLowerCase().includes(searchLower) ||
        booking.vehicle.toLowerCase().includes(searchLower) ||
        booking.id.toLowerCase().includes(searchLower) ||
        booking.agentName.toLowerCase().includes(searchLower)
      );
    });

    // Then sort the filtered bookings
    return [...filtered].sort((a, b) => {
      if (sortField === "amount") {
        return sortDirection === "asc"
          ? a[sortField] - b[sortField]
          : b[sortField] - a[sortField];
      }

      // Special case for time info
      if (sortField === "getTimeInfo") {
        // Get the status for each booking
        const aInfo = a.getTimeInfo();
        const bInfo = b.getTimeInfo();

        // First sort by status (expired, urgent, returning-today, active)
        if (aInfo.status !== bInfo.status) {
          // Map status to numeric values for sorting
          const statusOrder = {
            expired: 0,
            urgent: 1,
            "returning-today": 2,
            active: 3,
          };
          const aStatusValue = statusOrder[aInfo.status];
          const bStatusValue = statusOrder[bInfo.status];

          return sortDirection === "asc"
            ? aStatusValue - bStatusValue
            : bStatusValue - aStatusValue;
        }

        // If status is the same, sort by end date
        return sortDirection === "asc"
          ? new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
          : new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
      }

      return sortDirection === "asc"
        ? String(a[sortField]).localeCompare(String(b[sortField]))
        : String(b[sortField]).localeCompare(String(a[sortField]));
    });
  }, [bookings, searchTerm, sortField, sortDirection, currentTime]); // Add currentTime dependency

  // Generate PDF from bookings data
  const handleGeneratePdf = () => {
    try {
      setIsGeneratingPdf(true);
      const toastId = toast.loading("Generating PDF report...");

      // Initialize the PDF document (A4 format in landscape orientation)
      const doc = new jsPDF({ orientation: "landscape" });

      // Add company logo or name
      doc.setFontSize(20);
      doc.setTextColor(229, 62, 62); // Primary color used in the CSS
      doc.text("CARLAVILLE", 14, 22);

      // Add document title
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("Bookings Report", 14, 32);

      // Add generation date and filters information
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Generated on: ${format(new Date(), "MMMM d, yyyy HH:mm")}`,
        14,
        40
      );

      // Add search term if any
      if (searchTerm) {
        doc.text(`Filtered by: "${searchTerm}"`, 14, 46);
      }

      // Define table columns
      const columns = [
        { header: "ID", dataKey: "id" },
        { header: "Client", dataKey: "client" },
        { header: "Vehicle", dataKey: "vehicle" },
        { header: "Agent", dataKey: "agent" },
        { header: "Pickup", dataKey: "pickup" },
        { header: "Return", dataKey: "return" },
        { header: "Start Date", dataKey: "startDate" },
        { header: "End Date", dataKey: "endDate" },
        { header: "Status", dataKey: "status" },
        { header: "Payment", dataKey: "payment" },
        { header: "Amount", dataKey: "amount" },
      ];

      // Convert bookings data for the table
      const data = filteredAndSortedBookings.map((booking) => ({
        id: booking.id,
        client: booking.clientName,
        vehicle: booking.vehicle,
        agent: booking.agentName,
        pickup: booking.pickupLocation,
        return: booking.returnLocation,
        startDate: formatDate(booking.startDate),
        endDate: formatDate(booking.endDate),
        status:
          booking.status.charAt(0).toUpperCase() + booking.status.slice(1),
        payment:
          booking.paymentStatus.charAt(0).toUpperCase() +
          booking.paymentStatus.slice(1),
        amount: `$${booking.amount}`,
      }));

      // Add table to the document
      autoTable(doc, {
        head: [columns.map((column) => column.header)],
        body: data.map((row) =>
          columns.map((column) => row[column.dataKey as keyof typeof row])
        ),
        startY: 50,
        styles: {
          fontSize: 8,
          cellPadding: 2,
          overflow: "linebreak",
          cellWidth: "auto",
        },
        headStyles: {
          fillColor: [229, 62, 62], // Primary color
          textColor: 255,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        columnStyles: {
          id: { cellWidth: 30 },
          amount: { halign: "right" },
        },
        margin: { top: 50, bottom: 20 },
        didDrawPage: (data) => {
          // Add page number at the bottom
          doc.setFontSize(8);
          doc.text(
            `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`,
            data.settings.margin.left,
            doc.internal.pageSize.height - 10
          );
        },
      });

      // Add summary information at the end
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(
        `Total Bookings: ${data.length}`,
        14,
        doc.internal.pageSize.height - 20
      );

      if (data.length > 0) {
        // Calculate total amount
        const totalAmount = data.reduce((sum, booking) => {
          const amount = parseFloat(booking.amount.replace("$", ""));
          return sum + amount;
        }, 0);

        doc.text(
          `Total Amount: $${totalAmount.toFixed(2)}`,
          14,
          doc.internal.pageSize.height - 15
        );
      }

      // Save the PDF with a filename including the date
      const fileName = `bookings-report-${format(
        new Date(),
        "yyyy-MM-dd"
      )}.pdf`;
      doc.save(fileName);

      // Show success message
      toast.dismiss(toastId);
      toast.success(`PDF report "${fileName}" downloaded successfully`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF report");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="bookings-page">
      <div className="bookings-header">
        <h1>{t("bookings.bookingsManagement")}</h1>
        <div className="bookings-actions">
          <button
            className="btn btn-secondary mr-2"
            onClick={fetchBookings}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={isRefreshing ? "spinning" : ""} />
            <span>{isRefreshing ? "Chargement..." : "Actualiser"}</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={16} />
            <span>{t("bookings.newBooking")}</span>
          </button>
        </div>
      </div>

      <div className="bookings-toolbar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder={t("bookings.searchBookings")}
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="toolbar-actions">
          <button className="filter-button">
            <Filter size={16} />
            <span>{t("bookings.filters")}</span>
          </button>

          <button
            className="export-button"
            onClick={handleGeneratePdf}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? (
              <>
                <div className="spinner-sm"></div>
                <span>{t("bookings.generatingPdf")}</span>
              </>
            ) : (
              <>
                <FileText size={16} />
                <span>{t("bookings.pdf")}</span>
              </>
            )}
          </button>

          <button className="export-button">
            <Download size={16} />
            <span>{t("bookings.excel")}</span>
          </button>
        </div>
      </div>

      {isRefreshing ? (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>{t("bookings.loadingBookings")}</p>
        </div>
      ) : filteredAndSortedBookings.length === 0 ? (
        <div className="no-results">
          <p>{t("bookings.noBookingsFound")}</p>
          <p className="no-results-sub">
            {bookings.length === 0
              ? t("bookings.noBookingsInDb")
              : t("bookings.adjustSearch")}
          </p>
        </div>
      ) : (
        <div className="bookings-table-container">
          <table className="bookings-table">
            <thead>
              <tr>
                <th onClick={() => toggleSortDirection("id")}>
                  <div className="th-content">
                    {t("bookings.id")}
                    {sortField === "id" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      ))}
                  </div>
                </th>
                <th onClick={() => toggleSortDirection("clientName")}>
                  <div className="th-content">
                    {t("bookings.client")}
                    {sortField === "clientName" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      ))}
                  </div>
                </th>
                <th onClick={() => toggleSortDirection("vehicle")}>
                  <div className="th-content">
                    {t("bookings.vehicle")}
                    {sortField === "vehicle" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      ))}
                  </div>
                </th>
                <th onClick={() => toggleSortDirection("agentName")}>
                  <div className="th-content">
                    {t("bookings.agent")}
                    {sortField === "agentName" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      ))}
                  </div>
                </th>
                <th onClick={() => toggleSortDirection("pickupLocation")}>
                  <div className="th-content">
                    {t("bookings.pickupLocation")}
                    {sortField === "pickupLocation" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      ))}
                  </div>
                </th>
                <th onClick={() => toggleSortDirection("returnLocation")}>
                  <div className="th-content">
                    {t("bookings.returnLocation")}
                    {sortField === "returnLocation" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      ))}
                  </div>
                </th>
                <th onClick={() => toggleSortDirection("startDate")}>
                  <div className="th-content">
                    {t("bookings.startDate")}
                    {sortField === "startDate" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      ))}
                  </div>
                </th>
                <th onClick={() => toggleSortDirection("endDate")}>
                  <div className="th-content">
                    {t("bookings.endDate")}
                    {sortField === "endDate" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      ))}
                  </div>
                </th>
                <th onClick={() => toggleSortDirection("getTimeInfo")}>
                  <div className="th-content">
                    {t("bookings.timeStatus")}
                    {sortField === "getTimeInfo" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      ))}
                  </div>
                </th>
                <th onClick={() => toggleSortDirection("status")}>
                  <div className="th-content">
                    {t("bookings.status")}
                    {sortField === "status" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      ))}
                  </div>
                </th>
                <th onClick={() => toggleSortDirection("paymentStatus")}>
                  <div className="th-content">
                    {t("bookings.payment")}
                    {sortField === "paymentStatus" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      ))}
                  </div>
                </th>
                <th onClick={() => toggleSortDirection("amount")}>
                  <div className="th-content">
                    {t("bookings.amount")}
                    {sortField === "amount" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      ))}
                  </div>
                </th>
                <th>{t("bookings.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedBookings.map((booking) => {
                // Calculate time info for this booking - will be recalculated on every render
                const timeInfo = booking.getTimeInfo();

                return (
                  <tr key={booking.id}>
                    <td>{booking.id}</td>
                    <td>{booking.clientName}</td>
                    <td>{booking.vehicle}</td>
                    <td>{booking.agentName}</td>
                    <td>{booking.pickupLocation}</td>
                    <td>{booking.returnLocation}</td>
                    <td>{formatDate(booking.startDate)}</td>
                    <td>{formatDate(booking.endDate)}</td>
                    <td
                      className={`time-status ${timeInfo.status}`}
                      data-seconds-only={
                        timeInfo.secondsOnly ? "true" : "false"
                      }
                    >
                      {timeInfo.text}
                    </td>
                    <td>
                      <span className={`status-badge ${booking.status}`}>
                        {booking.status.charAt(0).toUpperCase() +
                          booking.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`payment-badge ${booking.paymentStatus}`}
                      >
                        {booking.paymentStatus.charAt(0).toUpperCase() +
                          booking.paymentStatus.slice(1)}
                      </span>
                    </td>
                    <td>${booking.amount}</td>
                    <td>
                      <div className="table-actions">
                        {(isAdmin(user) ||
                          user?.id === booking.userId ||
                          user?.id === booking.agentId) && (
                          <button
                            className="action-btn edit"
                            onClick={() => handleEditClick(booking)}
                          >
                            {t("bookings.edit")}
                          </button>
                        )}
                        <button className="action-btn view">
                          {t("bookings.view")}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddBookingModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleAddBooking}
        booking={selectedBooking}
        clients={clients}
        vehicles={vehicles}
        agents={agents}
        isSubmitting={isSaving}
      />
    </div>
  );
}