import { useState, useEffect, useCallback } from 'react'
import { ALL_CATEGORIES, promptForNewCategory } from '../lib/categorise'
import { getCustomCategories, saveCustomCategories } from '../lib/supabase'

// Merges the built-in category list with user-added ones (persisted in Supabase
// settings) and exposes an addCategory() flow used by the "＋ Add new…" dropdown
// option on both the Import and Overview screens.
export function useCategories() {
  const [custom, setCustom] = useState([])

  useEffect(() => {
    getCustomCategories().then(setCustom).catch(() => {})
  }, [])

  const categories = [...ALL_CATEGORIES, ...custom.filter(c => !ALL_CATEGORIES.includes(c))]

  // Prompts for a new subcategory, persists it, and returns the new 'Bucket — Sub'
  // string (or null if cancelled) so the caller can apply it to the transaction.
  const addCategory = useCallback(async () => {
    const cat = promptForNewCategory()
    if (!cat) return null
    if (!ALL_CATEGORIES.includes(cat) && !custom.includes(cat)) {
      const next = [...custom, cat]
      setCustom(next)
      try { await saveCustomCategories(next) } catch (e) { console.error(e) }
    }
    return cat
  }, [custom])

  return { categories, addCategory }
}
