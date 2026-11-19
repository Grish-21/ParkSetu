export type UserRole = 'driver' | 'owner' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Lot {
  id: number;
  owner_id?: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  price_per_hour: number;
  overstay_multiplier?: number;
  buffer_slots?: number;
}

export interface LotNearbyItem {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance_km: number;
  price_per_hour: number;
  total_slots: number;
  free_now: number;
  free_for_window: number;
}

export interface Slot {
  id: number;
  lot_id: number;
  label: string;
  polygon?: [number, number][] | null;
  is_buffer: boolean;
  status: 'free' | 'occupied';
  updated_at?: string;
}

export interface CreateSlotInput {
  label: string;
  polygon?: [number, number][] | null;
  is_buffer: boolean;
}

export interface CreateLotInput {
  name: string;
  address: string;
  lat: number;
  lng: number;
  price_per_hour: number;
}

export type BookingStatus =
  | 'BOOKED'
  | 'CHECKED_IN'
  | 'OVERSTAY'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'CANCELLED';

export interface Booking {
  id: number;
  user_id?: number;
  lot_id: number;
  lot_name?: string;
  slot_id: number;
  slot_label?: string;
  vehicle_no: string;
  start_time: string; // ISO 8601 UTC string (e.g. 2026-11-19T10:00:00Z)
  end_time: string;
  status: BookingStatus;
  qr_token: string;
  checked_in_at: string | null;
  exited_at: string | null;
  amount: number;
  overstay_minutes: number;
  at_risk: boolean;
  created_at?: string;
}

export interface CreateBookingInput {
  lot_id: number;
  start_time: string;
  end_time: string;
  vehicle_no: string;
}

export interface BookingConflictError {
  message: string;
  alternatives: LotNearbyItem[];
}

export interface ForecastResponse {
  free_now: number;
  next_free_at: string | null;
  confidence: number;
  method: string;
}

export interface AdminStats {
  occupancy_by_hour: { hour: number; avg_occupancy: number }[];
  bookings_total: number;
  no_show_rate: number;
  overstay_rate: number;
  revenue: number;
  peak_hours: number[];
}

export interface SlotUpdateWsMessage {
  type: 'slot_update';
  lot_id: number;
  free_count: number;
  slots: {
    slot_id: number;
    label: string;
    status: 'free' | 'occupied';
  }[];
}

export type BookingEventType =
  | 'reminder'
  | 'no_show_released'
  | 'overstay'
  | 'reroute_suggested'
  | 'extended';

export interface BookingEventWsMessage {
  type: 'booking_event';
  booking_id: number;
  event: BookingEventType;
  message: string;
  data?: {
    alternatives?: LotNearbyItem[];
    [key: string]: any;
  };
}

export type WsMessage = SlotUpdateWsMessage | BookingEventWsMessage;
