import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { LotNearbyItem } from '../api/types';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';

// Custom sleek HTML/SVG markers for Leaflet
function createParkingIcon(freeCount: number, totalCount: number) {
  const isAvailable = freeCount > 0;
  const bgColor = isAvailable ? '#10b981' : '#f43f5e';

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        background: #1e293b;
        color: white;
        border: 2px solid ${bgColor};
        border-radius: 9999px;
        padding: 4px 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        font-family: system-ui, sans-serif;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transform: translate(-50%, -50%);
        white-space: nowrap;
        gap: 4px;
      ">
        <span style="
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          background: ${bgColor};
          display: inline-block;
        "></span>
        <span>P</span>
        <span style="color: ${bgColor}; font-size: 10px;">${freeCount}/${totalCount}</span>
      </div>
    `,
    iconSize: [60, 26],
    iconAnchor: [30, 13],
  });
}

function createUserIcon() {
  return L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div style="
        position: relative;
        width: 18px;
        height: 18px;
        transform: translate(-50%, -50%);
      ">
        <div style="
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 9999px;
          background: #6366f1;
          opacity: 0.75;
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          position: relative;
          width: 14px;
          height: 14px;
          margin: 2px;
          border-radius: 9999px;
          background: #4f46e5;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        "></div>
      </div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function createSelectedPinIcon() {
  return L.divIcon({
    className: 'custom-selected-pin',
    html: `
      <div style="
        transform: translate(-50%, -100%);
        color: #f59e0b;
        filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
      ">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
}

interface MapClickHandlerProps {
  onMapClick: (lat: number, lng: number) => void;
}

const MapClickHandler: React.FC<MapClickHandlerProps> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

interface MapViewProps {
  lots?: LotNearbyItem[];
  userLat?: number;
  userLng?: number;
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  selectedCoord?: { lat: number; lng: number } | null;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
}

export const MapView: React.FC<MapViewProps> = ({
  lots = [],
  userLat,
  userLng,
  centerLat = 19.2813,
  centerLng = 72.8689,
  zoom = 13,
  selectedCoord,
  onMapClick,
  className = 'h-72 w-full rounded-2xl overflow-hidden shadow-inner',
}) => {
  const center: [number, number] = [centerLat, centerLng];

  return (
    <div className={`relative ${className} z-0`}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}

        {/* User Current Location Marker */}
        {userLat && userLng && (
          <Marker position={[userLat, userLng]} icon={createUserIcon()}>
            <Popup className="custom-popup">
              <div className="text-xs font-semibold text-slate-800">
                📍 You are here
              </div>
            </Popup>
          </Marker>
        )}

        {/* Selected Coordinate for New Lot */}
        {selectedCoord && (
          <Marker
            position={[selectedCoord.lat, selectedCoord.lng]}
            icon={createSelectedPinIcon()}
          >
            <Popup className="custom-popup">
              <div className="text-xs text-slate-800">
                <strong>Selected Location</strong>
                <br />
                {selectedCoord.lat.toFixed(4)}, {selectedCoord.lng.toFixed(4)}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Parking Lot Markers */}
        {lots.map((lot) => (
          <Marker
            key={lot.id}
            position={[lot.lat, lot.lng]}
            icon={createParkingIcon(lot.free_now, lot.total_slots)}
          >
            <Popup className="custom-popup">
              <div className="p-1 text-slate-800 space-y-1">
                <h4 className="font-bold text-sm text-slate-900">{lot.name}</h4>
                <p className="text-xs text-slate-600">{lot.address}</p>
                <div className="text-xs flex items-center justify-between gap-4 font-semibold text-slate-800 pt-1">
                  <span>₹{lot.price_per_hour}/hr</span>
                  <span className="text-emerald-600">{lot.free_now} free</span>
                </div>
                <div className="pt-2">
                  <Link
                    to={`/lots/${lot.id}`}
                    className="block text-center bg-indigo-600 text-white font-semibold py-1.5 px-3 rounded-lg text-xs hover:bg-indigo-700 transition"
                  >
                    View & Book
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
