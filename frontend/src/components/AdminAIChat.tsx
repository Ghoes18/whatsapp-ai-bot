import React, { useState, useRef, useEffect } from 'react';
import { dashboardAPI, type AdminConversation } from '../services/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const AdminAIChat: React.FC = () => {
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Carregar conversas ao inicializar
  useEffect(() => {
    loadConversations();
  }, []);

  // Carregar histórico quando conversa muda
  useEffect(() => {
    if (currentConversationId) {
      loadConversationHistory(currentConversationId);
    } else {
      setMessages([]);
    }
  }, [currentConversationId]);

  const loadConversations = async () => {
    try {
      setIsLoadingConversations(true);
      const response = await dashboardAPI.getAdminConversations();
      setConversations(response.conversations);
      
      // Se não há conversa selecionada e há conversas disponíveis, selecionar a primeira
      if (!currentConversationId && response.conversations.length > 0) {
        setCurrentConversationId(response.conversations[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadConversationHistory = async (conversationId: string) => {
    try {
      setIsLoadingHistory(true);
      const response = await dashboardAPI.getAdminChatHistory(conversationId);
      
      if (response.history && response.history.length > 0) {
        const historyMessages = response.history.map((msg, index) => ({
          id: `history-${index}`,
          role: msg.role,
          content: msg.content,
          timestamp: new Date()
        }));
        setMessages(historyMessages);
      } else {
        // Se não há histórico, mostrar mensagem de boas-vindas
        setMessages([{
          id: '1',
          role: 'assistant',
          content: 'Olá! Sou o assistente de IA do sistema. Posso ajudá-lo a consultar informações da base de dados, estatísticas de clientes, planos, mensagens e muito mais. Como posso ajudar?',
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      setMessages([{
        id: '1',
        role: 'assistant',
        content: 'Erro ao carregar histórico. Como posso ajudar?',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const createNewConversation = async () => {
    try {
      const response = await dashboardAPI.createAdminConversation();
      await loadConversations();
      setCurrentConversationId(response.conversationId);
    } catch (error) {
      console.error('Erro ao criar nova conversa:', error);
      alert('Erro ao criar nova conversa. Tente novamente.');
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!confirm('Tem certeza que deseja apagar esta conversa?')) {
      return;
    }

    try {
      await dashboardAPI.deleteAdminConversation(conversationId);
      await loadConversations();
      
      // Se a conversa apagada era a atual, limpar seleção
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Erro ao apagar conversa:', error);
      alert('Erro ao apagar conversa. Tente novamente.');
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !currentConversationId) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await dashboardAPI.chatWithAI(messageToSend, currentConversationId);
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Recarregar conversas para atualizar timestamps
      await loadConversations();
    } catch (error) {
      console.error('Erro ao enviar mensagem para IA:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-PT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Hoje';
    } else if (diffDays === 1) {
      return 'Ontem';
    } else if (diffDays < 7) {
      return `${diffDays} dias atrás`;
    } else {
      return date.toLocaleDateString('pt-PT');
    }
  };

  const exampleQuestions = [
    "Quantos clientes temos registados?",
    "Quais são os planos mais populares?",
    "Quantas mensagens foram enviadas hoje?",
    "Mostrar estatísticas dos últimos 7 dias",
    "Listar clientes com IA desativada",
    "Quantos planos pendentes temos?"
  ];

  const handleExampleClick = (question: string) => {
    setInputMessage(question);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar space para Sidebar.tsx */}
      <div className="hidden w-72 lg:block"></div>

      {/* Conversations Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={createNewConversation}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Nova Conversa</span>
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingConversations ? (
            <div className="flex justify-center items-center h-32">
              <div className="w-5 h-5 rounded-full border-2 animate-spin border-gray-300 border-t-blue-500"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-gray-500 text-center">
              <p>Nenhuma conversa encontrada.</p>
              <p className="text-sm mt-1">Crie uma nova conversa para começar.</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`group p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    currentConversationId === conversation.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setCurrentConversationId(conversation.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {conversation.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(conversation.last_interaction)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conversation.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all duration-200"
                      title="Apagar conversa"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentConversationId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center space-x-3">
                <div className="flex justify-center items-center w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Chat com IA Admin</h1>
                  <p className="text-sm text-gray-600">
                    {conversations.find(c => c.id === currentConversationId)?.title || 'Conversa'}
                  </p>
                </div>
              </div>
            </div>

            {/* Example Questions (only show if no messages or just welcome message) */}
            {messages.length <= 1 && (
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <p className="mb-3 text-sm font-medium text-gray-700">Perguntas de exemplo:</p>
                <div className="flex flex-wrap gap-2">
                  {exampleQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleExampleClick(question)}
                      className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-full hover:bg-gray-50 hover:border-blue-300 transition-colors duration-200"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoadingHistory ? (
                <div className="flex justify-center items-center h-32">
                  <div className="flex items-center space-x-3 text-gray-500">
                    <div className="w-5 h-5 rounded-full border-2 animate-spin border-gray-300 border-t-blue-500"></div>
                    <span>Carregando histórico...</span>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                    >
                      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</div>
                      <div className={`flex items-center justify-end mt-2 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                        <span className="text-xs font-medium">{formatTime(message.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center space-x-3">
                    <div className="flex justify-center items-center w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="px-4 py-3 bg-gray-100 rounded-2xl">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-center space-x-3">
                <div className="relative flex-1">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua pergunta sobre a base de dados..."
                    className="px-4 py-3 w-full rounded-xl border border-gray-200 transition-all duration-200 resize-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    rows={1}
                    disabled={isLoading}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="p-3 text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-sm transition-all duration-200 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  title="Enviar mensagem"
                  aria-label="Enviar mensagem"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 rounded-full border-2 animate-spin border-white/30 border-t-white"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* No Conversation Selected */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Chat com IA Admin</h2>
              <p className="text-gray-600 mb-4">Selecione uma conversa ou crie uma nova para começar</p>
              <button
                onClick={createNewConversation}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Nova Conversa
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAIChat; 