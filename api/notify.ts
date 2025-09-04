// api/notify.ts

export const config = { runtime: 'nodejs20.x' }
import type { VercelRequest, VercelResponse } from '@vercel/node';

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    if (!SLACK_WEBHOOK_URL) return res.status(500).json({ error: "Webhook not configured" });

    const { ad_id, severity, breaches } = req.body ?? {};
    const text = `⚠️ *${severity?.toUpperCase() || "ALERT"}* for ad \`${ad_id}\`\nBreaches: \`${JSON.stringify(breaches)}\``;

    const r = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    if (!r.ok) {
      const t = await r.text();
      return res.status(502).json({ error: "Webhook failed", detail: t });
    }

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}




