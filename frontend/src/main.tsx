import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import NewJob from './pages/NewJob'
import JobProgress from './pages/JobProgress'
import JobResult from './pages/JobResult'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/jobs/new" element={<NewJob />} />
        <Route path="/jobs/:id" element={<JobProgress />} />
        <Route path="/jobs/:id/result" element={<JobResult />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)