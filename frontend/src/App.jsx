import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import SignupPage        from './pages/SignupPage';
import LoginPage         from './pages/LoginPage';
import RequestBoardPage  from './pages/RequestBoardPage';
import PostRequestPage   from './pages/PostRequestPage';
import RequestDetailPage from './pages/RequestDetailPage';
import MyRequestsPage    from './pages/MyRequestsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth */}
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login"  element={<LoginPage />} />

          {/* Request Board */}
          <Route path="/requests"       element={<RequestBoardPage />} />
          <Route path="/requests/new"   element={<PostRequestPage />} />
          <Route path="/requests/:id"   element={<RequestDetailPage />} />

          {/* My Activity (requests + offers dashboard) */}
          <Route path="/my-activity"    element={<MyRequestsPage />} />

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/requests" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
