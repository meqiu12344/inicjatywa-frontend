import React from 'react';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import Link from 'next/link';

export function AdminNotificationBadge() {
  const { notifications, hasPending } = useAdminNotifications();

  if (!hasPending) {
    return null;
  }

  return (
    <div className="admin-notification-badge">
      <a href="/admin/pending-requests" className="notification-link">
        <div className="badge-container">
          <span className="badge-icon">📋</span>
          <span className="badge-text">Nowe wnioski</span>
          {notifications.pending_count > 0 && (
            <>
              <span className="badge-count">{notifications.pending_count}</span>
              <span className="notification-pulse"></span>
            </>
          )}
        </div>
      </a>

      {/* Preview tooltip */}
      {notifications.pending_requests.length > 0 && (
        <div className="notification-preview">
          <div className="preview-header">
            <strong>Oczekujące wnioski ({notifications.pending_count})</strong>
          </div>
          <div className="preview-list">
            {notifications.pending_requests.slice(0, 3).map((req) => (
              <div key={req.id} className="preview-item">
                <div className="preview-org">{req.organization_name}</div>
                <div className="preview-user">{req.user.username}</div>
                <div className="preview-date">
                  {new Date(req.created_at).toLocaleDateString('pl-PL')}
                </div>
              </div>
            ))}
          </div>
          <a href="/admin/pending-requests" className="preview-footer">
            Przejdź do panelu →
          </a>
        </div>
      )}

      <style jsx>{`
        .admin-notification-badge {
          position: relative;
          margin-left: 12px;
        }

        .notification-link {
          text-decoration: none;
          display: inline-block;
        }

        .badge-container {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(90deg, #ff6b6b 0%, #ee5a6f 100%);
          color: white;
          padding: 8px 12px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.875rem;
          transition: all 0.3s ease;
          position: relative;
          box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
        }

        .badge-container:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(255, 107, 107, 0.4);
        }

        .badge-icon {
          font-size: 1.1em;
        }

        .badge-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.3);
          min-width: 24px;
          height: 24px;
          border-radius: 50%;
          font-weight: bold;
          font-size: 0.85rem;
        }

        .notification-pulse {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background-color: #ff1744;
          animation: pulse 2s infinite;
          box-shadow: 0 0 0 0 rgba(255, 23, 68, 0.7);
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(255, 23, 68, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(255, 23, 68, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(255, 23, 68, 0);
          }
        }

        .notification-preview {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 12px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          min-width: 320px;
          max-width: 400px;
          z-index: 1000;
          opacity: 0;
          visibility: hidden;
          transform: translateY(-10px) scale(0.95);
          transition: all 0.3s ease;
          pointer-events: none;
        }

        .badge-container:hover ~ .notification-preview,
        .notification-preview:hover {
          opacity: 1;
          visibility: visible;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }

        .preview-header {
          padding: 12px 16px;
          border-bottom: 1px solid #eee;
          color: #333;
        }

        .preview-list {
          max-height: 240px;
          overflow-y: auto;
        }

        .preview-item {
          padding: 12px 16px;
          border-bottom: 1px solid #f5f5f5;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .preview-item:hover {
          background-color: #f9f9f9;
        }

        .preview-org {
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
        }

        .preview-user {
          font-size: 0.85rem;
          color: #666;
          margin-bottom: 4px;
        }

        .preview-date {
          font-size: 0.8rem;
          color: #999;
        }

        .preview-footer {
          display: block;
          padding: 12px 16px;
          text-align: center;
          color: #0066cc;
          text-decoration: none;
          border-top: 1px solid #eee;
          font-weight: 500;
          transition: background-color 0.2s ease;
        }

        .preview-footer:hover {
          background-color: #f5f5f5;
        }
      `}</style>
    </div>
  );
}
