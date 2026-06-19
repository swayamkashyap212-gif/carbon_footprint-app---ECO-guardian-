import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authHeader } }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: { code: "UNAUTHORIZED", message: "Missing or invalid user session." } }, { status: 401 });
  }

  const { data: entries, error } = await supabase.from("carbon_entries").select("category,kg_co2e,occurred_at").eq("user_id", user.id).order("occurred_at", { ascending: false }).limit(90);

  if (error) {
    return Response.json({ error: { code: "QUERY_FAILED", message: error.message } }, { status: 500 });
  }

  const total = (entries ?? []).reduce((sum, entry) => sum + Number(entry.kg_co2e), 0);
  const dailyAverage = total / Math.max(entries?.length ?? 1, 1);
  const forecast7 = round(dailyAverage * 7 * 0.94);
  const forecast30 = round(dailyAverage * 30 * 0.9);
  const forecast90 = round(forecast30 * 3);
  const forecastAnnual = round(forecast30 * 12);
  const risk = forecast7 > 100 ? "high" : forecast7 > 60 ? "medium" : "low";
  const sustainabilityScore = Math.max(0, Math.min(100, Math.round(100 - dailyAverage * 2)));

  const payload = {
    user_id: user.id,
    model_version: "baseline-v1",
    forecast_7d_kg: forecast7,
    forecast_30d_kg: forecast30,
    forecast_90d_kg: forecast90,
    forecast_annual_kg: forecastAnnual,
    risk_level: risk,
    sustainability_score: sustainabilityScore,
    drivers: entries?.slice(0, 5) ?? []
  };

  const { data, error: insertError } = await supabase.from("prediction_logs").insert(payload).select().single();
  if (insertError) {
    return Response.json({ error: { code: "INSERT_FAILED", message: insertError.message } }, { status: 500 });
  }

  return Response.json(data);
});

function round(value: number) {
  return Math.round(value * 100) / 100;
}
