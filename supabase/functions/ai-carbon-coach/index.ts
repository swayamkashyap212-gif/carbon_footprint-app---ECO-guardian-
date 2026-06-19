import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { messages = [], profile = {}, recentEntries = [] } = await req.json();
  const apiKey = Deno.env.get("OPENAI_API_KEY");

  if (!apiKey) {
    return Response.json({
      role: "assistant",
      content: "Your fastest carbon win is to replace one short vehicle trip with metro, walking, or cycling and group quick-commerce orders into one delivery window."
    });
  }

  const system: Message = {
    role: "system",
    content:
      "You are EcoGuardian AI, a concise sustainability coach. Give personalized, measurable carbon reduction actions. Include kg CO2e savings when possible. Avoid medical, legal, or financial certainty."
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        system,
        {
          role: "system",
          content: `User profile: ${JSON.stringify(profile)}. Recent carbon entries: ${JSON.stringify(recentEntries)}.`
        },
        ...messages
      ],
      temperature: 0.4,
      max_tokens: 450
    })
  });

  if (!response.ok) {
    return Response.json({ role: "assistant", content: "I could not reach the AI service. Try a route, food, or electricity habit swap today and I will quantify it once service returns." }, { status: 200 });
  }

  const data = await response.json();
  return Response.json({
    role: "assistant",
    content: data.choices?.[0]?.message?.content ?? "Start with your largest category this week and make one low-friction swap today."
  });
});
