import React, { useState, useEffect } from 'react'
import { getGoals, upsertGoal, deleteGoal } from '../lib/supabase'
import { formatCurrencyFull } from '../lib/finance'

const ICONS = [
  { emoji: '🔧', label: 'Home improvement' },
  { emoji: '✈️', label: 'Holiday' },
  { emoji: '🚗', label: 'Car' },
  { emoji: '🏠', label: 'Property' },
  { emoji: '🏕️', label: 'Motorhome' },
  { emoji: '📈', label: 'Investment' },
  { emoji: '💻', label: 'Tech' },
  { emoji: '🎸', label: 'Hobby' },
  { emoji: '🎓', label: 'Education' },
  { emoji: '❤️', label: 'Health' },
  { emoji: '🎁', label: 'Gift/Event' },
  { emoji: '⭐', label: 'Other' },
]

const DEFAULT_GOALS = [
  { id: 'home', name: 'Home improvements', emoji: '🔧', target: 20000, saved: 0, monthly: 150, priority: 'high', ongoing: false },
  { id: 'holiday', name: 'Annual holiday', emoji: '✈️', target: 5000, saved: 0, monthly: 100, priority: 'high', ongoing: false },
  { id: 'motorhome', name: 'Motorhome upgrades', emoji: '🏕️', target: 8000, saved: 0, monthly: 80, priority: 'medium', ongoing: false },
  { id: 'isa', name: 'ISA top-up', emoji: '📈', target: 0, saved: 0, monthly: 200, priority: 'high', ongoing: true },
  { id: 'oscar', name: 'Oscar (uni / car)', emoji: '🎓', target: 10000, saved: 0, monthly: 50, priority: 'medium', ongoing: false },
  { id: 'buffer', name: 'Emergency buffer', emoji: '❤️', target: 5000, saved: 500, monthly: 50, priority: 'high', ongoing: false },
]

const PRIORITY_BADGE = { high: 'badge-green', medium: 'badge-blue', low: 'badge-amber' }

export default function Goals() {
  const [goals, setGoals] = useState(DEFAULT_GOALS)
  const [surplus, setSurplus] = useState(500)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newGoal, setNewGoal] = useState({ name: '', emoji: '⭐', target: '', saved: '', monthly: '', priority: 'medium', ongoing: false })

  useEffect(() => {
    getGoals().then(data => {
      if (data && data.length > 0) setGoals(data)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const totalAllocated = goals.reduce((s, g) => s + (g.monthly || 0), 0)
  const unallocated = surplus - totalAllocated
  const isaGoal = goals.find(g => g.ongoing)

  const save = async (goal) => {
    try { await upsertGoal(goal) } catch (e) { console.error(e) }
  }

  const updateMonthly = (id, val) => {
    const updated = goals.map(g => g.id === id ? { ...g, monthly: +val } : g)
    setGoals(updated)
    const goal = updated.find(g => g.id === id)
    if (goal) save(goal)
  }

  const remove = async (id) => {
    setGoals(goals.filter(g => g.id !== id))
    try { await deleteGoal(id) } catch (e) { console.error(e) }
  }

  const add = async () => {
    if (!newGoal.name) return
    const goal = {
      ...newGoal,
      id: `goal-${Date.now()}`,
      target: +newGoal.target || 0,
      saved: +newGoal.saved || 0,
      monthly: +newGoal.monthly || 0,
    }
    const updated = [...goals, goal]
    setGoals(updated)
    await save(goal)
    setNewGoal({ name: '', emoji: '⭐', target: '', saved: '', monthly: '', priority: 'medium', ongoing: false })
    setShowAdd(false)
  }

  const monthsToTarget = (g) => {
    if (g.ongoing || g.target <= 0) return null
    const remaining = Math.max(0, g.target - (g.saved || 0))
    if (!g.monthly || g.monthly <= 0) return null
    return Math.ceil(remaining / g.monthly)
  }

  const targetDate = (months) => {
    if (months === null) return '—'
    const d = new Date(2026, 6, 1)
    d.setMonth(d.getMonth() + months)
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  }

  return (
    <div className="page">
      <h1 className="page-title">Goals</h1>

      <div className="slider-row">
        <div className="slider-label"><span>Monthly surplus available</span><span className="slider-val">{formatCurrencyFull(surplus)}/mo</span></div>
        <input type="range" min={100} max={1500} step={50} value={surplus} onChange={e => setSurplus(+e.target.value)} />
      </div>

      <div className="metric-grid">
        <div className="metric"><div className="metric-label">Total allocated</div><div className="metric-value blue">{formatCurrencyFull(totalAllocated)}/mo</div></div>
        <div className="metric"><div className="metric-label">Unallocated</div><div className={`metric-value ${unallocated >= 0 ? 'green' : 'red'}`}>{formatCurrencyFull(Math.abs(unallocated))}{unallocated < 0 ? ' over' : ''}</div></div>
        <div className="metric"><div className="metric-label">ISA top-up</div><div className="metric-value green">{formatCurrencyFull(isaGoal?.monthly || 0)}/mo</div></div>
        <div className="metric"><div className="metric-label">Goals tracking</div><div className="metric-value">{goals.filter(g => !g.ongoing && g.monthly > 0).length}</div></div>
      </div>

      {totalAllocated > surplus && (
        <div className="alert">Over-allocated by {formatCurrencyFull(totalAllocated - surplus)}/mo. Reduce allocations or increase available surplus.</div>
      )}
      {unallocated > 50 && (
        <div className="alert-success">{formatCurrencyFull(unallocated)}/mo unallocated — consider adding to ISA or a new goal.</div>
      )}

      <div className="divider" />
      <div className="section-label">Your goals</div>

      {goals.map(goal => {
        const months = monthsToTarget(goal)
        const pct = goal.target > 0 ? Math.min(100, Math.round((goal.saved || 0) / goal.target * 100)) : null
        return (
          <div className="goal-card" key={goal.id}>
            <div className="goal-header">
              <div className="goal-icon">{goal.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="goal-name">{goal.name}</div>
                <div className="goal-sub">
                  <span className={`badge ${PRIORITY_BADGE[goal.priority] || 'badge-amber'}`}>{goal.priority}</span>
                  {' '}
                  {goal.ongoing ? 'Ongoing' : months !== null ? `Done ${targetDate(months)}` : 'Set an allocation'}
                </div>
              </div>
              <div className="goal-right">
                <div className="goal-amount">{goal.ongoing ? formatCurrencyFull(goal.monthly) + '/mo' : formatCurrencyFull(goal.target)}</div>
                <div className="goal-freq">{goal.ongoing ? 'ongoing' : formatCurrencyFull(goal.monthly) + '/mo'}</div>
              </div>
              <button onClick={() => remove(goal.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '0 0 0 8px', fontSize: 16 }} aria-label={`Remove ${goal.name}`}>×</button>
            </div>
            <div className="card-body">
              {!goal.ongoing && goal.target > 0 && (
                <>
                  <div className="prog-wrap">
                    <div className="prog-bar" style={{ width: `${pct}%`, background: 'var(--blue)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-3)', marginBottom: 8 }}>
                    <span>{formatCurrencyFull(goal.saved || 0)} saved</span>
                    <span>{pct}% of {formatCurrencyFull(goal.target)}</span>
                  </div>
                </>
              )}
              <div className="line-item">
                <span className="line-key">{goal.ongoing ? 'Monthly contribution' : 'Monthly allocation'}</span>
                <input
                  type="number" value={goal.monthly} min={0} max={2000} step={10}
                  style={{ width: 80, textAlign: 'right', fontSize: 13, fontWeight: 500 }}
                  onChange={e => updateMonthly(goal.id, e.target.value)}
                />
              </div>
              {!goal.ongoing && (
                <div className="line-item">
                  <span className="line-key">Target date</span>
                  <span className={`line-val ${months !== null && months < 24 ? 'green' : months !== null && months < 48 ? 'amber' : 'red'}`}>{targetDate(months)}</span>
                </div>
              )}
              {goal.ongoing && (
                <div className="line-item">
                  <span className="line-key">Annual ISA contribution (total)</span>
                  <span className="line-val green">{formatCurrencyFull((1000 + (goal.monthly || 0)) * 12)}/yr</span>
                </div>
              )}
            </div>
          </div>
        )
      })}

      <div className="divider" />
      <button className="btn-block" onClick={() => setShowAdd(!showAdd)} style={{ marginBottom: 8 }}>
        {showAdd ? 'Cancel' : '+ Add a goal'}
      </button>

      {showAdd && (
        <div className="card">
          <div className="card-body">
            <div style={{ marginBottom: 10 }}>
              <label className="form-label">Goal name</label>
              <input type="text" value={newGoal.name} onChange={e => setNewGoal({ ...newGoal, name: e.target.value })} placeholder="e.g. Kitchen renovation" />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label className="form-label">Icon</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginBottom: 10 }}>
                {ICONS.map(ic => (
                  <button key={ic.emoji} onClick={() => setNewGoal({ ...newGoal, emoji: ic.emoji })}
                    style={{ background: newGoal.emoji === ic.emoji ? 'var(--blue-bg)' : 'var(--surface-2)', border: `${newGoal.emoji === ic.emoji ? '2px solid var(--blue)' : '0.5px solid var(--border)'}`, borderRadius: 'var(--radius)', padding: 6, cursor: 'pointer', fontSize: 18 }}
                    title={ic.label} aria-label={ic.label}>{ic.emoji}</button>
                ))}
              </div>
            </div>
            <div className="form-grid">
              <div><label className="form-label">Target amount</label><input type="number" value={newGoal.target} onChange={e => setNewGoal({ ...newGoal, target: e.target.value })} placeholder="15000" /></div>
              <div><label className="form-label">Already saved</label><input type="number" value={newGoal.saved} onChange={e => setNewGoal({ ...newGoal, saved: e.target.value })} placeholder="0" /></div>
              <div><label className="form-label">Monthly allocation</label><input type="number" value={newGoal.monthly} onChange={e => setNewGoal({ ...newGoal, monthly: e.target.value })} placeholder="100" /></div>
              <div>
                <label className="form-label">Priority</label>
                <select value={newGoal.priority} onChange={e => setNewGoal({ ...newGoal, priority: e.target.value })}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <input type="checkbox" id="ongoing" checked={newGoal.ongoing} onChange={e => setNewGoal({ ...newGoal, ongoing: e.target.checked })} />
              <label htmlFor="ongoing" style={{ fontSize: 13, color: 'var(--text-2)' }}>Ongoing contribution (no target date)</label>
            </div>
            <button className="btn-primary btn-block" onClick={add}>Add goal</button>
          </div>
        </div>
      )}
    </div>
  )
}
