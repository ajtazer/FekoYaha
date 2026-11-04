import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { Starfield } from '@/components/Starfield'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { KEYWORD_REGEX } from '@/lib/config'
import { Home } from '@/pages/Home'
import { Room } from '@/pages/Room'
import { Admin } from '@/pages/Admin'

function RoomRoute() {
  const { keyword = '' } = useParams()
  if (!KEYWORD_REGEX.test(keyword)) return <Navigate to="/" replace />
  return <Room keyword={keyword} />
}

export function App() {
  return (
    <TooltipProvider delayDuration={200}>
      <Starfield />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/:keyword" element={<RoomRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-center" richColors />
    </TooltipProvider>
  )
}
