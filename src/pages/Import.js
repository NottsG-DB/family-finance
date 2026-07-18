import React, { useState, useCallback } from 'react'
import { categoriseBatch, parseSantanderHTML, parseSantanderMidata, parseCreditCardCSV } from '../lib/categorise'
import { upsertTransactions } from '../lib/supabase'
import { formatCurrencyFull } from '../lib/finance'

const ALL_CATS = [
  'A — Mortgage', 'A — Credit card', 'A — Banking', 'A — Stocks ISA', 'A — Cash saving',
  'A — Energy', 'A — Broadband', 'A — Council tax', 'A — Water', 'A — TV licence',
  'A — Business setup (one-off)', 'A — Mortgage overpayment',
  'B — Groceries', 'B — Mobile', 'B — Streaming', 'B — Gym', 'B — Subscriptions',
  'B — Oscar — school', 'B — Oscar spending',
  'C — Holidays', 'C — Health', 'C — Clothing and sport', 'C — Motorhome',
  'C — Leisure', 'C — Charity', 'C — Gifting', 'C — Home improvements',
  'C — Eating out', 'C — Transport', 'C — Fuel', 'C — Bikes', 'C — Cash',
  'C — Garden/Household', 'C — Cats', 'C — Other',
  'Income — Gavin wages', 'Income — Claire wages', 'Income — Other',
  'Internal — Transfer',
]

const TIER_CONFIG = {
  1: { label: 'Tier 1 — High confidence', sub: 'Previously confirmed. Approve all or tap to change.', color: 'var(--green)', badgeClass: 'badge-green' },
  2: { label: 'Tier 2 — First time seen', sub: 'Confident but unconfirmed. Check then approve.', color: 'var(--amber)', badgeClass: 'badge-amber' },
  3: { label: 'Tier 3 — Needs your input', sub: 'Unknown payees. Assign a category below.', color: 'var(--red)', badgeClass: 'badge-red' },
}

function TierSection({ tier, transactions, onCategoryChange, onApproveAll, approved }) {
  const cfg = TIER_CONFIG[tier]
  const total = transactions.reduce((s, tx) => s + Math.abs(tx.amount), 0)
  if (transactions.length === 0) return null
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{cfg.label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{cfg.sub}</div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)' }}>{transactions.length} transactions</div>
      </div>

      {transactions.map((tx, i) => (
        <div key={tx.reference || i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: 4 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{tx.date} · {tx.account}</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: tx.amount < 0 ? 'var(--red)' : 'var(--green)', flexShrink: 0, minWidth: 60, textAlign: 'right' }}>
            {tx.amount >= 0 ? '+' : ''}{formatCurrencyFull(tx.amount)}
          </div>
          {tier < 3 ? (
            <span className={`badge ${cfg.badgeClass}`} style={{ fontSize: 10, flexShrink: 0, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {tx.subcategory}
            </span>
          ) : (
            <select
              value={tx._override || ''}
              onChange={e => onCategoryChange(tx.reference || i, e.target.value)}
              style={{ fontSize: 11, padding: '3px 6px', maxWidth: 140 }}
            >
              <option value="">— assign —</option>
              {ALL_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>
      ))}

      {tier < 3 && (
        <button
          className={approved ? 'btn-success btn-block' : 'btn-block'}
          style={{ marginTop: 4, padding: '8px', fontSize: 12 }}
          onClick={() => onApproveAll(tier)}
          disabled={approved}
        >
          {approved ? `Tier ${tier} approved ✓` : `Approve all tier ${tier} — ${formatCurrencyFull(total)}`}
        </button>
      )}
    </div>
  )
}

export default function Import() {
  const [view, setView] = useState('review')
  const [transactions, setTransactions] = useState([])
  const [overrides, setOverrides] = useState({})
  const [approved, setApproved] = useState({ 1: false, 2: false })
  const [committing, setCommitting] = useState(false)
  const [committed, setCommitted] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const processFile = useCallback(async (file) => {
    // Santander exports (XLS-as-HTML and Midata CSV) are ISO-8859-1, where £ is the
    // single byte 0xA3. Blob.text() always decodes as UTF-8, which turns £ into the
    // replacement char U+FFFD and breaks amount parsing — so decode explicitly.
    const buf = await file.arrayBuffer()
    const latin1 = new TextDecoder('iso-8859-1').decode(buf)
    const utf8 = new TextDecoder('utf-8').decode(buf)
    let parsed = []
    if (file.name.endsWith('.csv')) {
      // Detect Santander Midata CSV (semicolon separated, ISO-8859-1) vs credit card CSV (comma separated)
      if (latin1.includes('Date;Type;Merchant') || latin1.split('\n')[0].includes(';')) {
        parsed = parseSantanderMidata(latin1)
      } else {
        parsed = parseCreditCardCSV(utf8)
      }
    } else {
      parsed = parseSantanderHTML(latin1)
    }
    const categorised = categoriseBatch(parsed)
    setTransactions(categorised)
    setOverrides({})
    setApproved({ 1: false, 2: false })
    setCommitted(false)
  }, [])

  const onDrop = useCallback(async (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const onFileChange = useCallback(async (e) => {
    const file = e.target.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleCategoryChange = (ref, value) => {
    setOverrides(prev => ({ ...prev, [ref]: value }))
  }

  const handleApproveAll = (tier) => {
    setApproved(prev => ({ ...prev, [tier]: true }))
  }

  const commit = async () => {
    setCommitting(true)
    try {
      const toCommit = transactions
        .filter(tx => {
          if (tx.tier === 3) return !!overrides[tx.reference]
          if (tx.tier === 1) return approved[1]
          if (tx.tier === 2) return approved[2]
          return false
        })
        .map(tx => {
          const override = overrides[tx.reference]
          const [cat, sub] = override ? override.split(' — ') : [tx.category, tx.subcategory]
          return { ...tx, category: cat, subcategory: sub, reviewed: true }
        })
      await upsertTransactions(toCommit)
      setCommitted(true)
    } catch (e) {
      console.error(e)
      alert('Error saving transactions. Check your Supabase connection.')
    } finally {
      setCommitting(false)
    }
  }

  const tier1 = transactions.filter(tx => tx.tier === 1)
  const tier2 = transactions.filter(tx => tx.tier === 2)
  const tier3 = transactions.filter(tx => tx.tier === 3)

  const summaryData = transactions.reduce((acc, tx) => {
    if (tx.amount >= 0 || tx.category === 'Internal') return acc
    const key = `${tx.category} — ${tx.subcategory}`
    acc[key] = (acc[key] || 0) + Math.abs(tx.amount)
    return acc
  }, {})
  const summarySorted = Object.entries(summaryData).sort((a, b) => b[1] - a[1])

  return (
    <div className="page">
      <h1 className="page-title">Import</h1>

      <div className="seg-ctrl">
        {[['review', 'Review'], ['summary', 'Summary'], ['rules', 'Learned rules']].map(([k, l]) => (
          <button key={k} className={`seg-btn ${view === k ? 'active' : ''}`} onClick={() => setView(k)}>{l}</button>
        ))}
      </div>

      {view === 'review' && (
        <>
          <div
            className="upload-zone"
            style={{ borderColor: dragOver ? 'var(--blue)' : undefined }}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => document.getElementById('file-input').click()}
          >
            <div style={{ fontSize: 28, marginBottom: 6 }}>↑</div>
            <div className="upload-zone-title">Drop a statement here</div>
            <div className="upload-zone-sub">Santander XLS or credit card CSV · drag or tap to browse</div>
            <input id="file-input" type="file" accept=".csv,.xls,.xlsx" style={{ display: 'none' }} onChange={onFileChange} />
          </div>

          {transactions.length > 0 && (
            <>
              <div className="metric-grid" style={{ marginBottom: '1rem' }}>
                <div className="metric"><div className="metric-label">Transactions</div><div className="metric-value blue">{transactions.length}</div></div>
                <div className="metric"><div className="metric-label">Auto-assigned</div><div className="metric-value green">{tier1.length + tier2.length}</div></div>
                <div className="metric"><div className="metric-label">Needs review</div><div className="metric-value amber">{tier3.length}</div></div>
                <div className="metric"><div className="metric-label">Total spend</div><div className="metric-value red">{formatCurrencyFull(transactions.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0))}</div></div>
              </div>

              <div className="divider" />
              <TierSection tier={1} transactions={tier1} onCategoryChange={handleCategoryChange} onApproveAll={handleApproveAll} approved={approved[1]} />
              <TierSection tier={2} transactions={tier2} onCategoryChange={handleCategoryChange} onApproveAll={handleApproveAll} approved={approved[2]} />
              <TierSection tier={3} transactions={tier3} onCategoryChange={handleCategoryChange} onApproveAll={handleApproveAll} approved={approved[3]} />

              <div className="divider" />
              {committed
                ? <div className="alert-success">Transactions saved. They'll appear in the Overview once the month is selected.</div>
                : <button className="btn-primary btn-block" onClick={commit} disabled={committing} style={{ padding: 12 }}>
                    {committing ? 'Saving…' : `Commit approved transactions to database`}
                  </button>
              }
            </>
          )}
        </>
      )}

      {view === 'summary' && (
        <>
          {summarySorted.length === 0
            ? <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)', fontSize: 13 }}>Import a statement to see the summary.</div>
            : (
              <div className="card">
                <div className="card-body">
                  {summarySorted.map(([cat, amt]) => {
                    const maxAmt = summarySorted[0][1]
                    const pct = Math.round(amt / maxAmt * 100)
                    const color = cat.startsWith('A') ? 'var(--blue)' : cat.startsWith('B') ? 'var(--green)' : 'var(--amber)'
                    return (
                      <div className="line-item" key={cat}>
                        <span className="line-key" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{cat}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 60, height: 4, borderRadius: 2, background: 'var(--bg)' }}>
                            <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: color }} />
                          </div>
                          <span className="line-val">{formatCurrencyFull(Math.round(amt))}</span>
                        </div>
                      </div>
                    )
                  })}
                  <div className="line-item" style={{ marginTop: 4 }}>
                    <span style={{ fontWeight: 500 }}>Total spend</span>
                    <span className="line-val red">{formatCurrencyFull(Math.round(summarySorted.reduce((s, [, v]) => s + v, 0)))}</span>
                  </div>
                </div>
              </div>
            )
          }
        </>
      )}

      {view === 'rules' && (
        <>
          <div className="alert" style={{ marginBottom: 12 }}>
            Rules are built from your confirmed categorisations. Matches are case-insensitive and grow with each import.
          </div>
          <div className="card">
            <div className="card-body">
              {[
                { pattern: 'TESCO, ASDA, MORR, M&S, SAINSBURY…', cat: 'B — Groceries', conf: 1 },
                { pattern: '3M UK', cat: 'Income — Gavin wages', conf: 1 },
                { pattern: 'NOTTINGHAM TRENT', cat: 'Income — Claire wages', conf: 1 },
                { pattern: 'SANTANDER MORTGAGE', cat: 'A — Mortgage', conf: 1 },
                { pattern: 'OCTOPUS ENERGY', cat: 'A — Energy', conf: 1 },
                { pattern: 'HLAM ISA / S&S ISA', cat: 'A — Stocks ISA', conf: 1 },
                { pattern: 'SNOWCOMPARE, OXYGENE SKI, RYANAIR…', cat: 'C — Holidays', conf: 1 },
                { pattern: 'BOLT MEDICAL', cat: 'C — Health', conf: 1 },
                { pattern: 'RUSHCLIFFE VET', cat: 'C — Cats', conf: 1 },
                { pattern: 'SUSTRANS, RED CROSS, GREENPEACE…', cat: 'C — Charity', conf: 1 },
                { pattern: 'WOLF MOON, SCAMP AND DUDE', cat: 'C — Gifting', conf: 1 },
                { pattern: 'KLARNA', cat: 'C — Clothing and sport', conf: 0.7 },
                { pattern: 'AMAZON', cat: 'C — Other', conf: 0.6 },
                { pattern: 'TRANSFER TO/FROM CLAIRE PHIPPS', cat: 'Internal — Transfer', conf: 1 },
              ].map(rule => (
                <div className="line-item" key={rule.pattern}>
                  <span className="line-key" style={{ fontSize: 11, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{rule.pattern}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span className={`badge ${rule.conf >= 1 ? 'badge-green' : rule.conf >= 0.7 ? 'badge-blue' : 'badge-amber'}`}>
                      {rule.conf >= 1 ? 'High' : rule.conf >= 0.7 ? 'Medium' : 'Low'}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 500 }}>{rule.cat}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
