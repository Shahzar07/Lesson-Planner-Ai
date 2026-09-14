import { CATALOGUE, chainFor } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reports whether the key is present and which chain is configured. */
export async function GET() {
  const key = process.env.OPENROUTER_API_KEY;
  return Response.json({
    keyConfigured: Boolean(key),
    keyPreview: key ? `${key.slice(0, 12)}…${key.slice(-4)}` : null,
    chains: { en: chainFor("en"), ur: chainFor("ur") },
    catalogue: CATALOGUE,
  });
}
