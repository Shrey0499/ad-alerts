// api/analyze.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const MODEL = process.env.MODEL_ID || "gpt-4o-mini"; // choose an available model in GitHub Models
const BASE = process.env.GITHUB_MODELS_BASE || "https://models.github.ai/inference";
const TOKEN = process.env.GITHUB_MODELS_TOKEN!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { ad, metrics, thresholds, bucket } = req.body ?? {};
    if (!ad || !metrics || !thresholds || !bucket) {
      return res.status(400).json({ error: "Missing body fields ad|metrics|thresholds|bucket" });
    }

    const system = "You are a pragmatic performance marketing analyst. Be concise, numeric, action-oriented.";
    const user = `
Context:
- Time bucket: ${bucket}
- Thresholds: ${JSON.stringify(thresholds)}
- Recent metrics (newest first, up to 30): ${JSON.stringify(metrics)}

Tasks:
1) Identify metric breaches and since when.
2) Explain likely drivers (e.g., CPM spikes, creative fatigue).
3) Recommend next steps with expected impact.
4) Output JSON with: { "summary": string, "bullets": string[], "chartNotes": string[], "breaches": string[], "nextActions": string[] }.
Return plain text THEN a JSON block.
`;

    const ghResp = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: 0.3,
        max_tokens: 700
      })
    });

    if (!ghResp.ok) {
      const txt = await ghResp.text();
      return res.status(502).json({ error: "GitHub Models API failed", detail: txt });
    }

    const data = await ghResp.json();
    const content = data?.choices?.[0]?.message?.content || "";

    return res.status(200).json({ ok: true, content });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Server error" });
  }
}
