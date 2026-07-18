import React, { useState } from 'react'
import { DEFAULTS, effectiveMarginalRate, formatCurrencyFull, formatCurrency } from '../lib/finance'

const BASE_INCOME = 8095
const BASE_FIXED = 1820 // fixed costs excl ISA and mortgage

export default function WhatIf() {
  const [groceries, setGroceries] = useState(800)
  const [eatingOut, setEatingOut] = useState(240)
  const [gavSpend, setGavSpend] = useState(107)
  const [claireSpend, setClaire] = useState(40)
  const [isaMonthly, setIsa] = useState(1000)
  const [mortgageOv, setMortgageOv] = useState(0)
  const [caPct, setCaPct] = useState(100)
  const [carPrice, setCarPrice] = useState(28000)
  const [carDeposit, setCarDeposit] = useState(5000)
  const [fundMode, setFundMode] = useState('loan')

  const varSpend = groceries + eatingOut + (gavSpend * 4) + (claireSpend * 4)
  const totalOut = BASE_FIXED + isaMonthly + mortgageOv + varSpend
  const surplus = BASE_INCOME - totalOut
  const annualSurplus = surplus * 12

  // Car allowance tax
  const caAnnual = DEFAULTS.carAllowanceMonthly * 12
  const intoSal = Math.round(caAnnual * (1 - caPct / 100))
  const intoPen = Math.round(caAnnual * (caPct / 100))
  const gross = DEFAULTS.gavGross + intoSal
  const margRate = effectiveMarginalRate(gross)
  const taxOnSal = Math.round(intoSal * margRate)
  const netExtra = Math.round((intoSal - taxOnSal) / 12)
  const inTaper = gross > 100000 && gross < 125140

  // Car finance
  const borrow = Math.max(0, carPrice - carDeposit)
  const loanMonthly = fundMode === 'loan'
    ? Math.round(borrow * (0.07 / 12 * Math.pow(1 + 0.07 / 12, 60)) / (Math.pow(1 + 0.07 / 12, 60) - 1))
    : fundMode === 'mortgage'
    ? Math.round(borrow * (0.045 / 12 * Math.pow(1 + 0.045 / 12, 120)) / (Math.pow(1 + 0.045 / 12, 120) - 1))
    : 0
  const isaAt2027 = Math.round(33000 * Math.pow(1.06, 1.33) + 1000 * 12 * 1.33)

  return (
    <div className="page">
      <h1 className="page-title">What if</h1>

      <div className="section-label">Monthly cash flow</div>
      {[
        { label: 'Groceries (monthly)', val: groceries, set: setGroceries, min: 400, max: 1400, step: 50, suffix: '/mo' },
        { label: 'Eating out (monthly)', val: eatingOut, set: setEatingOut, min: 0, max: 600, step: 20, suffix: '/mo' },
        { label: 'Gavin spending (weekly)', val: gavSpend, set: setGavSpend, min: 0, max: 300, step: 5, suffix: '/wk' },
        { label: 'Claire spending (weekly)', val: claireSpend, set: setClaire, min: 0, max: 200, step: 5, suffix: '/wk' },
        { label: 'Stocks ISA (monthly)', val: isaMonthly, set: setIsa, min: 0, max: 1667, step: 50, suffix: '/mo' },
        { label: 'Mortgage overpayment', val: mortgageOv, set: setMortgageOv, min: 0, max: 1000, step: 50, suffix: '/mo' },
      ].map(s => (
        <div className="slider-row" key={s.label}>
          <div className="slider-label"><span>{s.label}</span><span className="slider-val">{formatCurrencyFull(s.val)}{s.suffix}</span></div>
          <input type="range" min={s.min} max={s.max} step={s.step} value={s.val} onChange={e => s.set(+e.target.value)} />
        </div>
      ))}

      <div className="metric-grid">
        <div className="metric"><div className="metric-label">Monthly surplus</div><div className={`metric-value ${surplus >= 0 ? 'green' : 'red'}`}>{formatCurrencyFull(Math.abs(surplus))}{surplus < 0 ? ' deficit' : ''}</div></div>
        <div className="metric"><div className="metric-label">Annual surplus</div><div className={`metric-value ${annualSurplus >= 0 ? 'blue' : 'red'}`}>{formatCurrency(Math.abs(annualSurplus))}</div></div>
        <div className="metric"><div className="metric-label">ISA in 8 years</div><div className="metric-value green">{formatCurrency(Math.round(33000 * Math.pow(1.06, 8) + isaMonthly * 12 * 8 * 1.03))}</div></div>
        <div className="metric"><div className="metric-label">Pension @ 57</div><div className="metric-value blue">{formatCurrency(Math.round((630000 + 70000) * Math.pow(1.06, 7) * 1.06))}</div></div>
      </div>

      <div className="divider" />
      <div className="section-label">Car allowance — Jan 2028</div>
      <div className="slider-row">
        <div className="slider-label"><span>% of £740/mo into pension</span><span className="slider-val">{caPct}%</span></div>
        <input type="range" min={0} max={100} step={10} value={caPct} onChange={e => setCaPct(+e.target.value)} />
      </div>
      <div className="metric-grid">
        <div className="metric"><div className="metric-label">Into pension/yr</div><div className="metric-value green">{formatCurrencyFull(intoPen)}</div></div>
        <div className="metric"><div className="metric-label">Extra take-home/mo</div><div className={`metric-value ${netExtra > 0 ? 'blue' : ''}`}>{netExtra > 0 ? '+' : ''}{formatCurrencyFull(netExtra)}</div></div>
        <div className="metric"><div className="metric-label">BIK saving/yr</div><div className="metric-value green">+£2,000</div></div>
        <div className="metric"><div className="metric-label">Marginal rate</div><div className={`metric-value ${inTaper ? 'red' : 'amber'}`}>{Math.round(margRate * 100)}%{inTaper ? ' taper' : ''}</div></div>
      </div>
      {inTaper && caPct < 100 && (
        <div className="alert">Income in 60% personal allowance taper. Sacrificing more into pension saves significant tax.</div>
      )}
      {caPct === 100 && (
        <div className="alert-success">Full sacrifice: zero income tax on allowance. BIK saving adds +£167/mo net.</div>
      )}

      <div className="divider" />
      <div className="section-label">Car purchase — Nov 2027</div>
      <div className="slider-row">
        <div className="slider-label"><span>Car price</span><span className="slider-val">{formatCurrencyFull(carPrice)}</span></div>
        <input type="range" min={20000} max={35000} step={500} value={carPrice} onChange={e => setCarPrice(+e.target.value)} />
      </div>
      <div className="slider-row">
        <div className="slider-label"><span>Deposit / trade-in</span><span className="slider-val">{formatCurrencyFull(carDeposit)}</span></div>
        <input type="range" min={0} max={15000} step={500} value={carDeposit} onChange={e => setCarDeposit(+e.target.value)} />
      </div>
      <div className="seg-ctrl">
        {[['loan', 'Personal loan'], ['mortgage', 'Add to mortgage'], ['isa', 'Use ISA']].map(([k, l]) => (
          <button key={k} className={`seg-btn ${fundMode === k ? 'active' : ''}`} onClick={() => setFundMode(k)}>{l}</button>
        ))}
      </div>
      <div className="metric-grid">
        <div className="metric"><div className="metric-label">Amount to borrow/use</div><div className="metric-value">{formatCurrencyFull(borrow)}</div></div>
        <div className="metric"><div className="metric-label">Monthly cost</div><div className={`metric-value ${loanMonthly > 0 ? 'red' : 'green'}`}>{loanMonthly > 0 ? formatCurrencyFull(loanMonthly) + '/mo' : 'None'}</div></div>
        {fundMode === 'isa' && <div className="metric"><div className="metric-label">ISA est. Nov 2027</div><div className="metric-value blue">{formatCurrencyFull(isaAt2027)}</div></div>}
        {fundMode === 'isa' && <div className="metric"><div className="metric-label">ISA remaining</div><div className={`metric-value ${isaAt2027 - borrow > 0 ? 'green' : 'red'}`}>{formatCurrencyFull(Math.max(0, isaAt2027 - borrow))}</div></div>}
        {fundMode === 'loan' && <div className="metric"><div className="metric-label">Rate</div><div className="metric-value amber">~7%</div></div>}
        {fundMode === 'loan' && <div className="metric"><div className="metric-label">Total interest</div><div className="metric-value red">{formatCurrencyFull(Math.round(loanMonthly * 60 - borrow))}</div></div>}
        {fundMode === 'mortgage' && <div className="metric"><div className="metric-label">Rate assumed</div><div className="metric-value amber">~4.5%</div></div>}
        {fundMode === 'mortgage' && <div className="metric"><div className="metric-label">New mortgage total</div><div className="metric-value red">{formatCurrencyFull(153238 + borrow)}</div></div>}
      </div>
      {fundMode === 'isa' && isaAt2027 >= borrow && (
        <div className="alert-success">ISA covers the purchase — no borrowing needed and no interest cost. Recommended if ISA is treated as a spending pot, not retirement savings.</div>
      )}
      {fundMode === 'loan' && (
        <div className="alert">Personal loan keeps mortgage clean. Higher rate (7% vs 4.5%) but clears in 5 years. Best if ISA is earmarked for retirement.</div>
      )}
      {fundMode === 'mortgage' && (
        <div className="alert">Borrowing against the house for a depreciating asset. Lowest monthly cost but highest total interest. Rate uncertain at 2027 renewal.</div>
      )}
    </div>
  )
}
