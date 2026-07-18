import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth helpers
export const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()

// Transactions
export const getTransactions = async (from, to) => {
  let query = supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })
  if (from) query = query.gte('date', from)
  if (to) query = query.lte('date', to)
  const { data, error } = await query
  if (error) throw error
  return data
}

export const upsertTransactions = async (transactions) => {
  const { data, error } = await supabase
    .from('transactions')
    .upsert(transactions, { onConflict: 'reference' })
  if (error) throw error
  return data
}

export const updateTransactionCategory = async (id, category, subcategory) => {
  const { error } = await supabase
    .from('transactions')
    .update({ category, subcategory, reviewed: true })
    .eq('id', id)
  if (error) throw error
}

// Categorisation rules
export const getRules = async () => {
  const { data, error } = await supabase
    .from('categorisation_rules')
    .select('*')
    .order('confidence', { ascending: false })
  if (error) throw error
  return data
}

export const upsertRule = async (merchant_pattern, category, subcategory, confidence) => {
  const { error } = await supabase
    .from('categorisation_rules')
    .upsert({ merchant_pattern, category, subcategory, confidence }, { onConflict: 'merchant_pattern' })
  if (error) throw error
}

// Goals
export const getGoals = async () => {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .order('priority_order')
  if (error) throw error
  return data
}

export const upsertGoal = async (goal) => {
  const { data, error } = await supabase
    .from('goals')
    .upsert(goal, { onConflict: 'id' })
  if (error) throw error
  return data
}

export const deleteGoal = async (id) => {
  const { error } = await supabase.from('goals').delete().eq('id', id)
  if (error) throw error
}

// Mortgage parts
export const getMortgageParts = async () => {
  const { data, error } = await supabase
    .from('mortgage_parts')
    .select('*')
    .order('id')
  if (error) throw error
  return data
}

export const updateMortgagePart = async (id, updates) => {
  const { error } = await supabase
    .from('mortgage_parts')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}

// Financial settings (pension, ISA, salaries etc)
export const getSettings = async () => {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
  if (error) throw error
  // Return as key/value object
  return Object.fromEntries((data || []).map(r => [r.key, r.value]))
}

export const setSetting = async (key, value) => {
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value }, { onConflict: 'key' })
  if (error) throw error
}

// Accounts summary
export const getAccounts = async () => {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('id')
  if (error) throw error
  return data
}

export const upsertAccount = async (account) => {
  const { data, error } = await supabase
    .from('accounts')
    .upsert(account, { onConflict: 'id' })
  if (error) throw error
  return data
}
