import { engine } from '../store'
import { notify, notifyError } from '../feedback/toast'

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
export const torrentsLabel = (n: number) => plural(n, 'torrent')

/**
 * Runs a mutation with consistent feedback: success toast, error toast with qBittorrent's reason,
 * and an immediate sync so the table reflects the change without waiting for the next poll.
 */
export async function run(fn: () => Promise<unknown>, messages: { success: string; failure: string }): Promise<boolean> {
  try {
    await fn()
    notify(messages.success, { tone: 'success' })
    return true
  } catch (e) {
    notifyError(messages.failure, e)
    return false
  } finally {
    engine.refresh()
  }
}
