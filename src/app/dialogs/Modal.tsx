import { AlertDialog } from '@base-ui/react/alert-dialog'
import { Dialog } from '@base-ui/react/dialog'
import type { FormEvent, ReactNode } from 'react'
import { CloseIcon } from '../icons'
import { Icon } from '../components/Icon'
import { closeDialog } from './dialogStore'

interface ModalProps {
  title: string
  description?: ReactNode
  children?: ReactNode
  footer: ReactNode
  /** Wraps the body in a <form>; submitting runs this. */
  onSubmit?: () => void
  /** Alert dialogs require an explicit choice (no click-outside dismissal). */
  alert?: boolean
  size?: 'sm' | 'md' | 'lg'
}

/** Accessible modal shell: focus trap, Escape to close, labelled title, return focus on close. */
export function Modal({ title, description, children, footer, onSubmit, alert, size = 'md' }: ModalProps) {
  const C = alert ? AlertDialog : Dialog
  const body = (
    <>
      <header className="modal__head">
        <C.Title className="modal__title">{title}</C.Title>
        {!alert && <C.Close className="iconbtn iconbtn--ghost" aria-label="Close"><Icon icon={CloseIcon} /></C.Close>}
      </header>
      {description && <C.Description className="modal__desc">{description}</C.Description>}
      {children && <div className="modal__body">{children}</div>}
      <footer className="modal__foot">{footer}</footer>
    </>
  )
  return (
    <C.Root open onOpenChange={(open) => !open && closeDialog()}>
      <C.Portal>
        <C.Backdrop className="modal-backdrop" />
        <C.Popup className={`modal modal--${size}`}>
          {onSubmit ? (
            <form onSubmit={(e: FormEvent) => { e.preventDefault(); onSubmit() }}>{body}</form>
          ) : body}
        </C.Popup>
      </C.Portal>
    </C.Root>
  )
}

export function CancelButton({ label = 'Cancel' }: { label?: string }) {
  return <button type="button" className="btn" onClick={closeDialog}>{label}</button>
}
