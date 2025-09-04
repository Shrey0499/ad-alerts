import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function MetricCard({ rows }: { rows: any[] }) {
  const [thresholds, setThresholds] = useState<Record<string, number>>({});
  const latest = rows[0];

  useEffect(() => {
    (async () => {
      const adId = latest?.ad_id;
      if (!adId) return;
      const { data } = await supabase.from("thresholds")
        .select("*").eq("ad_id", adId).order("id", { ascending:false }).limit(1);
      const t = data?.[0];
      if (!t) return;
      setThresholds({
        min_unique_reach: t.min_unique_reach ?? Infinity,
        min_impressions:  t.min_impressions  ?? Infinity,
        min_ctr:          t.min_ctr          ?? Infinity,
        min_vcr:          t.min_vcr          ?? Infinity,
        max_cpm:          t.max_cpm          ?? -Infinity
      } as any);
    })();
  }, [latest?.ad_id]);

  const warn = (v:number|null|undefined, cmp:(x:number)=>boolean)=> v!=null && cmp(v);
  const warnings = latest ? {
    unique_reach: warn(latest.unique_reach, v=>v < (thresholds.min_unique_reach ?? -Infinity)),
    impressions:  warn(latest.impressions,  v=>v < (thresholds.min_impressions  ?? -Infinity)),
    ctr:          warn(latest.ctr,          v=>v < (thresholds.min_ctr          ?? -Infinity)),
    vcr:          warn(latest.vcr,          v=>v < (thresholds.min_vcr          ?? -Infinity)),
    cpm:          warn(latest.cpm,          v=>v > (thresholds.max_cpm          ??  Infinity))
  } : {};

  return (
    <div className="grid grid-cols-5 gap-3">
      {["unique_reach","impressions","ctr","vcr","cpm"].map((k)=>(
        <div key={k} className={`rounded border p-3 ${warnings[k as keyof typeof warnings] ? "border-amber-500 bg-amber-50" : "border-gray-200"}`}>
          <div className="text-sm uppercase">{k.replace("_"," ")}</div>
          <div className="text-2xl font-semibold">
            {latest ? (k==="ctr"||k==="vcr" ? ((latest[k]*100).toFixed(2)+"%") : latest[k]) : "—"}
          </div>
          {warnings[k as keyof typeof warnings] && <div className="text-amber-700 text-xs mt-1">Warning: threshold breached</div>}
        </div>
      ))}
    </div>
  );
}
