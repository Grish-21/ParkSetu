-- ====================================================================
-- ParkSetu - Complete PostgreSQL Schema & Initial Seed Data
-- Compatible with Supabase SQL Editor and standard psql client
-- ====================================================================

-- 1. CLEANUP (Drop tables if they already exist in reverse order)
DROP TABLE IF EXISTS occupancy_log CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS slots CASCADE;
DROP TABLE IF EXISTS lots CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ====================================================================
-- 2. TABLE DEFINITIONS
-- ====================================================================

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'driver' CHECK (role IN ('driver', 'owner', 'admin'))
);

CREATE INDEX idx_users_email ON users(email);

-- Parking Lots Table
CREATE TABLE lots (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(160) NOT NULL,
    address VARCHAR(300) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    price_per_hour DOUBLE PRECISION NOT NULL CHECK (price_per_hour > 0),
    overstay_multiplier DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    buffer_slots INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_lots_coords ON lots(lat, lng);

-- Parking Slots Table
CREATE TABLE slots (
    id SERIAL PRIMARY KEY,
    lot_id INTEGER NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
    label VARCHAR(30) NOT NULL,
    polygon TEXT,
    is_buffer BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'occupied')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_slot_lot_label UNIQUE (lot_id, label)
);

CREATE INDEX idx_slots_lot_id ON slots(lot_id);
CREATE INDEX idx_slots_status ON slots(status);

-- Bookings Table
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lot_id INTEGER NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
    slot_id INTEGER NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
    vehicle_no VARCHAR(30) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'BOOKED' CHECK (status IN ('BOOKED', 'CHECKED_IN', 'OVERSTAY', 'COMPLETED', 'NO_SHOW', 'CANCELLED')),
    qr_token VARCHAR(80) UNIQUE NOT NULL,
    checked_in_at TIMESTAMPTZ,
    exited_at TIMESTAMPTZ,
    amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    overstay_minutes INTEGER NOT NULL DEFAULT 0,
    at_risk BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_booking_slot_window ON bookings (slot_id, start_time, end_time);
CREATE INDEX ix_booking_user_created ON bookings (user_id, created_at);
CREATE INDEX idx_booking_status ON bookings(status);
CREATE INDEX idx_booking_qr_token ON bookings(qr_token);

-- Occupancy Log Table (Telemetry & AI Training Log)
CREATE TABLE occupancy_log (
    id SERIAL PRIMARY KEY,
    lot_id INTEGER NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
    ts TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    occupied_count INTEGER NOT NULL,
    total_count INTEGER NOT NULL
);

CREATE INDEX idx_occupancy_log_lot_ts ON occupancy_log(lot_id, ts);

-- ====================================================================
-- 3. SEED INITIAL DATA (Demo Users, Mira Bhayandar Lots & Slots)
-- ====================================================================

-- Demo Users (Password for all 3 accounts: demo1234)
-- Bcrypt hash: $2b$12$ha.qcmCDwgykuCzifxDAnO27ALwwsr0BcbCGHUvGXkvKs1LicAV3e
INSERT INTO users (id, name, email, password_hash, role) VALUES
(1, 'Demo Driver', 'driver@demo.com', '$2b$12$ha.qcmCDwgykuCzifxDAnO27ALwwsr0BcbCGHUvGXkvKs1LicAV3e', 'driver'),
(2, 'Demo Owner',  'owner@demo.com',  '$2b$12$ha.qcmCDwgykuCzifxDAnO27ALwwsr0BcbCGHUvGXkvKs1LicAV3e', 'owner'),
(3, 'Demo Admin',  'admin@demo.com',  '$2b$12$ha.qcmCDwgykuCzifxDAnO27ALwwsr0BcbCGHUvGXkvKs1LicAV3e', 'admin');

-- Advance users sequence
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- Demo Lots in Mira Bhayandar
INSERT INTO lots (id, owner_id, name, address, lat, lng, price_per_hour, overstay_multiplier, buffer_slots) VALUES
(1, 2, 'Mira Road Station Plaza Parking', 'Station Road, Near Platform 1, Mira Road East', 19.2813, 72.8689, 30.0, 1.5, 1),
(2, 2, 'Bhayandar Petrol Pump Lot',        'Near HP Petrol Pump, Station Road, Bhayandar West', 19.3109, 72.8517, 20.0, 1.5, 1),
(3, 2, 'Mira-Bhayandar Mall Parking',     'Maxus Mall Road, Beverly Park, Mira Road East',    19.2950, 72.8600, 40.0, 1.5, 1);

-- Advance lots sequence
SELECT setval('lots_id_seq', (SELECT MAX(id) FROM lots));

-- Demo Slots for Lot 1 (10 slots total: 9 regular bookable + 1 buffer)
INSERT INTO slots (lot_id, label, is_buffer, status) VALUES
(1, 'A01', FALSE, 'free'),
(1, 'A02', FALSE, 'free'),
(1, 'A03', FALSE, 'free'),
(1, 'A04', FALSE, 'free'),
(1, 'A05', FALSE, 'free'),
(1, 'A06', FALSE, 'free'),
(1, 'A07', FALSE, 'free'),
(1, 'A08', FALSE, 'free'),
(1, 'A09', FALSE, 'free'),
(1, 'BUF-1', TRUE, 'free');

-- Demo Slots for Lot 2 (6 slots total: 5 regular bookable + 1 buffer)
INSERT INTO slots (lot_id, label, is_buffer, status) VALUES
(2, 'A01', FALSE, 'free'),
(2, 'A02', FALSE, 'free'),
(2, 'A03', FALSE, 'free'),
(2, 'A04', FALSE, 'free'),
(2, 'A05', FALSE, 'free'),
(2, 'BUF-1', TRUE, 'free');

-- Demo Slots for Lot 3 (12 slots total: 11 regular bookable + 1 buffer)
INSERT INTO slots (lot_id, label, is_buffer, status) VALUES
(3, 'A01', FALSE, 'free'),
(3, 'A02', FALSE, 'free'),
(3, 'A03', FALSE, 'free'),
(3, 'A04', FALSE, 'free'),
(3, 'A05', FALSE, 'free'),
(3, 'A06', FALSE, 'free'),
(3, 'A07', FALSE, 'free'),
(3, 'A08', FALSE, 'free'),
(3, 'A09', FALSE, 'free'),
(3, 'A10', FALSE, 'free'),
(3, 'A11', FALSE, 'free'),
(3, 'BUF-1', TRUE, 'free');

-- Advance slots sequence
SELECT setval('slots_id_seq', (SELECT MAX(id) FROM slots));

-- Verify Table Status
SELECT 'Users Created:' as category, count(*) FROM users
UNION ALL
SELECT 'Lots Created:', count(*) FROM lots
UNION ALL
SELECT 'Slots Created:', count(*) FROM slots;
