"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { dashboardAPI } from "../services/api";
import type { DashboardStats, RecentActivity, AdvancedDashboardStats } from "../services/api";
import { UserGroupIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

// Enhanced SVG Icons
const ChatIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </svg>
);

const AssignmentIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const TrendingUpIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
    />
  </svg>
);

const CircleIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const RefreshIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const CurrencyDollarIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
    />
  </svg>
);

const CalendarIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeConversations: 0,
    pendingPlans: 0,
    todayMessages: 0,
    humanSupportRequests: 0,
    paidClients: 0,
    weeklyPlans: 0,
    conversionRate: 0,
  });

  const [advancedStats, setAdvancedStats] = useState<AdvancedDashboardStats>({
    responseRate: 0,
    avgResponseTime: "0 min",
    goalDistribution: [],
    clientGrowth: 0,
    satisfactionScore: 0,
    engagementRate: 0,
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, advancedStatsData, activityData] = await Promise.all([
        dashboardAPI.getDashboardStats(),
        dashboardAPI.getAdvancedDashboardStats(),
        dashboardAPI.getRecentActivity(),
      ]);

      setStats(statsData);
      setAdvancedStats(advancedStatsData);
      setRecentActivity(Array.isArray(activityData) ? activityData : []);
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Agora";
    if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h atrás`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d atrás`;
  };

  const mainStatCards = [
    {
      title: "Total de Clientes",
      value: stats.totalClients,
      icon: UserGroupIcon,
      gradient: "from-emerald-500 to-teal-600",
      bgGradient: "from-emerald-50 to-teal-50",
      iconBg: "from-emerald-500 to-teal-600",
    },
    {
      title: "Conversas Ativas",
      value: stats.activeConversations,
      icon: ChatIcon,
      gradient: "from-blue-500 to-indigo-600",
      bgGradient: "from-blue-50 to-indigo-50",
      iconBg: "from-blue-500 to-indigo-600",
    },
    {
      title: "Planos Pendentes",
      value: stats.pendingPlans,
      icon: AssignmentIcon,
      gradient: "from-amber-500 to-orange-600",
      bgGradient: "from-amber-50 to-orange-50",
      iconBg: "from-amber-500 to-orange-600",
    },
    {
      title: "Mensagens Hoje",
      value: stats.todayMessages,
      icon: TrendingUpIcon,
      gradient: "from-purple-500 to-pink-600",
      bgGradient: "from-purple-50 to-pink-50",
      iconBg: "from-purple-500 to-pink-600",
    },
  ];

  const secondaryStatCards = [
    {
      title: "Suporte Humano",
      value: stats.humanSupportRequests,
      icon: ExclamationTriangleIcon,
      gradient: "from-red-500 to-pink-600",
      bgGradient: "from-red-50 to-pink-50",
      iconBg: "from-red-500 to-pink-600",
    },
    {
      title: "Clientes Pagos",
      value: stats.paidClients,
      suffix: ` (${stats.conversionRate}%)`,
      icon: CurrencyDollarIcon,
      gradient: "from-green-500 to-emerald-600",
      bgGradient: "from-green-50 to-emerald-50",
      iconBg: "from-green-500 to-emerald-600",
    },
    {
      title: "Planos da Semana",
      value: stats.weeklyPlans,
      icon: CalendarIcon,
      gradient: "from-cyan-500 to-blue-600",
      bgGradient: "from-cyan-50 to-blue-50",
      iconBg: "from-cyan-500 to-blue-600",
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "message":
        return ChatIcon;
      case "plan":
        return AssignmentIcon;
      case "client":
        return CircleIcon;
      default:
        return CircleIcon;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "active":
        return "bg-gradient-to-r from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/30 text-emerald-800 dark:text-emerald-300";
      case "pending":
        return "bg-gradient-to-r from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 text-amber-800 dark:text-amber-300";
      case "completed":
        return "bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-800 dark:text-blue-300";
      default:
        return "bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-800 dark:text-gray-300";
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        {/* Sidebar space */}
        <div className="hidden w-72 lg:block"></div>

        <div className="flex flex-1 justify-center items-center">
          <div className="text-center">
            <div className="relative mx-auto mb-6 w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-600"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent animate-spin border-t-blue-600"></div>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Carregando dashboard
            </h3>
            <p className="text-gray-600 dark:text-gray-400">Buscando dados mais recentes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar space */}
      <div className="hidden w-72 lg:block"></div>

      <div className="overflow-auto flex-1">
        <div className="p-6 space-y-8">
          {/* Enhanced Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300">
                Dashboard
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Visão geral do seu bot de WhatsApp
              </p>
            </div>
            <button
              onClick={loadDashboardData}
              className="inline-flex items-center px-4 py-2 bg-white rounded-xl border border-gray-300 shadow-sm transition-all duration-200 dark:bg-gray-800 dark:border-gray-600 hover:shadow-md hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 group"
            >
              <RefreshIcon className="mr-2 w-4 h-4 text-gray-500 transition-colors dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300" />
              <span className="font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                Atualizar
              </span>
            </button>
          </div>

          {/* Main Stats Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {mainStatCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div
                  key={index}
                  className={`relative overflow-hidden bg-gradient-to-br ${card.bgGradient} dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-white/20 dark:border-gray-700/20 group`}
                >
                  <div className="flex justify-between items-center">
                    <div className="space-y-2">
                      <p
                        className={`text-3xl font-bold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}
                      >
                        {card.value.toLocaleString()}
                      </p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {card.title}
                      </p>
                    </div>
                    <div
                      className={`p-3 rounded-xl bg-gradient-to-br ${card.iconBg} shadow-lg group-hover:scale-110 transition-transform duration-300`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  {/* Decorative gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r to-transparent opacity-0 transition-opacity duration-300 from-white/10 group-hover:opacity-100"></div>
                </div>
              );
            })}
          </div>

          {/* Secondary Stats Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {secondaryStatCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div
                  key={index}
                  className={`relative overflow-hidden bg-gradient-to-br ${card.bgGradient} dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-white/20 dark:border-gray-700/20 group`}
                >
                  <div className="flex justify-between items-center">
                    <div className="space-y-2">
                      <div className="flex items-baseline">
                        <p
                          className={`text-2xl font-bold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}
                        >
                          {card.value.toLocaleString()}
                        </p>
                        {card.suffix && (
                          <span className="ml-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                            {card.suffix}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {card.title}
                      </p>
                    </div>
                    <div
                      className={`p-3 rounded-xl bg-gradient-to-br ${card.iconBg} shadow-lg group-hover:scale-110 transition-transform duration-300`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  {/* Decorative gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r to-transparent opacity-0 transition-opacity duration-300 from-white/10 group-hover:opacity-100"></div>
                </div>
              );
            })}
          </div>

          {/* Enhanced Content Grid */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <div className="overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm dark:bg-gray-800 dark:border-gray-700">
                <div className="p-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Atividade Recente
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Últimas interações do sistema
                  </p>
                </div>

                <div className="p-6">
                  {recentActivity.length > 0 ? (
                    <div className="space-y-4">
                      {recentActivity.map((activity) => {
                        const ActivityIcon = getActivityIcon(activity.type);
                        return (
                          <div
                            key={activity.id}
                            className="flex items-start p-4 space-x-4 rounded-xl transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700 group"
                          >
                            <div className="flex-shrink-0">
                              <div className="flex justify-center items-center w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl transition-transform duration-200 dark:from-blue-900/30 dark:to-indigo-900/30 group-hover:scale-110">
                                {ActivityIcon ? (
                                  <ActivityIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                ) : (
                                  <CircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <p className="text-sm font-medium leading-relaxed text-gray-900 dark:text-gray-100">
                                  {activity.content}
                                </p>
                                <span className="ml-4 text-xs font-medium text-gray-500 whitespace-nowrap dark:text-gray-400">
                                  {formatTimestamp(activity.timestamp)}
                                </span>
                              </div>
                              {activity.clientName && (
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                  Cliente:{" "}
                                  <span className="font-medium">
                                    {activity.clientName}
                                  </span>
                                </p>
                              )}
                              {activity.status && (
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mt-2 ${getStatusColor(
                                    activity.status
                                  )}`}
                                >
                                  {activity.status}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full dark:from-gray-700 dark:to-gray-800">
                        <CircleIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                      </div>
                      <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">
                        Nenhuma atividade
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        As atividades recentes aparecerão aqui
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Sidebar */}
            <div className="space-y-6">
              {/* Performance Metrics */}
              <div className="overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm dark:bg-gray-800 dark:border-gray-700">
                <div className="p-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Performance
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl dark:bg-gray-700">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Taxa de Resposta
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {advancedStats.responseRate}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl dark:bg-gray-700">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tempo Médio
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {advancedStats.avgResponseTime}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl dark:bg-gray-700">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Satisfação
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {advancedStats.satisfactionScore}/5
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl dark:bg-gray-700">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Crescimento (7d)
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        +{advancedStats.clientGrowth}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Goals */}
              {advancedStats.goalDistribution.length > 0 && (
                <div className="overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm dark:bg-gray-800 dark:border-gray-700">
                  <div className="p-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      Objetivos Populares
                    </h3>
                  </div>
                  <div className="p-6 space-y-3">
                    {advancedStats.goalDistribution.map((goalData, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl dark:bg-gray-700">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                          {goalData.goal}
                        </span>
                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {goalData.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm dark:bg-gray-800 dark:border-gray-700">
                <div className="p-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Ações Rápidas
                  </h3>
                </div>
                <div className="p-6 space-y-3">
                  <button className="px-4 py-3 w-full font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-sm transition-all duration-200 hover:from-blue-600 hover:to-indigo-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900">
                    Nova Conversa
                  </button>
                  <button className="px-4 py-3 w-full font-medium text-gray-700 bg-white rounded-xl border border-gray-300 transition-all duration-200 dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900">
                    Ver Relatórios
                  </button>
                  <button className="px-4 py-3 w-full font-medium text-gray-700 bg-white rounded-xl border border-gray-300 transition-all duration-200 dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900">
                    Configurações
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
