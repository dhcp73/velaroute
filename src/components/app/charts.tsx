"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

const AXIS = { fontSize: 11, fill: "var(--faint)" };
const TIP = { contentStyle: { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 12, color: "var(--ink)" }, labelStyle: { color: "var(--muted)" } };

export function VolumeChart({ data }: { data: { day: string; leads: number; booked: number; blocked: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ left: -18, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#985a30" stopOpacity={0.35} /><stop offset="1" stopColor="#985a30" stopOpacity={0} /></linearGradient>
          <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5c7964" stopOpacity={0.35} /><stop offset="1" stopColor="#5c7964" stopOpacity={0} /></linearGradient>
        </defs>
        <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip {...TIP} />
        <Area type="monotone" dataKey="leads" name="Leads" stroke="#985a30" strokeWidth={2} fill="url(#gl)" />
        <Area type="monotone" dataKey="booked" name="Booked" stroke="#5c7964" strokeWidth={2} fill="url(#gb)" />
        <Area type="monotone" dataKey="blocked" name="Blocked" stroke="#fb7185" strokeWidth={1.5} fill="transparent" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function FairnessChart({ data }: { data: { name: string; leads: number; expected: number; color: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ left: -18, right: 8, top: 8 }}>
        <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip {...TIP} cursor={{ fill: "var(--surface-2)" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="leads" name="Routed" radius={[6, 6, 0, 0]}>{data.map((d) => <Cell key={d.name} fill={d.color} />)}</Bar>
        <Bar dataKey="expected" name="Expected by weight" fill="var(--line)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SpeedChart({ data }: { data: { name: string; medianMinutes: number; color: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 8 }}>
        <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} unit="m" />
        <YAxis type="category" dataKey="name" tick={AXIS} axisLine={false} tickLine={false} width={64} />
        <Tooltip {...TIP} cursor={{ fill: "var(--surface-2)" }} formatter={(v) => [`${v} min`, "Median first touch"]} />
        <Bar dataKey="medianMinutes" radius={[0, 6, 6, 0]}>{data.map((d) => <Cell key={d.name} fill={d.color} />)}</Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const PIE = ["#985a30", "#787b70", "#5c7964", "#b69c6e", "#595b54"];
export function SourceChart({ data }: { data: { source: string; leads: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="leads" nameKey="source" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="none">
          {data.map((d, i) => <Cell key={d.source} fill={PIE[i % PIE.length]} />)}
        </Pie>
        <Tooltip {...TIP} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function FunnelBars({ data }: { data: { stage: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="flex flex-col gap-2.5">
      {data.map((d) => (
        <li key={d.stage} className="grid grid-cols-[110px_1fr_44px] items-center gap-3 text-sm">
          <span className="truncate text-muted">{d.stage}</span>
          <span className="h-3 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: "#985a30" }} /></span>
          <span className="text-right font-medium tabular-nums">{d.value}</span>
        </li>
      ))}
    </ul>
  );
}
