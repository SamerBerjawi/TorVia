import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import { initAppearance } from '@/ui/theme'
import '@/ui/tokens.css'
import '@/ui/app.css'

initAppearance()
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
