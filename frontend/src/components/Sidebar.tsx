"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate, useLocation, matchPath } from "react-router-dom"
import { useNotifications } from "../hooks/useNotifications"
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

const Sidebar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { notifications } = useNotifications()
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
      text: "Planos Pendentes",
      icon: ClipboardDocumentListIcon,
      path: "/pending-plans",
      badge: notifications.pendingPlans,
      gradient: "from-amber-500 to-orange-600",
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
      <div className="fixed z-50 lg:hidden top-4 left-4">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-3 transition-all duration-200 border border-gray-200 shadow-lg bg-white/90 backdrop-blur-sm rounded-xl hover:shadow-xl hover:bg-white"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <XMarkIcon className="w-5 h-5 text-gray-700" />
          ) : (
            <Bars3Icon className="w-5 h-5 text-gray-700" />
          )}
        </button>
      </div>

      {/* Fixed Sidebar */}
      <div
        className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white/95 backdrop-blur-sm shadow-2xl border-r border-gray-200 transform transition-all duration-300 ease-in-out
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        {/* Enhanced Header */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 shadow-lg rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
              <BotIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-transparent bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text">
                AI Bot
              </h1>
              <p className="text-sm font-medium text-gray-600">Dashboard</p>
            </div>
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
                className={`
                  w-full flex items-center space-x-4 px-4 py-3.5 rounded-xl text-left transition-all duration-200 group relative overflow-hidden
                  ${
                    active
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 shadow-sm"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }
                `}
              >
                <div className="relative z-10">
                  <div
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      active ? `bg-gradient-to-r ${item.gradient} shadow-sm` : "bg-gray-100 group-hover:bg-gray-200"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? "text-white" : "text-gray-500 group-hover:text-gray-700"}`} />
                  </div>
                  {item.badge && item.badge > 0 && (
                    <span className="absolute flex items-center justify-center w-5 h-5 text-xs font-bold text-white rounded-full shadow-sm -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`font-medium z-10 ${active ? "text-blue-700" : "text-gray-700 group-hover:text-gray-900"}`}
                >
                  {item.text}
                </span>

                {/* Active indicator */}
                {active && (
                  <div className="absolute right-0 w-1 h-8 transform -translate-y-1/2 rounded-l-full top-1/2 bg-gradient-to-b from-blue-500 to-indigo-600"></div>
                )}
              </button>
            )
          })}
        </nav>

        {/* Enhanced AI Toggle */}
        {sidebarClientId && aiEnabled !== null && (
          <div className="px-4 pb-6">
            <div className="p-4 border border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-900">IA do Cliente</span>
                <div className={`w-2 h-2 rounded-full ${aiEnabled ? "bg-emerald-500" : "bg-gray-400"}`}></div>
              </div>
              <button
                onClick={handleToggleAI}
                disabled={aiLoading}
                className={`w-full px-4 py-2.5 rounded-lg font-medium transition-all duration-200 text-sm shadow-sm
                  ${
                    aiEnabled
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
                      : "bg-white border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                  }
                  ${aiLoading ? "opacity-50 cursor-not-allowed" : "hover:shadow-md"}
                `}
              >
                {aiLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 mr-2 border-2 border-current rounded-full border-t-transparent animate-spin"></div>
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
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="text-center">
            <p className="text-xs font-medium text-gray-500">WhatsApp Bot v2.0</p>
            <p className="mt-1 text-xs text-gray-400">Powered by AI</p>
          </div>
        </div>
      </div>

      {/* Enhanced Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 transition-opacity duration-300 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}

export default Sidebar
