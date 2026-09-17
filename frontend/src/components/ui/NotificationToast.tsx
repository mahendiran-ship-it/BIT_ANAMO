import React from 'react';
import { X, Bell, CheckCircle2, AlertTriangle, Boxes } from 'lucide-react';
import { useRealtime } from '../../context/useRealtime';

interface NotificationToastProps {
  onNavigate?: (path: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ onNavigate }) => {
  const { notifications, dismissNotification } = useRealtime();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {notifications.map((notif) => {
        const getIcon = () => {
          switch (notif.type) {
            case 'block':
              return <Boxes className="w-5 h-5 text-btc-primary animate-pulse" />;
            case 'success':
              return <CheckCircle2 className="w-5 h-5 text-intel-emerald" />;
            case 'alert':
              return <AlertTriangle className="w-5 h-5 text-intel-amber animate-bounce" />;
            default:
              return <Bell className="w-5 h-5 text-intel-cyan" />;
          }
        };

        const getBorderColor = () => {
          switch (notif.type) {
            case 'block':
              return 'border-btc-primary/50 shadow-glow-btc/20';
            case 'success':
              return 'border-intel-emerald/50';
            case 'alert':
              return 'border-intel-amber/60 shadow-lg';
            default:
              return 'border-intel-cyan/40';
          }
        };

        return (
          <div
            key={notif.id}
            className={`pointer-events-auto bg-dark-900/95 border backdrop-blur-md rounded-xl p-3.5 shadow-2xl flex items-start gap-3 transition-all duration-300 animate-slide-in ${getBorderColor()}`}
          >
            <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
            <div
              className={`flex-1 ${notif.link ? 'cursor-pointer' : ''}`}
              onClick={() => {
                if (notif.link && onNavigate) onNavigate(notif.link);
              }}
            >
              <div className="text-xs font-bold font-mono text-white tracking-wide">
                {notif.title}
              </div>
              <div className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                {notif.message}
              </div>
              {notif.link && (
                <span className="text-[10px] font-mono text-intel-cyan hover:underline mt-1 block">
                  Inspect in Analysis →
                </span>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismissNotification(notif.id);
              }}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
