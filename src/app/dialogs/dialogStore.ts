import { create } from 'zustand'

/** Exactly one modal at a time; every dialog in the app opens through here. */
export type DialogRequest =
  | { kind: 'add'; links?: string; files?: readonly File[] }
  | { kind: 'delete'; hashes: readonly string[] }
  | { kind: 'location'; hashes: readonly string[] }
  | { kind: 'rename'; hash: string }
  | { kind: 'category'; hashes: readonly string[] }
  | { kind: 'tags'; hashes: readonly string[] }
  | { kind: 'limits'; hashes: readonly string[] }
  | { kind: 'confirm'; title: string; body: string; confirmLabel: string; destructive?: boolean; onConfirm: () => Promise<void> }
  | { kind: 'global-speed' }
  | { kind: 'palette' }
  | { kind: 'shortcuts' }

interface DialogState {
  current: DialogRequest | null
  open(d: DialogRequest): void
  close(): void
}

export const useDialogs = create<DialogState>()((set) => ({
  current: null,
  open: (current) => set({ current }),
  close: () => set({ current: null }),
}))

export const openDialog = (d: DialogRequest) => useDialogs.getState().open(d)
export const closeDialog = () => useDialogs.getState().close()
