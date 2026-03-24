import { useEffect, useRef } from 'react'

export function useAutoScroll<T extends HTMLElement>(dependency: unknown) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    if (!ref.current) {
      return
    }

    ref.current.scrollTo({
      behavior: 'smooth',
      top: ref.current.scrollHeight,
    })
  }, [dependency])

  return ref
}
