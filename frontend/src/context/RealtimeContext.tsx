import React, { useEffect, useState, useCallback, ReactNode } from 'react';
import { api } from '../api/client';
import { BlockSummary, HealthStatus, RealtimeNotification } from '../types';
import { normalizeBlockSummary } from '../api/normalizers';
import { formatInteger } from '../utils/formatters';
import { RealtimeContext } from './realtimeContextValue';

export const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [latestBlock, setLatestBlock] = useState<BlockSummary | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [pulseBlockHeight, setPulseBlockHeight] = useState<number | null>(null);

  const addNotification = useCallback((notif: Omit<RealtimeNotification, 'id' | 'timestamp'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const item: RealtimeNotification = {
      ...notif,
      id,
      timestamp: Date.now()
    };
    setNotifications((prev) => [item, ...prev].slice(0, 10));

    // Auto dismiss non-alert notifications after 8 seconds
    if (notif.type !== 'alert') {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 8000);
    }
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const refreshHealth = useCallback(async () => {
    try {
      const data = await api.getHealth();
      setHealth(data);
      if (data.database.latest_block) {
        setLatestBlock(data.database.latest_block);
      }
      setLastUpdated(new Date());
    } catch (e) {
      console.error('Failed to fetch health:', e);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    refreshHealth();

    // Setup SSE connection
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      const url = api.getEventSourceUrl();
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.addEventListener('ping', () => {
        setIsConnected(true);
        setLastUpdated(new Date());
      });

      eventSource.addEventListener('new_block_detected', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          addNotification({
            type: 'block',
            title: `NEW BLOCK #${data.height}`,
            message: `New Bitcoin block detected (${formatInteger(data.tx_count)} transactions). Ingesting and analyzing...`,
            link: `/blocks/${data.height}`
          });
          setPulseBlockHeight(data.height);
        } catch (e) {
          console.error(e);
        }
      });

      eventSource.addEventListener('block_analyzed', (event: MessageEvent) => {
        try {
          const block = normalizeBlockSummary(JSON.parse(event.data));
          if (!block) {
            console.error('Ignoring malformed block_analyzed event');
            return;
          }
          setLatestBlock(block);
          setLastUpdated(new Date());
          setPulseBlockHeight(block.height);
          addNotification({
            type: 'success',
            title: `✓ BLOCK #${block.height} ANALYZED`,
            message: `${formatInteger(block.analyzed_tx_count)} txs analyzed in ${block.total_time_sec}s (${block.coverage_pct}% coverage).`,
            link: `/blocks/${block.height}`
          });
          refreshHealth();
        } catch (e) {
          console.error(e);
        }
      });

      eventSource.addEventListener('followed_address_hit', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          const sign = data.activity_change_pct >= 0 ? '+' : '';
          addNotification({
            type: 'alert',
            title: `MONITORING ALERT: Followed Address Activity`,
            message: `Observed in Block #${data.block_height}: ${data.tx_count} transactions (${data.incoming_btc} BTC IN, ${data.outgoing_btc} BTC OUT). Activity change: ${sign}${data.activity_change_pct}%`,
            link: `/address/${data.address}`
          });
        } catch (e) {
          console.error(e);
        }
      });

      eventSource.onerror = () => {
        setIsConnected(false);
        if (eventSource) {
          eventSource.close();
        }
        reconnectTimeout = setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    const interval = setInterval(refreshHealth, 20000);

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(interval);
    };
  }, [addNotification, refreshHealth]);

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        latestBlock,
        notifications,
        health,
        lastUpdated,
        dismissNotification,
        refreshHealth,
        pulseBlockHeight
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

