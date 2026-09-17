import { createContext } from 'react';
import { BlockSummary, HealthStatus, RealtimeNotification } from '../types';

export interface RealtimeContextType {
  isConnected: boolean;
  latestBlock: BlockSummary | null;
  notifications: RealtimeNotification[];
  health: HealthStatus | null;
  lastUpdated: Date;
  dismissNotification: (id: string) => void;
  refreshHealth: () => Promise<void>;
  pulseBlockHeight: number | null;
}

export const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);