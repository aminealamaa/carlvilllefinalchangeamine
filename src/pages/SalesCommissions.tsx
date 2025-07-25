import React, { useState, useEffect } from 'react';
import { Search, Calendar, Download, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '../lib/supabase';
import './SalesCommissions.css';

interface AgentCommission {
  agent_id: string;
  agent_name: string;
  total_bookings: number;
  total_sales: number;
  total_commission: number;
  change_percentage: number;
}

export const SalesCommissions = () => {
  const [period, setPeriod] = useState<'today' | 'month' | 'quarter' | 'year'>('month');
  const [commissions, setCommissions] = useState<AgentCommission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCommissions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let startDate, endDate;
      const now = new Date();

      switch (period) {
        case 'today':
          startDate = format(now, 'yyyy-MM-dd');
          endDate = format(now, 'yyyy-MM-dd');
          break;
        case 'month':
          startDate = format(startOfMonth(now), 'yyyy-MM-dd');
          endDate = format(endOfMonth(now), 'yyyy-MM-dd');
          break;
        // Add other cases as needed
        default:
          startDate = format(startOfMonth(now), 'yyyy-MM-dd');
          endDate = format(endOfMonth(now), 'yyyy-MM-dd');
      }

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          amount,
          commission_amount,
          agent_id,
          agents (
            id,
            first_name,
            last_name
          )
        `)
        .gte('start_date', startDate)
        .lte('end_date', endDate);

      if (error) throw error;

      // Process and aggregate the data
      const agentStats = data.reduce((acc: { [key: string]: AgentCommission }, booking) => {
        const agentId = booking.agent_id;
        const agentName = `${booking.agents.first_name} ${booking.agents.last_name}`;
        
        if (!acc[agentId]) {
          acc[agentId] = {
            agent_id: agentId,
            agent_name: agentName,
            total_bookings: 0,
            total_sales: 0,
            total_commission: 0,
            change_percentage: 0 // This would be calculated by comparing with previous period
          };
        }

        acc[agentId].total_bookings++;
        acc[agentId].total_sales += booking.amount;
        acc[agentId].total_commission += booking.commission_amount;

        return acc;
      }, {});

      setCommissions(Object.values(agentStats));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, [period]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (isLoading) {
    return <div className="loading">Loading commissions data...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="commissions-page">
      <div className="commissions-header">
        <h1>Sales Commissions</h1>
        <div className="period-selector">
          <button 
            className={`period-btn ${period === 'today' ? 'active' : ''}`}
            onClick={() => setPeriod('today')}
          >
            Today
          </button>
          <button 
            className={`period-btn ${period === 'month' ? 'active' : ''}`}
            onClick={() => setPeriod('month')}
          >
            This Month
          </button>
          <button 
            className={`period-btn ${period === 'quarter' ? 'active' : ''}`}
            onClick={() => setPeriod('quarter')}
          >
            This Quarter
          </button>
          <button 
            className={`period-btn ${period === 'year' ? 'active' : ''}`}
            onClick={() => setPeriod('year')}
          >
            This Year
          </button>
        </div>
      </div>

      <div className="commissions-toolbar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search agents..." 
            className="search-input"
          />
        </div>

        <button className="export-button">
          <Download size={16} />
          <span>Export Report</span>
        </button>
      </div>

      <div className="commissions-grid">
        {commissions.map(agent => (
          <div key={agent.agent_id} className="commission-card">
            <div className="agent-header">
              <div className="agent-info">
                <h3 className="agent-name">{agent.agent_name}</h3>
                <div className="agent-stats">
                  <span className="stat-label">Total Bookings:</span>
                  <span className="stat-value">{agent.total_bookings}</span>
                </div>
              </div>
            </div>

            <div className="commission-stats">
              <div className="stat-item">
                <div className="stat-header">
                  <span>Total Sales</span>
                  {agent.change_percentage !== 0 && (
                    <div className={`change ${agent.change_percentage > 0 ? 'increase' : 'decrease'}`}>
                      {agent.change_percentage > 0 ? (
                        <ArrowUpRight size={16} />
                      ) : (
                        <ArrowDownRight size={16} />
                      )}
                      <span>{Math.abs(agent.change_percentage)}%</span>
                    </div>
                  )}
                </div>
                <div className="stat-value">{formatCurrency(agent.total_sales)}</div>
                <div className="stat-footer">Current period</div>
              </div>

              <div className="stat-item">
                <div className="stat-header">
                  <span>Commission Earned</span>
                </div>
                <div className="stat-value">{formatCurrency(agent.total_commission)}</div>
                <div className="stat-footer">Based on booking rates</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};