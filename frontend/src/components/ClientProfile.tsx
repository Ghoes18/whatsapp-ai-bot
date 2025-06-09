import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import type { Client, ClientStats } from '../services/api';

// Simple SVG Icons
const PersonIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const EditIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const SaveIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const CancelIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const ScheduleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ClientProfile: React.FC = () => {
  const { clientId } = useParams();
  const [client, setClient] = useState<Client | null>(null);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedClient, setEditedClient] = useState<Partial<Client>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId) {
      loadClientData(clientId);
      loadClientStats(clientId);
    }
  }, [clientId]);

  const loadClientData = async (clientId: string) => {
    try {
      setLoading(true);
      const clientData = await dashboardAPI.getClient(clientId);
      setClient(clientData);
      
      setEditedClient({
        name: clientData.name,
        age: clientData.age,
        gender: clientData.gender,
        height: clientData.height,
        weight: clientData.weight,
        goal: clientData.goal,
        activity_level: clientData.activity_level,
        dietary_restrictions: clientData.dietary_restrictions
      });
    } catch (error) {
      console.error('Erro ao carregar dados do cliente:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClientStats = async (clientId: string) => {
    try {
      const statsData = await dashboardAPI.getClientStats(clientId);
      setStats(statsData);
    } catch (error) {
      console.error('Erro ao carregar estatísticas do cliente:', error);
    }
  };

  const handleSave = async () => {
    if (!client) return;

    try {
      await dashboardAPI.updateClient(client.id, editedClient);
      setClient({ ...client, ...editedClient });
      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
    }
  };

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
        dietary_restrictions: client.dietary_restrictions
      });
    }
    setIsEditing(false);
  };

  const toggleAI = async () => {
    if (!client) return;

    try {
      const response = await dashboardAPI.toggleAI(client.id);
      setClient({ ...client, ai_enabled: response.ai_enabled });
    } catch (error) {
      console.error('Erro ao alternar IA:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando perfil do cliente...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <PersonIcon className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Cliente não encontrado</h3>
          <p className="text-gray-500">O cliente solicitado não foi encontrado no sistema.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Perfil do Cliente</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleAI}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              client.ai_enabled
                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            IA {client.ai_enabled ? 'Ativada' : 'Desativada'}
          </button>
          <button className="btn-primary flex items-center space-x-2">
            <WhatsAppIcon className="h-4 w-4" />
            <span>Conversar</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações Básicas */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Informações Pessoais</h2>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <EditIcon className="h-4 w-4" />
                  <span>Editar</span>
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleSave}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <SaveIcon className="h-4 w-4" />
                    <span>Salvar</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <CancelIcon className="h-4 w-4" />
                    <span>Cancelar</span>
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  id="name"
                  type="text"
                  value={isEditing ? editedClient.name ?? '' : client.name ?? ''}
                  onChange={(e) => setEditedClient({ ...editedClient, name: e.target.value })}
                  disabled={!isEditing}
                  className="input-field"
                />
              </div>
              
              <div>
                <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">Idade</label>
                <input
                  id="age"
                  type="number"
                  value={isEditing ? editedClient.age ?? '' : client.age ?? ''}
                  onChange={(e) => setEditedClient({ ...editedClient, age: parseInt(e.target.value) })}
                  disabled={!isEditing}
                  className="input-field"
                />
              </div>

              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Gênero</label>
                <select
                  id="gender"
                  value={isEditing ? editedClient.gender ?? '' : client.gender ?? ''}
                  onChange={(e) => setEditedClient({ ...editedClient, gender: e.target.value })}
                  disabled={!isEditing}
                  className="input-field"
                >
                  <option value="">Selecione</option>
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                  <option value="other">Outro</option>
                </select>
              </div>

              <div>
                <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1">Altura (cm)</label>
                <input
                  id="height"
                  type="number"
                  value={isEditing ? editedClient.height ?? '' : client.height ?? ''}
                  onChange={(e) => setEditedClient({ ...editedClient, height: parseInt(e.target.value) })}
                  disabled={!isEditing}
                  className="input-field"
                />
              </div>

              <div>
                <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                <input
                  id="weight"
                  type="number"
                  value={isEditing ? editedClient.weight ?? '' : client.weight ?? ''}
                  onChange={(e) => setEditedClient({ ...editedClient, weight: parseFloat(e.target.value) })}
                  disabled={!isEditing}
                  className="input-field"
                />
              </div>

              <div>
                <label htmlFor="activity_level" className="block text-sm font-medium text-gray-700 mb-1">Nível de Atividade</label>
                <select
                  id="activity_level"
                  value={isEditing ? editedClient.activity_level ?? '' : client.activity_level ?? ''}
                  onChange={(e) => setEditedClient({ ...editedClient, activity_level: e.target.value })}
                  disabled={!isEditing}
                  className="input-field"
                >
                  <option value="">Selecione</option>
                  <option value="sedentary">Sedentário</option>
                  <option value="lightly_active">Levemente Ativo</option>
                  <option value="moderately_active">Moderadamente Ativo</option>
                  <option value="very_active">Muito Ativo</option>
                  <option value="extremely_active">Extremamente Ativo</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="goal" className="block text-sm font-medium text-gray-700 mb-1">Objetivo</label>
                <textarea
                  id="goal"
                  value={isEditing ? editedClient.goal ?? '' : client.goal ?? ''}
                  onChange={(e) => setEditedClient({ ...editedClient, goal: e.target.value })}
                  disabled={!isEditing}
                  rows={3}
                  className="input-field"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="dietary_restrictions" className="block text-sm font-medium text-gray-700 mb-1">Restrições Alimentares</label>
                <textarea
                  id="dietary_restrictions"
                  value={isEditing ? editedClient.dietary_restrictions ?? '' : client.dietary_restrictions ?? ''}
                  onChange={(e) => setEditedClient({ ...editedClient, dietary_restrictions: e.target.value })}
                  disabled={!isEditing}
                  rows={2}
                  className="input-field"
                  placeholder="Ex: Alergia a lactose, vegetariano, etc."
                />
              </div>
            </div>
          </div>

          {/* Histórico de Planos */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Histórico de Planos</h2>
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ScheduleIcon className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500">Nenhum plano encontrado</p>
            </div>
          </div>
        </div>

        {/* Sidebar com Estatísticas */}
        <div className="space-y-6">
          {/* Informações de Contato */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações de Contato</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <PersonIcon className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{client.name ?? 'Nome não informado'}</p>
                  <p className="text-sm text-gray-500">Cliente</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <WhatsAppIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{client.phone ?? 'Telefone não informado'}</p>
                  <p className="text-sm text-gray-500">WhatsApp</p>
                </div>
              </div>
            </div>
          </div>

          {/* Estatísticas */}
          {stats && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total de Mensagens</span>
                  <span className="text-sm font-medium text-gray-900">{stats.totalMessages ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Planos Recebidos</span>
                  <span className="text-sm font-medium text-gray-900">{stats.plansReceived ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Última Atividade</span>
                  <span className="text-sm font-medium text-gray-900">
                    {stats.lastActivity ? formatDate(stats.lastActivity) : 'Nunca'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Ações Rápidas */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
            <div className="space-y-2">
              <button className="w-full btn-primary text-sm">
                Gerar Novo Plano
              </button>
              <button className="w-full btn-secondary text-sm">
                Ver Conversas
              </button>
              <button className="w-full btn-secondary text-sm">
                Exportar Dados
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientProfile; 