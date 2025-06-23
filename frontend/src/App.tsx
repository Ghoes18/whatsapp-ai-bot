import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Conversations from './components/Conversations';
import ClientProfile from './components/ClientProfile';
import PendingPlans from './components/PendingPlans';
import HumanSupportRequests from './components/HumanSupportRequests';
import AdminAIChat from './components/AdminAIChat';
import Sidebar from './components/Sidebar';

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gray-50">
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
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
