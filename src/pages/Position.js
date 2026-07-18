import React, { useState } from 'react'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler } from 'chart.js'
import { MORTGAGE_PARTS, DEFAULTS, projectPension, projectISA, formatCurrency, formatCurrencyFull } from '../lib/finance'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler)

const RETIRE_AGES = [57, 60, 65]

export default function Position() {
  const [growthRate, setGrowthRate] = useState(6)
  const [isaMonthly, setIsaMonthly] = useState(1000)
  const [caPct, setCaPct] = useState(100)
  const [retireAge, setRetireAge] = useState(57)

  const gr = growthRate / 100
  const caAnnual = DEFAULTS.carAllowanceMonthly * 12 * (caPct / 100)

  // Build contribution schedule: index 0 = age 49 (2026)
  const penContribs = Array.from({ length: 17 }, (_, i) => {
    const age = 49 + i
    if (i === 0) return 70000
    if (age >= 57) return 0
    return 37000 + (age >= 51 ? caAnnual : 0)
  })

  const penSnapshots = projectPension(DEFAULTS.gavPensionPot, penContribs, gr, 17)
  const isaSnapshots = projectISA(DEFAULTS.isaBalance, isaMonthly, gr, 17 * 12)

  const ages = Array.from({ length: 17 }, (_, i) => 49 + i)
  const years = ages.map(a => 2026 + (a - 49))

  const retireIdx = retireAge - 49
  const penAtRetire = penSnapshots[retireIdx] || 0
  const isaAtRetire = isaSnapshots[retireIdx] || 0
  const taxFreeLump = Math.min(penAtRetire * 0.25, 268275)
  const penRemain = penAtRetire - taxFreeLump
  const penDrawdown = Math.round(penRemain * 0.04)
  const isaDrawdown = Math.round(isaAtRetire * 0.04)
  const dbIncome = retireAge >= 59 ? 15000 : 0
  const stateIncome = retireAge >= 67 ? 23000 : 0
  const grossIncome = penDrawdown + isaDrawdown + dbIncome + stateIncome
  const taxable = penDrawdown + dbIncome + stateIncome
  const pa = 12570
  const tax = taxable <= pa ? 0 : Math.round(Math.min(taxable - pa, 37700) * 0.20 + Math.max(0, taxable - pa - 37700) * 0.40)
  const netIncome = grossIncome - tax
  const netMonthly = Math.round(netIncome / 12)

  const chartData = {
    labels: ages.map((a, i) => `${a}\n(${years[i]})`),
    datasets: [
      {
        label: 'Pension',
        data: penSnapshots,
        borderColor: '#378ADD',
        backgroundColor: 'rgba(55,138,221,0.08)',
        fill: true, tension: 0.3, pointRadius: 3,
      },
      {
        label: 'ISA',
        data: isaSnapshots,
        borderColor: '#1D9E75',
        backgroundColor: 'rgba(29,158,117,0.08)',
        fill: true, tension: 0.3, pointRadius: 3,
      },
    ]
  }

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` } }
    },
    scales: {
      x: { ticks: { font: { size: 10 } }, grid: { display: false } },
      y: { ticks: { callback: v => formatCurrency(v), font: { size: 10 } }, grid: { color: 'rgba(128,128,128,0.1)' } }
    }
  }

  const mortgageTotal = MORTGAGE_PARTS.reduce((s, p) => s + p.balance, 0)

  return (
    <div className="page">
      <h1 className="page-title">Financial position</h1>

      <div className="section-label">Net position today</div>
      <div className="metric-grid">
        <div className="metric"><div className="metric-label">Pension pot</div><div className="metric-value blue">{formatCurrency(DEFAULTS.gavPensionPot)}</div></div>
        <div className="metric"><div className="metric-label">ISA balance</div><div className="metric-value green">{formatCurrency(DEFAULTS.isaBalance)}</div></div>
        <div className="metric"><div className="metric-label">Mortgage</div><div className="metric-value red">{formatCurrency(mortgageTotal)}</div></div>
        <div className="metric"><div className="metric-label">Net assets</div><div className="metric-value">{formatCurrency(DEFAULTS.gavPensionPot + DEFAULTS.isaBalance - mortgageTotal)}</div></div>
      </div>

      <div className="section-label">Assumptions</div>
      <div className="slider-row">
        <div className="slider-label"><span>Growth rate</span><span className="slider-val">{growthRate}%</span></div>
        <input type="range" min={3} max={10} step={0.5} value={growthRate} onChange={e => setGrowthRate(+e.target.value)} />
      </div>
      <div className="slider-row">
        <div className="slider-label"><span>ISA monthly contribution</span><span className="slider-val">{formatCurrencyFull(isaMonthly)}/mo</span></div>
        <input type="range" min={500} max={1667} step={50} value={isaMonthly} onChange={e => setIsaMonthly(+e.target.value)} />
      </div>
      <div className="slider-row">
        <div className="slider-label"><span>Car allowance into pension (from Jan 2028)</span><span className="slider-val">{caPct}%</span></div>
        <input type="range" min={0} max={100} step={10} value={caPct} onChange={e => setCaPct(+e.target.value)} />
      </div>

      <div className="section-label">Pot growth projection</div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-2)' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#378ADD', display: 'inline-block' }} />Pension
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-2)' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#1D9E75', display: 'inline-block' }} />ISA
        </span>
      </div>
      <div className="chart-container" style={{ height: 220, marginBottom: '1rem' }}>
        <Line data={chartData} options={chartOptions} />
      </div>

      <div className="section-label">Retirement income</div>
      <div className="seg-ctrl">
        {RETIRE_AGES.map(age => (
          <button key={age} className={`seg-btn ${retireAge === age ? 'active' : ''}`} onClick={() => setRetireAge(age)}>
            Retire at {age}
          </button>
        ))}
      </div>

      <div className="metric-grid">
        <div className="metric"><div className="metric-label">Pension at {retireAge}</div><div className="metric-value blue">{formatCurrency(penAtRetire)}</div></div>
        <div className="metric"><div className="metric-label">ISA at {retireAge}</div><div className="metric-value green">{formatCurrency(isaAtRetire)}</div></div>
        <div className="metric"><div className="metric-label">Tax-free lump sum</div><div className="metric-value amber">{formatCurrencyFull(taxFreeLump)}</div></div>
        <div className="metric"><div className="metric-label">Net monthly income</div><div className="metric-value green">{formatCurrencyFull(netMonthly)}</div></div>
      </div>

      <div className="card">
        <div className="card-header" style={{ cursor: 'default' }}>
          <div className="card-title">Annual income breakdown at {retireAge}</div>
        </div>
        <div className="card-body">
          <div className="line-item"><span className="line-key">Pension drawdown (4%)</span><span className="line-val blue">{formatCurrencyFull(penDrawdown)}/yr</span></div>
          <div className="line-item"><span className="line-key">ISA withdrawals (4%, tax-free)</span><span className="line-val green">{formatCurrencyFull(isaDrawdown)}/yr</span></div>
          <div className="line-item"><span className="line-key">Claire DB pension</span><span className={`line-val ${retireAge >= 59 ? 'green' : 'amber'}`}>{retireAge >= 59 ? formatCurrencyFull(dbIncome) + '/yr' : 'Starts Oct 2034'}</span></div>
          <div className="line-item"><span className="line-key">State pensions (both, from 67)</span><span className={`line-val ${retireAge >= 67 ? 'green' : ''}`}>{retireAge >= 67 ? '~£23,000/yr' : 'Not yet'}</span></div>
          <div className="line-item"><span className="line-key">Estimated tax</span><span className="line-val amber">{formatCurrencyFull(tax)}/yr</span></div>
          <div className="line-item"><span className="line-key">Net income</span><span className="line-val green">{formatCurrencyFull(netIncome)}/yr · {formatCurrencyFull(netMonthly)}/mo</span></div>
        </div>
      </div>

      {netIncome > 70000
        ? <div className="alert-success">Comfortable retirement income. Consider whether earlier retirement is possible.</div>
        : <div className="alert">Working to 60 or 65 significantly improves the income position.</div>
      }

      <div className="divider" />
      <div className="section-label">Key assets and liabilities</div>
      <div className="card">
        <div className="card-body">
          <div className="line-item"><span className="line-key">Gavin pension (DC)</span><span className="line-val green">{formatCurrencyFull(DEFAULTS.gavPensionPot)}</span></div>
          <div className="line-item"><span className="line-key">Gavin pension — 2025/26 contribution</span><span className="line-val green">+{formatCurrencyFull(DEFAULTS.gavCarryForward + DEFAULTS.gavPensionContrib)}</span></div>
          <div className="line-item"><span className="line-key">Claire DB pension (from age 59)</span><span className="line-val green">{formatCurrencyFull(DEFAULTS.clairePensionAnnual)}/yr</span></div>
          <div className="line-item"><span className="line-key">Stocks ISA</span><span className="line-val green">{formatCurrencyFull(DEFAULTS.isaBalance)}</span></div>
          <div className="line-item"><span className="line-key">State pension — Gavin (from 67)</span><span className="line-val">~£11,500/yr</span></div>
          <div className="line-item"><span className="line-key">State pension — Claire (from 67)</span><span className="line-val">~£11,500/yr</span></div>
          <div className="line-item"><span className="line-key">Mortgage outstanding</span><span className="line-val red">{formatCurrencyFull(mortgageTotal)}</span></div>
        </div>
      </div>
    </div>
  )
}
