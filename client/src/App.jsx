import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Chat from './pages/Chat.jsx'
import Results from './pages/Results.jsx'
import Cutoffs from './pages/Cutoffs.jsx'
import CollegeDetails from './pages/CollegeDetails.jsx'
import Compare from './pages/Compare.jsx'
import StudentProfile from './pages/StudentProfile.jsx'
import CounsellingHub from './pages/CounsellingHub.jsx'
import Login from './pages/admin/Login.jsx'
import Dashboard from './pages/admin/Dashboard.jsx'
import DatasetList from './pages/admin/DatasetList.jsx'
import UploadDataset from './pages/admin/UploadDataset.jsx'
import DatasetDetails from './pages/admin/DatasetDetails.jsx'
import Analytics from './pages/admin/Analytics.jsx'
import ProtectedRoute from './components/Admin/ProtectedRoute.jsx'
import { StudentAuthProvider } from './context/StudentAuthContext.jsx'

export default function App() {
  return (
    <StudentAuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/results" element={<Results />} />
        <Route path="/cutoffs" element={<Cutoffs />} />
        <Route path="/college/:id" element={<CollegeDetails />} />
        <Route path="/colleges/:id" element={<CollegeDetails />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/profile" element={<StudentProfile />} />
        <Route path="/choice-list" element={<StudentProfile />} />
        <Route path="/counselling-guide" element={<CounsellingHub />} />
        <Route path="/tools" element={<CounsellingHub />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/datasets"
          element={
            <ProtectedRoute>
              <DatasetList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/upload"
          element={
            <ProtectedRoute>
              <UploadDataset />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/datasets/:id"
          element={
            <ProtectedRoute>
              <DatasetDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Home />} />
      </Routes>
    </StudentAuthProvider>
  )
}
