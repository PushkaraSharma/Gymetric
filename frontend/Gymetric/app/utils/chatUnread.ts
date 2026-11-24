import { useEffect, useState } from 'react'
import { api } from '@/services/Api'

let unread = 0
const listeners = new Set<(count: number) => void>()

export const refreshChatUnread = async () => {
  const response = await api.chatUnread()
  if (response.kind !== 'ok') return
  unread = response.data?.count ?? 0
  listeners.forEach((listener) => listener(unread))
}

export function useChatUnread(poll = false) {
  const [count, setCount] = useState(unread)
  useEffect(() => {
    listeners.add(setCount)
    if (!poll) return () => { listeners.delete(setCount) }
    refreshChatUnread()
    const timer = setInterval(refreshChatUnread, 60_000)
    return () => {
      listeners.delete(setCount)
      clearInterval(timer)
    }
  }, [poll])
  return count
}
