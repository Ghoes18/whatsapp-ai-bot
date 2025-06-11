import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, matchPath } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { dashboardAPI } from '../services/api';

// Simple SVG Icons
const ChartBarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const ChatBubbleLeftRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const ClipboardDocumentListIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const Bars3Icon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const XMarkIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { notifications } = useNotifications();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Estado para IA do cliente selecionado
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [sidebarClientId, setSidebarClientId] = useState<string | null>(null);

  // Detectar se está em uma conversa e extrair clientId
  useEffect(() => {
    const match = matchPath('/conversations/:clientId', location.pathname);
    if (match && match.params && match.params.clientId) {
      setSidebarClientId(match.params.clientId);
    } else {
      setSidebarClientId(null);
      setAiEnabled(null);
    }
  }, [location.pathname]);

  // Buscar status da IA do cliente selecionado
  useEffect(() => {
    if (sidebarClientId) {
      dashboardAPI.getClient(sidebarClientId).then(client => {
        setAiEnabled(client.ai_enabled);
      }).catch(() => setAiEnabled(null));
    }
  }, [sidebarClientId]);

  // Alternar IA
  const handleToggleAI = async () => {
    if (!sidebarClientId) return;
    setAiLoading(true);
    try {
      const response = await dashboardAPI.toggleAI(sidebarClientId);
      setAiEnabled(response.ai_enabled);
    } catch (error) {
      console.error('Erro ao alternar IA:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const menuItems = [
    {
      text: 'Dashboard',
      icon: ChartBarIcon,
      path: '/',
    },
    {
      text: 'Conversas',
      icon: ChatBubbleLeftRightIcon,
      path: '/conversations',
      badge: notifications.unreadMessages,
    },
    {
      text: 'Planos Pendentes',
      icon: ClipboardDocumentListIcon,
      path: '/pending-plans',
      badge: notifications.pendingPlans,
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed z-50 lg:hidden top-4 left-4">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-white border border-gray-200 rounded-lg shadow-lg"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <XMarkIcon className="w-6 h-6 text-gray-600" />
          ) : (
            <Bars3Icon className="w-6 h-6 text-gray-600" />
          )}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white shadow-lg border-r border-gray-200 transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600">
              <ChartBarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI Bot</h1>
              <p className="text-sm text-gray-500">Dashboard</p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.text}
                onClick={() => {
                  navigate(item.path);
                  setIsMobileMenuOpen(false);
                }}
                className={`
                  w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 group relative
                  ${isActive(item.path)
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <div className="relative">
                  <Icon className={`h-5 w-5 ${isActive(item.path) ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-red-500 rounded-full -top-2 -right-2">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={`font-medium ${isActive(item.path) ? 'text-primary-700' : 'text-gray-700'}`}>
                  {item.text}
                </span>
              </button>
            );
          })}
        </nav>
        {/* Botão de IA do cliente selecionado */}
        {sidebarClientId && aiEnabled !== null && (
          <div className="px-4 pb-4">
            <button
              onClick={handleToggleAI}
              disabled={aiLoading}
              className={`w-full mt-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm
                ${aiEnabled ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}
                ${aiLoading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {aiLoading ? 'Atualizando...' : `IA ${aiEnabled ? 'Ativada' : 'Desativada'}`}
            </button>
          </div>
        )}
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar; 