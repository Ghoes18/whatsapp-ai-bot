import React, { useState, useEffect } from "react";
import { dashboardAPI } from '../services/api';
import type { PendingPlan } from '../services/api';

// Simple SVG Icons
const EditIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const ApproveIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const RejectIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ScheduleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const FitnessCenterIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z" />
  </svg>
);

const PendingPlans: React.FC = () => {
  const [pendingPlans, setPendingPlans] = useState<PendingPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PendingPlan | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  useEffect(() => {
    loadPendingPlans();
  }, []);

  const loadPendingPlans = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getPendingPlans();
      setPendingPlans(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Erro ao carregar planos pendentes:", error);
      setPendingPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (plan: PendingPlan) => {
    setSelectedPlan(plan);
    setEditedContent(plan.plan_content);
    setIsEditModalOpen(true);
  };

  const handleReview = async (status: "approved" | "rejected") => {
    if (!selectedPlan) return;

    try {
      setProcessingPlanId(selectedPlan.id);
      await dashboardAPI.reviewPlan(
        selectedPlan.id,
        status,
        status === "approved" ? editedContent : undefined
      );

      // Atualizar localmente
      setPendingPlans((prev) =>
        prev.filter((plan) => plan.id !== selectedPlan.id)
      );
      setIsEditModalOpen(false);
      setSelectedPlan(null);
    } catch (error) {
      console.error("Erro ao revisar plano:", error);
    } finally {
      setProcessingPlanId(null);
    }
  };

  const handleApprovePlan = async (plan: PendingPlan) => {
    try {
      setProcessingPlanId(plan.id);
      await dashboardAPI.reviewPlan(
        plan.id,
        "approved",
        plan.plan_content // Usar o conteúdo original do plano
      );

      // Atualizar localmente
      setPendingPlans((prev) =>
        prev.filter((p) => p.id !== plan.id)
      );
    } catch (error) {
      console.error("Erro ao aprovar plano:", error);
    } finally {
      setProcessingPlanId(null);
    }
  };

  const handleRejectPlan = async (plan: PendingPlan) => {
    try {
      setProcessingPlanId(plan.id);
      await dashboardAPI.reviewPlan(
        plan.id,
        "rejected"
      );

      // Atualizar localmente
      setPendingPlans((prev) =>
        prev.filter((p) => p.id !== plan.id)
      );
    } catch (error) {
      console.error("Erro ao rejeitar plano:", error);
    } finally {
      setProcessingPlanId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPlanType = (content: string) => {
    if (
      content.toLowerCase().includes("treino") ||
      content.toLowerCase().includes("exercício")
    ) {
      return { 
        type: "Treino", 
        icon: FitnessCenterIcon, 
        color: "text-blue-600",
        bgColor: "bg-blue-100"
      };
    }
    if (
      content.toLowerCase().includes("nutricional") ||
      content.toLowerCase().includes("alimentação")
    ) {
      return { 
        type: "Nutrição", 
        icon: ScheduleIcon, 
        color: "text-green-600",
        bgColor: "bg-green-100"
      };
    }
    return { 
      type: "Plano", 
      icon: ScheduleIcon, 
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-b-2 rounded-full animate-spin border-primary-600"></div>
          <p className="text-gray-600">Carregando planos pendentes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Planos Pendentes de Aprovação</h1>
        <button 
          onClick={loadPendingPlans}
          className="flex items-center space-x-2 btn-secondary"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Atualizar</span>
        </button>
      </div>

      {!Array.isArray(pendingPlans) || pendingPlans.length === 0 ? (
        <div className="text-center card">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full">
            <ScheduleIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            Nenhum plano pendente de aprovação
          </h3>
          <p className="text-gray-500">
            Todos os planos gerados pela IA foram revisados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pendingPlans.map((plan) => {
            const planInfo = getPlanType(plan.plan_content);
            const Icon = planInfo.icon;
            const isProcessing = processingPlanId === plan.id;
            
            return (
              <div
                key={plan.id}
                className="transition-all duration-300 card hover:shadow-lg hover:-translate-y-1"
              >
                <div className="flex items-center mb-4">
                  <div className={`w-10 h-10 ${planInfo.bgColor} rounded-full flex items-center justify-center mr-3`}>
                    <Icon className={`h-5 w-5 ${planInfo.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {planInfo.type}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {plan.client_phone}
                    </p>
                  </div>
                  <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    Pendente
                  </span>
                </div>

                <div className="pt-4 mb-4 border-t border-gray-200">
                  <p className="mb-4 text-sm text-gray-700 line-clamp-6">
                    {plan.plan_content}
                  </p>
                  <p className="text-xs text-gray-500">
                    Criado em: {formatDate(plan.created_at)}
                  </p>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => openEditModal(plan)}
                    disabled={isProcessing}
                    className="flex items-center justify-center flex-1 space-x-1 text-sm btn-secondary"
                  >
                    <EditIcon className="w-4 h-4" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => handleApprovePlan(plan)}
                    disabled={isProcessing}
                    className="flex items-center justify-center flex-1 space-x-1 text-sm btn-primary"
                  >
                    <ApproveIcon className="w-4 h-4" />
                    <span>Aprovar</span>
                  </button>
                  <button
                    onClick={() => handleRejectPlan(plan)}
                    disabled={isProcessing}
                    className="flex items-center justify-center flex-1 px-3 py-2 space-x-1 text-sm font-medium text-white transition-colors duration-200 bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    <RejectIcon className="w-4 h-4" />
                    <span>Rejeitar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Edição */}
      {isEditModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Editar Plano
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Cliente: {selectedPlan.client_phone}
              </p>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto">
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full h-64 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Conteúdo do plano..."
              />
            </div>
            
            <div className="flex justify-end p-6 space-x-3 border-t border-gray-200">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleReview("approved")}
                disabled={processingPlanId === selectedPlan.id}
                className="flex items-center space-x-2 btn-primary"
              >
                {processingPlanId === selectedPlan.id ? (
                  <div className="w-4 h-4 border-b-2 border-white rounded-full animate-spin"></div>
                ) : (
                  <ApproveIcon className="w-4 h-4" />
                )}
                <span>Aprovar com Edições</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingPlans;
