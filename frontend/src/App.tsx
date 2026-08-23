// frontend/src/App.tsx
import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Jobs from './pages/Jobs'
import NewJob from './pages/NewJob'
import JobProgress from './pages/JobProgress'
import JobResult from './pages/JobResult'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/jobs" element={<Jobs />} />
      <Route path="/jobs/new" element={<NewJob />} />
      <Route path="/jobs/:id" element={<JobProgress />} />
      <Route path="/jobs/:id/result" element={<JobResult />} />
    </Routes>
  )
}