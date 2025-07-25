import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import './Breadcrumbs.css';

interface BreadcrumbsProps {
  path: string;
}

export const Breadcrumbs = ({ path }: BreadcrumbsProps) => {
  // Skip empty segments and remove trailing slash
  const segments = path.split('/').filter(Boolean);
  
  // Generate route mapping for better display names
  const routeMapping: Record<string, string> = {
    bookings: 'Bookings',
    fleet: 'Fleet',
    clients: 'Clients',
    representatives: 'Sales Representatives',
    insurance: 'Insurance',
    settings: 'Settings',
  };

  return (
    <div className="breadcrumbs">
      <div className="breadcrumbs-container">
        <Link to="/" className="breadcrumb-item">
          <Home size={16} />
          <span className="breadcrumb-text">Home</span>
        </Link>
        
        {segments.map((segment, index) => {
          // Build the path up to this point
          const url = `/${segments.slice(0, index + 1).join('/')}`;
          const isLast = index === segments.length - 1;
          
          return (
            <React.Fragment key={url}>
              <ChevronRight size={16} className="breadcrumb-separator" />
              {isLast ? (
                <span className="breadcrumb-item active">
                  <span className="breadcrumb-text">
                    {routeMapping[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)}
                  </span>
                </span>
              ) : (
                <Link to={url} className="breadcrumb-item">
                  <span className="breadcrumb-text">
                    {routeMapping[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)}
                  </span>
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};