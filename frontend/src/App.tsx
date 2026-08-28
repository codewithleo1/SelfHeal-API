// ADD to frontend/src/App.tsx
// 1. Import at top:
import DemoRunner from './pages/DemoRunner'

// 2. Add route inside <Routes>:
<Route path="/demo" element={<DemoRunner />} />

// ── Full updated App.tsx (replace entire file) ──────────────────────────────
// frontend/src/App.tsx
import { Routes, Route } from 'react-router-dom'
import Landing     from './pages/Landing'
import Dashboard   from './pages/Dashboard'
import NewJob      from './pages/NewJob'
import JobProgress from './pages/JobProgress'
import JobResult   from './pages/JobResult'
import Jobs        from './pages/Jobs'
import DemoRunner  from './pages/DemoRunner'

export default function App() {
  return (
    <Routes>
      <Route path="/"                   element={<Landing />} />
      <Route path="/dashboard"          element={<Dashboard />} />
      <Route path="/jobs"               element={<Jobs />} />
      <Route path="/jobs/new"           element={<NewJob />} />
      <Route path="/jobs/:id"           element={<JobProgress />} />
      <Route path="/jobs/:id/result"    element={<JobResult />} />
      <Route path="/demo"               element={<DemoRunner />} />
    </Routes>
  )
}