import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  Microscope,
  Wallet,
  Radar,
  Compass,
  TrendingUp,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  Activity
} from 'lucide-react';

export type PageId =
  | 'dashboard'
  | 'live-blocks'
  | 'block-analysis'
  | 'addresses'
  | 'follow-up'
  | 'explorer'
  | 'patterns'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  followedCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  followedCount = 0
}) => {
  const navItems = [
    { id: 'dashboard' as PageId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live-blocks' as PageId, label: 'Live Blocks', icon: Boxes, badge: 'Live' },
    { id: 'block-analysis' as PageId, label: 'Block Analysis', icon: Microscope },
    { id: 'addresses' as PageId, label: 'Addresses', icon: Wallet },
    { id: 'follow-up' as PageId, label: 'Follow-Up', icon: Radar, count: followedCount },
    { id: 'explorer' as PageId, label: 'Explorer', icon: Compass },
    { id: 'patterns' as PageId, label: 'Patterns', icon: TrendingUp },
    { id: 'reports' as PageId, label: 'Reports', icon: FileSpreadsheet },
    { id: 'settings' as PageId, label: 'Settings', icon: Settings },
  ];

  const handleNav = (id: PageId) => {
    onSelectPage(id);
    if (mobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-dark-900 border-r border-dark-700/80 transition-all duration-300 ease-in-out select-none
          ${collapsed ? 'w-20' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-dark-700/60 bg-dark-950/40">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-glow-btc flex-shrink-0">
              <Shield className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-sm tracking-wider text-white font-mono flex items-center gap-1.5">
                  BITCOIN<span className="text-btc-primary">INTEL</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                  Mission Control v1.0
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* 10-Day Rolling Window Badge */}
        {!collapsed && (
          <div className="px-4 py-3 mx-3 my-2 rounded-lg bg-dark-850 border border-dark-700/50 flex items-center gap-2.5 text-xs text-slate-300">
            <Activity className="w-4 h-4 text-intel-cyan animate-pulse" />
            <div className="truncate">
              <span className="font-semibold text-intel-cyan">10-Day Window</span>
              <p className="text-[10px] text-slate-400">Continuous Rolling Analysis</p>
            </div>
          </div>
        )}

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative
                  ${isActive
                    ? 'bg-btc-primary/15 text-btc-primary border border-btc-primary/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-dark-800/80 border border-transparent'
                  }
                  ${collapsed ? 'justify-center px-0' : ''}
                `}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-btc-primary' : 'text-slate-400 group-hover:text-slate-200'}`} />

                {!collapsed && (
                  <span className="truncate flex-1 text-left font-medium tracking-wide">
                    {item.label}
                  </span>
                )}

                {!collapsed && item.badge && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-intel-emerald/20 text-intel-emerald border border-intel-emerald/30 uppercase">
                    {item.badge}
                  </span>
                )}

                {!collapsed && item.count !== undefined && item.count > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-intel-cyan/20 text-intel-cyan border border-intel-cyan/30">
                    {item.count}
                  </span>
                )}

                {/* Active left indicator bar */}
                {isActive && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-btc-primary rounded-r" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-dark-700/60 bg-dark-950/30">
          {!collapsed ? (
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-intel-emerald animate-ping" />
                <span>FEED ONLINE</span>
              </span>
              <span className="text-slate-500">REAL DATA</span>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-intel-emerald" title="Live Bitcoin Feed Online" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
