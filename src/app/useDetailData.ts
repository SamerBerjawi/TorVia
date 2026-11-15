import { useEffect, useState } from 'react'
import { ApiError } from '@/api/transport'

export type Loaded<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ok'; data: T; reload: () => void }

/** Polls `load` while mounted (pauses when the tab is hidden). Aborts in-flight requests on change/unmount. */
export function useDetailData<T>(key: string, load: (signal: AbortSignal) => Promise<T>, intervalMs = 3000): Loaded<T> {
  const [state, setState] = useState<Loaded<T>>({ status: 'loading' })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    setState({ status: 'loading' })
  }, [key])
  useEffect(() => {
    const ctl = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const reload = () => setTick((n) => n + 1)
    const run = async () => {
      try {
        const data = await load(ctl.signal)
        if (!ctl.signal.aborted) setState({ status: 'ok', data, reload })
      } catch (e) {
        if (ctl.signal.aborted) return
        setState({ status: 'error', message: e instanceof ApiError ? e.message : 'Could not load' })
      }
      if (!ctl.signal.aborted) timer = setTimeout(() => void run(), document.hidden ? intervalMs * 5 : intervalMs)
    }
    void run()
    return () => {
      ctl.abort()
      if (timer) clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick, intervalMs])
  return state
}
