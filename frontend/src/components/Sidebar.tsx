"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate, useLocation, matchPath } from "react-router-dom"
import { useNotifications } from "../hooks/useNotifications"
import { useTheme } from "../contexts/ThemeContext"
import { useAuth } from "../contexts/AuthContext"
import { dashboardAPI } from "../services/api"

// Enhanced SVG Icons
const ChartBarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
)

const ChatBubbleLeftRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </svg>
)

const ClipboardDocumentListIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
)

const Bars3Icon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

const XMarkIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const BotIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
)

const UserGroupIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
    />
  </svg>
)

const ChatIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </svg>
)

const SunIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
)

const MoonIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
    />
  </svg>
)

const ArrowRightOnRectangleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
    />
  </svg>
)

const Sidebar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { notifications } = useNotifications()
  const { theme, toggleTheme } = useTheme()
  const { signOut, user } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [sidebarClientId, setSidebarClientId] = useState<string | null>(null)

  useEffect(() => {
    const match = matchPath("/conversations/:clientId", location.pathname)
    if (match && match.params && match.params.clientId) {
      setSidebarClientId(match.params.clientId)
    } else {
      setSidebarClientId(null)
      setAiEnabled(null)
    }
  }, [location.pathname])

  useEffect(() => {
    if (sidebarClientId) {
      dashboardAPI
        .getClient(sidebarClientId)
        .then((client) => {
          setAiEnabled(client.ai_enabled)
        })
        .catch(() => setAiEnabled(null))
    }
  }, [sidebarClientId])

  const handleToggleAI = async () => {
    if (!sidebarClientId) return
    setAiLoading(true)
    try {
      const response = await dashboardAPI.toggleAI(sidebarClientId)
      setAiEnabled(response.ai_enabled)
    } catch (error) {
      console.error("Erro ao alternar IA:", error)
    } finally {
      setAiLoading(false)
    }
  }

  const menuItems = [
    {
      text: "Dashboard",
      icon: ChartBarIcon,
      path: "/",
      gradient: "from-blue-500 to-indigo-600",
    },
    {
      text: "Conversas",
      icon: ChatBubbleLeftRightIcon,
      path: "/conversations",
      badge: notifications.unreadMessages,
      gradient: "from-emerald-500 to-teal-600",
    },
    {
      text: "Clientes",
      icon: UserGroupIcon,
      path: "/clients",
      gradient: "from-cyan-500 to-blue-600",
    },
    {
      text: "Planos Pendentes",
      icon: ClipboardDocumentListIcon,
      path: "/pending-plans",
      badge: notifications.pendingPlans,
      gradient: "from-amber-500 to-orange-600",
    },
    {
      text: "Suporte Humano",
      icon: UserGroupIcon,
      path: "/human-support",
      badge: notifications.humanSupportRequests,
      gradient: "from-red-500 to-pink-600",
    },
    {
      text: "Chat com IA",
      icon: ChatIcon,
      path: "/admin-chat",
      gradient: "from-purple-500 to-purple-600",
    },
  ]

  const isActive = (path: string) => {
    if (path === "/conversations") {
      return location.pathname === "/conversations" || location.pathname.startsWith("/conversations/")
    }
    return location.pathname === path
  }

  return (
    <>
      {/* Enhanced Mobile menu button - Fixed position */}
      <div className="fixed top-4 left-4 z-50 lg:hidden">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-3 rounded-xl border border-gray-200 shadow-lg backdrop-blur-sm transition-all duration-200 dark:border-gray-600 bg-white/90 dark:bg-gray-800/90 hover:shadow-xl hover:bg-white dark:hover:bg-gray-800"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <XMarkIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          ) : (
            <Bars3Icon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          )}
        </button>
      </div>

      {/* Fixed Sidebar */}
      <div
        className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-2xl border-r border-gray-200 dark:border-gray-700 transform transition-all duration-300 ease-in-out
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        {/* Enhanced Header */}
        <div className="p-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex justify-center items-center w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <BotIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300">
                  AI Bot
                </h1>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Dashboard</p>
              </div>
            </div>
            
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 bg-gray-100 rounded-lg transition-colors duration-200 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <SunIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              ) : (
                <MoonIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              )}
            </button>
          </div>
        </div>

        {/* Enhanced Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            
            return (
              <button
                key={item.text}
                onClick={() => {
                  navigate(item.path)
                  setIsMobileMenuOpen(false)
                }}
                className={
                  `w-full flex items-center space-x-4 px-4 py-3.5 rounded-xl text-left transition-all duration-200 group relative overflow-hidden
                  ${
                    active
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 shadow-sm"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                  }
                `}
              >
                <div className="relative z-10">
                  <div
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      active ? `bg-gradient-to-r ${item.gradient} shadow-sm` : "bg-gray-100 dark:bg-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-600"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? "text-white" : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300"}`} />
                  </div>
                  {/* Condição mais rigorosa para evitar qualquer renderização de 0 */}
                  {(() => {
                    const badge = item.badge;
                    const shouldShowBadge = badge !== undefined && 
                                          badge !== null && 
                                          typeof badge === 'number' && 
                                          badge > 0;
                    
                    if (!shouldShowBadge) return null;
                    
                    return (
                      <span className="flex absolute -top-1 -right-1 justify-center items-center w-5 h-5 text-xs font-bold text-white bg-gradient-to-r from-red-500 to-red-600 rounded-full shadow-sm">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    );
                  })()}
                </div>
                <span
                  className={`font-medium z-10 ${active ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100"}`}
                >
                  {item.text}
                </span>
                {/* Active indicator */}
                {active && (
                  <div className="absolute right-0 top-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-l-full transform -translate-y-1/2"></div>
                )}
              </button>
            )
          })}
        </nav>

        {/* Enhanced AI Toggle */}
        {sidebarClientId && aiEnabled !== null && (
          <div className="px-4 pb-6">
            <div className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">IA do Cliente</span>
                <div className={`w-2 h-2 rounded-full ${aiEnabled ? "bg-emerald-500" : "bg-gray-400"}`}></div>
              </div>
              <button
                onClick={handleToggleAI}
                disabled={aiLoading}
                className={`w-full px-4 py-2.5 rounded-lg font-medium transition-all duration-200 text-sm shadow-sm
                  ${
                    aiEnabled
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
                      : "bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600"
                  }
                  ${aiLoading ? "opacity-50 cursor-not-allowed" : "hover:shadow-md"}
                `}
              >
                {aiLoading ? (
                  <div className="flex justify-center items-center">
                    <div className="mr-2 w-4 h-4 rounded-full border-2 border-current animate-spin border-t-transparent"></div>
                    Atualizando...
                  </div>
                ) : (
                  `IA ${aiEnabled ? "Ativada" : "Desativada"}`
                )}
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Footer */}
        <div className="absolute right-0 bottom-0 left-0 p-4 bg-gradient-to-r from-gray-50 to-white border-t border-gray-100 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700">
          <div className="space-y-3">
            {/* User info */}
            <div className="text-center">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {user?.email || 'Usuário'}
              </p>
            </div>

            {/* Logout button */}
            <button
              onClick={signOut}
              className="flex justify-center items-center px-3 py-2 space-x-2 w-full text-sm font-medium text-gray-600 rounded-lg transition-all duration-200 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
              <span>Sair</span>
            </button>

            {/* Version info */}
            <div className="text-center">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">WhatsApp Bot v2.0</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Powered by AI</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 backdrop-blur-sm transition-opacity duration-300 bg-black/20 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}

export default Sidebar
