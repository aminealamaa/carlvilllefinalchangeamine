import React, { useState } from "react";
import { DollarSign, Calendar, TrendingUp, Award, Car } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  startOfYear,
} from "date-fns";
import { useAuth } from "../contexts/AuthContext";
import "./AgentCommissionView.css";

interface BookingDetail {
  id: string;
  client_name: string;
  vehicle_name: string;
  agent_name: string;
  amount: number;
  commission_amount: number;
  commission_rate: number;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

interface CommissionStats {
  total_commission: number;
  total_sales: number;
  total_bookings: number;
  commission_rate: number;
}

const AgentCommissionView = () => {
  const { user } = useAuth();
  const [dateFilter, setDateFilter] = useState<"month" | "quarter" | "year">(
    "month"
  );

  // Get date range based on filter
  const getDateRange = () => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date = today;

    switch (dateFilter) {
      case "month": {
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        break;
      }
      case "quarter": {
        startDate = startOfQuarter(today);
        break;
      }
      case "year": {
        startDate = startOfYear(today);
        break;
      }
      default: {
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
      }
    }

    return {
      start: format(startDate, "yyyy-MM-dd"),
      end: format(endDate, "yyyy-MM-dd"),
    };
  };

  // Fetch user's booking details with commission data
  const {
    data: bookingDetails,
    isLoading: isLoadingBookings,
    error: bookingsError,
  } = useQuery<BookingDetail[]>({
    queryKey: ["userBookings", user?.id, dateFilter],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      const { start, end } = getDateRange();

      console.log("Fetching bookings created by user:", user.id);
      console.log("Date range:", { start, end });

      // First, fetch the basic booking data
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select(
          `
          id,
          amount,
          commission_amount,
          commission_rate,
          start_date,
          end_date,
          status,
          created_at,
          user_id,
          agent_id,
          client_id,
          vehicle_id
        `
        )
        .eq("user_id", user.id)
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: false });

      if (bookingsError) {
        console.error("Error fetching bookings:", bookingsError);
        throw bookingsError;
      }

      if (!bookings || bookings.length === 0) {
        console.log("No bookings found for user");
        return [];
      }

      console.log("Found bookings:", bookings);

      // Get unique IDs for related data
      const clientIds = [
        ...new Set(bookings.map((b) => b.client_id).filter(Boolean)),
      ];
      const vehicleIds = [
        ...new Set(bookings.map((b) => b.vehicle_id).filter(Boolean)),
      ];
      const agentIds = [
        ...new Set(bookings.map((b) => b.agent_id).filter(Boolean)),
      ];

      console.log("Related IDs:", { clientIds, vehicleIds, agentIds });

      // Fetch clients data
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id, first_name, last_name")
        .in("id", clientIds);

      if (clientsError) {
        console.error("Error fetching clients:", clientsError);
      }

      // Fetch vehicles data
      const { data: vehicles, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("id, brand, model")
        .in("id", vehicleIds);

      if (vehiclesError) {
        console.error("Error fetching vehicles:", vehiclesError);
      }

      // Fetch agents data
      const { data: agents, error: agentsError } = await supabase
        .from("agents")
        .select("id, first_name, last_name")
        .in("id", agentIds);

      if (agentsError) {
        console.error("Error fetching agents:", agentsError);
      }

      console.log("Related data:", { clients, vehicles, agents });

      // Create lookup maps for better performance
      const clientsMap = new Map(clients?.map((c) => [c.id, c]) || []);
      const vehiclesMap = new Map(vehicles?.map((v) => [v.id, v]) || []);
      const agentsMap = new Map(agents?.map((a) => [a.id, a]) || []);

      // Combine the data
      return bookings.map((booking) => {
        const client = clientsMap.get(booking.client_id);
        const vehicle = vehiclesMap.get(booking.vehicle_id);
        const agent = agentsMap.get(booking.agent_id);

        // Use existing commission data or calculate default (10% if not set)
        const commissionRate = booking.commission_rate || 0.1;
        const commissionAmount =
          booking.commission_amount || (booking.amount || 0) * commissionRate;

        return {
          id: booking.id,
          client_name: client
            ? `${client.first_name} ${client.last_name}`
            : "Unknown Client",
          vehicle_name: vehicle
            ? `${vehicle.brand} ${vehicle.model}`
            : "Unknown Vehicle",
          agent_name: agent
            ? `${agent.first_name} ${agent.last_name}`
            : "No Agent Assigned",
          amount: booking.amount || 0,
          commission_amount: commissionAmount,
          commission_rate: commissionRate,
          start_date: booking.start_date,
          end_date: booking.end_date,
          status: booking.status,
          created_at: booking.created_at,
        };
      });
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user?.id,
  });

  // Calculate commission statistics from booking data
  const commissionStats: CommissionStats = React.useMemo(() => {
    if (!bookingDetails || bookingDetails.length === 0) {
      return {
        total_commission: 0,
        total_sales: 0,
        total_bookings: 0,
        commission_rate: 0.1, // Default 10%
      };
    }

    const totalSales = bookingDetails.reduce(
      (sum, booking) => sum + booking.amount,
      0
    );
    const totalCommission = bookingDetails.reduce(
      (sum, booking) => sum + booking.commission_amount,
      0
    );
    const completedBookings = bookingDetails.filter(
      (booking) => booking.status === "completed"
    ).length;

    // Calculate average commission rate
    const avgCommissionRate =
      bookingDetails.length > 0
        ? bookingDetails.reduce(
            (sum, booking) => sum + booking.commission_rate,
            0
          ) / bookingDetails.length
        : 0.1;

    return {
      total_commission: totalCommission,
      total_sales: totalSales,
      total_bookings: completedBookings,
      commission_rate: avgCommissionRate,
    };
  }, [bookingDetails]);

  // Don't render if not authenticated
  if (!user) {
    return (
      <div className="agent-commission-view">
        <div className="access-denied">
          <h2>Authentication Required</h2>
          <p>Please log in to view your bookings.</p>
        </div>
      </div>
    );
  }

  const handleDateFilterChange = (filter: "month" | "quarter" | "year") => {
    setDateFilter(filter);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  return (
    <div className="agent-commission-view">
      <div className="commission-header">
        <div className="header-title">
          <h1>My Bookings</h1>
          <span className="agent-name">View all bookings you've created</span>
        </div>
        <div className="date-filter">
          <span
            className={dateFilter === "month" ? "selected" : ""}
            onClick={() => handleDateFilterChange("month")}
          >
            This Month
          </span>
          <span
            className={dateFilter === "quarter" ? "selected" : ""}
            onClick={() => handleDateFilterChange("quarter")}
          >
            This Quarter
          </span>
          <span
            className={dateFilter === "year" ? "selected" : ""}
            onClick={() => handleDateFilterChange("year")}
          >
            This Year
          </span>
        </div>
      </div>

      {/* Commission Stats */}
      <div className="commission-stats">
        {isLoadingBookings ? (
          Array(4)
            .fill(0)
            .map((_, index) => (
              <div className="stat-card skeleton" key={index}>
                <div className="stat-icon skeleton-icon"></div>
                <div className="stat-content">
                  <div className="skeleton-text"></div>
                  <div className="skeleton-value"></div>
                </div>
              </div>
            ))
        ) : bookingsError ? (
          <div className="error-message">
            <h3>Error loading commission data</h3>
            <p>
              {bookingsError instanceof Error
                ? bookingsError.message
                : "Unknown error occurred"}
            </p>
          </div>
        ) : (
          <>
            <div className="stat-card">
              <div className="stat-icon commission">
                <DollarSign size={24} />
              </div>
              <div className="stat-content">
                <h3>Total Commission</h3>
                <p className="stat-value">
                  {formatCurrency(commissionStats.total_commission)}
                </p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon sales">
                <TrendingUp size={24} />
              </div>
              <div className="stat-content">
                <h3>Total Sales</h3>
                <p className="stat-value">
                  {formatCurrency(commissionStats.total_sales)}
                </p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon bookings">
                <Calendar size={24} />
              </div>
              <div className="stat-content">
                <h3>Completed Bookings</h3>
                <p className="stat-value">
                  {formatNumber(commissionStats.total_bookings)}
                </p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon rate">
                <Award size={24} />
              </div>
              <div className="stat-content">
                <h3>Commission Rate</h3>
                <p className="stat-value">
                  {(commissionStats.commission_rate * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Booking Details */}
      <div className="bookings-section">
        <div className="section-header">
          <h2>Booking Details</h2>
          <span className="booking-count">
            {bookingDetails?.length || 0} bookings
          </span>
        </div>

        {isLoadingBookings ? (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <p>Loading bookings...</p>
          </div>
        ) : bookingDetails && bookingDetails.length > 0 ? (
          <div className="bookings-table-container">
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Vehicle</th>
                  <th>Agent</th>
                  <th>Period</th>
                  <th>Amount</th>
                  <th>Commission Rate</th>
                  <th>Commission</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookingDetails.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      {format(parseISO(booking.created_at), "MMM dd, yyyy")}
                    </td>
                    <td>{booking.client_name}</td>
                    <td>{booking.vehicle_name}</td>
                    <td>{booking.agent_name}</td>
                    <td>
                      <div className="date-range">
                        <span>
                          {format(parseISO(booking.start_date), "MMM dd")}
                        </span>
                        <span>-</span>
                        <span>
                          {format(parseISO(booking.end_date), "MMM dd, yyyy")}
                        </span>
                      </div>
                    </td>
                    <td className="amount-cell">
                      {formatCurrency(booking.amount)}
                    </td>
                    <td className="rate-cell">
                      {(booking.commission_rate * 100).toFixed(1)}%
                    </td>
                    <td className="commission-cell">
                      {formatCurrency(booking.commission_amount)}
                    </td>
                    <td>
                      <span className={`status-badge ${booking.status}`}>
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-bookings">
            <Car size={48} />
            <h3>No bookings found</h3>
            <p>You haven't made any bookings in this period.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentCommissionView;
