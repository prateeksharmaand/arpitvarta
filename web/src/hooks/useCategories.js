import { useEffect, useState } from 'react'
import { fetchCategories } from '../lib/categories'

// Profession categories from the backend, cached for the session.
export function useCategories() {
  const [categories, setCategories] = useState([])
  useEffect(() => {
    let cancelled = false
    fetchCategories()
      .then((list) => { if (!cancelled) setCategories(list) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])
  return categories
}
