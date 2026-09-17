import React, { Component, ErrorInfo, ReactNode, useState } from 'react';
import { RealtimeProvider } from './context/RealtimeContext';
import { useRealtime } from './context/useRealtime';
import { Sidebar, PageId } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { NotificationToast } from './components/ui/NotificationToast';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { LiveBlocksPage } from './pages/LiveBlocksPage';
import { BlockAnalysisPage } from './pages/BlockAnalysisPage';
import { AddressPage } from './pages/AddressPage';
import { FollowUpPage } from './pages/FollowUpPage';
import { ExplorerPage } from './pages/ExplorerPage';
import { PatternsPage } from './pages/PatternsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

/* ============================================================
   ERROR BOUNDARY
   Prevents a React runtime error from turning the whole
   application into a blank/black screen.
   ============================================================ */

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('========================================');
    console.error('BIT GUARD REACT RUNTIME ERROR');
    console.error('========================================');
    console.error('Error:', error);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('Component stack:', errorInfo.componentStack);
    console.error('========================================');
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            width: '100%',
            background: '#070A12',
            color: '#F1F5F9',
            padding: '40px',
            boxSizing: 'border-box',
            fontFamily:
              'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '900px',
              margin: '0 auto',
              background: '#0C1220',
              border: '1px solid #26324A',
              borderRadius: '16px',
              padding: '30px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#ef4444',
                }}
              />

              <h1
                style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: 700,
                }}
              >
                BIT GUARD encountered an error
              </h1>
            </div>

            <p
              style={{
                color: '#94A3B8',
                lineHeight: 1.6,
                marginBottom: '20px',
              }}
            >
              The application crashed while rendering. The exact error is
              shown below so it can be diagnosed instead of displaying a
              blank screen.
            </p>

            <div
              style={{
                background: '#050810',
                border: '1px solid #1E293B',
                borderRadius: '10px',
                padding: '18px',
                overflowX: 'auto',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  color: '#F87171',
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '10px',
                }}
              >
                Error
              </div>

              <pre
                style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: '#CBD5E1',
                  fontSize: '13px',
                  lineHeight: 1.6,
                }}
              >
                {this.state.error?.message ||
                  'Unknown React runtime error'}
              </pre>
            </div>

            {this.state.error?.stack && (
              <details
                style={{
                  marginBottom: '24px',
                }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    color: '#94A3B8',
                    marginBottom: '10px',
                  }}
                >
                  Show stack trace
                </summary>

                <pre
                  style={{
                    background: '#050810',
                    border: '1px solid #1E293B',
                    borderRadius: '10px',
                    padding: '15px',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: '#64748B',
                    fontSize: '12px',
                    lineHeight: 1.5,
                  }}
                >
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={this.handleReload}
                style={{
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 18px',
                  background: '#2563EB',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Reload Application
              </button>

              <button
                onClick={() => console.clear()}
                style={{
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '10px 18px',
                  background: 'transparent',
                  color: '#CBD5E1',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Clear Console
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/* ============================================================
   APPLICATION CONTENT
   ============================================================ */

const AppContent: React.FC = () => {
  const { latestBlock, health } = useRealtime();

  const [currentPage, setCurrentPage] =
    useState<PageId>('dashboard');

  const [sidebarCollapsed, setSidebarCollapsed] =
    useState<boolean>(false);

  const [mobileOpen, setMobileOpen] =
    useState<boolean>(false);

  // Active navigation targets
  const [selectedBlockHeight, setSelectedBlockHeight] =
    useState<number | null>(null);

  const [selectedAddress, setSelectedAddress] =
    useState<string>(
      'bc1phj3nvfystppn2px9zrgdfv42j0f9zasu8gv7ak4zknkurwnkmjms7whlx4'
    );

  const handleNavigateTo = (
    type: 'block' | 'address' | 'transaction' | 'page',
    id: string
  ) => {
    if (type === 'block') {
      setSelectedBlockHeight(parseInt(id, 10) || latestBlock?.height || 0);

      setCurrentPage('block-analysis');

    } else if (type === 'transaction') {
      const blockHeight = parseInt(id, 10);
      if (blockHeight) {
        setSelectedBlockHeight(blockHeight);
        setCurrentPage('block-analysis');
      }
    } else if (type === 'address') {
      setSelectedAddress(id);
      setCurrentPage('addresses');

    } else if (type === 'page') {
      setCurrentPage(id as PageId);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex">
      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <Sidebar
        currentPage={currentPage}
        onSelectPage={setCurrentPage}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        followedCount={
          health?.database?.followed_addresses_count || 0
        }
      />

      {/* =====================================================
          MAIN CONTENT
          ===================================================== */}

      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarCollapsed
            ? 'lg:pl-20'
            : 'lg:pl-64'
        }`}
      >
        {/* TopBar */}

        <TopBar
          onToggleMobileMenu={() =>
            setMobileOpen((previous) => !previous)
          }
          onNavigateTo={handleNavigateTo}
        />

        {/* =================================================
            PAGE CONTAINER
            ================================================= */}

        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          {/* Dashboard */}

          {currentPage === 'dashboard' && (
            <DashboardPage
              onNavigateTo={(type, id) =>
                handleNavigateTo(type, id)
              }
            />
          )}

          {/* Live Blocks */}

          {currentPage === 'live-blocks' && (
            <LiveBlocksPage
              onSelectBlock={(height) => {
                setSelectedBlockHeight(height);
                setCurrentPage('block-analysis');
              }}
            />
          )}

          {/* Block Analysis */}

          {currentPage === 'block-analysis' && (
            <BlockAnalysisPage
              blockHeight={
                selectedBlockHeight ||
                latestBlock?.height ||
                latestBlock?.height || 0
              }
              onNavigateToAddress={(addr) => {
                setSelectedAddress(addr);
                setCurrentPage('addresses');
              }}
              onNavigateToBlock={(height) => {
                setSelectedBlockHeight(height);
              }}
            />
          )}

          {/* Address */}

          {currentPage === 'addresses' && (
            <AddressPage
              address={selectedAddress}
              onNavigateToBlock={(height) => {
                setSelectedBlockHeight(height);
                setCurrentPage('block-analysis');
              }}
            />
          )}

          {/* Follow Up */}

          {currentPage === 'follow-up' && (
            <FollowUpPage
              onNavigateToAddress={(addr) => {
                setSelectedAddress(addr);
                setCurrentPage('addresses');
              }}
              onNavigateToBlock={(height) => {
                setSelectedBlockHeight(height);
                setCurrentPage('block-analysis');
              }}
            />
          )}

          {/* Explorer */}

          {currentPage === 'explorer' && (
            <ExplorerPage
              onNavigateTo={(type, id) =>
                handleNavigateTo(type, id)
              }
            />
          )}

          {/* Patterns */}

          {currentPage === 'patterns' && (
            <PatternsPage />
          )}

          {/* Reports */}

          {currentPage === 'reports' && (
            <ReportsPage />
          )}

          {/* Settings */}

          {currentPage === 'settings' && (
            <SettingsPage />
          )}
        </main>

        {/* =================================================
            REAL-TIME NOTIFICATION TOASTS
            ================================================= */}

        <NotificationToast
          onNavigate={(link) => {
            if (link.startsWith('/blocks/')) {
              const height = parseInt(
                link.replace('/blocks/', ''),
                10
              );

              if (height) {
                setSelectedBlockHeight(height);
                setCurrentPage('block-analysis');
              }

            } else if (link.startsWith('/address/')) {
              const address = link.replace(
                '/address/',
                ''
              );

              if (address) {
                setSelectedAddress(address);
                setCurrentPage('addresses');
              }
            }
          }}
        />
      </div>
    </div>
  );
};

/* ============================================================
   ROOT APP
   ============================================================ */

export default function App() {
  return (
    <ErrorBoundary>
      <RealtimeProvider>
        <AppContent />
      </RealtimeProvider>
    </ErrorBoundary>
  );
}