import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const categoryMap: Record<string, string> = {
  food_delivery: "food",
  grocery_delivery: "food",
  ride_booking: "transport",
  navigation_trip: "transport",
  food_waste: "food_waste",
  routine: "routine",
  electricity: "electricity",
  transport: "transport",
  flight: "flight",
  food: "food",
  shopping: "shopping"
};

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

  const body = await req.json();
  const { category: rawCategory, label, kg_co2e, source = "manual", occurred_at = new Date().toISOString(), metadata = {} } = body;

  if (!rawCategory || !label || typeof kg_co2e !== "number" || kg_co2e < 0) {
    return Response.json({ error: { code: "VALIDATION_ERROR", message: "category, label and non-negative kg_co2e are required." } }, { status: 422 });
  }

  const category = categoryMap[rawCategory] ?? rawCategory;

  const validCategories = ['electricity', 'transport', 'flight', 'food', 'food_waste', 'shopping', 'routine'];
  if (!validCategories.includes(category)) {
    return Response.json({ error: { code: "VALIDATION_ERROR", message: `Invalid category: ${rawCategory}. Valid categories: ${validCategories.join(", ")}` } }, { status: 422 });
  }

  const { data, error } = await supabase
    .from("carbon_entries")
    .insert({
      user_id: user.id,
      category,
      label,
      kg_co2e,
      source,
      occurred_at,
      metadata
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: { code: "INSERT_FAILED", message: error.message } }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
});
