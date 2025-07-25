import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Download,
  Calendar,
  TrendingUp,
  Medal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "../lib/supabase";
import {
  AddAgentModal,
  AgentFormData,
} from "../components/agents/AddAgentModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import "./AgentCommissions.css";

interface AgentCommission {
  id: string;
  name: string;
  reservationCount: number;
  totalSales: number;
  commission: number;
  rank: number;
  performanceScore: number;
}

type SortField =
  | "reservationCount"
  | "totalSales"
  | "commission"
  | "performanceScore";

export const AgentCommissions = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });
  const [sortField, setSortField] = useState<SortField>("performanceScore");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Fetch agent commission data
  const {
    data: commissions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["agent-commissions", dateRange],
    queryFn: async () => {
      // Format dates for API query
      const startDate = format(dateRange.start, "yyyy-MM-dd");
      const endDate = format(dateRange.end, "yyyy-MM-dd");

      // First get all agents
      const { data: agents, error: agentsError } = await supabase
        .from("agents")
        .select("id, first_name, last_name");

      if (agentsError) throw agentsError;

      // Then get bookings for the date range
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("id, agent_id, amount, commission_amount, created_at")
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      if (bookingsError) throw bookingsError;

      // Calculate commission data for each agent
      let agentData: AgentCommission[] = agents.map((agent) => {
        // Filter bookings for this agent
        const agentBookings = bookings.filter(
          (booking) => booking.agent_id === agent.id
        );

        // Calculate totals
        const totalSales = agentBookings.reduce(
          (sum, booking) => sum + booking.amount,
          0
        );

        const commissionTotal = agentBookings.reduce(
          (sum, booking) => sum + (booking.commission_amount || 0),
          0
        );

        // Calculate performance score based on 60% sales, 30% reservations, 10% commission
        const performanceScore =
          totalSales * 0.6 +
          agentBookings.length * 1000 * 0.3 +
          commissionTotal * 0.1;

        return {
          id: agent.id,
          name: `${agent.first_name} ${agent.last_name}`,
          reservationCount: agentBookings.length,
          totalSales,
          commission: commissionTotal,
          rank: 0, // Will be set after sorting
          performanceScore,
        };
      });

      // Sort by performance score and assign ranks
      agentData.sort((a, b) => b.performanceScore - a.performanceScore);

      // Assign ranks based on the sorted order
      agentData = agentData.map((agent, index) => ({
        ...agent,
        rank: index + 1,
      }));

      return agentData;
    },
  });

  // Add new agent sale mutation
  const { mutate: addAgentSale, isPending } = useMutation({
    mutationFn: async (data: AgentFormData) => {
      // Find agent by first and last name
      const { data: agentData, error: agentError } = await supabase
        .from("agents")
        .select("id")
        .eq("first_name", data.firstName)
        .eq("last_name", data.lastName)
        .single();

      if (agentError) throw agentError;

      // Create a new booking with commission
      const commissionRate = 0.08; // 8% commission rate
      const amount = 1000; // Placeholder amount (should be provided in form)
      const commissionAmount = amount * commissionRate;

      const { error: bookingError } = await supabase.from("bookings").insert({
        agent_id: agentData.id,
        amount,
        commission_amount: commissionAmount,
        commission_rate: commissionRate,
        start_date: format(new Date(), "yyyy-MM-dd"),
        end_date: format(
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          "yyyy-MM-dd"
        ),
        status: "pending",
        payment_status: "pending",
      });

      if (bookingError) throw bookingError;

      return { success: true };
    },
    onSuccess: () => {
      toast.success("Agent sale added successfully");
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["agent-commissions"] });
    },
    onError: (error) => {
      toast.error(
        `Failed to add agent sale: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    },
  });

  const handleAddAgent = (data: AgentFormData) => {
    addAgentSale(data);
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

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc"); // Default to descending when changing sort field
    }
  };

  // Sort commissions based on current sort field and direction
  const sortedCommissions = React.useMemo(() => {
    if (!commissions.length) return [];

    return [...commissions].sort((a, b) => {
      const valueA = a[sortField];
      const valueB = b[sortField];

      const compareResult =
        sortDirection === "asc"
          ? valueA > valueB
            ? 1
            : -1
          : valueA < valueB
          ? 1
          : -1;

      return compareResult;
    });
  }, [commissions, sortField, sortDirection]);

  // Get medal for top 3 performers
  const getMedalIcon = (rank: number) => {
    if (rank === 1) return <Medal size={18} className="medal gold" />;
    if (rank === 2) return <Medal size={18} className="medal silver" />;
    if (rank === 3) return <Medal size={18} className="medal bronze" />;
    return null;
  };

  return (
    <div className="agent-commissions">
      <div className="commissions-header">
        <div className="header-title">
          <h1>{t("commissions.agentCommissions")}</h1>
          <span className="last-updated">
            {t("commissions.lastUpdated")}:{" "}
            {format(new Date(), "MMM d, yyyy HH:mm")}
          </span>
        </div>

        <div className="header-actions">
          <div className="date-filter">
            <Calendar size={16} />
            <input
              type="date"
              value={format(dateRange.start, "yyyy-MM-dd")}
              onChange={(e) =>
                setDateRange((prev) => ({
                  ...prev,
                  start: new Date(e.target.value),
                }))
              }
            />
            <span>{t("commissions.to")}</span>
            <input
              type="date"
              value={format(dateRange.end, "yyyy-MM-dd")}
              onChange={(e) =>
                setDateRange((prev) => ({
                  ...prev,
                  end: new Date(e.target.value),
                }))
              }
            />
          </div>

          <button className="btn btn-secondary">
            <Download size={16} />
            <span>{t("commissions.export")}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error instanceof Error ? error.message : "An error occurred"}
        </div>
      )}

      <div className="commissions-table-container">
        <table className="commissions-table">
          <thead>
            <tr>
              <th>{t("commissions.rank")}</th>
              <th>{t("commissions.agentName")}</th>
              <th
                onClick={() => handleSort("reservationCount")}
                className="sortable-header"
              >
                <div className="header-content">
                  {t("commissions.reservations")}
                  {sortField === "reservationCount" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    ))}
                </div>
              </th>
              <th
                onClick={() => handleSort("totalSales")}
                className="sortable-header"
              >
                <div className="header-content">
                  {t("commissions.totalSales")}
                  {sortField === "totalSales" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    ))}
                </div>
              </th>
              <th
                onClick={() => handleSort("commission")}
                className="sortable-header"
              >
                <div className="header-content">
                  {t("commissions.commission")}
                  {sortField === "commission" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    ))}
                </div>
              </th>
              <th
                onClick={() => handleSort("performanceScore")}
                className="sortable-header"
              >
                <div className="header-content">
                  {t("commissions.performance")}
                  {sortField === "performanceScore" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    ))}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="loading-state">
                  {t("commissions.loadingCommissions")}
                </td>
              </tr>
            ) : sortedCommissions.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-state">
                  {t("commissions.noCommissionData")}
                </td>
              </tr>
            ) : (
              sortedCommissions.map((agent) => (
                <tr
                  key={agent.id}
                  className={agent.rank <= 3 ? `rank-${agent.rank}` : ""}
                >
                  <td>
                    <div className="rank-display">
                      {getMedalIcon(agent.rank)}
                      <span>#{agent.rank}</span>
                    </div>
                  </td>
                  <td>{agent.name}</td>
                  <td>{formatNumber(agent.reservationCount)}</td>
                  <td>{formatCurrency(agent.totalSales)}</td>
                  <td>{formatCurrency(agent.commission)}</td>
                  <td>
                    <div className="performance-indicator">
                      <TrendingUp size={16} />
                      <span>
                        {Math.round(agent.performanceScore / 100) / 10}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddAgentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddAgent}
        isSubmitting={isPending}
      />
    </div>
  );
};
