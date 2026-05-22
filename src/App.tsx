import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store, useAppDispatch, useAppSelector } from './store';
import { checkAuth, clearAuth } from './store/authSlice';
import Login from './pages/Login';
import Chat from './pages/Chat';
import ProtectedRoute from './components/ProtectedRoute';

const AppContent: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, loading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Check if user session cookies are already valid on app load
    dispatch(checkAuth());

    // Listen for background session expiration event from Axios interceptor
    const handleSessionExpired = () => {
      dispatch(clearAuth());
    };

    window.addEventListener('auth:session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth:session_expired', handleSessionExpired);
    };
  }, [dispatch]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0b0f19] text-slate-200">
        <div className="relative flex items-center justify-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-500"></div>
          <span className="absolute text-xs font-semibold text-indigo-400">ZOHO</span>
        </div>
        <p className="mt-4 text-sm font-medium tracking-wide text-slate-400 animate-pulse">
          Starting ZohoAgent workspace...
        </p>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/chat" replace /> : <Login />} 
      />
      <Route 
        path="/chat" 
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </Provider>
  );
};

export default App;
