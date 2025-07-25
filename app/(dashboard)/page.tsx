'use client'

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Users,
  Car,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  CloudSun,
  DollarSign,
  AlertTriangle,
  TrendingDown,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format, subDays, parseISO } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@/utils/permissionUtils";
import "@/pages/Dashboard.css";

interface KpiData {
  title: string;
  value: number | string;
  change: number;
  isIncrease: boolean;
  icon: React.ReactNode;
  isAlert?: boolean;
}

// Define proper types for Supabase responses
interface BookingWithRelations {
  id: string;
  created_at: string | null;
  clients: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  vehicles: {
    id: string;
    brand: string;
    model: string;
  } | null;
}

interface CarReturning {
  id: string;
  vehicle_brand: string;
  vehicle_model: string;
  client_name: string;
  end_date: string;
}

interface TopVehicle {
  id: string;
  brand: string;
  model: string;
  booking_count: number;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [dateFilter, setDateFilter] = useState<
    "today" | "week" | "month" | "custom"
  >("today");
  const [chartPeriod, setChartPeriod] = useState<"7d" | "30d" | "90d">("30d");

  // Fetch dashboard KPIs with the correct date range based on filter
  const { data: kpiData, isLoading: isLoadingKpis } = useQuery({
    queryKey: ["dashboardKpis", dateFilter],
    queryFn: async () => {
      try {
        // Get today's date for comparison
        const today = new Date();

        // Set date range based on filter
        let startDate = today;
        let compareStartDate = subDays(today, 1);
        let compareEndDate = subDays(today, 1);

        switch (dateFilter) {
          case "today":
            // Already set to today
            break;
          case "week":
            // Start from beginning of week
            startDate = new Date();
            startDate.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
            compareStartDate = subDays(startDate, 7);
            compareEndDate = subDays(today, 7);
            break;
          case "month":
            // Start from beginning of month
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            compareStartDate = new Date(
              today.getFullYear(),
              today.getMonth() - 1,
              1
            );
            compareEndDate = new Date(today.getFullYear(), today.getMonth(), 0);
            break;
          case "custom":
            // For custom we would normally use a date range picker
            // For now we'll just use the last 30 days
            startDate = subDays(today, 30);
            compareStartDate = subDays(today, 60);
            compareEndDate = subDays(today, 31);
            break;
        }

        // Format dates for query
        const formattedStartDate = format(startDate, "yyyy-MM-dd");
        const formattedEndDate = format(today, "yyyy-MM-dd 23:59:59");
        const formattedCompareStartDate = format(
          compareStartDate,
          "yyyy-MM-dd"
        );
        const formattedCompareEndDate = format(
          compareEndDate,
          "yyyy-MM-dd 23:59:59"
        );

        // Fetch current period bookings and calculate total revenue
        const { data: currentBookings, error: bookingsError } = await supabase
          .from("bookings")
          .select("id, created_at, amount")
          .gte("created_at", formattedStartDate)
          .lte("created_at", formattedEndDate);

        if (bookingsError) throw bookingsError;

        // Fetch previous period bookings for comparison
        const { data: previousBookings, error: previousError } = await supabase
          .from("bookings")
          .select("id, amount")
          .gte("created_at", formattedCompareStartDate)
          .lte("created_at", formattedCompareEndDate);

        if (previousError) throw previousError;

        const currentBookingsCount = currentBookings?.length || 0;
        const previousBookingsCount = previousBookings?.length || 0;

        // Calculate total revenue
        const currentRevenue =
          currentBookings?.reduce(
            (sum, booking) => sum + (booking.amount || 0),
            0
          ) || 0;
        const previousRevenue =
          previousBookings?.reduce(
            (sum, booking) => sum + (booking.amount || 0),
            0
          ) || 0;

        // Calculate percent change for bookings
        const bookingsChange =
          previousBookingsCount === 0
            ? 100
            : Math.round(
                ((currentBookingsCount - previousBookingsCount) /
                  previousBookingsCount) *
                  100
              );

        // Calculate percent change for revenue
        const revenueChange =
          previousRevenue === 0
            ? 100
            : Math.round(
                ((currentRevenue - previousRevenue) / previousRevenue) * 100
              );

        // Fetch cars returning in the last 24 hours
        const now = new Date();
        const twentyFourHoursAgo = new Date(
          now.getTime() - 24 * 60 * 60 * 1000
        );
        const twentyFourHoursFromNow = new Date(
          now.getTime() + 24 * 60 * 60 * 1000
        );

        console.log("Checking for cars returning between:", {
          from: format(twentyFourHoursAgo, "yyyy-MM-dd HH:mm:ss"),
          to: format(twentyFourHoursFromNow, "yyyy-MM-dd HH:mm:ss"),
        });

        const { data: carsReturningToday, error: returningError } =
          await supabase
            .from("bookings")
            .select("id, end_date")
            .gte("end_date", format(twentyFourHoursAgo, "yyyy-MM-dd HH:mm:ss"))
            .lte(
              "end_date",
              format(twentyFourHoursFromNow, "yyyy-MM-dd HH:mm:ss")
            );

        console.log({ carsReturningToday, returningError });
        console.log("Cars returning today query result:", carsReturningToday);

        if (returningError) {
          console.error("Error fetching cars returning today:", returningError);
          throw returningError;
        }

        const carsReturningCount = carsReturningToday?.length || 0;
        console.log("Cars returning today count:", carsReturningCount);

        // Fetch total expenses for the current period
        let currentExpensesQuery = supabase
          .from("expenses")
          .select("amount")
          .gte("date", formattedStartDate)
          .lte("date", format(today, "yyyy-MM-dd"));

        // Filter by user_id for non-admin users
        if (!isAdmin(user) && user?.id) {
          currentExpensesQuery = currentExpensesQuery.eq("user_id", user.id);
        }

        const { data: currentExpenses, error: expensesError } =
          await currentExpensesQuery;

        console.log("Expenses query result:", {
          currentExpenses,
          expensesError,
        });

        if (expensesError) {
          console.error("Error fetching expenses:", expensesError);
          // Don't throw error, just use default value
        }

        // Fetch previous period expenses for comparison
        let previousExpensesQuery = supabase
          .from("expenses")
          .select("amount")
          .gte("date", formattedCompareStartDate)
          .lte("date", format(compareEndDate, "yyyy-MM-dd"));

        // Filter by user_id for non-admin users
        if (!isAdmin(user) && user?.id) {
          previousExpensesQuery = previousExpensesQuery.eq("user_id", user.id);
        }

        const { data: previousExpenses, error: previousExpensesError } =
          await previousExpensesQuery;

        console.log("Previous expenses query result:", {
          previousExpenses,
          previousExpensesError,
        });

        if (previousExpensesError) {
          console.error(
            "Error fetching previous expenses:",
            previousExpensesError
          );
          // Don't throw error, just use default value
        }

        const currentExpensesTotal =
          currentExpenses?.reduce(
            (sum, expense) => sum + (expense.amount || 0),
            0
          ) || 0;
        const previousExpensesTotal =
          previousExpenses?.reduce(
            (sum, expense) => sum + (expense.amount || 0),
            0
          ) || 0;

        console.log("Expenses totals:", {
          currentExpensesTotal,
          previousExpensesTotal,
        });

        // Calculate percent change for expenses
        const expensesChange =
          previousExpensesTotal === 0
            ? currentExpensesTotal > 0
              ? 100
              : 0
            : Math.round(
                ((currentExpensesTotal - previousExpensesTotal) /
                  previousExpensesTotal) *
                  100
              );

        // Fetch available vehicles
        const { data: availableVehicles, error: vehiclesError } = await supabase
          .from("vehicles")
          .select("id")
          .eq("status", "available");

        if (vehiclesError) throw vehiclesError;

        // Fetch previous period's available vehicles
        const { data: previousVehicles, error: previousVehiclesError } =
          await supabase
            .from("vehicles")
            .select("count")
            .eq("status", "available")
            .single();

        if (previousVehiclesError && previousVehiclesError.code !== "PGRST116")
          throw previousVehiclesError;

        const vehiclesCount = availableVehicles?.length || 0;
        const previousVehiclesCount = previousVehicles?.count || vehiclesCount;

        const vehiclesChange =
          previousVehiclesCount === 0
            ? 0
            : Math.round(
                ((vehiclesCount - previousVehiclesCount) /
                  previousVehiclesCount) *
                  100
              );

        // Fetch active clients (clients with active bookings)
        const { data: activeClients, error: clientsError } = await supabase
          .from("clients")
          .select("id, status")
          .eq("status", "active");

        if (clientsError) throw clientsError;

        // We don't have previous period's client data, so we'll use a default value for demonstration
        const clientsCount = activeClients?.length || 0;
        const clientsChange = 8; // Default value, could be calculated properly with historical data

        // Return the KPI data with new features
        return [
          {
            title: t("dashboard.totalRevenue"),
            value: `$${currentRevenue.toFixed(2)}`,
            change: revenueChange,
            isIncrease: revenueChange >= 0,
            icon: <DollarSign size={24} className="kpi-icon" />,
          },
          {
            title: t("dashboard.carsReturningToday"),
            value: carsReturningCount,
            change: 0, // No comparison for this metric
            isIncrease: true,
            icon: <AlertTriangle size={24} className="kpi-icon" />,
            isAlert: carsReturningCount > 0,
          },
          {
            title: t("dashboard.totalExpenses"),
            value: `$${currentExpensesTotal.toFixed(2)}`,
            change: Math.abs(expensesChange),
            isIncrease: expensesChange <= 0, // Lower expenses are better
            icon: <TrendingDown size={24} className="kpi-icon" />,
          },
          {
            title:
              dateFilter === "today"
                ? t("dashboard.todaysBookings")
                : t("dashboard.bookings"),
            value: currentBookingsCount,
            change: bookingsChange,
            isIncrease: bookingsChange >= 0,
            icon: <Calendar size={24} className="kpi-icon" />,
          },
          {
            title: t("dashboard.availableVehicles"),
            value: vehiclesCount,
            change: Math.abs(vehiclesChange),
            isIncrease: vehiclesChange >= 0,
            icon: <Car size={24} className="kpi-icon" />,
          },
          {
            title: t("dashboard.activeClients"),
            value: clientsCount,
            change: clientsChange,
            isIncrease: true,
            icon: <Users size={24} className="kpi-icon" />,
          },
        ] as KpiData[];
      } catch (error: unknown) {
        console.error("Error fetching KPI data:", error);
        toast.error("Failed to load dashboard KPIs");
        return [];
      }
    },
    staleTime: 60 * 1000, // 1 minute
  });

  // Fetch recent activities
  const { data: activities, isLoading: isLoadingActivities } = useQuery({
    queryKey: ["recentActivities", dateFilter],
    queryFn: async () => {
      try {
        // Get today's date
        const today = new Date();

        // Set date range based on filter
        let startDate = today;

        switch (dateFilter) {
          case "today":
            // Already set to today's start
            startDate = new Date(today.setHours(0, 0, 0, 0));
            break;
          case "week":
            // Start from beginning of week
            startDate = new Date();
            startDate.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
            startDate.setHours(0, 0, 0, 0);
            break;
          case "month":
            // Start from beginning of month
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            break;
          case "custom":
            // For custom we would normally use a date range picker
            // For now we'll just use the last 30 days
            startDate = subDays(today, 30);
            break;
        }

        // Format date for query
        const formattedStartDate = format(startDate, "yyyy-MM-dd");
        const formattedEndDate = format(today, "yyyy-MM-dd 23:59:59");

        const { data, error: bookingsError } = await supabase
          .from("bookings")
          .select(
            `
            id,
            created_at,
            clients (id, first_name, last_name),
            vehicles (id, brand, model)
          `
          )
          .gte("created_at", formattedStartDate)
          .lte("created_at", formattedEndDate)
          .order("created_at", { ascending: false })
          .limit(5);

        if (bookingsError) throw bookingsError;

        // Use type assertion to handle the complex nested response
        const bookings = data as unknown as BookingWithRelations[];

        return (bookings || []).map((booking) => {
          const createdAt = parseISO(
            booking.created_at || new Date().toISOString()
          );
          const timeAgo = getTimeAgo(createdAt);

          const clientName = booking.clients
            ? `${booking.clients.first_name} ${booking.clients.last_name}`
            : "-";

          const vehicleName = booking.vehicles
            ? `${booking.vehicles.brand} ${booking.vehicles.model}`
            : "-";

          return {
            id: booking.id,
            activity: "New Booking",
            client: clientName,
            vehicle: vehicleName,
            time: timeAgo,
            created_at: booking.created_at || new Date().toISOString(),
          };
        });
      } catch (error: unknown) {
        console.error("Error fetching activities:", error);
        toast.error("Failed to load recent activities");
        return [];
      }
    },
    staleTime: 60 * 1000, // 1 minute
  });

  // Fetch cars returning in the last 24 hours details
  const { data: carsReturningToday, isLoading: isLoadingReturns } = useQuery({
    queryKey: ["carsReturningToday"],
    queryFn: async () => {
      try {
        const now = new Date();
        const twentyFourHoursAgo = new Date(
          now.getTime() - 24 * 60 * 60 * 1000
        );
        const twentyFourHoursFromNow = new Date(
          now.getTime() + 24 * 60 * 60 * 1000
        );

        console.log("Fetching cars returning in 24h window:", {
          from: format(twentyFourHoursAgo, "yyyy-MM-dd HH:mm:ss"),
          to: format(twentyFourHoursFromNow, "yyyy-MM-dd HH:mm:ss"),
        });

        const { data, error } = await supabase
          .from("bookings")
          .select(
            `
            id,
            end_date,
            clients (first_name, last_name),
            vehicles (brand, model)
          `
          )
          .gte("end_date", format(twentyFourHoursAgo, "yyyy-MM-dd HH:mm:ss"))
          .lte(
            "end_date",
            format(twentyFourHoursFromNow, "yyyy-MM-dd HH:mm:ss")
          );

        console.log("Cars returning today details:", data);

        if (error) throw error;

        return (data || []).map(
          (booking: {
            id: string;
            end_date: string;
            clients:
              | { first_name: string; last_name: string }
              | { first_name: string; last_name: string }[];
            vehicles:
              | { brand: string; model: string }
              | { brand: string; model: string }[];
          }) => {
            const client = Array.isArray(booking.clients)
              ? booking.clients[0]
              : booking.clients;
            const vehicle = Array.isArray(booking.vehicles)
              ? booking.vehicles[0]
              : booking.vehicles;

            return {
              id: booking.id,
              vehicle_brand: vehicle?.brand || "Unknown",
              vehicle_model: vehicle?.model || "Unknown",
              client_name: client
                ? `${client.first_name} ${client.last_name}`
                : "Unknown",
              end_date: booking.end_date,
            };
          }
        );
      } catch (error: unknown) {
        console.error("Error fetching cars returning today:", error);
        toast.error("Failed to load cars returning today");
        return [];
      }
    },
    staleTime: 60 * 1000, // 1 minute
  });

  // Fetch top vehicles based on booking count
  const { data: topVehicles = [], isLoading: isLoadingTopVehicles } = useQuery<
    TopVehicle[]
  >({
    queryKey: ["topVehicles"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("bookings")
          .select(
            `
            vehicles (
              id,
              brand,
              model
            )
          `
          )
          .not("vehicles", "is", null);

        if (error) throw error;

        // Count bookings per vehicle
        const vehicleCounts: { [key: string]: TopVehicle } = {};

        data.forEach((booking: any) => {
          const vehicles = booking.vehicles;
          if (!vehicles) return;

          // Handle both single vehicle and array of vehicles
          const vehicleList = Array.isArray(vehicles) ? vehicles : [vehicles];

          vehicleList.forEach((vehicle: any) => {
            if (!vehicle) return;

            const key = vehicle.id;
            if (!vehicleCounts[key]) {
              vehicleCounts[key] = {
                id: vehicle.id,
                brand: vehicle.brand,
                model: vehicle.model,
                booking_count: 0,
              };
            }
            vehicleCounts[key].booking_count++;
          });
        });

        // Convert to array and sort by booking count
        return Object.values(vehicleCounts)
          .sort((a, b) => b.booking_count - a.booking_count)
          .slice(0, 5); // Get top 5 vehicles
      } catch (error) {
        console.error("Error fetching top vehicles:", error);
        toast.error("Failed to load top vehicles");
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Helper function to calculate time ago
  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24)
      return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7)
      return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;

    return format(date, "MMM d, yyyy");
  };

  const handleDateFilterChange = (
    filter: "today" | "week" | "month" | "custom"
  ) => {
    setDateFilter(filter);
  };

  const handleChartPeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setChartPeriod(e.target.value as "7d" | "30d" | "90d");
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>{t("nav.dashboard")}</h1>
        <div className="date-filter">
          <span
            className={dateFilter === "today" ? "selected" : ""}
            onClick={() => handleDateFilterChange("today")}
          >
            {t("dashboard.today")}
          </span>
          <span
            className={dateFilter === "week" ? "selected" : ""}
            onClick={() => handleDateFilterChange("week")}
          >
            {t("dashboard.thisWeek")}
          </span>
          <span
            className={dateFilter === "month" ? "selected" : ""}
            onClick={() => handleDateFilterChange("month")}
          >
            {t("dashboard.thisMonth")}
          </span>
          <span
            className={dateFilter === "custom" ? "selected" : ""}
            onClick={() => handleDateFilterChange("custom")}
          >
            {t("dashboard.custom")}
          </span>
        </div>
      </div>

      <div className="kpi-grid">
        {isLoadingKpis
          ? Array(6)
              .fill(0)
              .map((_, index) => (
                <div className="kpi-card skeleton" key={index}>
                  <div className="kpi-card-header">
                    <div className="skeleton-text"></div>
                    <div className="skeleton-icon"></div>
                  </div>
                  <div className="skeleton-value"></div>
                  <div className="skeleton-text"></div>
                </div>
              ))
          : (kpiData || []).map((kpi, index) => (
              <div
                className={`kpi-card ${kpi.isAlert ? "alert" : ""}`}
                key={index}
              >
                <div className="kpi-card-header">
                  <h3 className="kpi-title">{kpi.title}</h3>
                  {kpi.icon}
                </div>
                <div className="kpi-value">{kpi.value}</div>
                <div
                  className={`kpi-change ${
                    kpi.isIncrease ? "increase" : "decrease"
                  }`}
                >
                  {kpi.change > 0 && (
                    <>
                      {kpi.isIncrease ? (
                        <ArrowUpRight size={16} />
                      ) : (
                        <ArrowDownRight size={16} />
                      )}
                      <span>
                        {Math.abs(kpi.change)}% {t("dashboard.fromYesterday")}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
      </div>

      {/* Cars returning today alert section */}
      {carsReturningToday && carsReturningToday.length > 0 && (
        <div className="cars-returning-alert card">
          <div className="card-header">
            <h3>{t("dashboard.carsReturningToday")}</h3>
            <span className="alert-badge">
              {carsReturningToday.length} {t("dashboard.returningToday")}
            </span>
          </div>
          <div className="returning-cars-list">
            {isLoadingReturns
              ? Array(3)
                  .fill(0)
                  .map((_, index) => (
                    <div className="returning-car-item skeleton" key={index}>
                      <div className="skeleton-text"></div>
                      <div className="skeleton-text small"></div>
                    </div>
                  ))
              : carsReturningToday.map((car: CarReturning) => (
                  <div className="returning-car-item" key={car.id}>
                    <div className="car-info">
                      <span className="car-name">
                        {car.vehicle_brand} {car.vehicle_model}
                      </span>
                      <span className="client-name">
                        {t("dashboard.client")}: {car.client_name}
                      </span>
                    </div>
                    <div className="return-date">
                      <AlertTriangle size={16} className="alert-icon" />
                      <span>Today</span>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="dashboard-chart card">
          <div className="card-header">
            <h3>{t("dashboard.bookingsOverview")}</h3>
            <div className="card-header-actions">
              <select
                value={chartPeriod}
                onChange={handleChartPeriodChange}
                className="chart-period-select"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>
          </div>
          <div className="chart-container">
            <div className="chart-placeholder">
              <BarChart3 size={36} />
              <p>
                {t("dashboard.bookingData")}{" "}
                {chartPeriod === "7d"
                  ? "7"
                  : chartPeriod === "30d"
                  ? "30"
                  : "90"}{" "}
                {t("dashboard.days")}
              </p>
            </div>
          </div>
        </div>

        <div className="dashboard-activities card">
          <div className="card-header">
            <h3>{t("dashboard.recentBookings")}</h3>
            <button className="view-all-btn">{t("dashboard.viewAll")}</button>
          </div>
          <div className="activities-list">
            {isLoadingActivities ? (
              Array(5)
                .fill(0)
                .map((_, index) => (
                  <div className="activity-item skeleton" key={index}>
                    <div className="activity-content">
                      <div className="skeleton-text"></div>
                      <div className="skeleton-text small"></div>
                    </div>
                    <div className="skeleton-text tiny"></div>
                  </div>
                ))
            ) : activities && activities.length === 0 ? (
              <div className="no-activities">
                <p>{t("dashboard.noActivities")}</p>
              </div>
            ) : (
              activities &&
              activities.map((activity) => (
                <div className="activity-item" key={activity.id}>
                  <div className="activity-content">
                    <p className="activity-text">{activity.activity}</p>
                    <div className="activity-details">
                      <span className="activity-client">
                        {activity.client !== "-" &&
                          `${t("dashboard.client")}: ${activity.client}`}
                      </span>
                      <span className="activity-vehicle">
                        {activity.vehicle !== "-" &&
                          `${t("dashboard.vehicle")}: ${activity.vehicle}`}
                      </span>
                    </div>
                  </div>
                  <span className="activity-time">{activity.time}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-lower-grid">
        <div className="top-vehicles card">
          <div className="card-header">
            <h3>{t("dashboard.topVehicles")}</h3>
          </div>
          <div className="top-vehicles-list">
            {isLoadingTopVehicles ? (
              Array(5)
                .fill(0)
                .map((_, index) => (
                  <div className="vehicle-item skeleton" key={index}>
                    <div className="skeleton-text"></div>
                    <div className="skeleton-text small"></div>
                  </div>
                ))
            ) : topVehicles.length === 0 ? (
              <div className="no-vehicles">
                <p>{t("dashboard.noVehicles")}</p>
              </div>
            ) : (
              topVehicles.map((vehicle) => (
                <div className="vehicle-item" key={vehicle.id}>
                  <div className="vehicle-info">
                    <span className="vehicle-name">
                      {vehicle.brand} {vehicle.model}
                    </span>
                    <span className="booking-count">
                      {vehicle.booking_count} {t("dashboard.bookings")}
                    </span>
                  </div>
                  <div className="vehicle-rank">
                    <Car size={16} className="vehicle-icon" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="weather-widget card">
          <div className="card-header">
            <h3>{t("dashboard.weatherForecast")}</h3>
            <span className="location-badge">New York, NY</span>
          </div>
          <div className="weather-content">
            <div className="weather-current">
              <CloudSun size={48} className="weather-icon" />
              <div className="weather-temp">72°F</div>
              <div className="weather-desc">{t("dashboard.partlyCloudy")}</div>
            </div>
            <div className="weather-forecast">
              <div className="forecast-day">
                <span className="day">Mon</span>
                <CloudSun size={20} />
                <span className="temp">74°F</span>
              </div>
              <div className="forecast-day">
                <span className="day">Tue</span>
                <CloudSun size={20} />
                <span className="temp">76°F</span>
              </div>
              <div className="forecast-day">
                <span className="day">Wed</span>
                <CloudSun size={20} />
                <span className="temp">78°F</span>
              </div>
              <div className="forecast-day">
                <span className="day">Thu</span>
                <CloudSun size={20} />
                <span className="temp">75°F</span>
              </div>
              <div className="forecast-day">
                <span className="day">Fri</span>
                <CloudSun size={20} />
                <span className="temp">72°F</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}