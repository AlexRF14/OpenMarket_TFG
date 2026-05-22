import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import * as XLSX from 'xlsx';
import { useAuth } from '../../state/auth';
import { getDashboard, type DashboardData } from '../../lib/operaciones-api';
import { categoriaLabel } from '../../lib/api-types';

const COLORS = ['#C4704A', '#6A8F6A', '#4A7A9B', '#8B6BAE', '#D4A843', '#4AABB5'];

const PRESETS: Array<{ label: string; days: number | null }> = [
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
  { label: '365 días', days: 365 },
  { label: 'Todo', days: null },
];

function fmt(v: string | number, currency = 'EUR') {
  return `${parseFloat(String(v)).toFixed(2)} ${currency}`;
}

function toYYYYMMDD(d: Date) {
  return d.toISOString().slice(0, 10);
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white border border-ink/10 p-5">
      <div className="text-[11.5px] uppercase tracking-wider text-ink/50 font-medium mb-2">{label}</div>
      <div className="font-display text-[28px] tracking-tight leading-none">{value}</div>
      {sub && <div className="text-[12px] text-ink/50 mt-1">{sub}</div>}
    </div>
  );
}

function exportToExcel(data: DashboardData) {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Métrica', 'Valor'],
    ['Período', `${data.period.from} → ${data.period.to}`],
    ['Total ventas', data.kpis.totalVentas],
    ['Total unidades', data.kpis.totalUnidades],
    ['Total ingresos (EUR)', data.kpis.totalIngresos],
    ['Ticket medio (EUR)', data.kpis.avgTicket],
  ]), 'KPIs');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    data.porTipo.map((r) => ({ Tipo: r.tipo, Ventas: r.ventas, Unidades: r.unidades, 'Ingresos (EUR)': r.ingresos }))
  ), 'Por tipo');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    data.porCategoria.map((r) => ({ Categoría: categoriaLabel(r.categoria as never), Ventas: r.ventas, Unidades: r.unidades, 'Ingresos (EUR)': r.ingresos }))
  ), 'Por categoría');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    data.evolucionMensual.map((r) => ({ Mes: r.mes, Ventas: r.ventas, 'Ingresos (EUR)': r.ingresos }))
  ), 'Evolución mensual');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    data.topOperaciones.map((r) => ({ Título: r.titulo, Tipo: r.tipo, Ventas: r.ventas, Unidades: r.unidades, 'Ingresos (EUR)': r.ingresos }))
  ), 'Top operaciones');

  XLSX.writeFile(wb, `cuadro-mandos-${data.period.from}-${data.period.to}.xlsx`);
}

export default function CuadroMandos() {
  const { account } = useAuth();
  if (account && account !== 'empresa') return <Navigate to="/app" replace />;

  const today = toYYYYMMDD(new Date());
  const [preset, setPreset] = useState<number | null>(30);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolvedFrom = preset !== null
    ? toYYYYMMDD(new Date(Date.now() - preset * 24 * 60 * 60 * 1000))
    : customFrom || undefined;
  const resolvedTo = preset !== null ? today : (customTo || today);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDashboard(resolvedFrom, resolvedTo)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError('No se pudieron cargar los datos.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [resolvedFrom, resolvedTo]);

  const isEmpty = !loading && !error && data && data.kpis.totalVentas === 0;

  return (
    <div className="px-8 py-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="text-[13px] text-ink/55">Vista empresa</div>
          <h1 className="font-display text-[34px] tracking-tight mt-0.5">Cuadro de Mandos</h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Presets */}
          <div className="flex gap-1 bg-white border border-ink/10 rounded-xl p-1">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => { setPreset(p.days); setCustomFrom(''); setCustomTo(''); }}
                className={`h-8 px-3 rounded-lg text-[13px] font-medium transition ${preset === p.days ? 'bg-terracotta-500 text-cream' : 'text-ink/70 hover:bg-ink/5'}`}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => setPreset(-1)}
              className={`h-8 px-3 rounded-lg text-[13px] font-medium transition ${preset === -1 ? 'bg-terracotta-500 text-cream' : 'text-ink/70 hover:bg-ink/5'}`}
            >
              Personalizado
            </button>
          </div>

          {/* Custom date inputs */}
          {preset === -1 && (
            <div className="flex items-center gap-2">
              <input type="date" value={customFrom} max={customTo || today} onChange={(e) => setCustomFrom(e.target.value)}
                className="h-9 px-3 rounded-lg border border-ink/10 text-[13px] outline-none focus:border-terracotta-500" />
              <span className="text-ink/40 text-[13px]">→</span>
              <input type="date" value={customTo} min={customFrom} max={today} onChange={(e) => setCustomTo(e.target.value)}
                className="h-9 px-3 rounded-lg border border-ink/10 text-[13px] outline-none focus:border-terracotta-500" />
            </div>
          )}

          {data && !isEmpty && (
            <button
              onClick={() => exportToExcel(data)}
              className="h-9 px-4 rounded-xl bg-white border border-ink/10 text-[13px] font-medium hover:border-ink/30 transition flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Exportar XLSX
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="py-20 text-center text-ink/50 text-[14px]">Cargando datos…</div>
      )}

      {error && (
        <div className="rounded-2xl bg-terracotta-50 border border-terracotta-200 text-terracotta-700 px-5 py-4 text-[13.5px]">{error}</div>
      )}

      {isEmpty && (
        <div className="rounded-2xl bg-white border border-ink/10 p-12 text-center">
          <div className="text-[40px] mb-3">📊</div>
          <h2 className="font-display text-[20px] mb-2">Sin datos en este período</h2>
          <p className="text-[14px] text-ink/60 max-w-sm mx-auto">
            No hay ventas confirmadas en el intervalo seleccionado. Amplía el rango de fechas o espera a que se realicen operaciones.
          </p>
        </div>
      )}

      {data && !isEmpty && !loading && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <KpiCard label="Ventas totales" value={String(data.kpis.totalVentas)} sub="transacciones confirmadas" />
            <KpiCard label="Unidades vendidas" value={String(data.kpis.totalUnidades)} />
            <KpiCard label="Ingresos brutos" value={fmt(data.kpis.totalIngresos)} />
            <KpiCard label="Ticket medio" value={fmt(data.kpis.avgTicket)} sub="por venta" />
          </div>

          {/* Row 1: Evolución mensual + Por tipo */}
          <div className="grid grid-cols-[2fr_1fr] gap-5 mb-5">
            {data.evolucionMensual.length > 0 && (
              <div className="rounded-2xl bg-white border border-ink/10 p-5">
                <div className="text-[11.5px] uppercase tracking-wider text-ink/50 font-medium mb-4">Evolución mensual de ingresos</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.evolucionMensual.map((r) => ({ ...r, ingresos: parseFloat(r.ingresos) }))} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d8" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${Number(v).toFixed(2)} EUR`, 'Ingresos']} />
                    <Line type="monotone" dataKey="ingresos" stroke="#C4704A" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {data.porTipo.length > 0 && (
              <div className="rounded-2xl bg-white border border-ink/10 p-5">
                <div className="text-[11.5px] uppercase tracking-wider text-ink/50 font-medium mb-4">Ventas por tipo</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.porTipo.map((r) => ({ ...r, ingresos: parseFloat(r.ingresos) }))} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d8" />
                    <XAxis dataKey="tipo" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="ventas" name="Ventas" fill="#C4704A" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="unidades" name="Unidades" fill="#6A8F6A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Row 2: Por categoría (pie) + Top operaciones */}
          <div className="grid grid-cols-[1fr_2fr] gap-5 mb-5">
            {data.porCategoria.length > 0 && (
              <div className="rounded-2xl bg-white border border-ink/10 p-5">
                <div className="text-[11.5px] uppercase tracking-wider text-ink/50 font-medium mb-4">Distribución por categoría</div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data.porCategoria.map((r) => ({ name: categoriaLabel(r.categoria as never), value: parseFloat(r.ingresos) }))}
                      cx="50%" cy="50%" outerRadius={80} dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {data.porCategoria.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`${Number(v).toFixed(2)} EUR`]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {data.topOperaciones.length > 0 && (
              <div className="rounded-2xl bg-white border border-ink/10 p-5">
                <div className="text-[11.5px] uppercase tracking-wider text-ink/50 font-medium mb-3">Top operaciones por ingresos</div>
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-ink/[.08]">
                      <th className="text-left font-medium text-ink/60 pb-2">Operación</th>
                      <th className="text-right font-medium text-ink/60 pb-2">Ventas</th>
                      <th className="text-right font-medium text-ink/60 pb-2">Unidades</th>
                      <th className="text-right font-medium text-ink/60 pb-2">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topOperaciones.map((op, i) => (
                      <tr key={op.id} className="border-b border-ink/[.06] last:border-0">
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-ink/40 w-4 shrink-0">{i + 1}.</span>
                            <span className="truncate max-w-[200px]">{op.titulo}</span>
                            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-ink/[.06] text-ink/50 capitalize">{op.tipo}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-right tabular-nums">{op.ventas}</td>
                        <td className="py-2.5 text-right tabular-nums">{op.unidades}</td>
                        <td className="py-2.5 text-right tabular-nums font-medium">{fmt(op.ingresos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
