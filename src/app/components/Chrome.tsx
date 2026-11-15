import { logout } from '@/api/auth'
import { SignOutIcon } from '../icons'
import { Icon } from './Icon'

export function SignOutButton({ compact = true }: { compact?: boolean }) {
  return (
    <button type="button" className={compact ? 'iconbtn' : 'btn'} aria-label={compact ? 'Sign out' : undefined} onClick={() => void logout().finally(() => location.reload())}>
      <Icon icon={SignOutIcon} />
      {!compact && 'Sign out'}
    </button>
  )
}

export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg className="brandmark" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="var(--accent)" />
      <path d="M7 17V7l10 10V7" fill="none" stroke="var(--on-accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
