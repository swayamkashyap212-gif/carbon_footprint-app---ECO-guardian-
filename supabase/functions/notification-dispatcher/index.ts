import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const { data: alerts } = await supabase.from("alerts").select("id,user_id,title,body").is("read_at", null).limit(100);

  if (alerts?.length) {
    const ids = alerts.map((a) => a.id);
    await supabase.from("alerts").update({ read_at: new Date().toISOString() }).in("id", ids);
  }

  return Response.json({
    dispatched: alerts?.length ?? 0,
    note: "Connect this function to FCM HTTP v1 with per-user device_tokens for production delivery."
  });
});
