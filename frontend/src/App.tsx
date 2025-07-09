import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Conversations from './components/Conversations';
import ClientProfile from './components/ClientProfile';
import PendingPlans from './components/PendingPlans';
import HumanSupportRequests from './components/HumanSupportRequests';
import AdminAIChat from './components/AdminAIChat';
import Sidebar from './components/Sidebar';
import AuthPage from './components/AuthPage';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ClientTable from "./components/ClientTable";

// Componente para tela de carregamento
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
      <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando...</p>
    </div>
  </div>
);

// Componente principal que verifica autenticação
const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <div className="flex h-screen bg-gray-50 transition-colors duration-200 dark:bg-gray-900">
        <Sidebar />
        <div className="overflow-hidden flex-1">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/conversations" element={<Conversations />} />
            <Route path="/conversations/:clientId" element={<Conversations />} />
            <Route path="/client/:clientId" element={<ClientProfile />} />
            <Route path="/pending-plans" element={<PendingPlans />} />
            <Route path="/human-support" element={<HumanSupportRequests />} />
            <Route path="/admin-chat" element={<AdminAIChat />} />
            <Route path="/clients" element={<ClientTable />} />
            <Route path="/clients/:id" element={<ClientProfile />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
