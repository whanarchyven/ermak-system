export async function POST(request: Request): Promise<Response> {
  try {
    const { clientId, text } = await request.json();
    if (!clientId || !text) return new Response("Bad request", { status: 400 });
    const base = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!base) return new Response("Missing NEXT_PUBLIC_CONVEX_URL", { status: 500 });
    const res = await fetch(`${base}/api/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, text }),
    });
    const body = await res.text().catch(() => "");
    return new Response(body || "ok", { status: res.status });
  } catch (e: any) {
    return new Response(e?.message || "error", { status: 500 });
  }
}


