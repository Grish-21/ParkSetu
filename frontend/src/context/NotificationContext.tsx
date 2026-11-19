import React, { createContext, useContext, useState, useEffect } from 'react';
import { BookingEventWsMessage, LotNearbyItem } from '../api/types';
import { subscribeMyEvents, triggerSimulatedBookingEvent } from '../api/ws';
import { useAuth } from '../auth/AuthContext';
import { mockDb } from '../api/mock';

export interface RerouteData {
  bookingId: number;
  message: string;
  alternatives: LotNearbyItem[];
}

interface NotificationContextType {
  toasts: BookingEventWsMessage[];
  rerouteAlert: RerouteData | null;
  dismissToast: (index: number) => void;
  dismissReroute: () => void;
  triggerDemoReroute: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [toasts, setToasts] = useState<BookingEventWsMessage[]>([]);
  const [rerouteAlert, setRerouteAlert] = useState<RerouteData | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = subscribeMyEvents(token, (event) => {
      setToasts((prev) => [event, ...prev.slice(0, 4)]);

      if (event.event === 'reroute_suggested') {
        const alternatives = event.data?.alternatives || [];
        setRerouteAlert({
          bookingId: event.booking_id,
          message: event.message,
          alternatives,
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [token, isAuthenticated]);

  const dismissToast = (index: number) => {
    setToasts((prev) => prev.filter((_, i) => i !== index));
  };

  const dismissReroute = () => {
    setRerouteAlert(null);
  };

  const triggerDemoReroute = () => {
    const alts = mockDb.getNearbyLots(19.2813, 72.8689).slice(1, 3);
    const demoEvent: BookingEventWsMessage = {
      type: 'booking_event',
      booking_id: 102,
      event: 'reroute_suggested',
      message: 'High risk of overstay detected at your booked lot! A reroute to a nearby lot with free slots is recommended.',
      data: {
        alternatives: alts,
      },
    };
    triggerSimulatedBookingEvent(demoEvent);
  };

  return (
    <NotificationContext.Provider
      value={{
        toasts,
        rerouteAlert,
        dismissToast,
        dismissReroute,
        triggerDemoReroute,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
