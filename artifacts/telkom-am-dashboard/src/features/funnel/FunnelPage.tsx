import React from "react";
import { useListFunnel } from "@workspace/api-client-react";
import { formatRupiah, cn } from "@/shared/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import { Target, AlertTriangle, Briefcase, Filter } from "lucide-react";

export default function FunnelVis() {
  const { data, isLoading } = useListFunnel();

  if (isLoading) return <div>Loading...</div>;
  if (!data) return <div>No data</div>;

  const achPercent = data.targetFullHo > 0 ? (data.realFullHo / data.targetFullHo) * 100 : 0;
  
  // Colors for bar chart
  const COLORS = ['#CC0000', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-primary to-primary/80 text-white rounded-2xl p-6 shadow-lg shadow-primary/20">
          <p className="text-primary-foreground/80 text-sm font-medium mb-1">Target Full HO</p>
          <h3 className="text-2xl font-display font-bold">{formatRupiah(data.targetFullHo)}</h3>
          <div className="mt-4 w-full bg-black/20 rounded-full h-2">
            <div className="bg-white h-2 rounded-full" style={{ width: `${Math.min(achPercent, 100)}%` }} />
          </div>
          <p className="text-right text-xs mt-1 font-bold">{achPercent.toFixed(1)}% Achieved</p>
        </div>
        
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Shortage Target</p>
              <h3 className="text-2xl font-display font-bold text-foreground">{formatRupiah(data.shortage)}</h3>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Nilai LOP</p>
              <h3 className="text-2xl font-display font-bold text-foreground">{formatRupiah(data.totalNilai)}</h3>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary text-foreground flex items-center justify-center shrink-0">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Jumlah LOP Aktif</p>
              <h3 className="text-2xl font-display font-bold text-foreground">{data.totalLop}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-1 bg-card rounded-2xl border border-border p-6 shadow-sm">
          <h3 className="text-lg font-bold font-display mb-6">LOP by Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byStatus} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="status" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.byStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pivot Table */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <h3 className="text-lg font-bold font-display">Status Funneling AM</h3>
            <button className="text-muted-foreground hover:text-primary transition-colors">
              <Filter className="w-5 h-5" />
            </button>
          </div>
          <div className="overflow-x-auto flex-1 p-0">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-secondary/50 text-muted-foreground font-medium sticky top-0">
                <tr>
                  <th className="px-6 py-4">Nama AM</th>
                  <th className="px-6 py-4 text-center">Total LOP</th>
                  <th className="px-6 py-4 text-right">Total Nilai</th>
                  <th className="px-6 py-4 text-right text-destructive">Shortage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.byAm.map((am, i) => (
                  <tr key={i} className="hover:bg-secondary/20">
                    <td className="px-6 py-4 font-semibold text-foreground">{am.namaAm}</td>
                    <td className="px-6 py-4 text-center font-medium bg-secondary/10">{am.totalLop}</td>
                    <td className="px-6 py-4 text-right text-muted-foreground">{formatRupiah(am.totalNilai)}</td>
                    <td className="px-6 py-4 text-right font-bold text-destructive">{formatRupiah(am.shortage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
