import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Search,
  Filter,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Edit,
  Trash2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, getCurrentUser } from "../lib/supabase";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { useAuth } from "../contexts/AuthContext";
import { isAdmin } from "../utils/permissionUtils";
import "./Expenses.css";

interface Expense {
  id: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  user_id: string;
  user_name: string;
  user_job_title: string;
  created_at: string;
}

interface User {
  id: string;
  name: string;
  job_title: string;
}

interface ExpenseFormData {
  amount: number;
  description: string;
  date: string;
  category: string;
  user_id: string;
}

interface SupabaseExpenseResponse {
  id: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  user_id: string;
  created_at: string;
  profiles:
    | {
        id: string;
        name: string;
        job_title: string;
      }[]
    | null;
}

export const Expenses = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [sortField, setSortField] = useState<keyof Expense>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  console.log("test first");
  console.log({ user }, "1");
  // Form state
  const [formData, setFormData] = useState<ExpenseFormData>({
    amount: 0,
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
    category: "other",
    user_id: "",
  });

  // Check if current user can add expenses (has agent or commercial job title)
  const canAddExpenses =
    user?.role === "admin" ||
    user?.role === "commercial" ||
    user?.role === "agent";

  // Fetch users with agent or commercial job titles (for admins only)
  const { data: agentUsers = [] } = useQuery<User[]>({
    queryKey: ["agentUsers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, job_title")
        .in("job_title", ["agent", "commercial"])
        .order("name");

      if (error) {
        toast.error("Failed to load users");
        throw error;
      }

      return data.map((profile) => ({
        id: profile.id,
        name: profile.name || "Unknown User",
        job_title: profile.job_title || "unknown",
      }));
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user && isAdmin(user),
  });

  // Fetch expenses from database
  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["expenses"],
    queryFn: async () => {
      let query = supabase.from("expenses").select(
        `
          id,
          amount,
          description,
          date,
          category,
          user_id,
          created_at,
          profiles (id, name, job_title)
        `
      );

      // Filter by user_id for non-admin users
      if (!isAdmin(user) && user?.id) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query.order("date", { ascending: false });
      console.log({ data, error });

      if (error) {
        toast.error("Failed to load expenses");
        throw error;
      }

      return (data as SupabaseExpenseResponse[]).map((expense) => {
        const profile = Array.isArray(expense.profiles)
          ? expense.profiles[0]
          : expense.profiles;
        return {
          id: expense.id,
          amount: expense.amount,
          description: expense.description,
          date: expense.date,
          category: expense.category,
          user_id: expense.user_id,
          user_name: profile?.name || "Unknown User",
          user_job_title: profile?.job_title || "unknown",
          created_at: expense.created_at,
        };
      });
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!user,
  });

  // Create or update expense mutation
  const { mutate: saveExpense, isPending: isSaving } = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      // For non-admin users, automatically use their user_id
      let finalUserId = data.user_id;
      if (!isAdmin(currentUser)) {
        finalUserId = currentUser.id;
      }

      if (!finalUserId) {
        throw new Error("User ID is required");
      }

      const expenseData = {
        amount: data.amount,
        description: data.description,
        date: data.date,
        category: data.category,
        user_id: finalUserId,
      };

      if (selectedExpense) {
        const { error } = await supabase
          .from("expenses")
          .update(expenseData)
          .eq("id", selectedExpense.id);

        if (error) throw error;
        toast.success("Expense updated successfully");
      } else {
        const { error } = await supabase.from("expenses").insert(expenseData);

        if (error) throw error;
        toast.success("Expense added successfully");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setIsModalOpen(false);
      setSelectedExpense(undefined);
      setFormData({
        amount: 0,
        description: "",
        date: format(new Date(), "yyyy-MM-dd"),
        category: "other",
        user_id: "",
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to save expense: ${error.message}`);
    },
  });

  // Delete expense mutation
  const { mutate: deleteExpense } = useMutation({
    mutationFn: async (expenseId: string) => {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId);

      if (error) throw error;
      toast.success("Expense deleted successfully");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete expense: ${error.message}`);
    },
  });

  // Filter and sort expenses
  const filteredAndSortedExpenses = React.useMemo(() => {
    if (!expenses) return [];

    const filtered = expenses.filter((expense) => {
      // Search term filter
      const searchMatches =
        !searchTerm ||
        (() => {
          const searchLower = searchTerm.toLowerCase();
          return (
            expense.description.toLowerCase().includes(searchLower) ||
            expense.user_name.toLowerCase().includes(searchLower) ||
            expense.category.toLowerCase().includes(searchLower) ||
            expense.amount.toString().includes(searchLower)
          );
        })();

      // User filter (for admins only)
      const userMatches = !selectedUserId || expense.user_id === selectedUserId;

      return searchMatches && userMatches;
    });

    return [...filtered].sort((a, b) => {
      if (sortField === "amount") {
        return sortDirection === "asc"
          ? a[sortField] - b[sortField]
          : b[sortField] - a[sortField];
      }

      return sortDirection === "asc"
        ? String(a[sortField]).localeCompare(String(b[sortField]))
        : String(b[sortField]).localeCompare(String(a[sortField]));
    });
  }, [expenses, searchTerm, selectedUserId, sortField, sortDirection]);

  // Set default user_id for form when user data is loaded
  React.useEffect(() => {
    if (!isAdmin(user) && user && !formData.user_id) {
      setFormData((prev) => ({ ...prev, user_id: user.id }));
    }
  }, [user, formData.user_id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // For non-admin users, use their user_id automatically
    let finalUserId = formData.user_id;
    if (!isAdmin(user) && user) {
      finalUserId = user.id;
    }

    if (!finalUserId && isAdmin(user)) {
      toast.error("Please select a user");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Please enter a description");
      return;
    }
    if (formData.amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    saveExpense({ ...formData, user_id: finalUserId });
  };

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    setFormData({
      amount: expense.amount,
      description: expense.description,
      date: expense.date,
      category: expense.category,
      user_id: expense.user_id,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (expenseId: string) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      deleteExpense(expenseId);
    }
  };

  const toggleSortDirection = (field: keyof Expense) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const totalExpenses = filteredAndSortedExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  const categoryOptions = [
    { value: "fuel", label: "Fuel" },
    { value: "maintenance", label: "Maintenance" },
    { value: "insurance", label: "Insurance" },
    { value: "repairs", label: "Repairs" },
    { value: "office", label: "Office Supplies" },
    { value: "travel", label: "Travel" },
    { value: "other", label: "Other" },
  ];

  // Don't show page if user doesn't have permission
  if (!canAddExpenses) {
    return (
      <div className="expenses-page">
        <div className="loading-indicator">
          <p>
            Access denied. This feature is only available for agents, commercial
            users, and administrators.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="expenses-page">
      <div className="expenses-header">
        <h1>{t("expenses.expenseManagement")}</h1>
        <div className="expenses-actions">
          <button
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={16} />
            <span>{t("expenses.addExpense")}</span>
          </button>
        </div>
      </div>

      <div className="expenses-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Expenses</h3>
            <p className="stat-value">${totalExpenses.toFixed(2)}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <FileText size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Records</h3>
            <p className="stat-value">{filteredAndSortedExpenses.length}</p>
          </div>
        </div>
      </div>

      <div className="expenses-toolbar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search expenses..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isAdmin(user) && (
          <div className="user-filter">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="user-filter-select"
            >
              <option value="">All Users</option>
              {agentUsers.map((agentUser) => (
                <option key={agentUser.id} value={agentUser.id}>
                  {agentUser.name} ({agentUser.job_title})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="toolbar-actions">
          <button className="filter-button">
            <Filter size={16} />
            <span>Filters</span>
          </button>
          <button className="export-button">
            <Download size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading expenses...</p>
        </div>
      ) : (
        <div className="expenses-table-container">
          <table className="expenses-table">
            <thead>
              <tr>
                <th onClick={() => toggleSortDirection("date")}>
                  <div className="th-content">
                    Date
                    {sortField === "date" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      ))}
                  </div>
                </th>
                {isAdmin(user) && (
                  <th onClick={() => toggleSortDirection("user_name")}>
                    <div className="th-content">
                      User
                      {sortField === "user_name" &&
                        (sortDirection === "asc" ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        ))}
                    </div>
                  </th>
                )}
                <th onClick={() => toggleSortDirection("category")}>
                  <div className="th-content">
                    Category
                    {sortField === "category" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      ))}
                  </div>
                </th>
                <th onClick={() => toggleSortDirection("description")}>
                  <div className="th-content">
                    Description
                    {sortField === "description" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      ))}
                  </div>
                </th>
                <th onClick={() => toggleSortDirection("amount")}>
                  <div className="th-content">
                    Amount
                    {sortField === "amount" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      ))}
                  </div>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedExpenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{format(parseISO(expense.date), "MMM dd, yyyy")}</td>
                  {isAdmin(user) && (
                    <td>
                      {expense.user_name}
                      <br />
                      <small className="text-gray-500">
                        ({expense.user_job_title})
                      </small>
                    </td>
                  )}
                  <td>
                    <span
                      className={`category-badge category-${expense.category}`}
                    >
                      {expense.category.charAt(0).toUpperCase() +
                        expense.category.slice(1)}
                    </span>
                  </td>
                  <td>{expense.description}</td>
                  <td className="amount-cell">${expense.amount.toFixed(2)}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="action-btn edit"
                        onClick={() => handleEdit(expense)}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDelete(expense.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Expense Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedExpense ? "Edit Expense" : "Add New Expense"}</h2>
              <button
                className="modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="expense-form">
              {isAdmin(user) && (
                <div className="form-group">
                  <label htmlFor="user_id">User *</label>
                  <select
                    id="user_id"
                    value={formData.user_id}
                    onChange={(e) =>
                      setFormData({ ...formData, user_id: e.target.value })
                    }
                    required
                  >
                    <option value="">Select User</option>
                    {agentUsers.map((agentUser) => (
                      <option key={agentUser.id} value={agentUser.id}>
                        {agentUser.name} ({agentUser.job_title})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="category">Category *</label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  required
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="amount">Amount *</label>
                <input
                  type="number"
                  id="amount"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="date">Date *</label>
                <input
                  type="date"
                  id="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving
                    ? "Saving..."
                    : selectedExpense
                    ? "Update Expense"
                    : "Add Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
