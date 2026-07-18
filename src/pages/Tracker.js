import React, { useState, useEffect, useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend } from 'chart.js'
import { getTransactions, getExcludedFromAverage, saveExcludedFromAverage } from '../lib/supabase'
import {
  computeTracker, lastNMonthKeys, nextNMonthKeys, formatMonthShort,
  formatCurrency, formatCurrencyFull,
} from '../lib/finance'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend)

const BUCKETS = [
  { key: 'A', label: 'A — Fixed', color: '#378ADD' },
  { key: 'B', label: 'B — Essential-ish', color: '#1D9E75' },
  { key: 'C', label: 'C — Discretionary', color: '#BA7517' },
]
const WINDOW = 12   // months of history for the trailing average
const HORIZON = 12  // months projected forward

export default function Tracker() {
  const [transactions, setTransactions] = useState([])
  const [excluded, setExcluded] = useState([])
  const [loading, setLoading] = useState(true)
  const [openCat, setOpenCat] = useState(null)

  const pastMonths = useMemo(() => lastNMonthKeys(WINDOW), [])
  const futureMonths = useMemo(() => nextNMonthKeys(HORIZON, pastMonths[pastMonths.length - 1]), [pastMonths])

  useEffect(() => {
    const from = `${pastMonths[0]}-01`
    const last = pastMonths[pastMonths.length - 1]
    const [ly, lm] = last.split('-').map(Number)
    const to = `${last}-${String(new Date(ly, lm, 0).getDate()).padStart(2, '0')}`
    Promise.all([getTransactions(from, to), getExcludedFromAverage().catch(() => [])])
      .then(([txs, ex]) => { setTransactions(txs || []); setExcluded(ex || []) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [pastMonths])

  const excludedSet = useMemo(() => new Set(excluded), [excluded])
  const { series, categories, bucketAvg, monthsWithData } = useMemo(
    () => computeTracker(transactions, pastMonths, excludedSet),
    [transactions, pastMonths, excludedSet]
  )

  // Trim leading months that have no imported data so the chart doesn't show a
  // misleading £0 run before your history starts.
  const firstDataIdx = useMemo(() => {
    const i = pastMonths.findIndex((_, j) => series.A[j] + series.B[j] + series.C[j] > 0)
    return i === -1 ? 0 : i
  }, [pastMonths, series])
  const activeMonths = pastMonths.slice(firstDataIdx)
  const activeSeries = {
    A: series.A.slice(firstDataIdx),
    B: series.B.slice(firstDataIdx),
    C: series.C.slice(firstDataIdx),
  }

  const toggleExclude = async (ref) => {
    const next = excluded.includes(ref) ? excluded.filter(r => r !== ref) : [...excluded, ref]
    setExcluded(next)
    try { await saveExcludedFromAverage(next) } catch (e) { console.error(e) }
  }

  const totalAvg = bucketAvg.A + bucketAvg.B + bucketAvg.C
  const projectedAnnual = totalAvg * HORIZON

  const labels = [...activeMonths, ...futureMonths].map(formatMonthShort)
  const nPast = activeMonths.length
  const chartData = {
    labels,
    datasets: BUCKETS.flatMap(b => {
      const actual = [...activeSeries[b.key], ...futureMonths.map(() => null)]
      const projected = labels.map(() => null)
      projected[nPast - 1] = activeSeries[b.key][nPast - 1]   // start the dashed line at the seam
      for (let i = 0; i < futureMonths.length; i++) projected[nPast + i] = bucketAvg[b.key]
      return [
        { label: b.label, data: actual, borderColor: b.color, backgroundColor: b.color, tension: 0.3, pointRadius: 2, borderWidth: 2 },
        { label: `${b.label} (projected)`, data: projected, borderColor: b.color, borderDash: [5, 4], tension: 0, pointRadius: 0, borderWidth: 1.5 },
      ]
    }),
  }
  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        filter: ctx => ctx.raw != null,
        callbacks: { label: ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` },
      },
    },
    scales: {
      x: { ticks: { font: { size: 9 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, grid: { display: false } },
      y: { ticks: { callback: v => formatCurrency(v), font: { size: 10 } }, grid: { color: 'rgba(128,128,128,0.1)' } },
    },
  }

  return (
    <div className="page">
      <h1 className="page-title">Tracker</h1>
      <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: -4, marginBottom: '1rem' }}>
        Monthly spend by bucket{monthsWithData > 0 ? ` over your ${monthsWithData} month${monthsWithData === 1 ? '' : 's'} of data` : ''}, projected
        forward {HORIZON} months from your average monthly spend. Averages divide by months imported, not a flat {WINDOW}.
        Expand a category to exclude one-off transactions from the projection.
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>Loading…</div>
      ) : transactions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)', fontSize: 13 }}>
          No transactions in the last {WINDOW} months. Import statements to build the tracker.
        </div>
      ) : (
        <>
          <div className="metric-grid" style={{ marginBottom: '1rem' }}>
            <div className="metric"><div className="metric-label">Avg spend / mo</div><div className="metric-value">{formatCurrencyFull(totalAvg)}</div></div>
            <div className="metric"><div className="metric-label">Projected / yr</div><div className="metric-value blue">{formatCurrencyFull(projectedAnnual)}</div></div>
            <div className="metric"><div className="metric-label">Excluded one-offs</div><div className="metric-value amber">{excluded.length}</div></div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
            {BUCKETS.map(b => (
              <span key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-2)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: b.color, display: 'inline-block' }} />
                {b.label} · {formatCurrencyFull(bucketAvg[b.key])}/mo
              </span>
            ))}
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>— — dashed = projected</span>
          </div>
          <div className="chart-container" style={{ height: 240, marginBottom: '1.5rem' }}>
            <Line data={chartData} options={chartOptions} />
          </div>

          <div className="section-label">Category averages & projection</div>
          {BUCKETS.map(b => {
            const rows = categories.filter(c => c.bucket === b.key)
            if (rows.length === 0) return null
            return (
              <div className="card" key={b.key} style={{ marginBottom: 12 }}>
                <div className="card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: b.color }} />
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{b.label}</span>
                  </div>
                  {rows.map(c => {
                    const isOpen = openCat === c.key
                    const sortedTxs = [...c.txs].sort((a, z) => Math.abs(z.amount) - Math.abs(a.amount))
                    const exclCount = c.txs.filter(t => excludedSet.has(t.reference)).length
                    return (
                      <div key={c.key} style={{ borderTop: '0.5px solid var(--border)' }}>
                        <div
                          className="line-item"
                          style={{ cursor: 'pointer' }}
                          onClick={() => setOpenCat(isOpen ? null : c.key)}
                        >
                          <span className="line-key" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {isOpen ? '▾' : '▸'} {c.subcategory}
                            {exclCount > 0 && <span style={{ color: 'var(--amber)', fontSize: 10 }}> · {exclCount} excluded</span>}
                          </span>
                          <span style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                            <span className="line-val">{formatCurrencyFull(c.avgMonthly)}/mo</span>
                            <span className="line-val" style={{ color: 'var(--text-3)', minWidth: 74, textAlign: 'right' }}>{formatCurrencyFull(c.projectedAnnual)}/yr</span>
                          </span>
                        </div>
                        {isOpen && (
                          <div style={{ padding: '4px 0 8px' }}>
                            {sortedTxs.map((t, i) => {
                              const isExcl = excludedSet.has(t.reference)
                              return (
                                <label
                                  key={t.reference || i}
                                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', fontSize: 11, opacity: isExcl ? 0.5 : 1, cursor: 'pointer' }}
                                >
                                  <input type="checkbox" checked={isExcl} onChange={() => toggleExclude(t.reference)} />
                                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: isExcl ? 'line-through' : 'none' }}>
                                    {t.date} · {t.description}
                                  </span>
                                  <span style={{ flexShrink: 0, fontWeight: 500 }}>{formatCurrencyFull(t.amount)}</span>
                                </label>
                              )
                            })}
                            <div style={{ fontSize: 10, color: 'var(--text-3)', padding: '2px 6px' }}>
                              Tick a transaction to exclude it from the average (e.g. a one-off cost).
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
