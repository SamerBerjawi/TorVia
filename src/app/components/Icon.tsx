import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'

/** The only way to render a UI glyph: consistent size and stroke, decorative by default. */
export function Icon({ icon, size = 16, label, className }: { icon: IconSvgElement; size?: number; label?: string; className?: string }) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={1.6}
      color="currentColor"
      className={className}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    />
  )
}
