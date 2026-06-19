import { useState } from "react";
import { Plane, Train, Leaf, MapPin } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { calculateFlightCarbonByRoute, estimateFlightDistanceKm } from "../services/carbonEngine";

const airports: { code: string; city: string }[] = [
  { code: "DEL", city: "Delhi" },
  { code: "BOM", city: "Mumbai" },
  { code: "BLR", city: "Bangalore" },
  { code: "HYD", city: "Hyderabad" },
  { code: "CCU", city: "Kolkata" },
  { code: "MAA", city: "Chennai" },
  { code: "GOI", city: "Goa" },
  { code: "PNQ", city: "Pune" },
  { code: "AMD", city: "Ahmedabad" },
  { code: "COK", city: "Kochi" },
  { code: "TRV", city: "Thiruvananthapuram" },
  { code: "PAT", city: "Patna" },
  { code: "LKO", city: "Lucknow" },
  { code: "JAI", city: "Jaipur" },
  { code: "JDH", city: "Jodhpur" },
  { code: "UDR", city: "Udaipur" },
  { code: "VNS", city: "Varanasi" },
  { code: "IXR", city: "Ranchi" },
];

const trainAlternatives: { from: string; to: string; train: string; duration: string; distance: string }[] = [
  { from: "DEL", to: "BOM", train: "Rajdhani Express", duration: "15h 35m", distance: "1,384 km" },
  { from: "DEL", to: "BLR", train: "Karnataka Express", duration: "34h", distance: "2,378 km" },
  { from: "DEL", to: "CCU", train: "Rajdhani Express", duration: "17h", distance: "1,449 km" },
  { from: "BOM", to: "GOI", train: "Jan Shatabdi", duration: "8h", distance: "588 km" },
  { from: "DEL", to: "LKO", train: "Vande Bharat", duration: "5h 45m", distance: "554 km" },
  { from: "DEL", to: "JAI", train: "Shatabdi Express", duration: "4h 30m", distance: "308 km" },
  { from: "BOM", to: "PNQ", train: "Deccan Express", duration: "3h 15m", distance: "192 km" },
  { from: "DEL", to: "AMD", train: "Rajdhani Express", duration: "12h 40m", distance: "930 km" },
  { from: "MAA", to: "BLR", train: "Shatabdi Express", duration: "5h", distance: "330 km" },
  { from: "DEL", to: "PAT", train: "Rajdhani Express", duration: "12h 30m", distance: "991 km" },
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function FlightScreen() {
  const [flightNumber, setFlightNumber] = useState("");
  const [departure, setDeparture] = useState("DEL");
  const [destination, setDestination] = useState("BOM");
  const [departureDate, setDepartureDate] = useState("");
  const [passengers, setPassengers] = useState("1");
  const [preview, setPreview] = useState<{ distance: number; kg: number } | null>(null);
  const [message, setMessage] = useState("");

  const addFlightLog = useAppStore((s) => s.addFlightLog);
  const addEntry = useAppStore((s) => s.addEntry);
  const flightLogs = useAppStore((s) => s.flightLogs);

  function flash(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  }

  const autoDistance = departure !== destination ? estimateFlightDistanceKm(departure, destination) : 0;
  const pCount = parseInt(passengers) || 1;

  function calc() {
    if (departure === destination) return;
    const result = calculateFlightCarbonByRoute(departure, destination, pCount);
    setPreview({ distance: result.distanceKm, kg: result.kgCo2e });
  }

  function log() {
    if (departure === destination) return;
    const result = calculateFlightCarbonByRoute(departure, destination, pCount);
    const now = new Date().toISOString();
    addFlightLog({
      id: uid(),
      flightNumber: flightNumber || "N/A",
      departureAirport: departure,
      destinationAirport: destination,
      departureDate: departureDate || new Date().toISOString().split("T")[0],
      passengerCount: pCount,
      distanceKm: result.distanceKm,
      kgCo2e: result.kgCo2e,
      source: "manual",
      confidence: 1,
    });
    addEntry({
      id: uid(),
      category: "flight",
      label: `Flight ${departure} → ${destination}`,
      kgCo2e: result.kgCo2e,
      source: "manual",
      occurredAt: now,
    });
    flash(`Logged ${result.kgCo2e} kg CO₂e for flight`);
    setFlightNumber("");
    setPassengers("1");
    setDepartureDate("");
    setPreview(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0faf0] to-[#e8f5e8] pb-24">
      <div className="sticky top-0 z-20 bg-[#154212]/95 backdrop-blur-md px-4 pt-4 pb-3 shadow-lg">
        <div className="flex items-center gap-2">
          <Plane className="text-[#bcf0ae]" size={22} />
          <h1 className="text-white text-lg font-semibold tracking-tight">Flight Tracker</h1>
        </div>
      </div>

      {message && (
        <div className="mx-4 mt-3 px-4 py-2.5 rounded-xl bg-[#154212] text-[#bcf0ae] text-sm font-medium shadow-lg animate-pulse">
          {message}
        </div>
      )}

      <div className="p-4 space-y-4">
        <Card title="Log Flight" icon={<Plane size={18} className="text-[#154212]" />}>
          <Field label="Flight Number">
            <input
              type="text"
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value)}
              placeholder="e.g. AI-302"
              className="w-full rounded-xl border border-[#bcf0ae] bg-white/70 px-3 py-2 text-sm focus:ring-2 focus:ring-[#154212] outline-none"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Departure Airport">
              <select
                value={departure}
                onChange={(e) => setDeparture(e.target.value)}
                className="w-full rounded-xl border border-[#bcf0ae] bg-white/70 px-3 py-2 text-sm focus:ring-2 focus:ring-[#154212] outline-none"
              >
                {airports.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} – {a.city}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Destination Airport">
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full rounded-xl border border-[#bcf0ae] bg-white/70 px-3 py-2 text-sm focus:ring-2 focus:ring-[#154212] outline-none"
              >
                {airports.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} – {a.city}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Departure Date">
              <input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="w-full rounded-xl border border-[#bcf0ae] bg-white/70 px-3 py-2 text-sm focus:ring-2 focus:ring-[#154212] outline-none"
              />
            </Field>
            <Field label="Passengers">
              <input
                type="number"
                value={passengers}
                onChange={(e) => setPassengers(e.target.value)}
                min={1}
                max={9}
                className="w-full rounded-xl border border-[#bcf0ae] bg-white/70 px-3 py-2 text-sm focus:ring-2 focus:ring-[#154212] outline-none"
              />
            </Field>
          </div>

          {departure !== destination && (
            <div className="p-3 rounded-xl bg-[#bcf0ae]/20 border border-[#bcf0ae] text-xs text-[#42493e] flex justify-between">
              <span>Route: {departure} → {destination}</span>
              <span className="font-medium">~{estimateFlightDistanceKm(departure, destination)} km</span>
            </div>
          )}

          {departure === destination && (
            <div className="p-3 rounded-xl bg-[#fee2e2] border border-[#fecaca] text-xs text-[#ba1a1a]">
              Departure and destination cannot be the same.
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={calc}
              disabled={departure === destination}
              className="flex-1 py-2.5 rounded-xl border border-[#154212]/20 text-[#154212] text-sm font-medium hover:bg-[#bcf0ae]/20 transition disabled:opacity-40"
            >
              Preview
            </button>
          </div>

          {preview && (
            <div className="p-4 rounded-xl bg-[#bcf0ae]/30 border border-[#bcf0ae] space-y-1">
              <div className="text-sm font-medium text-[#154212] text-center">
                Distance: {preview.distance} km
              </div>
              <div className="text-lg font-bold text-[#154212] text-center">
                {preview.kg} kg CO₂e
              </div>
              <div className="text-xs text-[#42493e] text-center">
                ({(preview.kg / pCount).toFixed(2)} kg per passenger, economy class)
              </div>
            </div>
          )}

          <button
            onClick={log}
            disabled={departure === destination}
            className="w-full py-3 mt-2 rounded-xl bg-[#154212] text-white font-semibold text-sm shadow-lg hover:bg-[#1a5a18] active:scale-[0.98] transition-all disabled:opacity-40"
          >
            Log Flight
          </button>
        </Card>

        {flightLogs.length > 0 && (
          <Card title="Recent Flights" icon={<Plane size={18} className="text-[#154212]" />}>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#42493e] text-xs border-b border-[#bcf0ae]/50">
                    <th className="text-left py-2 px-2 font-medium">Flight</th>
                    <th className="text-left py-2 px-2 font-medium">Route</th>
                    <th className="text-left py-2 px-2 font-medium">Date</th>
                    <th className="text-right py-2 px-2 font-medium">Pax</th>
                    <th className="text-right py-2 px-2 font-medium">km</th>
                    <th className="text-right py-2 px-2 font-medium">CO₂e</th>
                  </tr>
                </thead>
                <tbody>
                  {flightLogs.slice(0, 10).map((log) => (
                    <tr key={log.id} className="border-b border-[#bcf0ae]/30 text-[#154212]">
                      <td className="py-2 px-2 font-medium">{log.flightNumber}</td>
                      <td className="py-2 px-2">{log.departureAirport} → {log.destinationAirport}</td>
                      <td className="py-2 px-2 text-xs">{log.departureDate}</td>
                      <td className="py-2 px-2 text-right">{log.passengerCount}</td>
                      <td className="py-2 px-2 text-right">{log.distanceKm}</td>
                      <td className="py-2 px-2 text-right font-bold">{log.kgCo2e}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Card title="Eco Alternatives" icon={<Train size={18} className="text-[#154212]" />}>
          <p className="text-xs text-[#42493e] mb-3">
            Consider trains for shorter routes – up to 80% less carbon.
          </p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {trainAlternatives
              .filter(
                (t) =>
                  t.from === departure || t.to === destination || t.from === destination || t.to === departure
              )
              .map((t, i) => (
                <div key={i} className="p-3 rounded-xl bg-[#bcf0ae]/20 border border-[#bcf0ae]/50">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin size={12} className="text-[#154212]" />
                    <span className="text-xs font-medium text-[#154212]">
                      {t.from} → {t.to}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-[#154212]">{t.train}</div>
                  <div className="flex justify-between text-xs text-[#42493e] mt-1">
                    <span>{t.duration}</span>
                    <span>{t.distance}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Leaf size={10} className="text-green-600" />
                    <span className="text-xs text-green-700 font-medium">
                      Saves ~{Math.round(estimateFlightDistanceKm(t.from, t.to) * 0.255 * 0.8)} kg CO₂e vs flying
                    </span>
                  </div>
                </div>
              ))}
            {trainAlternatives.filter(
              (t) =>
                t.from === departure || t.to === destination || t.from === destination || t.to === departure
            ).length === 0 && (
              <div className="text-center text-xs text-[#42493e] py-4">
                Select a route above to see train alternatives.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-[#bcf0ae] shadow-[0_4px_30px_rgba(21,66,18,0.06)] p-5 space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-base font-semibold text-[#154212]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[#42493e]">{label}</label>
      {children}
    </div>
  );
}
