import React from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { Bell, Check, Trash2 } from 'lucide-react';
import './NotificationDropdown.css';

export const NotificationDropdown = () => {
  const { notifications, markAsRead, clearAll } = useNotifications();

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div className="notification-dropdown">
      <div className="notification-header">
        <h3>Notifications</h3>
        <button 
          className="notification-clear-all"
          onClick={clearAll}
          aria-label="Clear all notifications"
        >
          <Trash2 size={16} />
          <span>Clear All</span>
        </button>
      </div>
      
      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="notification-empty">
            <Bell size={24} />
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map(notification => (
            <div 
              key={notification.id} 
              className={`notification-item ${notification.read ? 'read' : 'unread'}`}
            >
              <div className={`notification-icon ${notification.type}`}>
                <Bell size={16} />
              </div>
              <div className="notification-content">
                <p className="notification-message">{notification.message}</p>
                <span className="notification-time">{formatTimeAgo(notification.timestamp)}</span>
              </div>
              {!notification.read && (
                <button 
                  className="notification-mark-read"
                  onClick={() => markAsRead(notification.id)}
                  aria-label="Mark as read"
                >
                  <Check size={16} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};