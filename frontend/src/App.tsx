import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Conversations from './components/Conversations'; // Temporarily comment out until component is created
import PendingPlans from './components/PendingPlans';
import ClientProfile from './components/ClientProfile';

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/conversations" element={<Conversations />} />
              <Route path="/conversations/:clientId" element={<Conversations />} />
              <Route path="/pending-plans" element={<PendingPlans />} />
              <Route path="/client/:clientId" element={<ClientProfile />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
