import { USE_MOCK } from './client';
import { SlotUpdateWsMessage, BookingEventWsMessage, LotNearbyItem } from './types';
import { mockDb } from './mock';

type SlotUpdateCallback = (msg: SlotUpdateWsMessage) => void;
type BookingEventCallback = (msg: BookingEventWsMessage) => void;

function getWsBaseUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  return apiUrl.replace(/^http/, 'ws');
}

/**
 * Connect to Lot Slots WebSocket (/ws/lots/{lotId})
 */
export function subscribeLotSlots(lotId: number, onMessage: SlotUpdateCallback): () => void {
  if (USE_MOCK) {
    // Simulate real-time CCTV / YOLO slot detection updates every 10 seconds
    const interval = setInterval(() => {
      const slots = mockDb.getSlots(lotId).filter((s) => !s.is_buffer);
      if (slots.length === 0) return;

      // Pick a random non-buffer slot and toggle status
      const randomSlot = slots[Math.floor(Math.random() * slots.length)];
      const nextStatus = randomSlot.status === 'free' ? 'occupied' : 'free';
      mockDb.updateSlotStatus(lotId, randomSlot.id, nextStatus);

      const updatedSlots = mockDb.getSlots(lotId);
      const freeCount = updatedSlots.filter((s) => !s.is_buffer && s.status === 'free').length;

      const payload: SlotUpdateWsMessage = {
        type: 'slot_update',
        lot_id: lotId,
        free_count: freeCount,
        slots: [
          {
            slot_id: randomSlot.id,
            label: randomSlot.label,
            status: nextStatus,
          },
        ],
      };

      onMessage(payload);
    }, 12000);

    return () => clearInterval(interval);
  }

  // Real WebSocket connection
  const wsUrl = `${getWsBaseUrl()}/ws/lots/${lotId}`;
  let socket: WebSocket | null = null;
  let isClosed = false;

  try {
    socket = new WebSocket(wsUrl);
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'slot_update') {
          onMessage(data as SlotUpdateWsMessage);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };
    socket.onerror = (err) => {
      console.warn('Lot WebSocket error:', err);
    };
  } catch (err) {
    console.warn('Failed to establish Lot WebSocket:', err);
  }

  return () => {
    isClosed = true;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
  };
}

// Global event emitter for manual/simulated notification triggers during demo
const simulatedEventSubscribers = new Set<BookingEventCallback>();

export function triggerSimulatedBookingEvent(event: BookingEventWsMessage) {
  simulatedEventSubscribers.forEach((cb) => cb(event));
}

/**
 * Connect to User Notification WebSocket (/ws/me?token=)
 */
export function subscribeMyEvents(
  token: string | null,
  onMessage: BookingEventCallback
): () => void {
  if (USE_MOCK) {
    simulatedEventSubscribers.add(onMessage);

    // After 15 seconds of login, simulate a demo reminder or reroute notification
    const timeout = setTimeout(() => {
      const activeBookings = mockDb.getBookings().filter((b) => b.status === 'BOOKED');
      const booking = activeBookings[0] || {
        id: 102,
        lot_name: 'Mira-Bhayandar Mall Parking',
      };

      const alternatives: LotNearbyItem[] = mockDb
        .getNearbyLots(19.295, 72.86)
        .filter((l) => l.name !== booking.lot_name)
        .slice(0, 2);

      const rerouteNotice: BookingEventWsMessage = {
        type: 'booking_event',
        booking_id: booking.id,
        event: 'reroute_suggested',
        message: `High risk of overstay at ${booking.lot_name || 'your booked lot'}. We recommend rerouting to a nearby lot with guaranteed free slots.`,
        data: {
          alternatives,
        },
      };

      onMessage(rerouteNotice);
    }, 20000);

    return () => {
      simulatedEventSubscribers.delete(onMessage);
      clearTimeout(timeout);
    };
  }

  if (!token) return () => {};

  const wsUrl = `${getWsBaseUrl()}/ws/me?token=${encodeURIComponent(token)}`;
  let socket: WebSocket | null = null;

  try {
    socket = new WebSocket(wsUrl);
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'booking_event') {
          onMessage(data as BookingEventWsMessage);
        }
      } catch (err) {
        console.error('Failed to parse user WebSocket message:', err);
      }
    };
    socket.onerror = (err) => {
      console.warn('User WebSocket error:', err);
    };
  } catch (err) {
    console.warn('Failed to establish User WebSocket:', err);
  }

  return () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
  };
}
