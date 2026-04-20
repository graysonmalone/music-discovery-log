import { createContext, useContext } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTop3, addTop3, removeTop3 } from '@/api/top3'
import { useAuth } from '@/hooks/useAuth'

const Top3Context = createContext(null)

export function Top3Provider({ children }) {
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()

  const { data: top3 = [] } = useQuery({
    queryKey: ['top3'],
    queryFn: getTop3,
    enabled: isAuthenticated,
  })

  const addMutation = useMutation({
    mutationFn: addTop3,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['top3'] }),
  })

  const removeMutation = useMutation({
    mutationFn: removeTop3,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['top3'] }),
  })

  function add(item) {
    // item = { id (iTunes ID), entityType, name, artworkUrl, artistName }
    if (top3.length >= 3 || isInTop3(item.id)) return
    addMutation.mutate(item)
  }

  function remove(itunesId) {
    removeMutation.mutate(itunesId)
  }

  function isInTop3(itunesId) {
    return top3.some(t => t.itunes_id === String(itunesId))
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
