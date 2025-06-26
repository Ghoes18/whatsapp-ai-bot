"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { dashboardAPI } from "../services/api"
import type { Client, ClientStats, Plan } from "../services/api"
import PlanViewModal from "./PlanViewModal"
import { formatPhoneNumber } from "../utils/phoneFormatter"
import { useTheme } from "../contexts/ThemeContext"
import UserAvatar from "./UserAvatar"

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
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)

  useTheme(); // Garante que o contexto de tema seja ativado

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
        experience: clientData.experience,
        available_days: clientData.available_days,
        health_conditions: clientData.health_conditions,
        exercise_preferences: clientData.exercise_preferences,
        equipment: clientData.equipment,
        motivation: clientData.motivation,
        profile_picture_url: clientData.profile_picture_url,
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
        experience: client.experience,
        available_days: client.available_days,
        health_conditions: client.health_conditions,
        exercise_preferences: client.exercise_preferences,
        equipment: client.equipment,
        motivation: client.motivation,
        profile_picture_url: client.profile_picture_url,
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

  const handleViewPlan = (plan: Plan) => {
    setSelectedPlanId(plan.id)
    setIsPlanModalOpen(true)
  }

  const closePlanModal = () => {
    setIsPlanModalOpen(false)
    setSelectedPlanId(null)
  }

  if (loading) {
    return (
      <div className="flex h-screen">
        {/* Sidebar space */}
        <div className="hidden w-72 lg:block"></div>

        <div className="flex flex-1 justify-center items-center">
          <div className="text-center">
            <div className="relative mx-auto mb-6 w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent animate-spin border-t-blue-600"></div>
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

        <div className="flex flex-1 justify-center items-center">
          <div className="text-center">
            <div className="flex justify-center items-center mx-auto mb-6 w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full">
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
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar space */}
      <div className="hidden w-72 lg:block"></div>

      <div className="overflow-auto flex-1">
        <div className="p-6 space-y-8">
          {/* Enhanced Header */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300">
                Perfil do Cliente
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Gerencie as informações e configurações do cliente</p>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <button
                onClick={toggleAI}
                className={`px-4 py-2.5 rounded-xl font-medium transition-all duration-200 shadow-sm ${
                  client.ai_enabled
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-200"
                    : "bg-white border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                }`}
              >
                IA {client.ai_enabled ? "Ativada" : "Desativada"}
              </button>
              <button className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900">
                <WhatsAppIcon className="mr-2 w-4 h-4" />
                Conversar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Enhanced Main Content */}
            <div className="space-y-8 lg:col-span-2">
              {/* Personal Information Card */}
              <div className="overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm dark:bg-gray-800 dark:border-gray-700">
                <div className="flex justify-between items-center p-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Informações Pessoais</h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Dados básicos do cliente</p>
                  </div>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center px-4 py-2 bg-white rounded-xl border border-gray-300 shadow-sm transition-all duration-200 hover:shadow-md hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 group dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      <EditIcon className="mr-2 w-4 h-4 text-gray-500 group-hover:text-gray-700 dark:text-gray-300 dark:group-hover:text-gray-100" />
                      <span className="font-medium text-gray-700 group-hover:text-gray-900 dark:text-gray-100 dark:group-hover:text-white">Editar</span>
                    </button>
                  ) : (
                    <div className="flex space-x-3">
                      <button
                        onClick={handleSave}
                        className="inline-flex items-center px-4 py-2 font-medium text-white bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl shadow-sm transition-all duration-200 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                      >
                        <SaveIcon className="mr-2 w-4 h-4" />
                        Salvar
                      </button>
                      <button
                        onClick={handleCancel}
                        className="inline-flex items-center px-4 py-2 bg-white rounded-xl border border-gray-300 shadow-sm transition-all duration-200 hover:shadow-md hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        <CancelIcon className="mr-2 w-4 h-4 text-gray-500 dark:text-gray-300" />
                        <span className="font-medium text-gray-700 dark:text-gray-100">Cancelar</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="name" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
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
                            ? "bg-white border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-gray-500"
                            : "text-gray-700 bg-gray-50 border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="age" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
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
                            ? "bg-white border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-gray-500"
                            : "text-gray-700 bg-gray-50 border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="gender" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Gênero
                      </label>
                      {isEditing ? (
                        <select
                          id="gender"
                          value={editedClient.gender ?? ""}
                          onChange={(e) => setEditedClient({ ...editedClient, gender: e.target.value })}
                          className="px-4 py-3 w-full bg-white rounded-xl border border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-gray-500"
                        >
                          <option value="">Selecione</option>
                          <option value="male">Masculino</option>
                          <option value="female">Feminino</option>
                          <option value="other">Outro</option>
                          <option value="masculino">Masculino</option>
                          <option value="feminino">Feminino</option>
                          <option value="outro">Outro</option>
                        </select>
                      ) : (
                        <div className="px-4 py-3 w-full text-gray-700 bg-gray-50 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                          {client.gender === 'male' || client.gender === 'masculino' ? 'Masculino' :
                           client.gender === 'female' || client.gender === 'feminino' ? 'Feminino' :
                           client.gender === 'other' || client.gender === 'outro' ? 'Outro' :
                           client.gender || 'Não informado'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="height" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
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
                            ? "bg-white border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-gray-500"
                            : "text-gray-700 bg-gray-50 border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="weight" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
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
                            ? "bg-white border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-gray-500"
                            : "text-gray-700 bg-gray-50 border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="experience" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Experiência
                      </label>
                      {isEditing ? (
                        <textarea
                          id="experience"
                          value={editedClient.experience ?? ""}
                          onChange={(e) => setEditedClient({ ...editedClient, experience: e.target.value })}
                          rows={2}
                          className="px-4 py-3 w-full bg-white rounded-xl border border-gray-300 transition-all duration-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-gray-500"
                          placeholder="Ex: Já treinou antes, iniciante, etc."
                        />
                      ) : (
                        <div className="px-4 py-3 w-full text-gray-700 bg-gray-50 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                          {client.experience || 'Não informado'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label htmlFor="goal" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
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
                            ? "bg-white border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-gray-500"
                            : "text-gray-700 bg-gray-50 border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label htmlFor="dietary_restrictions" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
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
                            ? "bg-white border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-gray-500"
                            : "text-gray-700 bg-gray-50 border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                        placeholder="Ex: Alergia a lactose, vegetariano, etc."
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label htmlFor="available_days" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Dias Disponíveis
                      </label>
                      <input
                        id="available_days"
                        type="text"
                        value={isEditing ? (editedClient.available_days ?? "") : (client.available_days ?? "")}
                        onChange={(e) => setEditedClient({ ...editedClient, available_days: e.target.value })}
                        disabled={!isEditing}
                        className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          isEditing
                            ? "bg-white border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-gray-500"
                            : "text-gray-700 bg-gray-50 border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                        placeholder="Ex: Segunda, Quarta, Sexta"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label htmlFor="health_conditions" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Condições de Saúde
                      </label>
                      <textarea
                        id="health_conditions"
                        value={isEditing ? (editedClient.health_conditions ?? "") : (client.health_conditions ?? "")}
                        onChange={(e) => setEditedClient({ ...editedClient, health_conditions: e.target.value })}
                        disabled={!isEditing}
                        rows={2}
                        className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                          isEditing
                            ? "bg-white border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-gray-500"
                            : "text-gray-700 bg-gray-50 border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                        placeholder="Ex: Hipertensão, diabetes, etc."
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label htmlFor="exercise_preferences" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Preferências de Exercício
                      </label>
                      <textarea
                        id="exercise_preferences"
                        value={isEditing ? (editedClient.exercise_preferences ?? "") : (client.exercise_preferences ?? "")}
                        onChange={(e) => setEditedClient({ ...editedClient, exercise_preferences: e.target.value })}
                        disabled={!isEditing}
                        rows={2}
                        className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                          isEditing
                            ? "bg-white border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-gray-500"
                            : "text-gray-700 bg-gray-50 border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                        placeholder="Ex: Musculação, corrida, etc."
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label htmlFor="equipment" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Equipamentos
                      </label>
                      <input
                        id="equipment"
                        type="text"
                        value={isEditing ? (editedClient.equipment ?? "") : (client.equipment ?? "")}
                        onChange={(e) => setEditedClient({ ...editedClient, equipment: e.target.value })}
                        disabled={!isEditing}
                        className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          isEditing
                            ? "bg-white border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-gray-500"
                            : "text-gray-700 bg-gray-50 border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                        placeholder="Ex: Halteres, elástico, etc."
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label htmlFor="motivation" className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Motivação
                      </label>
                      <textarea
                        id="motivation"
                        value={isEditing ? (editedClient.motivation ?? "") : (client.motivation ?? "")}
                        onChange={(e) => setEditedClient({ ...editedClient, motivation: e.target.value })}
                        disabled={!isEditing}
                        rows={2}
                        className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                          isEditing
                            ? "bg-white border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:hover:border-gray-500"
                            : "text-gray-700 bg-gray-50 border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                        placeholder="Ex: Emagrecer, ganhar massa, etc."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Plans History Card */}
              <div className="overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm dark:bg-gray-800 dark:border-gray-700">
                <div className="p-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Histórico de Planos</h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Planos gerados para este cliente</p>
                </div>
                
                {loadingPlans ? (
                  <div className="p-12 text-center">
                    <div className="relative mx-auto mb-6 w-16 h-16">
                      <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-600"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-transparent animate-spin border-t-blue-600"></div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Carregando planos...</p>
                  </div>
                ) : plans.length > 0 ? (
                  <div className="p-6 space-y-4">
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        className="p-4 rounded-xl border border-gray-200 transition-all duration-200 hover:shadow-md hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-700"
                      >
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="flex justify-center items-center w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg dark:from-blue-900/30 dark:to-indigo-900/30">
                              <ScheduleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{plan.type}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Criado em {formatDate(plan.created_at)}</p>
                            </div>
                          </div>
                          <span
                            className={`px-3 py-1 text-xs font-medium rounded-full ${
                              plan.status === 'active'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : plan.status === 'expired'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {plan.status === 'active' ? 'Ativo' : plan.status === 'expired' ? 'Expirado' : 'Concluído'}
                          </span>
                        </div>
                        
                        {plan.expires_at && (
                          <div className="p-2 mb-3 bg-gray-50 rounded-lg dark:bg-gray-700">
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Expira em: {formatDate(plan.expires_at)}
                            </p>
                          </div>
                        )}
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewPlan(plan)}
                            className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg border border-blue-200 transition-all duration-200 hover:bg-blue-100 hover:border-blue-300 dark:text-blue-300 dark:border-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-800/30"
                          >
                            <svg className="mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Ver Plano
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="flex justify-center items-center mx-auto mb-6 w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full dark:from-gray-700 dark:to-gray-600">
                      <ScheduleIcon className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">Nenhum plano encontrado</h3>
                    <p className="text-gray-500 dark:text-gray-400">Os planos gerados para este cliente aparecerão aqui</p>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Sidebar */}
            <div className="space-y-6">
              {/* Contact Information */}
              <div className="overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm dark:bg-gray-800 dark:border-gray-700">
                <div className="p-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Informações de Contato</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center p-4 space-x-4 bg-gray-50 rounded-xl dark:bg-gray-700">
                    <UserAvatar
                      clientId={client.id}
                      clientName={client.name}
                      size="lg"
                      className="flex-shrink-0"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{client.name ?? "Nome não informado"}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Cliente</p>
                    </div>
                  </div>

                  <div className="flex items-center p-4 space-x-4 bg-gray-50 rounded-xl dark:bg-gray-700">
                    <div className="flex justify-center items-center w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl dark:from-green-900/30 dark:to-emerald-900/30">
                      <WhatsAppIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{formatPhoneNumber(client.phone)}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">WhatsApp</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              {stats && (
                <div className="overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm dark:bg-gray-800 dark:border-gray-700">
                  <div className="p-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Estatísticas</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl dark:bg-gray-700">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total de Mensagens</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{stats.totalMessages ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl dark:bg-gray-700">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Planos Recebidos</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{stats.plansReceived ?? 0}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl dark:bg-gray-700">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Última Atividade</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
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

      {/* Plan View Modal */}
      {selectedPlanId && (
        <PlanViewModal
          planId={selectedPlanId}
          isOpen={isPlanModalOpen}
          onClose={closePlanModal}
        />
      )}
    </div>
  )
}

export default ClientProfile
