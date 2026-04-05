import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import api from "../api/client";

const FALLBACK_CENTER = { lat: 10.7769, lng: 106.7009 };

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

const spaceMarkerIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [32, 52],
  iconAnchor: [16, 52],
  popupAnchor: [0, -44],
  shadowSize: [52, 52],
  shadowAnchor: [16, 52]
});

function MapPage() {
  const [markers, setMarkers] = useState([]);

  useEffect(() => {
    api.get("/map").then((response) => setMarkers(response.data));
  }, []);

  const mapMarkers = useMemo(
    () =>
      markers
        .map((marker) => ({
          ...marker,
          lat: Number(marker.latitude),
          lng: Number(marker.longitude)
        }))
        .filter((marker) => Number.isFinite(marker.lat) && Number.isFinite(marker.lng)),
    [markers]
  );

  const mapCenter = useMemo(() => {
    if (mapMarkers.length === 0) {
      return FALLBACK_CENTER;
    }

    const total = mapMarkers.reduce(
      (accumulator, marker) => ({
        lat: accumulator.lat + marker.lat,
        lng: accumulator.lng + marker.lng
      }),
      { lat: 0, lng: 0 }
    );

    return {
      lat: total.lat / mapMarkers.length,
      lng: total.lng / mapMarkers.length
    };
  }, [mapMarkers]);


  return (
    <section className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-orange-600">Map overview</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-slate-900">Ban do khong gian</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="min-h-[540px] overflow-hidden rounded-[32px] border border-orange-100 bg-white shadow-panel">
          <MapContainer center={mapCenter} zoom={12} scrollWheelZoom className="h-[540px] w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mapMarkers.map((marker) => (
              <Marker
                key={marker.id}
                position={[marker.lat, marker.lng]}
                title={marker.name}
                icon={spaceMarkerIcon}
              >
                <Popup>
                  <div className="max-w-[260px] space-y-1">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-orange-600">
                      {getSpaceTypeLabel(marker.type)}
                    </p>
                    <p className="text-sm font-semibold text-slate-900">{marker.name}</p>
                    <p className="text-xs text-slate-600">{marker.location}</p>
                    <Link className="text-xs font-semibold text-teal-700" to={`/spaces/${marker.id}`}>
                      Xem chi tiết
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="space-y-4">
          {mapMarkers.map((marker) => (
            <div key={marker.id} className="rounded-[24px] border border-orange-100 bg-white p-5 shadow-panel">
              <p className="text-xs uppercase tracking-[0.25em] text-orange-600">{marker.type}</p>
              <h3 className="mt-2 font-display text-xl font-semibold text-slate-900">{marker.name}</h3>
              <p className="mt-2 text-sm text-slate-600">{marker.location}</p>
              <p className="mt-1 text-xs text-slate-400">
                {marker.lat}, {marker.lng}
              </p>
              <Link className="mt-3 inline-block text-sm font-semibold text-teal-700" to={`/spaces/${marker.id}`}>
                Đi đến chi tiết
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default MapPage;
