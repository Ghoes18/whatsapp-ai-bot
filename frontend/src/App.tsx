import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Conversations from './components/Conversations';
import ClientProfile from './components/ClientProfile';
import PendingPlans from './components/PendingPlans';
import HumanSupportRequests from './components/HumanSupportRequests';
import AdminAIChat from './components/AdminAIChat';
import Sidebar from './components/Sidebar';
import { ThemeProvider } from './contexts/ThemeContext';
import ClientTable from "./components/ClientTable";

function App() {
  return (
    <ThemeProvider>
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
    </ThemeProvider>
  );
}

export default App;
