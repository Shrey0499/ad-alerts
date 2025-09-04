import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { format } from "date-fns";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { MetricCard } from "./MetricCard";
import { ChartsPanel } from "./ChartsPanel";
import { postJSON } from "../lib/api";

type MetricRow = {
  id: number; ad_id: string; ts: string; time_bucket: "daily"|"weekly"|"monthly"|"hourly";
  unique_reach: number|null; impressions: number|null;
  ctr: number|null; vcr: number|null; cpm: number|null;
};

export default function Dashboard() {
  const [rows, setRows] = useState<MetricRow[]>([]);
  const [bucket, setBucket] = useState<"daily"|"weekly"|"monthly">("daily");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedAd, setSelectedAd] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ad_metrics").select("*")
        .eq("time_bucket", bucket)
        .order("ts", { ascending: false })
        .limit(500);
      setRows(data || []);
    })();
  }, [bucket]);

  useEffect(() => {
    const ch = supabase
      .channel("alerts_rt")
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"alerts" },
        (payload) => {
          setAlerts(a => [payload.new, ...a]);
          // fire serverless notify (optional)
          postJSON("/api/notify", {
            ad_id: payload.new.ad_id,
            severity: payload.new.severity,
            breaches: payload.new.breaches
          }).catch(()=>{});
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const cols = useMemo(() => ([
    { field:"ad_id", headerName:"Ad", filter: true },
    { field:"ts", headerName:"Time", valueFormatter:(p:any)=>format(new Date(p.value),"yyyy-MM-dd HH:mm") },
    { field:"time_bucket", headerName:"Bucket" },
    { field:"unique_reach" },
    { field:"impressions" },
    { field:"ctr", valueFormatter:(p:any)=>p.value!=null?(p.value*100).toFixed(2)+"%":"" },
    { field:"vcr", valueFormatter:(p:any)=>p.value!=null?(p.value*100).toFixed(1)+"%":"" },
    { field:"cpm", valueFormatter:(p:any)=>p.value!=null?"$"+p.value.toFixed(2):"" }
  ]), []);

  const runAnalysis = async () => {
    if (!selectedAd) return;
    const adRows = rows.filter(r => r.ad_id === selectedAd).slice(0, 30);
    if (!adRows.length) return;

    const { data: t } = await supabase.from("thresholds")
      .select("*").eq("ad_id", selectedAd).order("id", { ascending:false }).limit(1);
    const thresholds = t?.[0] ?? {};

    const body = {
      ad: { id: selectedAd },
      metrics: adRows,
      thresholds,
      bucket
    };

    const resp = await postJSON<{ ok: boolean; content: string }>("/api/analyze", body);
    setAnalysis(resp.content);
  };

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Ad Performance</h1>
        <select value={bucket} onChange={e=>setBucket(e.target.value as any)}>
          <option value="daily">Weekly view (daily)</option>
          <option value="weekly">Monthly view (weekly)</option>
          <option value="monthly">Yearly view (monthly)</option>
        </select>
        <select value={selectedAd ?? ""} onChange={e=>setSelectedAd(e.target.value || null)}>
          <option value="">Select Ad</option>
          {Array.from(new Set(rows.map(r=>r.ad_id))).map(id=><option key={id} value={id}>{id}</option>)}
        </select>
        <button onClick={runAnalysis} className="ml-auto px-3 py-2 border rounded">Detailed analysis</button>
        <span className="ml-3">{alerts[0] ? "New alert!" : "No new alerts"}</span>
      </header>

      <MetricCard rows={rows.filter(r => !selectedAd || r.ad_id === selectedAd)} />

      <div className="ag-theme-quartz" style={{ height: 420 }}>
        <AgGridReact
          rowData={rows}
          columnDefs={cols}
          rowSelection="single"
          enableRangeSelection={true}
          pivotPanelShow="always"
          onRowClicked={(e)=>setSelectedAd(e.data.ad_id)}
        />
      </div>

      <ChartsPanel rows={rows.filter(r => !selectedAd || r.ad_id === selectedAd)} />

      {analysis && (
        <div className="border rounded p-3 whitespace-pre-wrap">
          {analysis}
        </div>
      )}
    </div>
  );
}
