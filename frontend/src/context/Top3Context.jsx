import { createContext, useContext, useState } from 'react'

const Top3Context = createContext(null)
const STORAGE_KEY = 'mdl-top3'

export function Top3Provider({ children }) {
  const [top3, setTop3] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] }
    catch { return [] }
  })

  function add(item) {
    setTop3(prev => {
      if (prev.length >= 3 || prev.some(p => p.id === item.id)) return prev
      const next = [...prev, item]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  function remove(id) {
    setTop3(prev => {
      const next = prev.filter(p => p.id !== id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  function isInTop3(id) {
    return top3.some(p => p.id === id)
  }

  return (
    <Top3Context.Provider value={{ top3, add, remove, isInTop3, isFull: top3.length >= 3 }}>
      {children}
    </Top3Context.Provider>
  )
}

export function useTop3() {
  return useContext(Top3Context)
}
