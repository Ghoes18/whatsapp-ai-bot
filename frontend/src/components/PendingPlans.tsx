"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { dashboardAPI } from "../services/api"
import type { PendingPlan } from "../services/api"
import { useNotifications } from "../hooks/useNotifications"
import { formatPhoneNumber } from "../utils/phoneFormatter"

// Enhanced SVG Icons with better styling
const EditIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
)

const ApproveIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const RejectIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const ScheduleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
)

const FitnessCenterIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z"
    />
  </svg>
)

const RefreshIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
)

const PendingPlans: React.FC = () => {
  const [pendingPlans, setPendingPlans] = useState<PendingPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<PendingPlan | null>(null)
  const [editedContent, setEditedContent] = useState("")
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null)
  const { forceUpdate: forceUpdateNotifications } = useNotifications()

  useEffect(() => {
    loadPendingPlans()
  }, [])

  const loadPendingPlans = async () => {
    try {
      setLoading(true)
      const response = await dashboardAPI.getPendingPlans()
      setPendingPlans(Array.isArray(response) ? response : [])
    } catch (error) {
      console.error("Erro ao carregar planos pendentes:", error)
      setPendingPlans([])
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (plan: PendingPlan) => {
    setSelectedPlan(plan)
    setEditedContent(plan.plan_content)
    setIsEditModalOpen(true)
  }

  const handleReview = async (status: "approved" | "rejected") => {
    if (!selectedPlan) return

    try {
      setProcessingPlanId(selectedPlan.id)
      await dashboardAPI.reviewPlan(selectedPlan.id, status, status === "approved" ? editedContent : undefined)

      setPendingPlans((prev) => prev.filter((plan) => plan.id !== selectedPlan.id))
      setIsEditModalOpen(false)
      setSelectedPlan(null)
      
      // Forçar atualização das notificações
      forceUpdateNotifications()
    } catch (error) {
      console.error("Erro ao revisar plano:", error)
    } finally {
      setProcessingPlanId(null)
    }
  }

  const handleApprovePlan = async (plan: PendingPlan) => {
    try {
      setProcessingPlanId(plan.id)
      await dashboardAPI.reviewPlan(plan.id, "approved", plan.plan_content)

      setPendingPlans((prev) => prev.filter((p) => p.id !== plan.id))
      
      // Forçar atualização das notificações
      forceUpdateNotifications()
    } catch (error) {
      console.error("Erro ao aprovar plano:", error)
    } finally {
      setProcessingPlanId(null)
    }
  }

  const handleRejectPlan = async (plan: PendingPlan) => {
    try {
      setProcessingPlanId(plan.id)
      await dashboardAPI.reviewPlan(plan.id, "rejected")

      setPendingPlans((prev) => prev.filter((p) => p.id !== plan.id))
      
      // Forçar atualização das notificações
      forceUpdateNotifications()
    } catch (error) {
      console.error("Erro ao rejeitar plano:", error)
    } finally {
      setProcessingPlanId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getPlanType = (content: string) => {
    if (content.toLowerCase().includes("treino") || content.toLowerCase().includes("exercício")) {
      return {
        type: "Treino",
        icon: FitnessCenterIcon,
        color: "text-blue-600",
        bgColor: "bg-gradient-to-br from-blue-50 to-blue-100",
        iconBg: "bg-gradient-to-br from-blue-500 to-blue-600",
      }
    }
    if (content.toLowerCase().includes("nutricional") || content.toLowerCase().includes("alimentação")) {
      return {
        type: "Nutrição",
        icon: ScheduleIcon,
        color: "text-emerald-600",
        bgColor: "bg-gradient-to-br from-emerald-50 to-emerald-100",
        iconBg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
      }
    }
    return {
      type: "Plano",
      icon: ScheduleIcon,
      color: "text-amber-600",
      bgColor: "bg-gradient-to-br from-amber-50 to-amber-100",
      iconBg: "bg-gradient-to-br from-amber-500 to-amber-600",
    }
  }

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
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Carregando planos</h3>
            <p className="text-gray-600 dark:text-gray-400">Buscando planos pendentes de aprovação...</p>
          </div>
        </div>
      </div>
    )
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
                Planos Pendentes
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Revise e aprove os planos gerados pela IA</p>
            </div>
            <button
              onClick={loadPendingPlans}
              className="inline-flex items-center px-4 py-2 bg-white rounded-xl border border-gray-300 shadow-sm transition-all duration-200 dark:bg-gray-800 dark:border-gray-600 hover:shadow-md hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 group"
            >
              <RefreshIcon className="mr-2 w-4 h-4 text-gray-500 transition-colors dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300" />
              <span className="font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">Atualizar</span>
            </button>
          </div>

          {!Array.isArray(pendingPlans) || pendingPlans.length === 0 ? (
            <div className="py-16 text-center">
              <div className="p-12 mx-auto max-w-md bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl dark:from-gray-800 dark:to-gray-700">
                <div className="flex justify-center items-center mx-auto mb-6 w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full dark:from-gray-600 dark:to-gray-500">
                  <ScheduleIcon className="w-10 h-10 text-gray-500 dark:text-gray-400" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-100">Tudo em dia!</h3>
                <p className="leading-relaxed text-gray-600 dark:text-gray-400">
                  Não há planos pendentes de aprovação no momento. Todos os planos gerados pela IA foram revisados.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {pendingPlans.map((plan) => {
                const planInfo = getPlanType(plan.plan_content)
                const Icon = planInfo.icon
                const isProcessing = processingPlanId === plan.id

                return (
                  <div
                    key={plan.id}
                    className="overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm transition-all duration-300 dark:bg-gray-800 dark:border-gray-700 group hover:shadow-xl hover:-translate-y-1"
                  >
                    {/* Card Header */}
                    <div className={`${planInfo.bgColor} p-6 border-b border-white/20`}>
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-12 h-12 ${planInfo.iconBg} rounded-xl flex items-center justify-center shadow-lg`}
                          >
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">{planInfo.type}</h3>
                            <p className="text-sm font-medium text-gray-600">{formatPhoneNumber(plan.client_phone)}</p>
                          </div>
                        </div>
                        <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                          Pendente
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-6">
                      <div className="mb-6">
                        <p className="mb-4 text-sm leading-relaxed text-gray-700 line-clamp-4">{plan.plan_content}</p>
                        <div className="flex items-center px-3 py-2 text-xs text-gray-500 bg-gray-50 rounded-lg">
                          <div className="mr-2 w-2 h-2 bg-gray-400 rounded-full"></div>
                          Criado em {formatDate(plan.created_at)}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(plan)}
                          disabled={isProcessing}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-gray-900 text-sm font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                          <EditIcon className="w-4 h-4 mr-1.5 group-hover:scale-110 transition-transform" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleApprovePlan(plan)}
                          disabled={isProcessing}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-sm font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md group"
                        >
                          <ApproveIcon className="w-4 h-4 mr-1.5 group-hover:scale-110 transition-transform" />
                          Aprovar
                        </button>
                        <button
                          onClick={() => handleRejectPlan(plan)}
                          disabled={isProcessing}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md group"
                        >
                          <RejectIcon className="w-4 h-4 mr-1.5 group-hover:scale-110 transition-transform" />
                          Rejeitar
                        </button>
                      </div>
                    </div>

                    {/* Processing Overlay */}
                    {isProcessing && (
                      <div className="flex absolute inset-0 justify-center items-center rounded-2xl backdrop-blur-sm bg-white/80">
                        <div className="text-center">
                          <div className="mx-auto mb-2 w-8 h-8 rounded-full border-gray-300 animate-spin border-3 border-t-blue-600"></div>
                          <p className="text-sm font-medium text-gray-700">Processando...</p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Enhanced Edit Modal */}
          {isEditModalOpen && selectedPlan && (
            <div className="flex fixed inset-0 z-50 justify-center items-center p-4 backdrop-blur-sm bg-black/50">
              <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden">
                {/* Modal Header */}
                <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Editar Plano</h2>
                      <p className="mt-1 text-gray-600">
                        Cliente: <span className="font-medium">{formatPhoneNumber(selectedPlan.client_phone)}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => setIsEditModalOpen(false)}
                      className="p-2 rounded-xl transition-colors hover:bg-white/50"
                      aria-label="Fechar modal"
                    >
                      <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="overflow-y-auto flex-1 p-6">
                  <div className="space-y-4">
                    <label className="block mb-2 text-sm font-semibold text-gray-900">Conteúdo do Plano</label>
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="p-4 w-full h-80 bg-gray-50 rounded-xl border border-gray-200 transition-all duration-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white"
                      placeholder="Conteúdo do plano..."
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end p-6 space-x-3 bg-gray-50 border-t border-gray-100">
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleReview("approved")}
                    disabled={processingPlanId === selectedPlan.id}
                    className="inline-flex items-center px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                  >
                    {processingPlanId === selectedPlan.id ? (
                      <>
                        <div className="mr-2 w-4 h-4 rounded-full border-2 animate-spin border-white/30 border-t-white"></div>
                        Processando...
                      </>
                    ) : (
                      <>
                        <ApproveIcon className="mr-2 w-4 h-4" />
                        Aprovar com Edições
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PendingPlans
