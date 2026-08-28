import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export const OfflineBanner: React.FC = () => {
  const { isOnline, wasOffline } = useNetworkStatus();
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowBackOnline(true);
      const timer = setTimeout(() => {
        setShowBackOnline(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showBackOnline) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999999,
        background: isOnline
          ? 'linear-gradient(90deg, #059669 0%, #10b981 100%)'
          : 'linear-gradient(90deg, #dc2626 0%, #ef4444 100%)',
        color: '#ffffff',
        padding: '0.4rem 1rem',
        fontSize: '0.8rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.6rem',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
        animation: 'slideDownBanner 0.25s ease-out',
      }}
    >
      <style>{`
        @keyframes slideDownBanner {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      {isOnline ? (
        <>
          <Wifi size={15} strokeWidth={2.5} />
          <span>You are back online! Synchronizing latest records...</span>
        </>
      ) : (
        <>
          <WifiOff size={15} strokeWidth={2.5} />
          <span>
            You are offline. Showing cached records. New submissions will be saved when connection restores.
          </span>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#ffffff',
              padding: '0.15rem 0.6rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              marginLeft: '0.5rem',
            }}
          >
            <RefreshCw size={12} />
            <span>Retry</span>
          </button>
        </>
      )}
    </div>
  );
};
