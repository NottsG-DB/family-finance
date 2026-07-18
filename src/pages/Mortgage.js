import React, { useState } from 'react'
import { MORTGAGE_PARTS, monthlyMortgagePayment, blendedMortgageRate, payoffMonths, formatCurrencyFull, addMonthsToDate } from '../lib/finance'

const PART_COLORS = ['var(--green)', 'var(--red)', 'var(--amber)', 'var(--amber)']
const PART_BG = ['var(--green-bg)', 'var(--red-bg)', 'var(--amber-bg)', 'var(--amber-bg)']

export default function Mortgage() {
  const [open, setOpen] = useState(null)
  const [overpay, setOverpay] = useState(300)
  const [isaLump, setIsaLump] = useState(0)
  const toggle = id => setOpen(open === id ? null : id)

  const totalBalance = MORTGAGE_PARTS.reduce((s, p) => s + p.balance, 0)
  const totalMonthly = MORTGAGE_PARTS.reduce((s, p) => s + monthlyMortgagePayment(p.balance, p.rate, p.termYears), 0)
  const blended = blendedMortgageRate(MORTGAGE_PARTS)

  // Part 2 clearance
  const part2 = MORTGAGE_PARTS[1]
  const afterCash = Math.max(0, part2.balance - 3000 - isaLump)
  const months = payoffMonths(afterCash, overpay, part2.rate)
  const onTarget = months <= 16
  const payoffDate = months === 0 ? 'Cleared now' : months === Infinity ? 'Never' : addMonthsToDate(months)

  return (
    <div className="page">
      <h1 className="page-title">Mortgage</h1>

      <div className="metric-grid">
        <div className="metric"><div className="metric-label">Total outstanding</div><div className="metric-value red">{formatCurrencyFull(totalBalance)}</div></div>
        <div className="metric"><div className="metric-label">Monthly payment</div><div className="metric-value">{formatCurrencyFull(totalMonthly)}</div></div>
        <div className="metric"><div className="metric-label">Blended rate</div><div className="metric-value amber">{(blended * 100).toFixed(2)}%</div></div>
        <div className="metric"><div className="metric-label">Parts</div><div className="metric-value">{MORTGAGE_PARTS.length}</div></div>
      </div>

      <div className="section-label">Four parts</div>

      {MORTGAGE_PARTS.map((part, i) => {
        const monthly = monthlyMortgagePayment(part.balance, part.rate, part.termYears)
        const labels = ['Cheapest rate', 'Overpay first', '13yr 3mo term', 'Largest balance']
        const badgeClass = i === 1 ? 'badge-red' : i === 0 ? 'badge-green' : 'badge-amber'
        return (
          <div className="card" key={part.id}>
            <div className="card-header" onClick={() => toggle(part.id)}>
              <div className="card-header-left">
                <div className="card-icon" style={{ background: PART_BG[i] }}>
                  <span style={{ color: PART_COLORS[i], fontSize: 12, fontWeight: 700 }}>P{part.id}</span>
                </div>
                <div>
                  <div className="card-title">{part.label} — {formatCurrencyFull(part.balance)}</div>
                  <div className="card-sub">{(part.rate * 100).toFixed(2)}% fixed until {part.fixedUntil}</div>
                </div>
              </div>
              <span className={`badge ${badgeClass}`}>{labels[i]}</span>
            </div>
            {open === part.id && (
              <div className="card-body">
                <div className="line-item"><span className="line-key">Balance</span><span className="line-val">{formatCurrencyFull(part.balance)}</span></div>
                <div className="line-item"><span className="line-key">Rate</span><span className={`line-val ${i === 1 ? 'red' : ''}`}>{(part.rate * 100).toFixed(2)}%</span></div>
                <div className="line-item"><span className="line-key">Fixed until</span><span className="line-val">{part.fixedUntil}</span></div>
                <div className="line-item"><span className="line-key">Remaining term</span><span className="line-val">{part.termYears} years</span></div>
                <div className="line-item"><span className="line-key">Monthly payment</span><span className="line-val">{formatCurrencyFull(monthly)}</span></div>
                <div className="line-item"><span className="line-key">Monthly interest</span><span className="line-val red">{formatCurrencyFull(part.balance * part.rate / 12)}</span></div>
                {i === 0 && <div className="alert" style={{ marginTop: 8 }}>Deal expires Mar 2029 — will revert to SVR (~6%+). Plan renewal early.</div>}
                {i === 1 && <div className="alert" style={{ marginTop: 8 }}>Highest rate. Best overpayment target. Check 10% annual ERC-free allowance (~£1,469/yr).</div>}
                {i === 2 && <div className="alert" style={{ marginTop: 8 }}>Same rate as Part 4 — consider consolidating at Jan 2030 renewal.</div>}
              </div>
            )}
          </div>
        )
      })}

      <div className="divider" />
      <div className="section-label">Part 2 clearance tracker</div>

      <div className="card">
        <div className="card-header" style={{ cursor: 'default' }}>
          <div>
            <div className="card-title">Clear Part 2 by Nov 2027</div>
            <div className="card-sub">4.14% · £{part2.balance.toLocaleString()} · target 16 months</div>
          </div>
          <span className={`badge ${onTarget && months !== Infinity ? 'badge-green' : months === 0 ? 'badge-green' : 'badge-red'}`}>
            {months === 0 ? 'Cleared' : onTarget ? 'On track' : 'Off track'}
          </span>
        </div>
        <div className="card-body">
          <div className="slider-row">
            <div className="slider-label"><span>ISA lump sum</span><span className="slider-val">{formatCurrencyFull(isaLump)}</span></div>
            <input type="range" min={0} max={14000} step={500} value={isaLump} onChange={e => setIsaLump(+e.target.value)} />
          </div>
          <div className="slider-row">
            <div className="slider-label"><span>Monthly overpayment</span><span className="slider-val">{formatCurrencyFull(overpay)}/mo</span></div>
            <input type="range" min={0} max={1200} step={50} value={overpay} onChange={e => setOverpay(+e.target.value)} />
          </div>
          <div className="line-item"><span className="line-key">Balance after £3K cash + ISA</span><span className="line-val">{formatCurrencyFull(afterCash)}</span></div>
          <div className="line-item"><span className="line-key">Estimated payoff</span><span className={`line-val ${onTarget ? 'green' : 'red'}`}>{payoffDate}</span></div>
          <div className="line-item"><span className="line-key">ERC if clearing in full now</span><span className="line-val amber">~{formatCurrencyFull(part2.balance * 0.02)} (2%)</span></div>
          {months === 0
            ? <div className="alert-success" style={{ marginTop: 8 }}>Cleared with lump sum. No overpayment needed.</div>
            : onTarget
            ? <div className="alert-success" style={{ marginTop: 8 }}>On track to clear by {payoffDate}, before Nov 2027 target.</div>
            : <div className="alert" style={{ marginTop: 8 }}>Payoff {payoffDate} misses Nov 2027. Increase ISA lump or monthly overpayment.</div>
          }
        </div>
      </div>

      <div className="divider" />
      <div className="section-label">Upcoming renewals</div>
      <div className="timeline">
        {[
          { dot: 'var(--amber)', label: 'Jan 2029 — Parts 1 and 2 renew', body: `${formatCurrencyFull(MORTGAGE_PARTS[0].balance + MORTGAGE_PARTS[1].balance)} combined. Natural consolidation point.` },
          { dot: 'var(--red)', label: 'Jan 2030 — Parts 3 and 4 renew', body: `${formatCurrencyFull(MORTGAGE_PARTS[2].balance + MORTGAGE_PARTS[3].balance)} combined — largest renewal event.` },
        ].map((item, i) => (
          <div className="tl-item" key={i}>
            <div className="tl-dot" style={{ background: item.dot }} />
            <div className="tl-label">{item.label}</div>
            <div>{item.body}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
