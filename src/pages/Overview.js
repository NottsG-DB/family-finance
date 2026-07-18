import React, { useState, useEffect } from 'react'
import { getTransactions } from '../lib/supabase'
import { summariseByCategory, totalIncome, totalSpend, formatCurrencyFull } from '../lib/finance'


export default function Overview() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [openSection, setOpenSection] = useState(null)

  useEffect(() => {
    const [y, m] = month.split('-')
    const from = `${y}-${m}-01`
    const to = `${y}-${m}-31`
    getTransactions(from, to)
      .then(setTransactions)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [month])

  const income = totalIncome(transactions)
  const spend = totalSpend(transactions)
  const surplus = income - spend
  const spendPct = income > 0 ? Math.min(100, Math.round(spend / income * 100)) : 0

  const summary = summariseByCategory(transactions)
  const fixed = summary.filter(s => s.cat.startsWith('A'))
  const minimum = summary.filter(s => s.cat.startsWith('B'))
  const extra = summary.filter(s => s.cat.startsWith('C'))

  const toggle = (s) => setOpenSection(openSection === s ? null : s)

  const SectionCard = ({ id, label, sub, color, bg, items, total }) => (
    <div className="card">
      <div className="card-header" onClick={() => toggle(id)}>
        <div className="card-header-left">
          <div className="card-icon" style={{ background: bg }}>
            <span style={{ color, fontSize: 14 }}>■</span>
          </div>
          <div>
            <div className="card-title">{label}</div>
            <div className="card-sub">{sub}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--red)' }}>
            {formatCurrencyFull(total)}
          </div>
        </div>
      </div>
      {openSection === id && (
        <div className="card-body">
          {items.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>No transactions this period</p>
          ) : items.map(item => (
            <div className="line-item" key={item.cat}>
              <span className="line-key">{item.cat.split(' — ')[1]}</span>
              <span className="line-val">{formatCurrencyFull(item.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Overview</h1>
        <input
          type="month" value={month}
          onChange={e => setMonth(e.target.value)}
          style={{ fontSize: 13, padding: '6px 10px', width: 'auto' }}
        />
      </div>

      <div className="position-bar-wrap">
        <div className="section-label">Financial position</div>
        <div className="position-bar-track">
          <div className="position-bar-spent" style={{ width: `${spendPct}%` }} />
          <div className="position-bar-remain" />
        </div>
        <div className="position-bar-legend">
          <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--green)' }} />{formatCurrencyFull(income)} in</div>
          <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--red)' }} />{formatCurrencyFull(spend)} spent</div>
          <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--blue)' }} />{formatCurrencyFull(surplus)} left</div>
        </div>
      </div>

      <div className="metric-grid">
        <div className="metric"><div className="metric-label">Total income</div><div className="metric-value green">{formatCurrencyFull(income)}</div></div>
        <div className="metric"><div className="metric-label">Total spent</div><div className="metric-value red">{formatCurrencyFull(spend)}</div></div>
        <div className="metric"><div className="metric-label">Surplus</div><div className={`metric-value ${surplus >= 0 ? 'blue' : 'red'}`}>{formatCurrencyFull(surplus)}</div></div>
        <div className="metric"><div className="metric-label">Transactions</div><div className="metric-value">{transactions.length}</div></div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>Loading transactions…</div>
      ) : (
        <>
          <div className="section-label">Expenditure breakdown</div>
          <SectionCard id="fixed" label="A — Fixed costs" sub="Mortgage, bills, ISA" color="#185FA5" bg="var(--blue-bg)" items={fixed} total={fixed.reduce((s, x) => s + x.amount, 0)} />
          <SectionCard id="minimum" label="B — Minimum costs" sub="Groceries, mobiles, spending" color="#1D9E75" bg="var(--green-bg)" items={minimum} total={minimum.reduce((s, x) => s + x.amount, 0)} />
          <SectionCard id="extra" label="C — Extra costs" sub="Leisure, transport, charity" color="#BA7517" bg="var(--amber-bg)" items={extra} total={extra.reduce((s, x) => s + x.amount, 0)} />

          <div className="section-label" style={{ marginTop: '1rem' }}>Recent transactions</div>
          <div className="card">
            {transactions.slice(0, 20).map(tx => (
              <div className="tx-item" key={tx.id || tx.reference}>
                <div>
                  <div className="tx-name">{tx.description}</div>
                  <div className="tx-meta">{tx.date} · {tx.subcategory}</div>
                </div>
                <div className={`tx-amount ${tx.amount >= 0 ? 'credit' : 'debit'}`}>
                  {tx.amount >= 0 ? '+' : ''}{formatCurrencyFull(tx.amount)}
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                No transactions for this period. Import a statement to get started.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
