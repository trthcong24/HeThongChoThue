import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import api from "../api/client";
import { getSpaceTypeLabel } from "../utils/labels";
import PageHeader from "../components/PageHeader";

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

const MapPage = () => {
  const [searchParams] = useSearchParams();
  const [markers, setMarkers] = useState([]);
  const [rentalCode, setRentalCode] = useState(searchParams.get("rentalCode") || "");

  const loadMarkers = async (code) => {
    const params = {};
    if (code && code.trim()) {
      params.rentalCode = code.trim();
    }
    const response = await api.get("/map", { params });
    setMarkers(response.data);
  };

  useEffect(() => {
    loadMarkers(rentalCode);
  }, []);

  const mapMarkers = useMemo(
    () =>
      markers
        .map((marker) => ({
          ...marker,
          location: marker.location || marker.address || "-",
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
        <PageHeader eyebrow="Vehicle map overview" title="Bản đồ vị trí xe" />
        <form
          className="mt-4 flex flex-wrap items-center gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            loadMarkers(rentalCode);
          }}
        >
          <input
            value={rentalCode}
            onChange={(event) => setRentalCode(event.target.value)}
            placeholder="Nhập mã thuê xe (ví dụ: RENT-12)"
            className="w-full max-w-md rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          />
          <button type="submit" className="rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white">
            Tìm vị trí theo mã thuê
          </button>
          <button
            type="button"
            onClick={() => {
              setRentalCode("");
              loadMarkers("");
            }}
            className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
          >
            Xem toàn bộ xe
          </button>
        </form>
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
                    {marker.rental_code && <p className="text-xs font-semibold text-teal-700">{marker.rental_code}</p>}
                    <Link className="text-xs font-semibold text-teal-700" to={`/vehicles/${marker.id}`}>
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
              {marker.rental_code && <p className="mt-1 text-xs font-semibold text-teal-700">{marker.rental_code}</p>}
              <p className="mt-1 text-xs text-slate-400">
                {marker.lat}, {marker.lng}
              </p>
              <Link className="mt-3 inline-block text-sm font-semibold text-teal-700" to={`/vehicles/${marker.id}`}>
                Đi đến chi tiết
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MapPage;
