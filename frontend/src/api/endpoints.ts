import { apiClient, USE_MOCK, ApiError } from './client';
import {
  AuthResponse,
  UserRole,
  Lot,
  LotNearbyItem,
  Slot,
  CreateSlotInput,
  CreateLotInput,
  Booking,
  CreateBookingInput,
  ForecastResponse,
  AdminStats,
} from './types';
import {
  mockLogin,
  mockRegister,
  mockDb,
  mockGetForecast,
  mockGetAdminStats,
} from './mock';

export const endpoints = {
  // Auth
  async register(data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }): Promise<AuthResponse> {
    if (USE_MOCK) {
      return mockRegister(data.name, data.email, data.password, data.role);
    }
    return apiClient<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    if (USE_MOCK) {
      return mockLogin(data.email, data.password);
    }
    return apiClient<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Lots
  async getNearbyLots(params?: {
    lat?: number;
    lng?: number;
    radius_km?: number;
    start?: string;
    end?: string;
  }): Promise<LotNearbyItem[]> {
    const lat = params?.lat ?? 19.2813;
    const lng = params?.lng ?? 72.8689;
    const radius = params?.radius_km ?? 5;

    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 150));
      return mockDb.getNearbyLots(lat, lng, radius, params?.start, params?.end);
    }

    const searchParams = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      radius_km: radius.toString(),
    });
    if (params?.start) searchParams.set('start', params.start);
    if (params?.end) searchParams.set('end', params.end);

    return apiClient<LotNearbyItem[]>(`/lots/nearby?${searchParams.toString()}`);
  },

  async getLot(id: number): Promise<Lot> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 100));
      const lot = mockDb.getLot(id);
      if (!lot) throw new ApiError(404, 'Lot not found');
      return lot;
    }
    return apiClient<Lot>(`/lots/${id}`);
  },

  async getLotSlots(lotId: number): Promise<Slot[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 100));
      return mockDb.getSlots(lotId);
    }
    return apiClient<Slot[]>(`/lots/${lotId}/slots`);
  },

  async createLot(data: CreateLotInput): Promise<Lot> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200));
      const userStr = localStorage.getItem('parksetu_user');
      const user = userStr ? JSON.parse(userStr) : { id: 2 };
      return mockDb.createLot(data, user.id);
    }
    return apiClient<Lot>('/lots', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async createSlots(lotId: number, slots: CreateSlotInput[]): Promise<Slot[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200));
      return mockDb.createSlots(lotId, slots);
    }
    return apiClient<Slot[]>(`/lots/${lotId}/slots`, {
      method: 'POST',
      body: JSON.stringify(slots),
    });
  },

  async getLotForecast(lotId: number): Promise<ForecastResponse> {
    if (USE_MOCK) {
      return mockGetForecast(lotId);
    }
    return apiClient<ForecastResponse>(`/lots/${lotId}/forecast`);
  },

  // Bookings
  async createBooking(data: CreateBookingInput): Promise<Booking> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 250));
      const userStr = localStorage.getItem('parksetu_user');
      const user = userStr ? JSON.parse(userStr) : { id: 1 };
      try {
        return mockDb.createBooking(user.id, data);
      } catch (err: any) {
        if (err.status === 409) {
          throw new ApiError(409, err.message, err.detail);
        }
        throw err;
      }
    }
    return apiClient<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMyBookings(): Promise<Booking[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 150));
      const userStr = localStorage.getItem('parksetu_user');
      const user = userStr ? JSON.parse(userStr) : null;
      const bookings = mockDb.getBookings();
      if (user) {
        return bookings.filter((b) => !b.user_id || b.user_id === user.id);
      }
      return bookings;
    }
    return apiClient<Booking[]>('/bookings/me');
  },

  async extendBooking(id: number, newEndTime: string): Promise<Booking> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200));
      return mockDb.extendBooking(id, newEndTime);
    }
    return apiClient<Booking>(`/bookings/${id}/extend`, {
      method: 'POST',
      body: JSON.stringify({ new_end_time: newEndTime }),
    });
  },

  async cancelBooking(id: number): Promise<Booking> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200));
      return mockDb.cancelBooking(id);
    }
    return apiClient<Booking>(`/bookings/${id}/cancel`, {
      method: 'POST',
    });
  },

  async exitBooking(id: number): Promise<Booking> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200));
      return mockDb.exitBooking(id);
    }
    return apiClient<Booking>(`/bookings/${id}/exit`, {
      method: 'POST',
    });
  },

  async getAlternatives(bookingId: number): Promise<LotNearbyItem[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 150));
      return mockDb.getNearbyLots(19.2813, 72.8689).slice(0, 3);
    }
    return apiClient<LotNearbyItem[]>(`/bookings/${bookingId}/alternatives`);
  },

  // Gate simulator
  async checkin(qrToken: string): Promise<Booking> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200));
      return mockDb.checkin(qrToken);
    }
    return apiClient<Booking>('/checkin', {
      method: 'POST',
      body: JSON.stringify({ qr_token: qrToken }),
    });
  },

  // Admin / Owner stats
  async getAdminStats(lotId?: number): Promise<AdminStats> {
    if (USE_MOCK) {
      return mockGetAdminStats(lotId);
    }
    const query = lotId ? `?lot_id=${lotId}` : '';
    return apiClient<AdminStats>(`/admin/stats${query}`);
  },
};
