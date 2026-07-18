// Core financial calculations

export const MORTGAGE_PARTS = [
  { id: 1, balance: 30885.54, rate: 0.0159, fixedUntil: '2029-03-02', termYears: 11, label: 'Part 1' },
  { id: 2, balance: 14687.98, rate: 0.0414, fixedUntil: '2029-01-10', termYears: 2.5, label: 'Part 2' },
  { id: 3, balance: 16929.76, rate: 0.0379, fixedUntil: '2030-01-02', termYears: 13.25, label: 'Part 3' },
  { id: 4, balance: 90734.78, rate: 0.0379, fixedUntil: '2030-01-02', termYears: 11.75, label: 'Part 4' },
]

export const DEFAULTS = {
  gavGross: 115000,
  claireGross: 60000,
  gavPensionPot: 630000,
  gavPensionContrib: 28000,
  gavCarryForward: 42000,
  gavContribFrom2027: 37000,
  clairePensionAnnual: 15000,
  clairePensionStartAge: 59,
  isaBalance: 33000,
  isaMonthly: 1000,
  gavDOB: '1977-03-03',
  claireDOB: '1975-10-01',
  carAllowanceMonthly: 740,
  carAllowanceStartDate: '2028-01-01',
  bikValue: 5000,
  growthRate: 0.06,
}

export function monthlyMortgagePayment(balance, annualRate, termYears) {
  if (balance <= 0) return 0
  const r = annualRate / 12
  const n = termYears * 12
  if (r === 0) return balance / n
  return (balance * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

export function totalMortgagePayment(parts = MORTGAGE_PARTS) {
  return parts.reduce((sum, p) => sum + monthlyMortgagePayment(p.balance, p.rate, p.termYears), 0)
}

export function blendedMortgageRate(parts = MORTGAGE_PARTS) {
  const totalBal = parts.reduce((s, p) => s + p.balance, 0)
  const weightedRate = parts.reduce((s, p) => s + p.rate * p.balance, 0)
  return weightedRate / totalBal
}

export function payoffMonths(balance, monthlyOverpay, annualRate) {
  if (balance <= 0) return 0
  const r = annualRate / 12
  if (monthlyOverpay <= balance * r) return Infinity
  return Math.ceil(Math.log(monthlyOverpay / (monthlyOverpay - balance * r)) / Math.log(1 + r))
}

export function ageAt(dob, date = new Date()) {
  const d = new Date(dob)
  let age = date.getFullYear() - d.getFullYear()
  const m = date.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && date.getDate() < d.getDate())) age--
  return age
}

export function retirementYear(dob, retireAge) {
  return new Date(dob).getFullYear() + retireAge
}

export function projectPension(startPot, contributions, growthRate, years) {
  // contributions: array of annual amounts, one per year
  let pot = startPot
  const snapshots = []
  for (let y = 0; y < years; y++) {
    const contrib = Array.isArray(contributions) ? (contributions[y] || 0) : contributions
    pot = (pot + contrib) * (1 + growthRate)
    snapshots.push(Math.round(pot))
  }
  return snapshots
}

export function projectISA(startBalance, monthlyContrib, growthRate, months) {
  let bal = startBalance
  const snapshots = []
  for (let m = 0; m < months; m++) {
    bal = (bal + monthlyContrib) * (1 + growthRate / 12)
    if ((m + 1) % 12 === 0) snapshots.push(Math.round(bal))
  }
  return snapshots
}

export function effectiveMarginalRate(grossIncome) {
  // UK 2024/25 rates
  if (grossIncome <= 100000) return 0.40
  if (grossIncome <= 125140) return 0.60 // Personal allowance taper
  return 0.45
}

export function netSalary(gross) {
  const personalAllowance = gross > 125140 ? 0 : gross > 100000 ? 12570 - (gross - 100000) / 2 : 12570
  const taxable = Math.max(0, gross - personalAllowance)
  const basicRate = Math.min(taxable, 50270 - 12570) * 0.20
  const higherRate = Math.max(0, Math.min(taxable - (50270 - personalAllowance), 125140 - 50270)) * 0.40
  const additionalRate = Math.max(0, taxable - (125140 - personalAllowance)) * 0.45
  const tax = basicRate + higherRate + additionalRate
  // NI: 12% on £12,570–£50,270, 2% above
  const niBasic = Math.min(Math.max(0, gross - 12570), 50270 - 12570) * 0.08
  const niHigher = Math.max(0, gross - 50270) * 0.02
  const ni = niBasic + niHigher
  return Math.round(gross - tax - ni)
}

export function pensionSacrificeNet(gross, sacrificeAmount) {
  // Salary sacrifice reduces NI-able pay
  const reduced = gross - sacrificeAmount
  return netSalary(reduced)
}

export function formatCurrency(n, decimals = 0) {
  if (n === null || n === undefined) return '—'
  const abs = Math.abs(n)
  const formatted = abs >= 1000000
    ? `£${(abs / 1000000).toFixed(2)}m`
    : abs >= 1000
    ? `£${Math.round(abs / 1000)}k`
    : `£${abs.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
  return n < 0 ? `-${formatted}` : formatted
}

export function formatCurrencyFull(n) {
  if (n === null || n === undefined) return '—'
  return `£${Math.round(Math.abs(n)).toLocaleString('en-GB')}`
}

export function addMonthsToDate(months, from = new Date(2026, 6, 1)) {
  const d = new Date(from)
  d.setMonth(d.getMonth() + Math.round(months))
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

export function monthsBetween(from, to) {
  const a = new Date(from), b = new Date(to)
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
}

// Group transactions by category for summary
export function summariseByCategory(transactions) {
  const out = {}
  for (const tx of transactions) {
    if (tx.category === 'Internal' || tx.category === 'Income') continue
    if (tx.amount >= 0) continue
    const key = `${tx.category} — ${tx.subcategory}`
    out[key] = (out[key] || 0) + Math.abs(tx.amount)
  }
  return Object.entries(out)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amount]) => ({ cat, amount: Math.round(amount) }))
}

export function totalIncome(transactions) {
  return transactions
    .filter(tx => tx.category === 'Income' && tx.amount > 0)
    .reduce((s, tx) => s + tx.amount, 0)
}

export function totalSpend(transactions) {
  return transactions
    .filter(tx => tx.category !== 'Internal' && tx.category !== 'Income' && tx.amount < 0)
    .reduce((s, tx) => s + Math.abs(tx.amount), 0)
}
