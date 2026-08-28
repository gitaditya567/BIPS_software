import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { skipWaitingAndReload } from '../serviceWorkerRegistration';

export const PWAUpdateBanner: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const handleUpdateAvailable = () => {
      console.log('[PWA] Update available event received');
      setUpdateAvailable(true);
    };

    window.addEventListener('pwa-update-available', handleUpdateAvailable);

    return () => {
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
    };
  }, []);

  const handleUpdate = () => {
    setIsUpdating(true);
    setTimeout(() => {
      skipWaitingAndReload();
    }, 400);
  };

  if (!updateAvailable) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 99999,
        maxWidth: '380px',
        width: 'calc(100% - 32px)',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
        color: '#ffffff',
        padding: '1rem 1.25rem',
        borderRadius: '14px',
        boxShadow: '0 15px 30px -5px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        animation: 'slideDownUpdate 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <style>{`
        @keyframes slideDownUpdate {
          from { transform: translateY(-30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(59, 130, 246, 0.2)',
            color: '#60a5fa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Sparkles size={18} />
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
            New Version Available
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            An updated version of BIPS ERP is ready.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
        <button
          onClick={handleUpdate}
          disabled={isUpdating}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#ffffff',
            border: 'none',
            padding: '0.45rem 0.85rem',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: isUpdating ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
          }}
        >
          <RefreshCw size={13} style={{ animation: isUpdating ? 'spin 1s linear infinite' : 'none' }} />
          <span>{isUpdating ? 'Updating...' : 'Update'}</span>
        </button>

        <button
          onClick={() => setUpdateAvailable(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Close update banner"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
