"use client";

import type React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { dashboardAPI } from "../services/api";
import type { Client, Message } from "../services/api";
import { useNotifications } from "../hooks/useNotifications";
import {
  realtimeService,
  type RealtimeMessage,
  type RealtimeClient,
} from "../services/supabaseClient";

// Enhanced SVG Icons
const SendIcon = ({ className }: { className?: string }) => (
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
      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
    />
  </svg>
);

const AIIcon = ({ className }: { className?: string }) => (
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
      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

const PersonIcon = ({ className }: { className?: string }) => (
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
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

const SearchIcon = ({ className }: { className?: string }) => (
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
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
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
      d="M5 13l4 4L19 7"
    />
  </svg>
);

const AttachFileIcon = ({ className }: { className?: string }) => (
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
      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
    />
  </svg>
);

const ImageIcon = ({ className }: { className?: string }) => (
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
      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const MicIcon = ({ className }: { className?: string }) => (
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
      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
    />
  </svg>
);

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

const UserProfileIcon = ({ className }: { className?: string }) => (
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
      d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const Conversations: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { updateNotifications, decrementClientUnreadCount } =
    useNotifications();

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const markReadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMarkedReadRef = useRef<string | null>(null);
  const messagesCacheRef = useRef<{
    [clientId: string]: { messages: Message[]; timestamp: number };
  }>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const CACHE_DURATION = 5000;

  const isCacheValid = (clientId: string) => {
    const cache = messagesCacheRef.current[clientId];
    if (!cache) return false;
    return Date.now() - cache.timestamp < CACHE_DURATION;
  };

  const clearMessagesState = useCallback(() => {
    setMessages([]);
    setSelectedClient(null);
    setIsLoadingMessages(false);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const loadClients = useCallback(async () => {
    if (!isLoadingClients) return;

    try {
      const response = await dashboardAPI.getClients();
      const clientsList = Array.isArray(response) ? response : [];
      setClients(clientsList);
    } catch (error) {
      console.error("❌ Erro ao carregar clientes:", error);
      setClients([]);
    } finally {
      setIsLoadingClients(false);
    }
  }, [isLoadingClients]);

  // Handler para novas mensagens em tempo real
  const handleRealtimeMessage = useCallback(
    (message: RealtimeMessage) => {
      // Se a mensagem é para o cliente atualmente selecionado, adicionar à lista
      if (message.client_id === clientId) {
        setMessages((prev) => {
          // Verificação robusta de duplicatas
          const existsById = prev.find((m) => m.id === message.id);
          if (existsById) {
            return prev;
          }

          // Verificar duplicata por conteúdo e timestamp próximo (para casos de temp IDs)
          const existsByContent = prev.find((m) => 
            m.content === message.content && 
            m.role === message.role &&
            Math.abs(new Date(m.created_at).getTime() - new Date(message.created_at).getTime()) < 5000 // 5 segundos de diferença
          );
          
          if (existsByContent) {
            return prev;
          }

          const newMessage: Message = {
            id: message.id,
            client_id: message.client_id,
            role: message.role,
            content: message.content,
            created_at: message.created_at,
            read: message.read,
          };

          const updatedMessages = [...prev, newMessage].sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          );

          setTimeout(() => scrollToBottom(), 100);
          return updatedMessages;
        });

        // Invalidar cache para este cliente
        delete messagesCacheRef.current[message.client_id];
      }
    },
    [clientId]
  );

  // Handler para atualizações de mensagens (ex: marcadas como lidas)
  const handleRealtimeMessageUpdate = useCallback(
    (message: RealtimeMessage) => {
      // Se a mensagem é para o cliente atualmente selecionado, atualizar na lista
      if (message.client_id === clientId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id ? { ...m, read: message.read } : m
          )
        );
      }
    },
    [clientId]
  );

  // Handler para atualizações de clientes
  const handleRealtimeClientUpdate = useCallback((client: RealtimeClient) => {
    setClients((prev) => {
      const existingIndex = prev.findIndex((c) => c.id === client.id);
      if (existingIndex >= 0) {
        // Atualizar cliente existente
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...client };
        return updated;
      } else {
        // Adicionar novo cliente
        return [...prev, client as unknown as Client];
      }
    });
  }, []);

  const loadMessages = useCallback(
    async (targetClientId: string) => {
      if (!targetClientId) {
        return;
      }

      if (isCacheValid(targetClientId)) {
        setMessages(messagesCacheRef.current[targetClientId].messages);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setIsLoadingMessages(true);

      try {
        const response = await dashboardAPI.getMessages(targetClientId);

        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        const newMessages = Array.isArray(response) ? response : [];

        if (targetClientId === clientId) {
          const sortedMessages = [...newMessages].sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          );

          messagesCacheRef.current[targetClientId] = {
            messages: sortedMessages,
            timestamp: Date.now(),
          };

          setMessages(sortedMessages);

          setTimeout(() => scrollToBottom(), 100);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
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
    },
    [clientId]
  );

  const markMessagesAsRead = useCallback(
    async (targetClientId: string) => {
      if (lastMarkedReadRef.current === targetClientId) {
        return;
      }

      if (markReadTimeoutRef.current) {
        clearTimeout(markReadTimeoutRef.current);
      }

      lastMarkedReadRef.current = targetClientId;

      markReadTimeoutRef.current = setTimeout(async () => {
        try {
          const result = await dashboardAPI.markClientMessagesAsRead(
            targetClientId
          );

          // Atualizar contadores localmente de forma otimizada
          if (result.markedCount > 0) {
            decrementClientUnreadCount(targetClientId, result.markedCount);
          }

          delete messagesCacheRef.current[targetClientId];
        } catch (error) {
          console.error("❌ Erro ao marcar mensagens como lidas:", error);
          // Fallback: forçar atualização completa em caso de erro
          updateNotifications();
        } finally {
          lastMarkedReadRef.current = null;
        }
      }, 200);
    },
    [updateNotifications, decrementClientUnreadCount]
  );

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Configurar subscriptions de clientes (geral)
  useEffect(() => {
    // Monitorar mudanças no status de conexão
    const checkConnection = () => {
      const status = realtimeService.getConnectionStatus();
      setRealtimeConnected(status === 'connected');
    };
    
    // Verificar imediatamente
    checkConnection();
    
    // Verificar periodicamente
    const statusInterval = setInterval(checkConnection, 30000); // 30 segundos

    realtimeService.subscribeToClientsUpdates(handleRealtimeClientUpdate);

    return () => {
      clearInterval(statusInterval);
      realtimeService.unsubscribe("clients_updates");
    };
  }, [handleRealtimeClientUpdate]);

  // Configurar subscriptions de mensagens para cliente específico
  useEffect(() => {
    if (clientId) {
      const client = clients.find((c) => c.id === clientId);

      if (client) {
        setSelectedClient(client);
        loadMessages(clientId);
        markMessagesAsRead(clientId);

        try {
          // Configurar subscription para mensagens deste cliente
          realtimeService.subscribeToClientMessages(
            clientId,
            handleRealtimeMessage,
            handleRealtimeMessageUpdate
          );
        } catch (error) {
          console.error(`❌ Erro ao configurar subscription para cliente ${clientId}:`, error);
        }
      }
    } else {
      clearMessagesState();
      // Limpar subscription de mensagens quando não há cliente selecionado
      if (clientId) {
        realtimeService.unsubscribe(`messages_${clientId}`);
      }
    }

    return () => {
      if (clientId) {
        realtimeService.unsubscribe(`messages_${clientId}`);
      }
    };
  }, [clientId, clients.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [newMessage]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedClient || isSendingMessage) return;

    const messageToSend = newMessage.trim();
    setNewMessage("");
    setIsSendingMessage(true);

    try {
      await dashboardAPI.sendMessage(
        selectedClient.id,
        messageToSend
      );

      // Invalidar cache para forçar atualização
      delete messagesCacheRef.current[selectedClient.id];

      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error("❌ Erro ao enviar mensagem:", error);
      setNewMessage(messageToSend);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Navigate to client profile
  const handleClientProfileClick = (client: Client) => {
    navigate(`/client/${client.id}`);
  };

  // Navigate to conversation
  const handleConversationClick = (client: Client) => {
    navigate(`/conversations/${client.id}`);
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.includes(searchTerm)
  );

  if (isLoadingClients) {
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
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Carregando conversas
            </h3>
            <p className="text-gray-600">Buscando clientes e mensagens...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar space */}
      <div className="hidden w-72 lg:block"></div>

      <div className="flex flex-1 bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Fixed Client List */}
        <div className="flex flex-col w-full border-r border-gray-200 shadow-sm backdrop-blur-sm bg-white/80 lg:w-80">
          {/* Enhanced Header */}
          <div className="p-6 bg-gradient-to-r from-white to-gray-50 border-b border-gray-100">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Conversas</h2>

            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 w-5 h-5 text-gray-400 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="py-3 pr-4 pl-12 w-full rounded-xl border border-gray-200 backdrop-blur-sm transition-all duration-200 bg-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:bg-white focus:bg-white"
              />
            </div>
          </div>

          {/* Enhanced Client List */}
          <div className="overflow-y-auto flex-1">
            {filteredClients.length > 0 ? (
              <div className="p-2">
                {filteredClients.map((client) => (
                  <div
                    key={client.id}
                    className={`p-4 m-2 rounded-xl transition-all duration-200 hover:shadow-md group border ${
                      clientId === client.id
                        ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm"
                        : "hover:bg-white/70 backdrop-blur-sm border-transparent hover:border-gray-200"
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                            clientId === client.id
                              ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg"
                              : "bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-blue-100 group-hover:to-indigo-100"
                          }`}
                        >
                          <PersonIcon
                            className={`w-6 h-6 ${
                              clientId === client.id
                                ? "text-white"
                                : "text-gray-600 group-hover:text-blue-600"
                            }`}
                          />
                        </div>
                        {client.last_message_at && (
                          <div className="absolute -right-1 -bottom-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <p
                            className={`font-semibold truncate ${
                              clientId === client.id
                                ? "text-blue-900"
                                : "text-gray-900"
                            }`}
                          >
                            {client.name ?? "Cliente"}
                          </p>
                        </div>
                        <p className="mb-1 text-sm text-gray-600 truncate">
                          {client.phone ?? "Sem telefone"}
                        </p>
                        {client.last_message_at && (
                          <p className="text-xs text-gray-500 truncate">
                            Última mensagem:{" "}
                            {formatTime(client.last_message_at)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex mt-3 space-x-2">
                      <button
                        onClick={() => handleConversationClick(client)}
                        className={`flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                          clientId === client.id
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        <ChatIcon className="w-4 h-4 mr-1.5" />
                        Conversar
                      </button>
                      <button
                        onClick={() => handleClientProfileClick(client)}
                        className="inline-flex justify-center items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg border border-gray-300 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 hover:shadow-md"
                        title="Ver perfil do cliente"
                        aria-label="Ver perfil do cliente"
                      >
                        <UserProfileIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <div className="flex justify-center items-center mx-auto mb-6 w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full">
                  <PersonIcon className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="mb-2 text-lg font-medium text-gray-900">
                  Nenhum cliente encontrado
                </h3>
                <p className="text-gray-500">Tente ajustar sua busca</p>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Messages Area */}
        <div className="flex flex-col flex-1">
          {selectedClient ? (
            <>
              {/* Enhanced Conversation Header */}
              <div className="p-6 border-b border-gray-100 shadow-sm backdrop-blur-sm bg-white/90">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="flex justify-center items-center w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full shadow-lg">
                        <PersonIcon className="w-6 h-6 text-white" />
                      </div>
                      <div className="absolute -right-1 -bottom-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          {selectedClient.name ?? selectedClient.phone}
                        </h3>
                        {/* Indicador de conexão Realtime */}
                        <div
                          className={`w-2 h-2 rounded-full ${
                            realtimeConnected ? "bg-green-500" : "bg-red-500"
                          }`}
                          title={
                            realtimeConnected
                              ? "Conectado ao Realtime"
                              : "Desconectado do Realtime"
                          }
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600">
                        {selectedClient.phone ?? "Sem telefone"}
                      </p>
                    </div>
                  </div>

                  {/* Profile Button */}
                  <button
                    onClick={() => handleClientProfileClick(selectedClient)}
                    className="inline-flex items-center px-4 py-2 bg-white rounded-xl border border-gray-300 shadow-sm transition-all duration-200 hover:shadow-md hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 group"
                  >
                    <UserProfileIcon className="mr-2 w-4 h-4 text-gray-500 group-hover:text-gray-700" />
                    <span className="font-medium text-gray-700 group-hover:text-gray-900">
                      Ver Perfil
                    </span>
                  </button>
                </div>
              </div>

              {/* Enhanced Messages */}
              <div className="overflow-y-auto flex-1 p-6 space-y-4 bg-gradient-to-b from-gray-50/50 to-white/50">
                {isLoadingMessages ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="text-center">
                      <div className="mx-auto mb-3 w-8 h-8 rounded-full border-gray-300 animate-spin border-3 border-t-blue-600"></div>
                      <p className="text-sm text-gray-600">
                        Carregando mensagens...
                      </p>
                    </div>
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === "assistant"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md ${
                          message.role === "assistant"
                            ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                            : "bg-white border border-gray-200 text-gray-900"
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        <div
                          className={`flex items-center justify-end mt-2 ${
                            message.role === "assistant"
                              ? "text-blue-100"
                              : "text-gray-500"
                          }`}
                        >
                          <span className="text-xs font-medium">
                            {formatTime(message.created_at)}
                          </span>
                          {message.role === "assistant" && (
                            <CheckIcon className="ml-2 w-3 h-3" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-16 text-center">
                    <div className="flex justify-center items-center mx-auto mb-6 w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full">
                      <AIIcon className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="mb-2 text-lg font-medium text-gray-900">
                      Nenhuma mensagem ainda
                    </h3>
                    <p className="text-gray-500">
                      Inicie uma conversa com este cliente!
                    </p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Enhanced Message Input */}
              <div className="p-6 border-t border-gray-100 shadow-sm backdrop-blur-sm bg-white/90">
                <div className="flex items-center space-x-3">
                  <button
                    className="p-3 text-gray-400 rounded-xl transition-all duration-200 hover:text-gray-600 hover:bg-gray-100"
                    title="Anexar arquivo"
                    aria-label="Anexar arquivo"
                  >
                    <AttachFileIcon className="w-5 h-5" />
                  </button>
                  <button
                    className="p-3 text-gray-400 rounded-xl transition-all duration-200 hover:text-gray-600 hover:bg-gray-100"
                    title="Enviar imagem"
                    aria-label="Enviar imagem"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <div className="relative flex-1">
                    <textarea
                      ref={textareaRef}
                      value={newMessage}
                      onChange={handleMessageChange}
                      onKeyPress={handleKeyPress}
                      placeholder="Digite sua mensagem..."
                      disabled={isSendingMessage}
                      rows={1}
                      className="px-4 py-3 w-full rounded-xl border border-gray-200 backdrop-blur-sm transition-all duration-200 resize-none bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 hover:bg-white focus:bg-white"
                    />
                  </div>
                  <button
                    className="p-3 text-gray-400 rounded-xl transition-all duration-200 hover:text-gray-600 hover:bg-gray-100"
                    title="Gravar áudio"
                    aria-label="Gravar áudio"
                  >
                    <MicIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isSendingMessage}
                    className="p-3 text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-sm transition-all duration-200 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    title="Enviar mensagem"
                    aria-label="Enviar mensagem"
                  >
                    {isSendingMessage ? (
                      <div className="w-5 h-5 rounded-full border-2 animate-spin border-white/30 border-t-white"></div>
                    ) : (
                      <SendIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 justify-center items-center bg-gradient-to-br from-gray-50 to-white">
              <div className="text-center">
                <div className="flex justify-center items-center mx-auto mb-6 w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full shadow-lg">
                  <ChatIcon className="w-12 h-12 text-blue-600" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900">
                  Selecione uma conversa
                </h3>
                <p className="max-w-sm text-gray-600">
                  Escolha um cliente da lista para começar a conversar e
                  gerenciar suas mensagens
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Conversations;
