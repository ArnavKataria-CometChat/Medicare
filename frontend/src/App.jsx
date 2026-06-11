import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';

// Public Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import DoctorsDirectory from './pages/DoctorsDirectory';
import DoctorDetails from './pages/DoctorDetails';
import Articles from './pages/Articles';
import ArticleDetail from './pages/ArticleDetail';

// Authenticated User Pages
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import BookAppointment from './pages/BookAppointment';
import Confirmation from './pages/Confirmation';
import Profile from './pages/Profile';
import PatientRecords from './pages/PatientRecords';
import StaffSchedule from './pages/StaffSchedule';
import Chats from './pages/Chats';



// Admin Portal Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import EditUser from './pages/admin/EditUser';
import ArticleManagement from './pages/admin/ArticleManagement';
import EditArticle from './pages/admin/EditArticle';
import ActivityLog from './pages/admin/ActivityLog';
import NotificationLog from './pages/admin/NotificationLog';

const AppContent = () => {
  const { isAuthenticated, user, loading, isAdmin } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [navState, setNavState] = useState(null);

  useEffect(() => {
    const handlePopState = (e) => {
      setCurrentPath(window.location.pathname);
      setNavState(window.history.state);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path, state = null) => {
    window.history.pushState(state, '', path);
    setCurrentPath(path);
    setNavState(state);
    window.scrollTo(0, 0);
    // Dispatch custom event so SocketProvider knows about path changes
    window.dispatchEvent(new Event('pathchange'));
  };

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-primary)'
      }}>
        <p>Verifying credentials security...</p>
      </div>
    );
  }

  // Helper to extract path params (e.g. /doctors/123 -> 123)
  const getPathParam = (prefix) => {
    if (currentPath.startsWith(prefix)) {
      return currentPath.substring(prefix.length);
    }
    return null;
  };

  // Route router controller
  const renderRoute = () => {
    // 1. Admin Login
    if (currentPath === '/admin/login') {
      return <AdminLogin navigate={navigate} />;
    }

    // 2. Admin isolated console routes
    if (currentPath.startsWith('/admin')) {
      if (!isAuthenticated || !isAdmin) {
        // Redirect unauthorized to Admin Login
        setTimeout(() => navigate('/admin/login'), 50);
        return <p style={{ padding: '2rem' }}>Redirecting to security admin sign in...</p>;
      }

      let adminView = null;
      if (currentPath === '/admin') {
        adminView = <AdminDashboard navigate={navigate} />;
      } else if (currentPath === '/admin/users') {
        adminView = <UserManagement navigate={navigate} />;
      } else if (currentPath === '/admin/users/new') {
        adminView = <EditUser navigate={navigate} />;
      } else if (currentPath.startsWith('/admin/users/')) {
        const uId = getPathParam('/admin/users/');
        adminView = <EditUser navigate={navigate} userId={uId} />;
      } else if (currentPath === '/admin/articles') {
        adminView = <ArticleManagement navigate={navigate} />;
      } else if (currentPath === '/admin/articles/new') {
        adminView = <EditArticle navigate={navigate} />;
      } else if (currentPath.startsWith('/admin/articles/')) {
        const aId = getPathParam('/admin/articles/');
        adminView = <EditArticle navigate={navigate} articleId={aId} />;
      } else if (currentPath === '/admin/activities') {
        adminView = <ActivityLog />;
      } else if (currentPath === '/admin/notifications') {
        adminView = <NotificationLog />;
      } else {
        adminView = <AdminDashboard navigate={navigate} />;
      }

      return (
        <AdminLayout currentPath={currentPath} navigate={navigate}>
          {adminView}
        </AdminLayout>
      );
    }

    // 3. Public views
    let view = null;
    if (currentPath === '/') {
      view = <Home navigate={navigate} />;
    } else if (currentPath === '/login') {
      view = <Login navigate={navigate} />;
    } else if (currentPath === '/register') {
      view = <Register navigate={navigate} />;
    } else if (currentPath === '/doctors') {
      view = <DoctorsDirectory navigate={navigate} navigationState={navState} />;
    } else if (currentPath.startsWith('/doctors/')) {
      const docId = getPathParam('/doctors/');
      view = <DoctorDetails navigate={navigate} doctorId={docId} />;
    } else if (currentPath === '/articles') {
      view = <Articles navigate={navigate} />;
    } else if (currentPath.startsWith('/articles/')) {
      const artId = getPathParam('/articles/');
      view = <ArticleDetail navigate={navigate} articleId={artId} />;
    }

    // 4. Guarded authenticated user views
    if (!view) {
      if (!isAuthenticated) {
        setTimeout(() => navigate('/login'), 50);
        return <p style={{ padding: '2rem' }}>Authentication check required. Redirecting to login...</p>;
      }

      if (currentPath === '/dashboard') {
        view = <Dashboard navigate={navigate} />;
      } else if (currentPath === '/appointments') {
        view = <Appointments navigate={navigate} />;
      } else if (currentPath === '/chats') {
        view = <Chats navigate={navigate} />;
      } else if (currentPath === '/book') {
        view = <BookAppointment navigate={navigate} navigationState={navState} />;
      } else if (currentPath.startsWith('/confirmation/')) {
        const apptId = getPathParam('/confirmation/');
        view = <Confirmation navigate={navigate} appointmentId={apptId} />;
      } else if (currentPath === '/profile') {
        view = <Profile navigate={navigate} />;
      } else if (currentPath.startsWith('/patients/')) {
        if (user.role !== 'DOCTOR') {
          setTimeout(() => navigate('/dashboard'), 50);
          return <p style={{ padding: '2rem' }}>Access denied. Redirecting...</p>;
        }
        const patientId = getPathParam('/patients/');
        view = <PatientRecords navigate={navigate} patientId={patientId} />;
      } else if (currentPath === '/schedule') {
        if (user.role !== 'STAFF') {
          setTimeout(() => navigate('/dashboard'), 50);
          return <p style={{ padding: '2rem' }}>Access denied. Redirecting...</p>;
        }
        view = <StaffSchedule navigate={navigate} />;
      } else {
        view = <Dashboard navigate={navigate} />;
      }
    }

    return (
      <Layout currentPath={currentPath} navigate={navigate}>
        {view}
      </Layout>
    );
  };

  return renderRoute();
};

const App = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContentWrapper />
      </AuthProvider>
    </ToastProvider>
  );
};

const AppContentWrapper = () => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Listen for pushState changes via custom event
  useEffect(() => {
    const handlePathChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('pathchange', handlePathChange);
    return () => window.removeEventListener('pathchange', handlePathChange);
  }, []);

  return (
    <SocketProvider currentPath={currentPath}>
      <AppContent />
    </SocketProvider>
  );
};

export default App;
