import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { getSpaceTypeLabel } from "../utils/labels";

function MapPage() {
  const [markers, setMarkers] = useState([]);

  useEffect(() => {
    api.get("/map").then((response) => setMarkers(response.data));
  }, []);

  const bounds = useMemo(() => {
    if (markers.length === 0) {
      return null;
    }

    const latitudes = markers.map((item) => Number(item.latitude));
    const longitudes = markers.map((item) => Number(item.longitude));
    return {
      minLat: Math.min(...latitudes),
      maxLat: Math.max(...latitudes),
      minLng: Math.min(...longitudes),
      maxLng: Math.max(...longitudes)
    };
  }, [markers]);

  function getPosition(marker) {
    if (!bounds) {
      return { top: "50%", left: "50%" };
    }

    const latRatio = (Number(marker.latitude) - bounds.minLat) / Math.max(bounds.maxLat - bounds.minLat, 0.001);
    const lngRatio = (Number(marker.longitude) - bounds.minLng) / Math.max(bounds.maxLng - bounds.minLng, 0.001);

    return {
      top: `${100 - latRatio * 90}%`,
      left: `${5 + lngRatio * 90}%`
    };
  }

  return (
    <section className="space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-orange-600">Bản đồ tổng quan</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-slate-900">Bản đồ không gian</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="relative min-h-[540px] overflow-hidden rounded-[32px] border border-orange-100 bg-gradient-to-br from-orange-100 via-white to-teal-100 shadow-panel">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] bg-[size:48px_48px]" />
          {markers.map((marker) => {
            const position = getPosition(marker);
            return (
              <div key={marker.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={position}>
                <div className="rounded-full bg-orange-600 px-3 py-2 text-xs font-semibold text-white shadow-lg">
                  {marker.name}
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          {markers.map((marker) => (
            <div key={marker.id} className="rounded-[24px] border border-orange-100 bg-white p-5 shadow-panel">
              <p className="text-xs uppercase tracking-[0.25em] text-orange-600">{getSpaceTypeLabel(marker.type)}</p>
              <h3 className="mt-2 font-display text-xl font-semibold text-slate-900">{marker.name}</h3>
              <p className="mt-2 text-sm text-slate-600">{marker.location}</p>
              <p className="mt-1 text-xs text-slate-400">
                {marker.latitude}, {marker.longitude}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default MapPage;
