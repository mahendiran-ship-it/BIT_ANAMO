import { useContext } from 'react';
import { RealtimeContext } from './realtimeContextValue';

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return context;
};