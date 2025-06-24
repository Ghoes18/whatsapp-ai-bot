import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import type { HumanSupportRequest } from '../types/humanSupport';
import { formatPhoneNumber } from '../utils/phoneFormatter';

// Ícones
const NoRequestsIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
);

const CloseIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const HumanSupportRequests: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<HumanSupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'resolved'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<HumanSupportRequest | null>(null);
  const [handledBy, setHandledBy] = useState('');
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [attendingId, setAttendingId] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const statusFilter = filter === 'all' ? undefined : filter;
      const data = await dashboardAPI.getHumanSupportRequests(statusFilter);
      setRequests(data);
    } catch (error) {
      console.error('Erro ao carregar solicitações de suporte:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRequest = async (requestId: string, status: 'pending' | 'in_progress' | 'resolved') => {
    try {
      setUpdating(true);
      await dashboardAPI.updateHumanSupportRequest(requestId, {
        status,
        handledBy: handledBy || undefined,
        notes: notes || undefined
      });
      
      await loadRequests(); // Recarregar lista
      setSelectedRequest(null);
      setHandledBy('');
      setNotes('');
      
      console.log('✅ Solicitação atualizada com sucesso');
    } catch (error) {
      console.error('❌ Erro ao atualizar solicitação:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleAttendRequest = async (request: HumanSupportRequest) => {
    setAttendingId(request.id);
    try {
      // Atualiza o status para 'em progresso' e navega para a conversa
      await dashboardAPI.updateHumanSupportRequest(request.id, {
        status: 'in_progress',
      });
      navigate(`/conversations/${request.client_id}`);
    } catch (error) {
      console.error('Erro ao iniciar atendimento:', error);
    } finally {
      setAttendingId(null);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          text: 'Pendente',
          classes: 'bg-red-100 text-red-800 border-red-200',
          dot: 'bg-red-500'
        };
      case 'in_progress':
        return {
          text: 'Em Progresso',
          classes: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          dot: 'bg-yellow-500'
        };
      case 'resolved':
        return {
          text: 'Resolvido',
          classes: 'bg-green-100 text-green-800 border-green-200',
          dot: 'bg-green-500'
        };
      default:
        return {
          text: status,
          classes: 'bg-gray-100 text-gray-800 border-gray-200',
          dot: 'bg-gray-500'
        };
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <div className="hidden w-72 lg:block"></div>
        <div className="flex flex-1 justify-center items-center">
          <div className="text-center">
            <div className="relative mx-auto mb-6 w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-600"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent animate-spin border-t-blue-600"></div>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
              A carregar...
            </h3>
            <p className="text-gray-600 dark:text-gray-400">Buscando solicitações de suporte...</p>
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
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300">
                Suporte Humano
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Gerir solicitações de atendimento dos clientes.</p>
            </div>
            
            {/* Filtros */}
            <div className="flex p-1 space-x-1 bg-gray-100 rounded-xl dark:bg-gray-800">
              {(['all', 'pending', 'in_progress', 'resolved'] as const).map((filterOption) => (
                <button
                  key={filterOption}
                  onClick={() => setFilter(filterOption)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === filterOption
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  {filterOption === 'all' && 'Todos'}
                  {filterOption === 'pending' && 'Pendentes'}
                  {filterOption === 'in_progress' && 'Em Progresso'}
                  {filterOption === 'resolved' && 'Resolvidos'}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Solicitações */}
          {requests.length === 0 ? (
            <div className="py-16 text-center">
              <div className="p-12 mx-auto max-w-md bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl dark:from-gray-800 dark:to-gray-700">
                <div className="flex justify-center items-center mx-auto mb-6 w-20 h-20 bg-white rounded-full shadow-md dark:bg-gray-800">
                  <NoRequestsIcon className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-100">Nenhuma solicitação encontrada</h3>
                <p className="leading-relaxed text-gray-600 dark:text-gray-400">
                  {filter === 'pending'
                    ? 'Não há solicitações pendentes de atendimento humano.'
                    : `Não há solicitações com o estado "${getStatusStyle(filter).text}".`
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => {
                const statusStyle = getStatusStyle(request.status);
                return (
                  <div key={request.id} className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm transition-shadow duration-200 dark:bg-gray-800 dark:border-gray-700 hover:shadow-lg">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-3 space-x-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {request.clients.name || 'Cliente sem nome'}
                          </h3>
                          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
                            request.status === 'pending' 
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700'
                              : request.status === 'in_progress'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700'
                              : request.status === 'resolved'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                          }`}>
                            <div className={`w-2 h-2 rounded-full ${statusStyle.dot}`}></div>
                            {statusStyle.text}
                          </span>
                        </div>
                        <p className="mb-1 text-sm text-gray-600 dark:text-gray-400">📱 {formatPhoneNumber(request.clients.phone)}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">⏰ {formatTimestamp(request.created_at)}</p>
                      </div>
                      
                      {request.status === 'pending' && (
                        <button
                          onClick={() => handleAttendRequest(request)}
                          disabled={attendingId === request.id}
                          className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:bg-blue-400 disabled:cursor-wait"
                        >
                          {attendingId === request.id ? 'Aguarde...' : 'Atender'}
                        </button>
                      )}
                    </div>
                    
                    <div className="p-4 mt-4 bg-gray-50 rounded-b-xl border-t border-gray-100 dark:bg-gray-700 dark:border-gray-600">
                      <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Mensagem original:</p>
                      <blockquote className="pl-3 text-gray-800 border-l-4 border-gray-300 dark:text-gray-200 dark:border-gray-500">
                        {request.original_message}
                      </blockquote>
                    </div>

                    {request.handled_by && (
                      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                        <strong>Atendido por:</strong> {request.handled_by}
                      </div>
                    )}
                    {request.notes && (
                      <div className="p-3 mt-2 bg-blue-50 rounded-lg dark:bg-blue-900/30">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Notas:</p>
                        <p className="text-sm text-blue-900 dark:text-blue-200">{request.notes}</p>
                      </div>
                    )}
                    {request.resolved_at && (
                      <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        <strong>Resolvido em:</strong> {formatTimestamp(request.resolved_at)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal de Atendimento */}
          {selectedRequest && (
            <div className="flex fixed inset-0 z-50 justify-center items-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
              <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      Atender Solicitação
                    </h3>
                    <button
                      onClick={() => setSelectedRequest(null)}
                      className="p-2 text-gray-400 rounded-full dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
                      aria-label="Fechar modal"
                    >
                      <CloseIcon className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="p-4 bg-gray-50 rounded-xl dark:bg-gray-700">
                      <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Cliente:</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedRequest.clients.name || 'Sem nome'} - {formatPhoneNumber(selectedRequest.clients.phone)}</p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl dark:bg-gray-700">
                      <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Mensagem:</p>
                      <blockquote className="pl-3 text-gray-800 border-l-4 border-gray-300 dark:text-gray-200 dark:border-gray-500">
                        {selectedRequest.original_message}
                      </blockquote>
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Seu nome (opcional):
                      </label>
                      <input
                        type="text"
                        value={handledBy}
                        onChange={(e) => setHandledBy(e.target.value)}
                        className="px-4 py-2 w-full placeholder-gray-500 text-gray-900 bg-white rounded-xl border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                        placeholder="Nome do atendente"
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Notas (opcional):
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={4}
                        className="px-4 py-2 w-full placeholder-gray-500 text-gray-900 bg-white rounded-xl border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                        placeholder="Adicione notas sobre o atendimento..."
                      />
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        onClick={() => handleUpdateRequest(selectedRequest.id, 'in_progress')}
                        disabled={updating}
                        className="flex-1 px-4 py-3 font-semibold text-white bg-yellow-500 rounded-xl shadow-sm transition-all duration-200 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updating ? 'Aguarde...' : 'Marcar Em Progresso'}
                      </button>
                      <button
                        onClick={() => handleUpdateRequest(selectedRequest.id, 'resolved')}
                        disabled={updating}
                        className="flex-1 px-4 py-3 font-semibold text-white bg-green-600 rounded-xl shadow-sm transition-all duration-200 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updating ? 'Aguarde...' : 'Marcar Resolvido'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HumanSupportRequests; 