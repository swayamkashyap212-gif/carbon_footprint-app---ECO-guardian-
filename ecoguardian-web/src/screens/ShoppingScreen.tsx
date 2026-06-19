import { useState, useMemo } from "react";
import { ShoppingCart, Package, BarChart3 } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { calculateShoppingCarbonAdvanced } from "../services/carbonEngine";
import type { ShoppingCategory, DeliveryType } from "../types/domain";

const categories: ShoppingCategory[] = [
  "electronics", "fashion", "grocery", "food", "home_appliances",
  "personal_care", "medicine", "books", "furniture", "sports", "beauty",
];

const categoryLabels: Record<ShoppingCategory, string> = {
  electronics: "Electronics",
  fashion: "Fashion",
  grocery: "Grocery",
  food: "Food",
  home_appliances: "Home Appliances",
  personal_care: "Personal Care",
  medicine: "Medicine",
  books: "Books",
  furniture: "Furniture",
  sports: "Sports",
  beauty: "Beauty",
};

const vendorPlatforms = ["amazon", "flipkart", "blinkit", "other"] as const;
const deliveryTypes: { key: DeliveryType; label: string }[] = [
  { key: "standard", label: "Standard" },
  { key: "express", label: "Express" },
  { key: "grouped", label: "Grouped" },
  { key: "pickup", label: "Pickup" },
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function ShoppingScreen() {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState<ShoppingCategory>("electronics");
  const [vendor, setVendor] = useState<string>("amazon");
  const [quantity, setQuantity] = useState("1");
  const [orderValue, setOrderValue] = useState("");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("standard");
  const [preview, setPreview] = useState<{
    manufacturing: number;
    packaging: number;
    delivery: number;
    total: number;
  } | null>(null);
  const [message, setMessage] = useState("");

  const addShoppingLog = useAppStore((s) => s.addShoppingLog);
  const addEntry = useAppStore((s) => s.addEntry);
  const shoppingLogs = useAppStore((s) => s.shoppingLogs);

  function flash(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  }

  const analytics = useMemo(() => {
    if (shoppingLogs.length === 0) return null;
    const totalCarbon = shoppingLogs.reduce((s, l) => s + l.totalKgCo2e, 0);
    const avgPerOrder = totalCarbon / shoppingLogs.length;
    const byCategory: Record<string, { count: number; kg: number }> = {};
    for (const log of shoppingLogs) {
      const cat = log.category;
      if (!byCategory[cat]) byCategory[cat] = { count: 0, kg: 0 };
      byCategory[cat].count++;
      byCategory[cat].kg += log.totalKgCo2e;
    }
    return { totalCarbon, avgPerOrder, byCategory };
  }, [shoppingLogs]);

  function calc() {
    const q = parseInt(quantity) || 1;
    const result = calculateShoppingCarbonAdvanced(category, q, deliveryType);
    setPreview({
      manufacturing: result.manufacturingKg,
      packaging: result.packagingKg,
      delivery: result.deliveryKg,
      total: result.totalKgCo2e,
    });
  }

  function log() {
    const q = parseInt(quantity) || 1;
    const v = parseFloat(orderValue) || 0;
    const result = calculateShoppingCarbonAdvanced(category, q, deliveryType);
    const now = new Date().toISOString();
    addShoppingLog({
      id: uid(),
      vendor: vendor as "amazon" | "flipkart" | "blinkit" | "other",
      productName: productName || "Unknown Product",
      category,
      quantity: q,
      deliveryType,
      orderValue: v,
      manufacturingKg: result.manufacturingKg,
      packagingKg: result.packagingKg,
      deliveryKg: result.deliveryKg,
      totalKgCo2e: result.totalKgCo2e,
      source: "manual",
      confidence: 1,
    });
    addEntry({
      id: uid(),
      category: "shopping",
      label: `Shopping – ${productName || categoryLabels[category]}`,
      kgCo2e: result.totalKgCo2e,
      source: "manual",
      occurredAt: now,
    });
    flash(`Logged ${result.totalKgCo2e} kg CO₂e for shopping`);
    setProductName("");
    setQuantity("1");
    setOrderValue("");
    setPreview(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0faf0] to-[#e8f5e8] pb-24">
      <div className="sticky top-0 z-20 bg-[#154212]/95 backdrop-blur-md px-4 pt-4 pb-3 shadow-lg">
        <div className="flex items-center gap-2">
          <ShoppingCart className="text-[#bcf0ae]" size={22} />
          <h1 className="text-white text-lg font-semibold tracking-tight">Shopping Tracker</h1>
        </div>
      </div>

      {message && (
        <div className="mx-4 mt-3 px-4 py-2.5 rounded-xl bg-[#154212] text-[#bcf0ae] text-sm font-medium shadow-lg animate-pulse">
          {message}
        </div>
      )}

      <div className="p-4 space-y-4">
        <Card title="Log Shopping" icon={<Package size={18} className="text-[#154212]" />}>
          <Field label="Product Name">
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Product name"
              className="w-full rounded-xl border border-[#bcf0ae] bg-white/70 px-3 py-2 text-sm focus:ring-2 focus:ring-[#154212] outline-none"
            />
          </Field>
          <Field label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ShoppingCategory)}
              className="w-full rounded-xl border border-[#bcf0ae] bg-white/70 px-3 py-2 text-sm focus:ring-2 focus:ring-[#154212] outline-none"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {categoryLabels[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Vendor / Platform">
            <div className="flex flex-wrap gap-2">
              {vendorPlatforms.map((v) => (
                <Chip key={v} label={v} selected={vendor === v} onClick={() => setVendor(v)} />
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity">
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min={1}
                className="w-full rounded-xl border border-[#bcf0ae] bg-white/70 px-3 py-2 text-sm focus:ring-2 focus:ring-[#154212] outline-none"
              />
            </Field>
            <Field label="Order Value (₹)">
              <input
                type="number"
                value={orderValue}
                onChange={(e) => setOrderValue(e.target.value)}
                min={0}
                placeholder="0"
                className="w-full rounded-xl border border-[#bcf0ae] bg-white/70 px-3 py-2 text-sm focus:ring-2 focus:ring-[#154212] outline-none"
              />
            </Field>
          </div>
          <Field label="Delivery Type">
            <div className="flex flex-wrap gap-2">
              {deliveryTypes.map((d) => (
                <Chip key={d.key} label={d.label} selected={deliveryType === d.key} onClick={() => setDeliveryType(d.key)} />
              ))}
            </div>
          </Field>

          <div className="flex gap-2 pt-1">
            <button
              onClick={calc}
              className="flex-1 py-2.5 rounded-xl border border-[#154212]/20 text-[#154212] text-sm font-medium hover:bg-[#bcf0ae]/20 transition"
            >
              Preview
            </button>
          </div>

          {preview && (
            <div className="p-4 rounded-xl bg-[#bcf0ae]/30 border border-[#bcf0ae] space-y-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-xs text-[#42493e]">Manufacturing</div>
                  <div className="text-sm font-bold text-[#154212]">{preview.manufacturing} kg</div>
                </div>
                <div>
                  <div className="text-xs text-[#42493e]">Packaging</div>
                  <div className="text-sm font-bold text-[#154212]">{preview.packaging} kg</div>
                </div>
                <div>
                  <div className="text-xs text-[#42493e]">Delivery</div>
                  <div className="text-sm font-bold text-[#154212]">{preview.delivery} kg</div>
                </div>
              </div>
              <div className="text-center pt-2 border-t border-[#bcf0ae]">
                <div className="text-xs text-[#42493e]">Total Carbon Footprint</div>
                <div className="text-xl font-bold text-[#154212]">{preview.total} kg CO₂e</div>
              </div>
            </div>
          )}

          <button
            onClick={log}
            className="w-full py-3 mt-2 rounded-xl bg-[#154212] text-white font-semibold text-sm shadow-lg hover:bg-[#1a5a18] active:scale-[0.98] transition-all"
          >
            Calculate & Log
          </button>
        </Card>

        {shoppingLogs.length > 0 && (
          <Card title="Recent Shopping" icon={<Package size={18} className="text-[#154212]" />}>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#42493e] text-xs border-b border-[#bcf0ae]/50">
                    <th className="text-left py-2 px-2 font-medium">Product</th>
                    <th className="text-left py-2 px-2 font-medium">Category</th>
                    <th className="text-left py-2 px-2 font-medium">Vendor</th>
                    <th className="text-right py-2 px-2 font-medium">Qty</th>
                    <th className="text-left py-2 px-2 font-medium">Delivery</th>
                    <th className="text-right py-2 px-2 font-medium">CO₂e</th>
                  </tr>
                </thead>
                <tbody>
                  {shoppingLogs.slice(0, 10).map((log) => (
                    <tr key={log.id} className="border-b border-[#bcf0ae]/30 text-[#154212]">
                      <td className="py-2 px-2 font-medium truncate max-w-[120px]">{log.productName}</td>
                      <td className="py-2 px-2 text-xs">{categoryLabels[log.category]}</td>
                      <td className="py-2 px-2 capitalize">{log.vendor}</td>
                      <td className="py-2 px-2 text-right">{log.quantity}</td>
                      <td className="py-2 px-2 capitalize">{log.deliveryType}</td>
                      <td className="py-2 px-2 text-right font-bold">{log.totalKgCo2e}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {analytics && (
          <Card title="Shopping Analytics" icon={<BarChart3 size={18} className="text-[#154212]" />}>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-[#bcf0ae]/30 border border-[#bcf0ae] text-center">
                <div className="text-xs text-[#42493e]">Total Carbon</div>
                <div className="text-lg font-bold text-[#154212]">{analytics.totalCarbon.toFixed(2)} kg</div>
              </div>
              <div className="p-3 rounded-xl bg-[#bcf0ae]/30 border border-[#bcf0ae] text-center">
                <div className="text-xs text-[#42493e]">Avg per Order</div>
                <div className="text-lg font-bold text-[#154212]">{analytics.avgPerOrder.toFixed(2)} kg</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-[#42493e]">Breakdown by Category</div>
              {Object.entries(analytics.byCategory)
                .sort((a, b) => b[1].kg - a[1].kg)
                .map(([cat, data]) => (
                  <div key={cat} className="flex items-center justify-between p-2 rounded-lg bg-white/50">
                    <span className="text-sm text-[#154212]">{categoryLabels[cat as ShoppingCategory] || cat}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#42493e]">{data.count} orders</span>
                      <span className="text-sm font-bold text-[#154212]">{data.kg.toFixed(2)} kg</span>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        )}
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

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border
        ${
          selected
            ? "bg-[#154212] text-white border-[#154212] shadow-md"
            : "bg-white/60 text-[#42493e] border-[#bcf0ae] hover:bg-[#bcf0ae]/30"
        }`}
    >
      {label}
    </button>
  );
}
