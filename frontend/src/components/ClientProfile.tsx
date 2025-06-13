"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { dashboardAPI } from "../services/api"
import type { Client, ClientStats, Plan } from "../services/api"

// Enhanced SVG Icons
const PersonIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
)

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

const SaveIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"
    />
  </svg>
)

const CancelIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
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

const ClientProfile: React.FC = () => {
  const { clientId } = useParams()
  const [client, setClient] = useState<Client | null>(null)
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [editedClient, setEditedClient] = useState<Partial<Client>>({})
  const [loading, setLoading] = useState(true)
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null)

  useEffect(() => {
    if (clientId) {
      loadClientData(clientId)
      loadClientStats(clientId)
      loadClientPlans(clientId)
    }
  }, [clientId])

  const loadClientData = async (clientId: string) => {
    try {
      setLoading(true)
      const clientData = await dashboardAPI.getClient(clientId)
      setClient(clientData)

      setEditedClient({
        name: clientData.name,
        age: clientData.age,
        gender: clientData.gender,
        height: clientData.height,
        weight: clientData.weight,
        goal: clientData.goal,
        activity_level: clientData.activity_level,
        dietary_restrictions: clientData.dietary_restrictions,
      })
    } catch (error) {
      console.error("Erro ao carregar dados do cliente:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadClientStats = async (clientId: string) => {
    try {
      const statsData = await dashboardAPI.getClientStats(clientId)
      setStats(statsData)
    } catch (error) {
      console.error("Erro ao carregar estatísticas do cliente:", error)
    }
  }

  const loadClientPlans = async (clientId: string) => {
    try {
      console.log(`🔍 Frontend: Carregando planos para cliente ID: ${clientId}`)
      setLoadingPlans(true)
      const plansData = await dashboardAPI.getClientPlans(clientId)
      console.log(`📋 Frontend: Planos recebidos:`, plansData)
      setPlans(plansData)
    } catch (error) {
      console.error("❌ Frontend: Erro ao carregar planos do cliente:", error)
    } finally {
      setLoadingPlans(false)
    }
  }

  const handleSave = async () => {
    if (!client) return

    try {
      await dashboardAPI.updateClient(client.id, editedClient)
      setClient({ ...client, ...editedClient })
      setIsEditing(false)
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error)
    }
  }

  const handleCancel = () => {
    if (client) {
      setEditedClient({
        name: client.name,
        age: client.age,
        gender: client.gender,
        height: client.height,
        weight: client.weight,
        goal: client.goal,
        activity_level: client.activity_level,
        dietary_restrictions: client.dietary_restrictions,
      })
    }
    setIsEditing(false)
  }

  const toggleAI = async () => {
    if (!client) return

    try {
      const response = await dashboardAPI.toggleAI(client.id)
      setClient({ ...client, ai_enabled: response.ai_enabled })
    } catch (error) {
      console.error("Erro ao alternar IA:", error)
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

  const handleViewPDF = async (plan: Plan) => {
    try {
      setGeneratingPDF(plan.id)
      
      // Primeiro, tentar buscar o PDF existente
      const pdfResponse = await dashboardAPI.getPlanPDF(plan.id)
      
      if (pdfResponse.needsGeneration) {
        // Se precisa gerar, fazer a geração
        console.log(`📄 Gerando PDF para plano: ${plan.id}`)
        const generateResponse = await dashboardAPI.generatePlanPDF(plan.id)
        
        // Abrir o PDF em nova aba
        window.open(generateResponse.pdfUrl, '_blank')
      } else if (pdfResponse.pdfUrl) {
        // Se já existe, abrir diretamente
        console.log(`📄 Abrindo PDF existente: ${pdfResponse.pdfUrl}`)
        window.open(pdfResponse.pdfUrl, '_blank')
      } else {
        console.error('❌ Não foi possível obter URL do PDF')
        alert('Erro ao carregar o PDF. Tente novamente.')
      }
    } catch (error) {
      console.error('❌ Erro ao visualizar PDF:', error)
      alert('Erro ao carregar o PDF. Tente novamente.')
    } finally {
      setGeneratingPDF(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen">
        {/* Sidebar space */}
        <div className="hidden w-72 lg:block"></div>

        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent rounded-full border-t-blue-600 animate-spin"></div>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Carregando perfil</h3>
            <p className="text-gray-600">Buscando informações do cliente...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex h-screen">
        {/* Sidebar space */}
        <div className="hidden w-72 lg:block"></div>

        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200">
              <PersonIcon className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="mb-3 text-xl font-semibold text-gray-900">Cliente não encontrado</h3>
            <p className="text-gray-600">O cliente solicitado não foi encontrado no sistema.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar space */}
      <div className="hidden w-72 lg:block"></div>

      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-8">
          {/* Enhanced Header */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text">
                Perfil do Cliente
              </h1>
              <p className="mt-2 text-gray-600">Gerencie as informações e configurações do cliente</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={toggleAI}
                className={`px-4 py-2.5 rounded-xl font-medium transition-all duration-200 shadow-sm ${
                  client.ai_enabled
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-200"
                    : "bg-white border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                }`}
              >
                IA {client.ai_enabled ? "Ativada" : "Desativada"}
              </button>
              <button className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
                <WhatsAppIcon className="w-4 h-4 mr-2" />
                Conversar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Enhanced Main Content */}
            <div className="space-y-8 lg:col-span-2">
              {/* Personal Information Card */}
              <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Informações Pessoais</h2>
                    <p className="mt-1 text-sm text-gray-600">Dados básicos do cliente</p>
                  </div>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center px-4 py-2 transition-all duration-200 bg-white border border-gray-300 shadow-sm rounded-xl hover:shadow-md hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 group"
                    >
                      <EditIcon className="w-4 h-4 mr-2 text-gray-500 group-hover:text-gray-700" />
                      <span className="font-medium text-gray-700 group-hover:text-gray-900">Editar</span>
                    </button>
                  ) : (
                    <div className="flex space-x-3">
                      <button
                        onClick={handleSave}
                        className="inline-flex items-center px-4 py-2 font-medium text-white transition-all duration-200 shadow-sm bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-xl hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                      >
                        <SaveIcon className="w-4 h-4 mr-2" />
                        Salvar
                      </button>
                      <button
                        onClick={handleCancel}
                        className="inline-flex items-center px-4 py-2 transition-all duration-200 bg-white border border-gray-300 shadow-sm rounded-xl hover:shadow-md hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                      >
                        <CancelIcon className="w-4 h-4 mr-2 text-gray-500" />
                        <span className="font-medium text-gray-700">Cancelar</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="name" className="block text-sm font-semibold text-gray-900">
                        Nome
                      </label>
                      <input
                        id="name"
                        type="text"
                        value={isEditing ? (editedClient.name ?? "") : (client.name ?? "")}
                        onChange={(e) => setEditedClient({ ...editedClient, name: e.target.value })}
                        disabled={!isEditing}
                        className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          isEditing
                            ? "border-gray-300 bg-white hover:border-gray-400"
                            : "border-gray-200 bg-gray-50 text-gray-700"
                        }`}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="age" className="block text-sm font-semibold text-gray-900">
                        Idade
                      </label>
                      <input
                        id="age"
                        type="number"
                        value={isEditing ? (editedClient.age ?? "") : (client.age ?? "")}
                        onChange={(e) => setEditedClient({ ...editedClient, age: Number.parseInt(e.target.value) })}
                        disabled={!isEditing}
                        className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          isEditing
                            ? "border-gray-300 bg-white hover:border-gray-400"
                            : "border-gray-200 bg-gray-50 text-gray-700"
                        }`}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="gender" className="block text-sm font-semibold text-gray-900">
                        Gênero
                      </label>
                      <select
                        id="gender"
                        value={isEditing ? (editedClient.gender ?? "") : (client.gender ?? "")}
                        onChange={(e) => setEditedClient({ ...editedClient, gender: e.target.value })}
                        disabled={!isEditing}
                        className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          isEditing
                            ? "border-gray-300 bg-white hover:border-gray-400"
                            : "border-gray-200 bg-gray-50 text-gray-700"
                        }`}
                      >
                        <option value="">Selecione</option>
                        <option value="male">Masculino</option>
                        <option value="female">Feminino</option>
                        <option value="other">Outro</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="height" className="block text-sm font-semibold text-gray-900">
                        Altura (cm)
                      </label>
                      <input
                        id="height"
                        type="number"
                        value={isEditing ? (editedClient.height ?? "") : (client.height ?? "")}
                        onChange={(e) => setEditedClient({ ...editedClient, height: Number.parseInt(e.target.value) })}
                        disabled={!isEditing}
                        className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          isEditing
                            ? "border-gray-300 bg-white hover:border-gray-400"
                            : "border-gray-200 bg-gray-50 text-gray-700"
                        }`}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="weight" className="block text-sm font-semibold text-gray-900">
                        Peso (kg)
                      </label>
                      <input
                        id="weight"
                        type="number"
                        value={isEditing ? (editedClient.weight ?? "") : (client.weight ?? "")}
                        onChange={(e) =>
                          setEditedClient({ ...editedClient, weight: Number.parseFloat(e.target.value) })
                        }
                        disabled={!isEditing}
                        className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          isEditing
                            ? "border-gray-300 bg-white hover:border-gray-400"
                            : "border-gray-200 bg-gray-50 text-gray-700"
                        }`}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="activity_level" className="block text-sm font-semibold text-gray-900">
                        Nível de Atividade
                      </label>
                      <select
                        id="activity_level"
                        value={isEditing ? (editedClient.activity_level ?? "") : (client.activity_level ?? "")}
                        onChange={(e) => setEditedClient({ ...editedClient, activity_level: e.target.value })}
                        disabled={!isEditing}
                        className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          isEditing
                            ? "border-gray-300 bg-white hover:border-gray-400"
                            : "border-gray-200 bg-gray-50 text-gray-700"
                        }`}
                      >
                        <option value="">Selecione</option>
                        <option value="sedentary">Sedentário</option>
                        <option value="lightly_active">Levemente Ativo</option>
                        <option value="moderately_active">Moderadamente Ativo</option>
                        <option value="very_active">Muito Ativo</option>
                        <option value="extremely_active">Extremamente Ativo</option>
                      </select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label htmlFor="goal" className="block text-sm font-semibold text-gray-900">
                        Objetivo
                      </label>
                      <textarea
                        id="goal"
                        value={isEditing ? (editedClient.goal ?? "") : (client.goal ?? "")}
                        onChange={(e) => setEditedClient({ ...editedClient, goal: e.target.value })}
                        disabled={!isEditing}
                        rows={3}
                        className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                          isEditing
                            ? "border-gray-300 bg-white hover:border-gray-400"
                            : "border-gray-200 bg-gray-50 text-gray-700"
                        }`}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label htmlFor="dietary_restrictions" className="block text-sm font-semibold text-gray-900">
                        Restrições Alimentares
                      </label>
                      <textarea
                        id="dietary_restrictions"
                        value={
                          isEditing ? (editedClient.dietary_restrictions ?? "") : (client.dietary_restrictions ?? "")
                        }
                        onChange={(e) => setEditedClient({ ...editedClient, dietary_restrictions: e.target.value })}
                        disabled={!isEditing}
                        rows={2}
                        className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                          isEditing
                            ? "border-gray-300 bg-white hover:border-gray-400"
                            : "border-gray-200 bg-gray-50 text-gray-700"
                        }`}
                        placeholder="Ex: Alergia a lactose, vegetariano, etc."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Plans History Card */}
              <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <h2 className="text-xl font-bold text-gray-900">Histórico de Planos</h2>
                  <p className="mt-1 text-sm text-gray-600">Planos gerados para este cliente</p>
                </div>
                
                {loadingPlans ? (
                  <div className="p-12 text-center">
                    <div className="relative w-16 h-16 mx-auto mb-6">
                      <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-transparent rounded-full border-t-blue-600 animate-spin"></div>
                    </div>
                    <p className="text-gray-600">Carregando planos...</p>
                  </div>
                ) : plans.length > 0 ? (
                  <div className="p-6 space-y-4">
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        className="p-4 transition-all duration-200 border border-gray-200 rounded-xl hover:shadow-md hover:border-gray-300"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100">
                              <ScheduleIcon className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{plan.type}</h3>
                              <p className="text-sm text-gray-600">Criado em {formatDate(plan.created_at)}</p>
                            </div>
                          </div>
                          <span
                            className={`px-3 py-1 text-xs font-medium rounded-full ${
                              plan.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : plan.status === 'expired'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {plan.status === 'active' ? 'Ativo' : plan.status === 'expired' ? 'Expirado' : 'Concluído'}
                          </span>
                        </div>
                        
                        {plan.expires_at && (
                          <div className="p-2 mb-3 rounded-lg bg-gray-50">
                            <p className="text-xs text-gray-600">
                              Expira em: {formatDate(plan.expires_at)}
                            </p>
                          </div>
                        )}
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewPDF(plan)}
                            disabled={generatingPDF === plan.id}
                            className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 transition-all duration-200 border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {generatingPDF === plan.id ? (
                              <>
                                <div className="w-4 h-4 mr-2 border-2 border-blue-300 rounded-full border-t-blue-600 animate-spin"></div>
                                Gerando...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Ver PDF
                              </>
                            )}
                          </button>
                          
                          <button className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 transition-all duration-200 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-gray-300">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Detalhes
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200">
                      <ScheduleIcon className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="mb-2 text-lg font-medium text-gray-900">Nenhum plano encontrado</h3>
                    <p className="text-gray-500">Os planos gerados para este cliente aparecerão aqui</p>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Sidebar */}
            <div className="space-y-6">
              {/* Contact Information */}
              <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <h3 className="text-lg font-bold text-gray-900">Informações de Contato</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center p-4 space-x-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl">
                      <PersonIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{client.name ?? "Nome não informado"}</p>
                      <p className="text-sm text-gray-600">Cliente</p>
                    </div>
                  </div>

                  <div className="flex items-center p-4 space-x-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl">
                      <WhatsAppIcon className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{client.phone ?? "Telefone não informado"}</p>
                      <p className="text-sm text-gray-600">WhatsApp</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              {stats && (
                <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
                  <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <h3 className="text-lg font-bold text-gray-900">Estatísticas</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm font-medium text-gray-700">Total de Mensagens</span>
                      <span className="text-lg font-bold text-gray-900">{stats.totalMessages ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm font-medium text-gray-700">Planos Recebidos</span>
                      <span className="text-lg font-bold text-gray-900">{stats.plansReceived ?? 0}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Última Atividade</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {stats.lastActivity ? formatDate(stats.lastActivity) : "Nunca"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClientProfile
