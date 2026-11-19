import {
  User,
  AuthResponse,
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

// Haversine distance in km
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

const STORAGE_KEY_LOTS = 'parksetu_mock_lots';
const STORAGE_KEY_SLOTS = 'parksetu_mock_slots';
const STORAGE_KEY_BOOKINGS = 'parksetu_mock_bookings';

const DEFAULT_LOTS: Lot[] = [
  {
    id: 1,
    owner_id: 2,
    name: 'Mira Road Station Plaza Parking',
    address: 'Station Road, Near Platform 1, Mira Road East',
    lat: 19.2813,
    lng: 72.8689,
    price_per_hour: 30,
    overstay_multiplier: 1.5,
    buffer_slots: 1,
  },
  {
    id: 2,
    owner_id: 2,
    name: 'Bhayandar Petrol Pump Lot',
    address: 'Near HP Petrol Pump, Station Road, Bhayandar West',
    lat: 19.3109,
    lng: 72.8517,
    price_per_hour: 20,
    overstay_multiplier: 1.5,
    buffer_slots: 1,
  },
  {
    id: 3,
    owner_id: 2,
    name: 'Mira-Bhayandar Mall Parking',
    address: 'Maxus Mall Road, Beverly Park, Mira Road East',
    lat: 19.295,
    lng: 72.86,
    price_per_hour: 40,
    overstay_multiplier: 1.5,
    buffer_slots: 2,
  },
];

function generateInitialSlots(): Slot[] {
  const slots: Slot[] = [];
  // Lot 1: 10 slots
  for (let i = 1; i <= 10; i++) {
    slots.push({
      id: i,
      lot_id: 1,
      label: `A${i}`,
      polygon: null,
      is_buffer: i === 10,
      status: i <= 4 ? 'occupied' : 'free',
      updated_at: new Date().toISOString(),
    });
  }
  // Lot 2: 6 slots
  for (let i = 1; i <= 6; i++) {
    slots.push({
      id: 10 + i,
      lot_id: 2,
      label: `B${i}`,
      polygon: null,
      is_buffer: i === 6,
      status: i <= 5 ? 'occupied' : 'free', // mostly full to test forecast/reroute!
      updated_at: new Date().toISOString(),
    });
  }
  // Lot 3: 12 slots
  for (let i = 1; i <= 12; i++) {
    slots.push({
      id: 20 + i,
      lot_id: 3,
      label: `C${i}`,
      polygon: null,
      is_buffer: i >= 11,
      status: i % 2 === 0 ? 'occupied' : 'free',
      updated_at: new Date().toISOString(),
    });
  }
  return slots;
}

function generateInitialBookings(): Booking[] {
  const now = new Date();
  const startTime = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
  const endTime = new Date(now.getTime() + 45 * 60 * 1000).toISOString();

  return [
    {
      id: 101,
      user_id: 1,
      lot_id: 1,
      lot_name: 'Mira Road Station Plaza Parking',
      slot_id: 1,
      slot_label: 'A1',
      vehicle_no: 'MH04AB1234',
      start_time: startTime,
      end_time: endTime,
      status: 'CHECKED_IN',
      qr_token: 'QR-DEMO-101-ACTIVE',
      checked_in_at: startTime,
      exited_at: null,
      amount: 30,
      overstay_minutes: 0,
      at_risk: false,
      created_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
    },
    {
      id: 102,
      user_id: 1,
      lot_id: 3,
      lot_name: 'Mira-Bhayandar Mall Parking',
      slot_id: 21,
      slot_label: 'C1',
      vehicle_no: 'MH04EV5678',
      start_time: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      end_time: new Date(now.getTime() + 150 * 60 * 1000).toISOString(),
      status: 'BOOKED',
      qr_token: 'QR-DEMO-102-UPCOMING',
      checked_in_at: null,
      exited_at: null,
      amount: 80,
      overstay_minutes: 0,
      at_risk: true, // test reroute display!
      created_at: new Date().toISOString(),
    },
    {
      id: 100,
      user_id: 1,
      lot_id: 2,
      lot_name: 'Bhayandar Petrol Pump Lot',
      slot_id: 11,
      slot_label: 'B1',
      vehicle_no: 'MH04AB1234',
      start_time: new Date(now.getTime() - 86400000).toISOString(),
      end_time: new Date(now.getTime() - 82800000).toISOString(),
      status: 'COMPLETED',
      qr_token: 'QR-DEMO-100-PAST',
      checked_in_at: new Date(now.getTime() - 86400000).toISOString(),
      exited_at: new Date(now.getTime() - 82800000).toISOString(),
      amount: 20,
      overstay_minutes: 0,
      at_risk: false,
      created_at: new Date(now.getTime() - 90000000).toISOString(),
    },
  ];
}

class MockDatabase {
  private lots: Lot[];
  private slots: Slot[];
  private bookings: Booking[];

  constructor() {
    const savedLots = localStorage.getItem(STORAGE_KEY_LOTS);
    const savedSlots = localStorage.getItem(STORAGE_KEY_SLOTS);
    const savedBookings = localStorage.getItem(STORAGE_KEY_BOOKINGS);

    this.lots = savedLots ? JSON.parse(savedLots) : DEFAULT_LOTS;
    this.slots = savedSlots ? JSON.parse(savedSlots) : generateInitialSlots();
    this.bookings = savedBookings ? JSON.parse(savedBookings) : generateInitialBookings();

    this.persist();
  }

  private persist() {
    localStorage.setItem(STORAGE_KEY_LOTS, JSON.stringify(this.lots));
    localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(this.slots));
    localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(this.bookings));
  }

  getLots(): Lot[] {
    return [...this.lots];
  }

  getLot(id: number): Lot | undefined {
    return this.lots.find((l) => l.id === id);
  }

  createLot(input: CreateLotInput, ownerId: number): Lot {
    const newLot: Lot = {
      id: this.lots.length > 0 ? Math.max(...this.lots.map((l) => l.id)) + 1 : 1,
      owner_id: ownerId,
      name: input.name,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      price_per_hour: input.price_per_hour,
      overstay_multiplier: 1.5,
      buffer_slots: 1,
    };
    this.lots.push(newLot);
    this.persist();
    return newLot;
  }

  getSlots(lotId: number): Slot[] {
    return this.slots.filter((s) => s.lot_id === lotId);
  }

  createSlots(lotId: number, inputs: CreateSlotInput[]): Slot[] {
    const existing = this.slots.filter((s) => s.lot_id !== lotId);
    let nextId = this.slots.length > 0 ? Math.max(...this.slots.map((s) => s.id)) + 1 : 1;
    const created: Slot[] = inputs.map((input) => ({
      id: nextId++,
      lot_id: lotId,
      label: input.label,
      polygon: input.polygon || null,
      is_buffer: input.is_buffer,
      status: 'free',
      updated_at: new Date().toISOString(),
    }));
    this.slots = [...existing, ...created];
    this.persist();
    return created;
  }

  updateSlotStatus(lotId: number, slotId: number, status: 'free' | 'occupied'): Slot | undefined {
    const slot = this.slots.find((s) => s.lot_id === lotId && s.id === slotId);
    if (slot) {
      slot.status = status;
      slot.updated_at = new Date().toISOString();
      this.persist();
    }
    return slot;
  }

  getNearbyLots(
    lat: number,
    lng: number,
    _radiusKm: number = 5,
    _start?: string,
    _end?: string
  ): LotNearbyItem[] {
    const result: LotNearbyItem[] = this.lots.map((lot) => {
      const lotSlots = this.slots.filter((s) => s.lot_id === lot.id);
      const totalSlots = lotSlots.filter((s) => !s.is_buffer).length || 1;
      const freeSlots = lotSlots.filter((s) => !s.is_buffer && s.status === 'free').length;
      const distance = haversineDistance(lat, lng, lot.lat, lot.lng);

      return {
        id: lot.id,
        name: lot.name,
        address: lot.address,
        lat: lot.lat,
        lng: lot.lng,
        distance_km: distance,
        price_per_hour: lot.price_per_hour,
        total_slots: totalSlots,
        free_now: freeSlots,
        free_for_window: freeSlots,
      };
    });

    return result.sort((a, b) => a.distance_km - b.distance_km);
  }

  getBookings(): Booking[] {
    return [...this.bookings];
  }

  getBooking(id: number): Booking | undefined {
    return this.bookings.find((b) => b.id === id);
  }

  createBooking(userId: number, input: CreateBookingInput): Booking {
    const lot = this.getLot(input.lot_id);
    if (!lot) throw new Error('Lot not found');

    const availableSlots = this.slots
      .filter((s) => s.lot_id === input.lot_id && !s.is_buffer && s.status === 'free')
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

    if (availableSlots.length === 0) {
      const err: any = new Error('No available slots');
      err.status = 409;
      err.detail = {
        message: `No slots available at ${lot.name} for the selected window.`,
        alternatives: this.getNearbyLots(lot.lat, lot.lng).filter((l) => l.id !== lot.id),
      };
      throw err;
    }

    const assignedSlot = availableSlots[0];
    // mark slot occupied in mock state
    this.updateSlotStatus(lot.id, assignedSlot.id, 'occupied');

    const start = new Date(input.start_time);
    const end = new Date(input.end_time);
    const hours = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60)));
    const amount = hours * lot.price_per_hour;

    const newBooking: Booking = {
      id: this.bookings.length > 0 ? Math.max(...this.bookings.map((b) => b.id)) + 1 : 1,
      user_id: userId,
      lot_id: lot.id,
      lot_name: lot.name,
      slot_id: assignedSlot.id,
      slot_label: assignedSlot.label,
      vehicle_no: input.vehicle_no.trim().toUpperCase(),
      start_time: input.start_time,
      end_time: input.end_time,
      status: 'BOOKED',
      qr_token: `PST-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      checked_in_at: null,
      exited_at: null,
      amount,
      overstay_minutes: 0,
      at_risk: false,
      created_at: new Date().toISOString(),
    };

    this.bookings.unshift(newBooking);
    this.persist();
    return newBooking;
  }

  extendBooking(id: number, newEndTime: string): Booking {
    const booking = this.bookings.find((b) => b.id === id);
    if (!booking) throw new Error('Booking not found');

    const lot = this.getLot(booking.lot_id);
    const start = new Date(booking.start_time);
    const end = new Date(newEndTime);
    const hours = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60)));
    const baseAmount = hours * (lot?.price_per_hour || 30);

    booking.end_time = newEndTime;
    booking.amount = baseAmount;
    this.persist();
    return booking;
  }

  cancelBooking(id: number): Booking {
    const booking = this.bookings.find((b) => b.id === id);
    if (!booking) throw new Error('Booking not found');
    booking.status = 'CANCELLED';
    this.updateSlotStatus(booking.lot_id, booking.slot_id, 'free');
    this.persist();
    return booking;
  }

  exitBooking(id: number): Booking {
    const booking = this.bookings.find((b) => b.id === id);
    if (!booking) throw new Error('Booking not found');
    booking.status = 'COMPLETED';
    booking.exited_at = new Date().toISOString();
    this.updateSlotStatus(booking.lot_id, booking.slot_id, 'free');
    this.persist();
    return booking;
  }

  checkin(qrToken: string): Booking {
    const booking = this.bookings.find(
      (b) => b.qr_token.trim().toLowerCase() === qrToken.trim().toLowerCase()
    );
    if (!booking) {
      throw new Error('Invalid QR token or booking not found');
    }
    if (booking.status === 'CANCELLED') {
      throw new Error('Booking was cancelled');
    }
    if (booking.status === 'COMPLETED') {
      throw new Error('Booking is already completed');
    }

    booking.status = 'CHECKED_IN';
    booking.checked_in_at = new Date().toISOString();
    this.updateSlotStatus(booking.lot_id, booking.slot_id, 'occupied');
    this.persist();
    return booking;
  }
}

export const mockDb = new MockDatabase();

// Pre-seeded users for instant demo login
export const DEMO_USERS: Record<string, User> = {
  'driver@demo.com': {
    id: 1,
    name: 'Rahul Sharma (Driver)',
    email: 'driver@demo.com',
    role: 'driver',
  },
  'owner@demo.com': {
    id: 2,
    name: 'Vikram Joshi (Lot Owner)',
    email: 'owner@demo.com',
    role: 'owner',
  },
  'admin@demo.com': {
    id: 3,
    name: 'Pooja Patel (Mira Admin)',
    email: 'admin@demo.com',
    role: 'admin',
  },
};

export async function mockLogin(email: string, _password: string): Promise<AuthResponse> {
  await new Promise((r) => setTimeout(r, 250));
  const user = DEMO_USERS[email.toLowerCase()] || {
    id: 99,
    name: email.split('@')[0],
    email: email.toLowerCase(),
    role: 'driver' as const,
  };
  const token = `mock-jwt-token-${user.role}-${user.id}-${Date.now()}`;
  return { token, user };
}

export async function mockRegister(
  name: string,
  email: string,
  _password: string,
  role: 'driver' | 'owner' | 'admin'
): Promise<AuthResponse> {
  await new Promise((r) => setTimeout(r, 250));
  const user: User = {
    id: Math.floor(100 + Math.random() * 900),
    name,
    email: email.toLowerCase(),
    role,
  };
  const token = `mock-jwt-token-${user.role}-${user.id}-${Date.now()}`;
  return { token, user };
}

export async function mockGetForecast(lotId: number): Promise<ForecastResponse> {
  await new Promise((r) => setTimeout(r, 200));
  const slots = mockDb.getSlots(lotId);
  const freeNow = slots.filter((s) => !s.is_buffer && s.status === 'free').length;
  const now = new Date();
  const nextFreeMinutes = freeNow > 0 ? 0 : Math.floor(10 + Math.random() * 25);
  const nextFreeDate =
    freeNow > 0 ? null : new Date(now.getTime() + nextFreeMinutes * 60000).toISOString();

  return {
    free_now: freeNow,
    next_free_at: nextFreeDate,
    confidence: 0.86,
    method: 'ml_ensemble_forecast (YOLOv8 + LightGBM)',
  };
}

export async function mockGetAdminStats(lotId?: number): Promise<AdminStats> {
  await new Promise((r) => setTimeout(r, 200));
  return {
    occupancy_by_hour: [
      { hour: 8, avg_occupancy: 25 },
      { hour: 9, avg_occupancy: 45 },
      { hour: 10, avg_occupancy: 78 },
      { hour: 11, avg_occupancy: 92 },
      { hour: 12, avg_occupancy: 88 },
      { hour: 13, avg_occupancy: 70 },
      { hour: 14, avg_occupancy: 65 },
      { hour: 15, avg_occupancy: 72 },
      { hour: 16, avg_occupancy: 85 },
      { hour: 17, avg_occupancy: 96 },
      { hour: 18, avg_occupancy: 98 },
      { hour: 19, avg_occupancy: 90 },
      { hour: 20, avg_occupancy: 68 },
      { hour: 21, avg_occupancy: 42 },
    ],
    bookings_total: lotId ? 78 : 342,
    no_show_rate: 0.04, // 4%
    overstay_rate: 0.08, // 8%
    revenue: lotId ? 14250 : 86400,
    peak_hours: [11, 17, 18, 19],
  };
}
