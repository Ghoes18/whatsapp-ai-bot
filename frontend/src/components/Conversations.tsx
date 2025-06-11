import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { dashboardAPI } from "../services/api";
import type { Client, Message } from "../services/api";
import { useNotifications } from '../hooks/useNotifications';

// Simple SVG Icons
const SendIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const AIIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const PersonIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const AttachFileIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
  </svg>
);

const ImageIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const MicIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const ChatIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const Conversations: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { updateNotifications } = useNotifications();
  
  // Estados principais
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estados de loading
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const markReadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMarkedReadRef = useRef<string | null>(null);
  const messagesCacheRef = useRef<{ [clientId: string]: { messages: Message[], timestamp: number } }>({});
  const CACHE_DURATION = 5000; // 5 segundos de cache

  // Função para verificar se o cache é válido
  const isCacheValid = (clientId: string) => {
    const cache = messagesCacheRef.current[clientId];
    if (!cache) return false;
    return Date.now() - cache.timestamp < CACHE_DURATION;
  };

  // Função para limpar estado quando muda de cliente
  const clearMessagesState = useCallback(() => {
    console.log('🧹 Limpando estado das mensagens');
    setMessages([]);
    setSelectedClient(null);
    setIsLoadingMessages(false);
    
    // Abortar requisições pendentes
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Função otimizada para carregar clientes
  const loadClients = useCallback(async () => {
    if (!isLoadingClients) return; // Evitar múltiplas chamadas
    
    try {
      console.log('👥 Carregando clientes...');
      const response = await dashboardAPI.getClients();
      const clientsList = Array.isArray(response) ? response : [];
      setClients(clientsList);
      console.log(`✅ ${clientsList.length} clientes carregados`);
    } catch (error) {
      console.error("❌ Erro ao carregar clientes:", error);
      setClients([]);
    } finally {
      setIsLoadingClients(false);
    }
  }, [isLoadingClients]);

  // Função otimizada para carregar mensagens com cache
  const loadMessages = useCallback(async (targetClientId: string) => {
    if (!targetClientId) {
      console.log('❌ loadMessages: clientId não definido');
      return;
    }

    // Verificar cache primeiro
    if (isCacheValid(targetClientId)) {
      console.log('📨 Usando mensagens do cache');
      setMessages(messagesCacheRef.current[targetClientId].messages);
      return;
    }

    // Abortar requisições anteriores
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Criar novo AbortController para esta requisição
    abortControllerRef.current = new AbortController();
    
    setIsLoadingMessages(true);
    console.log(`📨 Carregando mensagens para cliente: ${targetClientId}`);
    
    try {
      const response = await dashboardAPI.getMessages(targetClientId);
      
      // Verificar se a requisição foi abortada
      if (abortControllerRef.current?.signal.aborted) {
        console.log('🚫 Requisição abortada');
        return;
      }
      
      const newMessages = Array.isArray(response) ? response : [];
      console.log(`📨 ${newMessages.length} mensagens recebidas`);

      // Verificar se ainda estamos no mesmo cliente
      if (targetClientId === clientId) {
        // Ordenar mensagens por data
        const sortedMessages = [...newMessages].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        // Atualizar cache
        messagesCacheRef.current[targetClientId] = {
          messages: sortedMessages,
          timestamp: Date.now()
        };

        console.log(`📨 Definindo ${sortedMessages.length} mensagens no estado`);
        setMessages(sortedMessages);
        
        // Rolar para baixo após carregar mensagens
        setTimeout(() => scrollToBottom(), 100);
      } else {
        console.log('⚠️ Cliente mudou durante carregamento, ignorando resultado');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🚫 Requisição de mensagens cancelada');
        return;
      }
      console.error("❌ Erro ao carregar mensagens:", error);
      if (targetClientId === clientId) {
        setMessages([]);
      }
    } finally {
      if (targetClientId === clientId) {
        setIsLoadingMessages(false);
      }
    }
  }, [clientId]);

  // Função otimizada para marcar mensagens como lidas com debounce mais robusto
  const markMessagesAsRead = useCallback(async (targetClientId: string) => {
    // Se já estamos marcando mensagens deste cliente, ignorar
    if (lastMarkedReadRef.current === targetClientId) {
      console.log('⏳ Aguardando debounce anterior para marcar como lido');
      return;
    }

    // Limpar timeout anterior se existir
    if (markReadTimeoutRef.current) {
      clearTimeout(markReadTimeoutRef.current);
    }

    // Marcar que estamos processando este cliente
    lastMarkedReadRef.current = targetClientId;

    // Aguardar 200ms antes de marcar como lido (debounce ainda mais reduzido)
    markReadTimeoutRef.current = setTimeout(async () => {
      try {
        console.log(`📖 Marcando mensagens como lidas para cliente: ${targetClientId}`);
        await dashboardAPI.markClientMessagesAsRead(targetClientId);
        
        // Atualizar notificações imediatamente
        updateNotifications();
        
        // Invalidar cache de mensagens para forçar atualização
        delete messagesCacheRef.current[targetClientId];
        
        // Forçar atualização adicional após 1 segundo para garantir sincronização
        setTimeout(() => {
          updateNotifications();
        }, 1000);
        
        console.log('✅ Mensagens marcadas como lidas');
      } catch (error) {
        console.error('❌ Erro ao marcar mensagens como lidas:', error);
      } finally {
        lastMarkedReadRef.current = null;
      }
    }, 200);
  }, [updateNotifications]);

  // Carregar dados quando o componente monta
  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Carregar mensagens quando o clientId muda
  useEffect(() => {
    if (clientId) {
      const client = clients.find(c => c.id === clientId);
      if (client) {
        setSelectedClient(client);
        loadMessages(clientId);
        markMessagesAsRead(clientId);
      }
    } else {
      clearMessagesState();
    }
  }, [clientId, clients, loadMessages, markMessagesAsRead, clearMessagesState]);

  // Função para rolar para baixo
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Função para formatar hora
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Função para enviar mensagem
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedClient || isSendingMessage) return;

    const messageToSend = newMessage.trim();
    setNewMessage("");
    setIsSendingMessage(true);

    try {
      console.log(`📤 Enviando mensagem para ${selectedClient.name}: ${messageToSend}`);
      
      const response = await dashboardAPI.sendMessage(selectedClient.id, messageToSend);
      console.log('✅ Mensagem enviada:', response);

      // Adicionar mensagem à lista local
      const newMsg: Message = {
        id: `temp-${Date.now()}`,
        content: messageToSend,
        role: 'assistant',
        created_at: new Date().toISOString(),
        client_id: selectedClient.id
      };

      setMessages(prev => [...prev, newMsg]);
      
      // Rolar para baixo
      setTimeout(() => scrollToBottom(), 100);
      
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      // Restaurar mensagem em caso de erro
      setNewMessage(messageToSend);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Função para lidar com mudança na mensagem
  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
  };

  // Função para lidar com Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Filtrar clientes baseado na busca
  const filteredClients = clients.filter(client =>
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm)
  );

  if (isLoadingClients) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-b-2 rounded-full animate-spin border-primary-600"></div>
          <p className="text-gray-600">Carregando conversas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Lista de Clientes */}
      <div className="flex flex-col w-full bg-white border-r border-gray-200 lg:w-80">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Conversas</h2>
          
          {/* Barra de Busca */}
          <div className="relative">
            <SearchIcon className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
            <input
              type="text"
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Lista de Clientes */}
        <div className="flex-1 overflow-y-auto">
          {filteredClients.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => navigate(`/conversations/${client.id}`)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    clientId === client.id ? 'bg-primary-50 border-r-2 border-primary-500' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-100">
                        <PersonIcon className="w-6 h-6 text-primary-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {client.name ?? 'Cliente'}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {client.phone ?? 'Sem telefone'}
                      </p>
                      {client.last_message_at && (
                        <p className="mt-1 text-xs text-gray-400 truncate">
                          Última mensagem: {formatTime(client.last_message_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full">
                <PersonIcon className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">Nenhum cliente encontrado</p>
            </div>
          )}
        </div>
      </div>

      {/* Área de Mensagens */}
      <div className="flex flex-col flex-1">
        {selectedClient ? (
          <>
            {/* Header da Conversa */}
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-100">
                    <PersonIcon className="w-5 h-5 text-primary-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedClient.name ?? 'Cliente'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedClient.phone ?? 'Sem telefone'}
                  </p>
                </div>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-8 h-8 border-b-2 rounded-full animate-spin border-primary-600"></div>
                </div>
              ) : messages.length > 0 ? (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'assistant' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.role === 'assistant'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <div className={`flex items-center justify-end mt-1 ${
                        message.role === 'assistant' ? 'text-primary-100' : 'text-gray-500'
                      }`}>
                        <span className="text-xs">{formatTime(message.created_at)}</span>
                        {message.role === 'assistant' && (
                          <CheckIcon className="w-3 h-3 ml-1" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center">
                  <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full">
                    <AIIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">Nenhuma mensagem ainda</p>
                  <p className="mt-1 text-sm text-gray-400">Inicie uma conversa!</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de Mensagem */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <button 
                  className="p-2 text-gray-400 transition-colors hover:text-gray-600"
                  title="Anexar arquivo"
                  aria-label="Anexar arquivo"
                >
                  <AttachFileIcon className="w-5 h-5" />
                </button>
                <button 
                  className="p-2 text-gray-400 transition-colors hover:text-gray-600"
                  title="Enviar imagem"
                  aria-label="Enviar imagem"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <div className="flex-1">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleMessageChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem..."
                    disabled={isSendingMessage}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>
                <button 
                  className="p-2 text-gray-400 transition-colors hover:text-gray-600"
                  title="Gravar áudio"
                  aria-label="Gravar áudio"
                >
                  <MicIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSendingMessage}
                  className="p-2 text-white transition-colors rounded-lg bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  title="Enviar mensagem"
                  aria-label="Enviar mensagem"
                >
                  {isSendingMessage ? (
                    <div className="w-5 h-5 border-b-2 border-white rounded-full animate-spin"></div>
                  ) : (
                    <SendIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center flex-1">
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full">
                <ChatIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-900">Selecione uma conversa</h3>
              <p className="text-gray-500">Escolha um cliente para começar a conversar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Conversations; 