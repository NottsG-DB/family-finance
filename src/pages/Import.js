import React, { useState, useCallback, useEffect } from 'react'
import { categoriseBatch, parseSantanderHTML, parseSantanderMidata, parseCreditCardCSV, splitCategory, ADD_CATEGORY, merchantKey, rulesFromRows } from '../lib/categorise'
import { upsertTransactions, getExistingReferences, getRules, upsertRule } from '../lib/supabase'
import { useCategories } from '../hooks/useCategories'
import { formatCurrencyFull } from '../lib/finance'

// Persist the in-progress import review so navigating away and back doesn't lose it.
const STORAGE_KEY = 'ff_import_session_v1'
const loadSession = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null } catch { return null }
}

const TIER_CONFIG = {
  1: { label: 'Tier 1 — High confidence', sub: 'Previously confirmed. Approve all or tap to change.', color: 'var(--green)', badgeClass: 'badge-green' },
  2: { label: 'Tier 2 — First time seen', sub: 'Confident but unconfirmed. Check then approve.', color: 'var(--amber)', badgeClass: 'badge-amber' },
  3: { label: 'Tier 3 — Needs your input', sub: 'Unknown payees. Assign a category below.', color: 'var(--red)', badgeClass: 'badge-red' },
}

function TierSection({ tier, transactions, overrides, categories, onCategoryChange, onApproveAll, approved }) {
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
          {(() => {
            const autoCat = `${tx.category} — ${tx.subcategory}`
            // Tier 1/2 default to their auto-guess; tier 3 starts unassigned. Overrides win.
            const current = overrides[tx.reference] != null ? overrides[tx.reference] : (tier < 3 ? autoCat : '')
            const edited = overrides[tx.reference] != null && overrides[tx.reference] !== autoCat
            // Keep the current value selectable even if it isn't one of the standard options.
            const opts = (!current || categories.includes(current)) ? categories : [current, ...categories]
            return (
              <select
                value={current}
                onChange={e => onCategoryChange(tx.reference || i, e.target.value)}
                title={tier < 3 ? `Auto-assigned: ${autoCat}${edited ? ' · changed' : ''}` : 'Assign a category'}
                style={{ fontSize: 11, padding: '3px 6px', maxWidth: 150, flexShrink: 0, borderColor: edited ? 'var(--blue)' : undefined, fontWeight: edited ? 500 : undefined }}
              >
                <option value="">— assign —</option>
                {opts.map(c => <option key={c} value={c}>{c}</option>)}
                <option value={ADD_CATEGORY}>＋ Add new category…</option>
              </select>
            )
          })()}
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
  const [transactions, setTransactions] = useState(() => loadSession()?.transactions || [])
  const [overrides, setOverrides] = useState(() => loadSession()?.overrides || {})
  const [approved, setApproved] = useState(() => loadSession()?.approved || { 1: false, 2: false })
  const [committing, setCommitting] = useState(false)
  const [savedCount, setSavedCount] = useState(() => loadSession()?.savedCount || 0)
  const [dragOver, setDragOver] = useState(false)
  const [learnedRules, setLearnedRules] = useState([])
  const { categories, addCategory } = useCategories()

  // Load learned rules for the "Learned rules" tab; reload after each save batch.
  useEffect(() => {
    getRules().then(setLearnedRules).catch(() => setLearnedRules([]))
  }, [savedCount])

  // Persist the review session so it survives navigating away from the Import tab.
  useEffect(() => {
    try {
      if (transactions.length === 0) localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, JSON.stringify({ transactions, overrides, approved, savedCount }))
    } catch (e) { /* ignore quota / private-mode errors */ }
  }, [transactions, overrides, approved, savedCount])

  const clearSession = useCallback(() => {
    setTransactions([])
    setOverrides({})
    setApproved({ 1: false, 2: false })
    setSavedCount(0)
  }, [])

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
    // Apply learned rules (from your past assignments) on top of the built-in ones.
    let learned = []
    try { learned = rulesFromRows(await getRules()) } catch (e) { console.error(e) }
    const categorised = categoriseBatch(parsed, learned)
    // Skip rows already in Supabase: tag each with alreadySaved so re-imports only
    // surface new transactions. Falls back to treating all as new if the lookup fails.
    let existing = new Set()
    try { existing = new Set(await getExistingReferences()) } catch (e) { console.error(e) }
    const marked = categorised.map(tx => ({ ...tx, alreadySaved: existing.has(tx.reference) }))
    setTransactions(marked)
    setOverrides({})
    setApproved({ 1: false, 2: false })
    setSavedCount(0)
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

  const handleCategoryChange = async (ref, value) => {
    if (value === ADD_CATEGORY) {
      const c = await addCategory()
      if (c) setOverrides(prev => ({ ...prev, [ref]: c }))
      return
    }
    setOverrides(prev => ({ ...prev, [ref]: value }))
  }

  const handleApproveAll = (tier) => {
    setApproved(prev => ({ ...prev, [tier]: true }))
  }

  // Whether a transaction is ready to save right now (approved tier, or assigned tier 3).
  const isReady = (tx) => {
    if (tx.alreadySaved) return false
    if (tx.tier === 3) return !!overrides[tx.reference]
    if (tx.tier === 1) return approved[1]
    if (tx.tier === 2) return approved[2]
    return false
  }

  // Commit only what's ready now, in batches. Saved rows are marked alreadySaved so
  // they drop out of the pending list and you can keep working through the rest.
  const commit = async () => {
    const pending = transactions.filter(isReady)
    if (pending.length === 0) return
    setCommitting(true)
    try {
      const toCommit = pending.map(tx => {
        const override = overrides[tx.reference]
        const [cat, sub] = override ? splitCategory(override) : [tx.category, tx.subcategory]
        // Only send columns that exist on the transactions table. categoriseBatch
        // adds `confidence` and `tier` for the UI, which PostgREST rejects (PGRST204)
        // and which would fail the entire upsert if spread in.
        return {
          date: tx.date,
          description: tx.description,
          amount: tx.amount,
          balance: tx.balance,
          reference: tx.reference,
          account: tx.account,
          type: tx.type,
          category: cat,
          subcategory: sub,
          reviewed: true,
        }
      })
      await upsertTransactions(toCommit)
      // Learn from manual assignments: the same merchant will auto-categorise next time.
      const learnSeen = new Set()
      for (const tx of pending) {
        if (!overrides[tx.reference]) continue
        const key = merchantKey(tx.description)
        if (!key || learnSeen.has(key)) continue
        learnSeen.add(key)
        const [cat, sub] = splitCategory(overrides[tx.reference])
        upsertRule(key, cat, sub, 1).catch(e => console.error('learn rule failed', e))
      }
      const savedRefs = new Set(pending.map(tx => tx.reference))
      setTransactions(prev => prev.map(tx => (savedRefs.has(tx.reference) ? { ...tx, alreadySaved: true } : tx)))
      setSavedCount(n => n + pending.length)
    } catch (e) {
      console.error(e)
      alert('Error saving transactions. Check your Supabase connection.')
    } finally {
      setCommitting(false)
    }
  }

  // Only new (not-yet-saved) rows are reviewed/committed; already-saved ones are skipped.
  const newTx = transactions.filter(tx => !tx.alreadySaved)
  const alreadyCount = transactions.length - newTx.length
  const tier1 = newTx.filter(tx => tx.tier === 1)
  const tier2 = newTx.filter(tx => tx.tier === 2)
  const tier3 = newTx.filter(tx => tx.tier === 3)
  const readyCount = newTx.filter(isReady).length

  const summaryData = newTx.reduce((acc, tx) => {
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {alreadyCount > 0
                    ? `${alreadyCount} already imported — skipped · ${newTx.length} new`
                    : `${newTx.length} new transactions`}
                </div>
                <button onClick={clearSession} style={{ fontSize: 11, padding: '3px 8px', background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-2)', cursor: 'pointer' }}>
                  Clear
                </button>
              </div>

              <div className="metric-grid" style={{ marginBottom: '1rem' }}>
                <div className="metric"><div className="metric-label">New</div><div className="metric-value blue">{newTx.length}</div></div>
                <div className="metric"><div className="metric-label">Auto-assigned</div><div className="metric-value green">{tier1.length + tier2.length}</div></div>
                <div className="metric"><div className="metric-label">Needs review</div><div className="metric-value amber">{tier3.length}</div></div>
                <div className="metric"><div className="metric-label">Total spend</div><div className="metric-value red">{formatCurrencyFull(newTx.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0))}</div></div>
              </div>

              {newTx.length === 0 && (
                <div className={savedCount > 0 ? 'alert-success' : 'alert'} style={{ marginBottom: '1rem' }}>
                  {savedCount > 0
                    ? `All done — ${savedCount} transaction${savedCount === 1 ? '' : 's'} saved this session. They'll appear in the Overview once the month is selected.`
                    : 'Every transaction in this file is already in your data — nothing new to import.'}
                </div>
              )}

              {newTx.length > 0 && (
                <>
                  <div className="divider" />
                  <TierSection tier={1} transactions={tier1} overrides={overrides} categories={categories} onCategoryChange={handleCategoryChange} onApproveAll={handleApproveAll} approved={approved[1]} />
                  <TierSection tier={2} transactions={tier2} overrides={overrides} categories={categories} onCategoryChange={handleCategoryChange} onApproveAll={handleApproveAll} approved={approved[2]} />
                  <TierSection tier={3} transactions={tier3} overrides={overrides} categories={categories} onCategoryChange={handleCategoryChange} onApproveAll={handleApproveAll} approved={approved[3]} />

                  <div className="divider" />
                  {savedCount > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, textAlign: 'center' }}>
                      ✓ {savedCount} saved so far · {newTx.length} still to review
                    </div>
                  )}
                  <button className="btn-primary btn-block" onClick={commit} disabled={committing || readyCount === 0} style={{ padding: 12 }}>
                    {committing ? 'Saving…' : readyCount > 0 ? `Save ${readyCount} ready transaction${readyCount === 1 ? '' : 's'}` : 'Assign or approve some to save'}
                  </button>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', marginTop: 6 }}>
                    Save in batches — assign a few, save them, and the rest stay here for later.
                  </div>
                </>
              )}
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
            These rules are learned from categories you assign. Assign a category to an unknown payee and commit — next time a transaction from that merchant auto-categorises. Built-in rules (Tesco, salary, mortgage, etc.) also apply on top.
          </div>
          {learnedRules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)', fontSize: 13 }}>
              No learned rules yet. Assign categories to unknown transactions and they'll appear here.
            </div>
          ) : (
            <div className="card">
              <div className="card-body">
                {learnedRules.map(rule => (
                  <div className="line-item" key={rule.merchant_pattern}>
                    <span className="line-key" style={{ fontSize: 11, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{rule.merchant_pattern}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, flexShrink: 0 }}>{rule.category} — {rule.subcategory}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
