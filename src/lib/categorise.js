// Categorisation engine
// Rules are checked in order — first match wins
// confidence: 1 = auto-assign silent, 0.7 = auto-assign flag, <0.7 = needs review

// Canonical assignable categories ('Letter — Subcategory'), shared by the import
// review dropdowns and the in-app transaction editor. A = fixed, B = variable but
// near-essential, C = variable discretionary; plus Income and Internal transfers.
export const ALL_CATEGORIES = [
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

// Split a 'Letter — Subcategory' string on the FIRST separator only, so subcategories
// that themselves contain ' — ' (e.g. 'Oscar — school') survive intact.
export function splitCategory(value) {
  const sep = value.indexOf(' — ')
  return sep === -1 ? [value, ''] : [value.slice(0, sep), value.slice(sep + 3)]
}

// The five fixed top-level buckets. New categories are always a subcategory under one
// of these, so the Overview A/B/C summary sections keep working.
export const CATEGORY_BUCKETS = ['A', 'B', 'C', 'Income', 'Internal']

// Sentinel value used as the "＋ Add new category…" dropdown option.
export const ADD_CATEGORY = '__add_new_category__'

// Prompt the user to define a new subcategory under an existing bucket.
// Returns a 'Bucket — Subcategory' string, or null if cancelled/invalid.
export function promptForNewCategory() {
  const name = (window.prompt('New category — name of the subcategory?') || '').trim()
  if (!name) return null
  const raw = (window.prompt('Which bucket? A = fixed · B = essential-ish · C = discretionary · or Income / Internal', 'C') || '').trim()
  const bucket = CATEGORY_BUCKETS.find(b => b.toLowerCase() === raw.toLowerCase())
  if (!bucket) { window.alert('Bucket must be one of: A, B, C, Income, Internal.'); return null }
  return `${bucket} — ${name}`
}

export const DEFAULT_RULES = [
  // A — Fixed
  { pattern: /SANTANDER MORTGAGE/i, category: 'A', subcategory: 'Mortgage', confidence: 1 },
  { pattern: /VIRGIN MONEY/i, category: 'A', subcategory: 'Credit card', confidence: 1 },
  { pattern: /HALIFAX/i, category: 'A', subcategory: 'Credit card', confidence: 1 },
  { pattern: /SANTANDERCARDS/i, category: 'A', subcategory: 'Credit card', confidence: 1 },
  { pattern: /CREATION\.CO\.UK/i, category: 'A', subcategory: 'Credit card', confidence: 1 },
  { pattern: /ANNUAL FEE/i, category: 'A', subcategory: 'Banking', confidence: 1 },
  { pattern: /HLAM.*ISA|S.S ISA/i, category: 'A', subcategory: 'Stocks ISA', confidence: 1 },
  { pattern: /HLAM REGULAR SAVIN/i, category: 'A', subcategory: 'Cash saving', confidence: 1 },
  { pattern: /FUTURE COMPASS/i, category: 'A', subcategory: 'Business setup (one-off)', confidence: 1 },
  { pattern: /LIFE.*INSURANCE|INSURANCE.*LIFE/i, category: 'A', subcategory: 'Life insurance', confidence: 1 },

  // A — Housing fixed costs
  { pattern: /OCTOPUS ENERGY|OVO ENERGY|BRITISH GAS/i, category: 'A', subcategory: 'Energy', confidence: 1 },
  { pattern: /VIRGIN MEDIA/i, category: 'A', subcategory: 'Broadband', confidence: 1 },
  { pattern: /RUSHCLIFFE BC|RUSHCLIFFE BORO.*COUNCIL TAX/i, category: 'A', subcategory: 'Council tax', confidence: 1 },
  { pattern: /SEVERN TRENT/i, category: 'A', subcategory: 'Water', confidence: 1 },
  { pattern: /TV LICEN/i, category: 'A', subcategory: 'TV licence', confidence: 1 },

  // B — Minimum costs
  { pattern: /TESCO|ASDA|MORRISONS|MORR |SAINSBURY|ALDI|LIDL|CO-OP|WAITROSE|MARKS.SPENCER|M&S FOOD|PORLOCK BAY|EAST BRIDGFORD GDN|GRASSHOPPER/i, category: 'B', subcategory: 'Groceries', confidence: 1 },
  { pattern: /EE DEVICE|EE MOBILE|THREE|O2 |SMARTY|GIFFGAFF/i, category: 'B', subcategory: 'Mobile', confidence: 1 },
  { pattern: /NETFLIX|AMAZON PRIME|DISNEY|PEACOCK|SPOTIFY|APPLE\.COM\/BILL/i, category: 'B', subcategory: 'Streaming', confidence: 1 },
  { pattern: /YGT FITNESS|VIRGIN ACTIVE|PURE GYM|NUFFIELD/i, category: 'B', subcategory: 'Gym', confidence: 1 },
  { pattern: /ANTHROPIC/i, category: 'B', subcategory: 'Subscriptions', confidence: 1 },
  { pattern: /PARENTPAY/i, category: 'B', subcategory: 'Oscar — school', confidence: 1 },
  { pattern: /OSCAR PHIPPS/i, category: 'B', subcategory: 'Oscar spending', confidence: 1 },

  // Salary inflows
  { pattern: /3M UK/i, category: 'Income', subcategory: 'Gavin wages', confidence: 1 },
  { pattern: /NOTTINGHAM TRENT/i, category: 'Income', subcategory: 'Claire wages', confidence: 1 },
  { pattern: /MS K.*PHIPPS|MR R.*PHIPPS/i, category: 'Income', subcategory: 'Mortgage contribution', confidence: 1 },

  // Internal transfers
  { pattern: /TRANSFER.*CLAIRE CLARKE|TRANSFER.*PHIPPS/i, category: 'Internal', subcategory: 'Transfer', confidence: 1 },
  { pattern: /REGULAR TRANSFER.*072877508|REGULAR TRANSFER.*090129 72877508/i, category: 'Internal', subcategory: 'Holiday savings', confidence: 1 },
  { pattern: /REGULAR TRANSFER.*092032381|REGULAR TRANSFER.*090129 92032381/i, category: 'Internal', subcategory: 'Motorhome fund', confidence: 1 },
  { pattern: /MORTGAGE2606|033445463/i, category: 'A', subcategory: 'Mortgage overpayment', confidence: 1 },

  // C — Extra costs
  { pattern: /SNOWCOMPARE|OXYGENE SKI|SNOWDOME|HPY\*SRS|HPY\*SKIMIUM|SKIDDLE|RYANAIR|LUTON AIRPORT|JET2|AIRBNB|BOOKING\.COM|HOLIDAY|EASYJET/i, category: 'C', subcategory: 'Holidays', confidence: 1 },
  { pattern: /SARL CLUB HOUSE|LA FOLIE DOUCE|HAMEAUX|BAR DE L|HAPPY MARMOTTE|VAL D.ISERE|INTERMARCHE|CAFE PALHINHAS|MAR D.ESTORIAS|AREAS PORTUGAL/i, category: 'C', subcategory: 'Holidays', confidence: 1 },
  { pattern: /BOLT MEDICAL/i, category: 'C', subcategory: 'Health', confidence: 1 },
  { pattern: /RUSHCLIFFE VET|VETS|VET /i, category: 'C', subcategory: 'Cats', confidence: 1 },
  { pattern: /LADY BAY DENTAL|DENTAL/i, category: 'C', subcategory: 'Health', confidence: 1 },
  { pattern: /MAHARISHI|SPORTPURSUIT|STEADYRACK|DECATHLON|RIPPL IMPACT|BIKEPARTS|THE BIKE HOUSE|SP WOLF MOON|SCAMP AND DUDE/i, category: 'C', subcategory: 'Clothing and sport', confidence: 1 },
  { pattern: /COMFORT-INSURANCE|DVLA EVL|MOTORHOME|CARAVAN/i, category: 'C', subcategory: 'Motorhome', confidence: 1 },
  { pattern: /IKEA/i, category: 'C', subcategory: 'Home improvements', confidence: 1 },
  { pattern: /FLIGHTCLUB|RESIDENT ADVISOR|TRCH|FORESTRY ENGLAND|WONDERLAND|SKIDDLE/i, category: 'C', subcategory: 'Leisure', confidence: 1 },
  { pattern: /SUSTRANS|RED CROSS|GREENPEACE|WWF|RSPB|UNICEF|ACTION AID|AMNESTY|SCOPE|UCU|FRIARY/i, category: 'C', subcategory: 'Charity', confidence: 1 },
  { pattern: /NATIONAL TRUST/i, category: 'C', subcategory: 'Charity', confidence: 1 },
  { pattern: /WOLF MOON|SCAMP AND DUDE|JUST GIVING/i, category: 'C', subcategory: 'Gifting', confidence: 1 },
  { pattern: /CASH WITHDRAWAL|ATM/i, category: 'C', subcategory: 'Cash', confidence: 0.8 },
  { pattern: /RESTAURANT|BISTRO|CAFE|COFFEE|PIZZA|NANDO|WAGAMAMA|MCDONALDS|KFC|SUBWAY|COSTA|STARBUCKS|PRET/i, category: 'C', subcategory: 'Eating out', confidence: 0.9 },
  { pattern: /PARKING|NTCP|CAR PARK/i, category: 'C', subcategory: 'Transport', confidence: 0.9 },
  { pattern: /FUEL|PETROL|SHELL|BP |ESSO|TEXACO/i, category: 'C', subcategory: 'Fuel', confidence: 1 },
  { pattern: /AMAZON/i, category: 'C', subcategory: 'Other', confidence: 0.6 },
  { pattern: /KLARNA/i, category: 'C', subcategory: 'Clothing and sport', confidence: 0.7 },
  { pattern: /RUSHCLIFFE BOROUGH COUN/i, category: 'C', subcategory: 'Garden/Household', confidence: 1 },
  { pattern: /1STFORMATIONS/i, category: 'A', subcategory: 'Business setup (one-off)', confidence: 1 },
  { pattern: /V12 RETAIL/i, category: 'A', subcategory: 'Credit card', confidence: 1 },
]

export function categorise(merchantDescription, customRules = []) {
  const allRules = [...customRules, ...DEFAULT_RULES]
  for (const rule of allRules) {
    if (rule.pattern.test(merchantDescription)) {
      return {
        category: rule.category,
        subcategory: rule.subcategory,
        confidence: rule.confidence,
        tier: rule.confidence >= 1 ? 1 : rule.confidence >= 0.7 ? 2 : 3
      }
    }
  }
  return { category: '?', subcategory: 'Needs review', confidence: 0, tier: 3 }
}

export function categoriseBatch(transactions, customRules = []) {
  return transactions.map(tx => ({
    ...tx,
    ...categorise(tx.description || tx.merchant || '', customRules)
  }))
}

// Two genuinely-distinct transactions can share date+description+amount (e.g. two
// identical same-day purchases), producing an identical reference. That collides the
// upsert's onConflict:'reference' and Postgres rejects the WHOLE batch with a
// cardinality error ("cannot affect row a second time"). Append a deterministic
// counter to any duplicates so references are unique — and stable on re-import, since
// the same file in the same order yields the same suffixes.
export function ensureUniqueReferences(transactions) {
  const counts = {}
  for (const t of transactions) {
    const base = t.reference
    counts[base] = (counts[base] || 0) + 1
    if (counts[base] > 1) t.reference = `${base}#${counts[base]}`
  }
  return transactions
}

// Parse Santander XLS (served as HTML)
// Columns: 0=empty, 1=Date, 2=empty, 3=Description, 4=empty, 5=Money in, 6=Money Out, 7=Balance
export function parseSantanderHTML(text) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'text/html')
  const rows = Array.from(doc.querySelectorAll('tr'))
  const transactions = []
  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim())
    if (cells.length < 8) continue
    const dateStr = cells[1]
    if (!dateStr || !/\d{2}\/\d{2}\/\d{4}/.test(dateStr)) continue
    const [d, m, y] = dateStr.split('/')
    const date = `${y}-${m}-${d}`
    const description = cells[3] || ''
    if (!description || description === 'Description') continue
    // Allowlist digits/dot/minus so any currency symbol, thousands separator or
    // stray encoding artefact (e.g. U+FFFD from a mis-decoded £) is stripped.
    const cleanAmt = v => {
      const s = (v || '').replace(/[^0-9.-]/g, '')
      const n = parseFloat(s)
      return isNaN(n) ? 0 : Math.abs(n)
    }
    const moneyIn = cleanAmt(cells[5])
    const moneyOut = cleanAmt(cells[6])
    const balance = cleanAmt(cells[7])
    if (moneyIn === 0 && moneyOut === 0) continue
    const amount = moneyIn > 0 ? moneyIn : -moneyOut
    // Include the running balance: it differs between two otherwise-identical
    // same-day transactions, so references stay distinct (and stable on re-import).
    const reference = `SAN-${date}-${description.slice(0, 30)}-${Math.abs(amount)}-B${balance}`.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_.]/g, '')
    transactions.push({ date, description, amount, balance, reference, account: 'Santander current', type: moneyIn > 0 ? 'credit' : 'debit' })
  }
  return ensureUniqueReferences(transactions)
}

// Parse Santander Midata CSV (semicolon separated, amounts as -£34.59)
export function parseSantanderMidata(text) {
  const lines = text.split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const transactions = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';').map(c => c.trim().replace(/"/g, ''))
    if (cols.length < 4) continue
    const dateStr = cols[0]
    if (!dateStr || !/\d{2}\/\d{2}\/\d{4}/.test(dateStr)) continue
    const [d, m, y] = dateStr.split('/')
    const date = `${y}-${m}-${d}`
    const description = cols[2] || cols[1] || 'Unknown'
    // Midata amounts are signed (e.g. -£34.59 / +£12.00) — keep +/- but drop £ etc.
    const amtStr = (cols[3] || '').replace(/[^0-9.+-]/g, '')
    const amount = parseFloat(amtStr) || 0
    const balStr = (cols[4] || '').replace(/[^0-9.+-]/g, '')
    const balance = Math.abs(parseFloat(balStr) || 0)
    if (amount === 0) continue
    const reference = `SAN-${date}-${description.slice(0, 20)}-${Math.abs(amount)}-B${balance}`.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_.]/g, '')
    transactions.push({ date, description, amount, balance, reference, account: 'Santander current', type: amount > 0 ? 'credit' : 'debit' })
  }
  return ensureUniqueReferences(transactions)
}

// Parse credit card CSV
export function parseCreditCardCSV(csvText) {
  const lines = csvText.split('\n').filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const transactions = []
  for (let i = 1; i < lines.length; i++) {
    try {
      const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''))
      if (cols.length < 4) continue
      const row = Object.fromEntries(headers.map((h, j) => [h, cols[j] || '']))
      const dateStr = row['Transaction Date'] || ''
      if (!dateStr || !/\d{4}-\d{2}-\d{2}/.test(dateStr)) continue
      const amount = parseFloat(row['Billing Amount']) || 0
      const isDebit = (row['Debit or Credit'] || 'DBIT') === 'DBIT'
      const merchant = row['Merchant'] || ''
      const reference = row['Reference Number'] || `CC-${dateStr}-${merchant}-${amount}`
      transactions.push({
        date: dateStr,
        description: merchant,
        amount: isDebit ? -amount : amount,
        balance: null,
        reference,
        account: `Credit card (${row['Card Used'] || 'CC'})`,
        type: isDebit ? 'debit' : 'credit'
      })
    } catch (e) { continue }
  }
  return ensureUniqueReferences(transactions)
}
