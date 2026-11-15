import { Toast } from '@base-ui/react/toast'
import { AlertIcon, CloseIcon, CompletedIcon } from '../icons'
import { Icon } from '../components/Icon'
import { toastManager } from './toast'

function ToastList() {
  const { toasts } = Toast.useToastManager()
  return toasts.map((t) => (
    <Toast.Root key={t.id} toast={t} className="toast" data-tone={t.type}>
      <Toast.Content className="toast__content">
        <Icon icon={t.type === 'error' ? AlertIcon : CompletedIcon} size={16} className="toast__icon" />
        <div className="toast__text">
          <Toast.Title className="toast__title" />
          <Toast.Description className="toast__desc" />
        </div>
        <Toast.Close className="iconbtn iconbtn--ghost" aria-label="Dismiss"><Icon icon={CloseIcon} size={14} /></Toast.Close>
      </Toast.Content>
    </Toast.Root>
  ))
}

/** Toast viewport (bottom-right). Errors stay 8 s, everything else 4 s; F6 focuses the region. */
export function Toaster() {
  return (
    <Toast.Provider toastManager={toastManager} limit={4}>
      <Toast.Portal>
        <Toast.Viewport className="toasts">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  )
}
