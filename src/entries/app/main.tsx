import { StrictMode } from 'react'
import { CSPProvider } from '@base-ui/react/csp-provider'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import { initAppearance } from '@/ui/theme'
import '@/ui/tokens.css'
import '@/ui/app.css'
import '@/ui/charts.css'

initAppearance()
// Our CSP forbids inline <style>; Base UI only needs it for Select/ScrollArea, which we style ourselves.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CSPProvider disableStyleElements>
      <App />
    </CSPProvider>
  </StrictMode>,
)
