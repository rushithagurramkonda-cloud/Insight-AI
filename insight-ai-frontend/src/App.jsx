import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminOnly, ProtectedRoute } from './components/Layout.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Privacy from './pages/Privacy.jsx';
import { Forbidden, NotFound, ServerError } from './pages/ErrorPages.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ResumeAnalysis from './pages/ResumeAnalysis.jsx';
import GithubAnalysis from './pages/GithubAnalysis.jsx';
import JobDescription from './pages/JobDescription.jsx';
import Comparison from './pages/Comparison.jsx';
import JobMatch from './pages/JobMatch.jsx';
import Reports from './pages/Reports.jsx';
import Profile from './pages/Profile.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login mode="signin" />} />
      <Route path="/register" element={<Login mode="register" />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/403" element={<Forbidden />} />
      <Route path="/500" element={<ServerError />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/resume-analysis" element={<ResumeAnalysis />} />
        <Route path="/github-analysis" element={<GithubAnalysis />} />
        <Route path="/job-description" element={<JobDescription />} />
        <Route path="/comparison" element={<Comparison />} />
        <Route path="/job-match" element={<JobMatch />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<AdminOnly><Profile adminView /></AdminOnly>} />
      </Route>

      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
