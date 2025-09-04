import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

export function ChartsPanel({ rows }: { rows:any[] }) {
  const data = rows.slice().reverse().map(r => ({
    ts: new Date(r.ts).toLocaleDateString(),
    CTR: r.ctr != null ? Number((r.ctr*100).toFixed(2)) : null,
    VCR: r.vcr != null ? Number((r.vcr*100).toFixed(2)) : null,
    CPM: r.cpm
  }));
  return (
    <div style={{height: 320}}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="ts" /><YAxis />
          <Tooltip /><Legend />
          <Line type="monotone" dataKey="CTR" />
          <Line type="monotone" dataKey="VCR" />
          <Line type="monotone" dataKey="CPM" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
