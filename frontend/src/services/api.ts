import axios from 'axios';
import type { HumanSupportRequest } from '../types/humanSupport';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/dashboard';

// Configurar axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interfaces
export interface Client {
  id: string;
  phone: string;
  name?: string;
  age?: number;
  gender?: string;
  height?: number;
  weight?: number;
  goal?: string;
  activity_level?: string;
  dietary_restrictions?: string;
  paid: boolean;
  plan_url?: string;
  plan_text?: string;
  ai_enabled: boolean;
  isTyping?: boolean;
  created_at: string;
  updated_at: string;
  last_context?: Record<string, unknown>;
  last_message_at?: string;
}

export interface Message {
  id: string;
  client_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  read?: boolean;
}

export interface PendingPlan {
  id: string;
  client_id: string;
  client_phone: string;
  plan_content: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Plan {
  id: string;
  client_id: string;
  type: string;
  plan_content: string;
  pdf_url?: string;
  created_at: string;
  expires_at?: string;
  status: 'active' | 'expired' | 'completed';
}

export interface PlanContent {
  id: string;
  client_id: string;
  type: string;
  plan_content: string;
  created_at: string;
  expires_at?: string;
  client: {
    name: string;
    phone: string;
  };
}

export interface ClientStats {
  totalMessages: number;
  plansReceived: number;
  lastActivity: string | null;
}

export interface DashboardStats {
  totalClients: number;
  activeConversations: number;
  pendingPlans: number;
  todayMessages: number;
}

export interface RecentActivity {
  id: string;
  clientPhone: string;
  clientName?: string;
  type: 'message' | 'plan' | 'client';
  content: string;
  timestamp: string;
  status: 'active' | 'pending' | 'completed';
}

// API calls
export const dashboardAPI = {
  // Dashboard
  getDashboardStats: (): Promise<DashboardStats> =>
    api.get('/stats').then(response => response.data),

  getUnreadMessageCounts: (): Promise<{ [clientId: string]: number }> =>
    api.get('/messages/unread-counts').then(response => response.data),

  getRecentActivity: (): Promise<RecentActivity[]> =>
    api.get('/recent-activity').then(response => response.data),

  // Clientes
  getClients: (): Promise<Client[]> => 
    api.get('/clients').then(response => response.data),

  getClient: (clientId: string): Promise<Client> =>
    api.get(`/clients/${clientId}`).then(response => response.data),

  getClientStats: (clientId: string): Promise<ClientStats> =>
    api.get(`/clients/${clientId}/stats`).then(response => response.data),

  getClientPlans: (clientId: string): Promise<Plan[]> =>
    api.get(`/clients/${clientId}/plans`).then(response => response.data),

  updateClient: (clientId: string, data: Partial<Client>): Promise<void> =>
    api.put(`/clients/${clientId}`, data).then(response => response.data),

  toggleAI: (clientId: string): Promise<{ ai_enabled: boolean }> =>
    api.post(`/clients/${clientId}/toggle-ai`).then(response => response.data),

  // Mensagens
  getMessages: (clientId: string): Promise<Message[]> =>
    api.get(`/clients/${clientId}/messages`).then(response => response.data),

  sendMessage: (clientId: string, content: string): Promise<void> => {
    console.log('API sendMessage chamado:', { clientId, content });
    console.log('URL do request:', `${API_BASE_URL}/clients/${clientId}/messages`);
    return api.post(`/clients/${clientId}/messages`, { content })
      .then(response => {
        console.log('API sendMessage sucesso:', response);
        return response.data;
      })
      .catch(error => {
        console.error('API sendMessage erro:', error);
        console.error('Erro response data:', error.response?.data);
        console.error('Erro response status:', error.response?.status);
        throw error;
      });
  },

  sendTyping: (clientId: string, isTyping: boolean): Promise<void> =>
    api.post(`/clients/${clientId}/typing`, { isTyping }).then(response => response.data),

  markMessageAsRead: (messageId: string): Promise<void> =>
    api.post(`/messages/${messageId}/read`).then(response => response.data),

  // Novo: Marcar todas as mensagens de um cliente como lidas (otimizado)
  markClientMessagesAsRead: (clientId: string): Promise<{ success: boolean, markedCount: number }> =>
    api.post(`/clients/${clientId}/messages/mark-read`).then(response => response.data),

  // Status de mensagens
  getMessageStatus: (messageId: string): Promise<{ delivered: boolean; read: boolean }> =>
    api.get(`/messages/${messageId}/status`).then(response => response.data),

  // Mídia
  sendImage: (clientId: string, imageUrl: string, caption?: string): Promise<void> =>
    api.post(`/clients/${clientId}/image`, { imageUrl, caption }).then(response => response.data),

  sendDocument: (clientId: string, documentUrl: string, filename: string): Promise<void> =>
    api.post(`/clients/${clientId}/document`, { documentUrl, filename }).then(response => response.data),

  sendAudio: (clientId: string, audioUrl: string): Promise<void> =>
    api.post(`/clients/${clientId}/audio`, { audioUrl }).then(response => response.data),

  // Planos Pendentes
  getPendingPlans: (): Promise<PendingPlan[]> =>
    api.get('/pending-plans').then(response => response.data),

  reviewPlan: (planId: string, status: 'approved' | 'rejected', editedContent?: string): Promise<void> =>
    api.post(`/pending-plans/${planId}/review`, { status, editedContent }).then(response => response.data),

  createPendingPlan: (clientId: string, planContent: string): Promise<{ planId: string }> =>
    api.post('/pending-plans', { clientId, planContent }).then(response => response.data),

  // PDFs dos Planos
  generatePlanPDF: (planId: string): Promise<{ pdfUrl: string }> =>
    api.post(`/plans/${planId}/generate-pdf`).then(response => response.data),

  getPlanPDF: (planId: string): Promise<{ pdfUrl?: string; needsGeneration?: boolean }> =>
    api.get(`/plans/${planId}/pdf`).then(response => response.data),

  // Conteúdo dos Planos
  getPlanContent: (planId: string): Promise<{ plan: PlanContent }> =>
    api.get(`/plans/${planId}/content`).then(response => response.data),

  // 🚨 SUPORTE HUMANO
  getHumanSupportRequests: (status?: string): Promise<HumanSupportRequest[]> => {
    const params = status ? { status } : {};
    return api.get('/human-support-requests', { params }).then(response => response.data);
  },

  updateHumanSupportRequest: (requestId: string, data: { 
    status: 'pending' | 'in_progress' | 'resolved';
    handledBy?: string;
    notes?: string;
  }): Promise<void> =>
    api.put(`/human-support-requests/${requestId}`, data).then(response => response.data),

  getHumanSupportRequestsCount: (): Promise<{ count: number }> =>
    api.get('/human-support-requests/count').then(response => response.data),

  // 🤖 ADMIN AI CHAT
  chatWithAI: (message: string): Promise<{ message: string }> =>
    api.post('/admin/chat', { message }).then(response => response.data),
};

export default api; 