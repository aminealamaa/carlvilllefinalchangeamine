import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Plus, Download, User, Mail } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, ensureAuthenticated } from "../lib/supabase";
import { AddAgentModal } from "../components/agents/AddAgentModal";
import { EditAgentModal } from "../components/agents/EditAgentModal";
import { toast } from "sonner";
import "./Agents.css";
import { useAuth } from "../contexts/AuthContext";

export interface Agent {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  user_id: string;
  created_at: string | null;
}

export interface AgentFormData {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export const Agents = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

  // Fetch agents
  const { data: agents = [], error: fetchError } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      try {
        // Ensure we have a valid session before proceeding
        const isAuthenticated = await ensureAuthenticated();
        if (!isAuthenticated) {
          console.error("Authentication failed, cannot fetch agents");
          toast.error(
            "Authentication error. Please try refreshing the page or login again."
          );
          return [];
        }

        const { data, error } = await supabase
          .from("agents")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          // Special handling for auth errors
          if (error.code === "PGRST301" || error.message.includes("JWT")) {
            toast.error("Session expired. Please refresh the page.");
            return [];
          }

          throw error;
        }

        // Add validation and sanitization
        return (data || []).map((agent) => {
          // Ensure all required fields have at least default values
          return {
            id:
              agent.id || `unknown-${Math.random().toString(36).substr(2, 9)}`,
            first_name: agent.first_name || "",
            last_name: agent.last_name || "",
            email: agent.email || "",
            role: agent.role || "",
            user_id: agent.user_id || "",
            created_at: agent.created_at,
          };
        }) as Agent[];
      } catch (err) {
        console.error("Error fetching agents:", err);
        toast.error("Failed to load agents");
        throw err;
      }
    },
    // Add retries and proper error handling
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Add effect to handle empty data detection
  React.useEffect(() => {
    if (agents && agents.length === 0) {
      // If we have no agents, this might be an auth issue
      console.log("Empty agents array detected, might be auth issue");

      // Check if we can manually refresh the auth and retry
      const retryFetch = async () => {
        const isAuthenticated = await ensureAuthenticated();
        if (isAuthenticated) {
          console.log("Authentication renewed, retrying agents fetch");
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["agents"] });
          }, 1000);
        } else {
          console.error("Failed to authenticate after retry");
        }
      };

      retryFetch();
    }
  }, [agents, queryClient]);

  const filteredAgents = React.useMemo(() => {
    // Guard against null or undefined agents array
    if (!agents || agents.length === 0) {
      return [];
    }

    return agents.filter((agent) => {
      // Skip invalid agents
      if (
        !agent ||
        !agent.first_name ||
        !agent.last_name ||
        !agent.email ||
        !agent.role
      ) {
        return false;
      }

      return (
        agent.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.role.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [agents, searchQuery]);

  // Debug effect to validate agent data structure
  React.useEffect(() => {
    if (agents && agents.length > 0) {
      // Check for any agents with missing required fields
      const invalidAgents = agents.filter(
        (agent) =>
          !agent.first_name || !agent.last_name || !agent.email || !agent.role
      );

      if (invalidAgents.length > 0) {
        console.warn(
          `Found ${invalidAgents.length} agents with missing fields:`,
          invalidAgents
        );
      }

      // Add safety measure to detect and fix filtering issues
      if (agents.length > 0 && filteredAgents.length === 0 && searchQuery) {
        console.warn(
          "Filtering issue detected: Have agents but filteredAgents is empty.",
          { agentsCount: agents.length, searchQuery }
        );

        // Auto-clear the search to show all agents
        console.log("Auto-clearing search to show all agents");
        setSearchQuery("");

        // Show a toast notification
        toast.info("Search has been cleared to show all agents", {
          duration: 3000,
        });
      }
    }
  }, [agents, filteredAgents, searchQuery]);

  // Add agent mutation
  const addAgentMutation = useMutation({
    mutationFn: async (newAgent: AgentFormData) => {
      const { error, data } = await supabase.from("agents").insert({
        first_name: newAgent.firstName,
        last_name: newAgent.lastName,
        email: newAgent.email,
        role: newAgent.role,
        user_id: user?.id,
      });
      console.log({ error, data });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      setIsAddModalOpen(false);
      toast.success("Agent added successfully");
    },
    onError: (error) => {
      toast.error(
        `Failed to add agent: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    },
  });

  // Update agent mutation
  const updateAgentMutation = useMutation({
    mutationFn: async ({ id, agent }: { id: string; agent: AgentFormData }) => {
      const { error } = await supabase
        .from("agents")
        .update({
          first_name: agent.firstName,
          last_name: agent.lastName,
          email: agent.email,
          role: agent.role,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      setIsEditModalOpen(false);
      setSelectedAgent(null);
      toast.success("Agent updated successfully");
    },
    onError: (error) => {
      toast.error(
        `Failed to update agent: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    },
  });

  // Delete agent mutation
  const deleteAgentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agents").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success("Agent deleted successfully");
    },
    onError: (error) => {
      toast.error(
        `Failed to delete agent: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    },
  });

  const handleAddAgent = (data: AgentFormData) => {
    addAgentMutation.mutate(data);
  };

  const handleUpdateAgent = (data: AgentFormData) => {
    if (selectedAgent) {
      updateAgentMutation.mutate({ id: selectedAgent.id, agent: data });
    }
  };

  const handleDeleteAgent = (id: string) => {
    if (confirm(t("agents.confirmDelete"))) {
      deleteAgentMutation.mutate(id);
    }
  };

  const openEditModal = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsEditModalOpen(true);
  };

  // Show fetch error as toast
  React.useEffect(() => {
    if (fetchError) {
      toast.error(
        `Failed to load agents: ${
          fetchError instanceof Error ? fetchError.message : "Unknown error"
        }`
      );
    }
  }, [fetchError]);

  console.log({ agents });

  console.log({ filteredAgents });

  return (
    <div className="agents-page">
      <div className="agents-header">
        <h1>{t("agents.agentsManagement")}</h1>
        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={16} />
            <span>{t("agents.addAgent")}</span>
          </button>

          <button className="btn btn-secondary">
            <Download size={16} />
            <span>{t("agents.export")}</span>
          </button>
        </div>
      </div>

      <div className="agents-toolbar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder={t("agents.searchAgents")}
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="agents-table-container">
        <table className="agents-table">
          <thead>
            <tr>
              <th>{t("agents.agent")}</th>
              <th>{t("agents.email")}</th>
              <th>{t("agents.role")}</th>
              <th>{t("agents.createdAt")}</th>
              <th>{t("agents.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredAgents.map((agent) => (
              <tr key={agent.id}>
                <td className="agent-name">
                  <User size={16} className="agent-icon" />
                  <span>{`${agent.first_name || t("agents.unknown")} ${
                    agent.last_name || ""
                  }`}</span>
                </td>
                <td>
                  <span className="agent-email">
                    <Mail size={14} className="email-icon" />
                    {agent.email || t("agents.noEmail")}
                  </span>
                </td>
                <td>
                  <span className="agent-role">
                    {agent.role || t("agents.noRole")}
                  </span>
                </td>
                <td>
                  {agent.created_at
                    ? new Date(agent.created_at).toLocaleDateString()
                    : "N/A"}
                </td>
                <td>
                  <div className="agent-actions">
                    <button
                      className="action-btn edit"
                      onClick={() => openEditModal(agent)}
                    >
                      {t("agents.edit")}
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => handleDeleteAgent(agent.id)}
                    >
                      {t("agents.delete")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredAgents.length === 0 && (
              <tr>
                <td colSpan={5} className="no-results">
                  {t("agents.noAgentsFound")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddAgentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddAgent}
        isSubmitting={addAgentMutation.isPending}
      />

      {selectedAgent && (
        <EditAgentModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedAgent(null);
          }}
          onSubmit={handleUpdateAgent}
          isSubmitting={updateAgentMutation.isPending}
          agent={selectedAgent}
        />
      )}
    </div>
  );
};
