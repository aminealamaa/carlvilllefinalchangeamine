import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Users, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './AgentDashboard.css';

interface Agent {
  id: string;
  fullName: string;
  email: string;
  avatar?: string;
  metrics: {
    reservations: number;
    totalSales: number;
    commission: number;
    target: number;
    progress: number;
  };
}

interface AgentMetrics {
  totalReservations: number;
  totalSales: number;
  totalCommission: number;
  changePercentage: number;
}

export const AgentDashboard = () => {
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [metrics, setMetrics] = useState<AgentMetrics>({
    totalReservations: 0,
    totalSales: 0,
    totalCommission: 0,
    changePercentage: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgentData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data: agentsData, error: agentsError } = await supabase
          .from('agents')
          .select(`
            id,
            first_name,
            last_name,
            email,
            bookings (
              id,
              amount,
              commission_amount
            )
          `);

        if (agentsError) throw agentsError;

        const processedAgents: Agent[] = agentsData.map(agent => ({
          id: agent.id,
          fullName: `${agent.first_name} ${agent.last_name}`,
          email: agent.email,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${agent.first_name} ${agent.last_name}`,
          metrics: {
            reservations: agent.bookings.length,
            totalSales: agent.bookings.reduce((sum, booking) => sum + booking.amount, 0),
            commission: agent.bookings.reduce((sum, booking) => sum + booking.commission_amount, 0),
            target: 10000, // Example target
            progress: (agent.bookings.reduce((sum, booking) => sum + booking.amount, 0) / 10000) * 100
          }
        }));

        setAgents(processedAgents);

        // Calculate overall metrics
        const totalMetrics = processedAgents.reduce(
          (acc, agent) => ({
            totalReservations: acc.totalReservations + agent.metrics.reservations,
            totalSales: acc.totalSales + agent.metrics.totalSales,
            totalCommission: acc.totalCommission + agent.metrics.commission,
            changePercentage: 12 // Example percentage, should be calculated based on previous period
          }),
          { totalReservations: 0, totalSales: 0, totalCommission: 0, changePercentage: 0 }
        );

        setMetrics(totalMetrics);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgentData();
  }, [dateRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (isLoading) {
    return <div className="loading-state">Loading agent performance data...</div>;
  }

  if (error) {
    return <div className="error-state">Error: {error}</div>;
  }

  return (
    <div className="agent-dashboard">
      <div className="dashboard-header">
        <h1>Tableau de bord des performances des agents </h1>
        <div className="date-range">
          <button 
            className={dateRange === 'week' ? 'active' : ''} 
            onClick={() => setDateRange('week')}
          >
            Cette semaine
          </button>
          <button 
            className={dateRange === 'month' ? 'active' : ''} 
            onClick={() => setDateRange('month')}
          >
            Ce mois-ci
          </button>
          <button 
            className={dateRange === 'quarter' ? 'active' : ''} 
            onClick={() => setDateRange('quarter')}
          >
            Ce trimestre
          </button>
          <button 
            className={dateRange === 'year' ? 'active' : ''} 
            onClick={() => setDateRange('year')}
          >
            Cette année
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <h3 className="metric-title">Total des réservations</h3>
            <Calendar className="metric-icon" size={20} />
          </div>
          <div className="metric-value">{metrics.totalReservations}</div>
          <div className={`metric-change ${metrics.changePercentage >= 0 ? 'positive' : 'negative'}`}>
            {metrics.changePercentage >= 0 ? (
              <ArrowUpRight size={16} />
            ) : (
              <ArrowDownRight size={16} />
            )}
            <span>{Math.abs(metrics.changePercentage)}% from last period</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <h3 className="metric-title">Ventes totales</h3>
            <DollarSign className="metric-icon" size={20} />
          </div>
          <div className="metric-value">{formatCurrency(metrics.totalSales)}</div>
          <div className={`metric-change ${metrics.changePercentage >= 0 ? 'positive' : 'negative'}`}>
            {metrics.changePercentage >= 0 ? (
              <ArrowUpRight size={16} />
            ) : (
              <ArrowDownRight size={16} />
            )}
            <span>{Math.abs(metrics.changePercentage)}% from last period</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <h3 className="metric-title">Commission totale</h3>
            <TrendingUp className="metric-icon" size={20} />
          </div>
          <div className="metric-value">{formatCurrency(metrics.totalCommission)}</div>
          <div className={`metric-change ${metrics.changePercentage >= 0 ? 'positive' : 'negative'}`}>
            {metrics.changePercentage >= 0 ? (
              <ArrowUpRight size={16} />
            ) : (
              <ArrowDownRight size={16} />
            )}
            <span>{Math.abs(metrics.changePercentage)}% from last period</span>
          </div>
        </div>
      </div>

      <div className="agents-grid">
        {agents.map(agent => (
          <div key={agent.id} className="agent-card">
            <div className="agent-header">
              <div className="agent-avatar">
                <img src={agent.avatar} alt={agent.fullName} />
              </div>
              <div className="agent-info">
                <h3>{agent.fullName}</h3>
                <div className="agent-email">{agent.email}</div>
              </div>
            </div>

            <div className="agent-stats">
              <div className="stat-box">
                <div className="stat-label">Réservations</div>
                <div className="stat-value">{agent.metrics.reservations}</div>
              </div>

              <div className="stat-box">
                <div className="stat-label">Ventes totales</div>
                <div className="stat-value">{formatCurrency(agent.metrics.totalSales)}</div>
              </div>

              <div className="stat-box">
                <div className="stat-label">Commission</div>
                <div className="stat-value">{formatCurrency(agent.metrics.commission)}</div>
              </div>

              <div className="stat-box">
                <div className="stat-label">Target Progress</div>
                <div className="stat-value">{Math.round(agent.metrics.progress)}%</div>
                <div className="progress-bar">
                  <div 
                    className={`progress-fill ${agent.metrics.progress >= 100 ? 'success' : ''}`}
                    style={{ width: `${Math.min(agent.metrics.progress, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};