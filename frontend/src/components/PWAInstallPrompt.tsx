import React, { useState, useEffect } from 'react';
import { Download, X, Share2, PlusSquare, Smartphone, Laptop, CheckCircle, ShieldCheck } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallPromptProps {
  forceOpenIOSModal?: boolean;
  onCloseIOSModal?: () => void;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  forceOpenIOSModal,
  onCloseIOSModal,
}) => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    showIOSModal,
    setShowIOSModal,
    isDismissed,
    promptInstall,
    dismissPrompt,
  } = usePWAInstall();

  const [bannerVisible, setBannerVisible] = useState(false);

  // Sync external force open
  useEffect(() => {
    if (forceOpenIOSModal !== undefined) {
      setShowIOSModal(forceOpenIOSModal);
    }
  }, [forceOpenIOSModal, setShowIOSModal]);

  // Show floating banner after 3 seconds if installable and not dismissed or installed
  useEffect(() => {
    if (isInstalled || isDismissed) {
      setBannerVisible(false);
      return;
    }

    if (isInstallable) {
      const timer = setTimeout(() => {
        setBannerVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, isDismissed]);

  const handleCloseModal = () => {
    setShowIOSModal(false);
    if (onCloseIOSModal) onCloseIOSModal();
  };

  const handleBannerDismiss = () => {
    setBannerVisible(false);
    dismissPrompt();
  };

  if (isInstalled) return null;

  return (
    <>
      {/* ─── 1. Bottom-Right Floating Install Banner (Android / Desktop / Chrome) ─── */}
      {bannerVisible && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            maxWidth: '380px',
            width: 'calc(100% - 48px)',
            background: 'linear-gradient(145deg, #1e3a5f 0%, #0f172a 100%)',
            color: '#ffffff',
            padding: '1.25rem',
            borderRadius: '16px',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(12px)',
            animation: 'slideInPWA 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <style>{`
            @keyframes slideInPWA {
              from { transform: translateY(30px) scale(0.95); opacity: 0; }
              to { transform: translateY(0) scale(1); opacity: 1; }
            }
          `}</style>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <img
                src="/erp/bips-logo.png"
                alt="BIPS ERP"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.1)',
                  padding: '3px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  flexShrink: 0,
                }}
              />
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
                  Install BIPS ERP App
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.3 }}>
                  Faster access, offline records, and instant alerts on {isIOS ? 'iOS' : 'your device'}.
                </p>
              </div>
            </div>

            <button
              onClick={handleBannerDismiss}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s',
              }}
              aria-label="Dismiss install banner"
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
            <button
              onClick={() => {
                setBannerVisible(false);
                promptInstall();
              }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '0.6rem 1rem',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
                transition: 'all 0.2s',
              }}
            >
              <Download size={15} />
              <span>Install Now</span>
            </button>

            <button
              onClick={handleBannerDismiss}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#cbd5e1',
                padding: '0.6rem 0.85rem',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* ─── 2. iOS & Fallback Installation Guide Modal ─── */}
      {showIOSModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            animation: 'fadeInModal 0.2s ease-out',
          }}
          onClick={handleCloseModal}
        >
          <style>{`
            @keyframes fadeInModal {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUpModal {
              from { transform: translateY(20px) scale(0.96); opacity: 0; }
              to { transform: translateY(0) scale(1); opacity: 1; }
            }
          `}</style>

          <div
            style={{
              background: '#1e293b',
              color: '#ffffff',
              borderRadius: '24px',
              maxWidth: '460px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.1)',
              animation: 'slideUpModal 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleCloseModal}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#cbd5e1',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <img
                src="/erp/bips-logo.png"
                alt="BIPS ERP"
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '14px',
                  background: 'rgba(255,255,255,0.08)',
                  padding: '4px',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.3)',
                }}
              />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                  Install BIPS School ERP
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                  {isIOS ? 'Add to your iPhone or iPad Home Screen' : 'Install on your device for native experience'}
                </p>
              </div>
            </div>

            {/* iOS Instructions */}
            {isIOS ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', margin: '1.25rem 0' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.85rem 1rem',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
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
                    <Share2 size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                      Step 1: Tap the Share Button
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      In Safari, tap the <Share2 size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> icon at the bottom of the screen.
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.85rem 1rem',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#34d399',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <PlusSquare size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                      Step 2: Add to Home Screen
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Scroll down the menu and tap <strong>"Add to Home Screen"</strong>.
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.85rem 1rem',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(245, 158, 11, 0.2)',
                      color: '#fbbf24',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                      Step 3: Confirm & Launch
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Tap <strong>"Add"</strong> in the top right. Launch BIPS ERP directly from your home screen!
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Desktop / Other Browsers instructions */
              <div style={{ margin: '1.25rem 0' }}>
                <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '1rem' }}>
                  You can install BIPS ERP as a standalone application on your device for instant launch and offline access.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                    <Laptop size={16} color="#60a5fa" />
                    <span><strong>Chrome / Edge:</strong> Click the install icon <Download size={13} style={{ display: 'inline' }} /> in your browser's address bar.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                    <Smartphone size={16} color="#34d399" />
                    <span><strong>Android:</strong> Tap the 3 dots menu and select <strong>"Install App"</strong>.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                    <ShieldCheck size={16} color="#fbbf24" />
                    <span>Works offline with cached student records, attendance, and fee history.</span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleCloseModal}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '0.75rem',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                marginTop: '0.5rem',
              }}
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
