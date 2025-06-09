import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  TextField,
  IconButton,
  Switch,
  FormControlLabel,
  InputAdornment,
  ListItemButton,
  Badge,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import {
  Send as SendIcon,
  SmartToy as AIIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Circle as OnlineIcon,
  Check as CheckIcon,
  AttachFile as AttachFileIcon,
  Image as ImageIcon,
  Mic as MicIcon,
} from "@mui/icons-material";
import { dashboardAPI } from "../services/api";
import type { Client, Message } from "../services/api";
import { useNotifications } from '../hooks/useNotifications';

// interface MessageStatus {
//   delivered: boolean;
//   read: boolean;
// }

const Conversations: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { notifications, updateNotifications } = useNotifications();
  
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
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

    // Aguardar 2 segundos antes de marcar como lido (debounce aumentado)
    markReadTimeoutRef.current = setTimeout(async () => {
      try {
        // Verificar se ainda estamos no mesmo cliente
        if (targetClientId !== clientId) {
          console.log('⚠️ Cliente mudou durante debounce, ignorando marcação como lido');
          return;
        }

        console.log(`📖 Marcando mensagens como lidas para cliente: ${targetClientId}`);
        const result = await dashboardAPI.markClientMessagesAsRead(targetClientId);
        
        if (result.success && result.markedCount > 0) {
          console.log(`✅ ${result.markedCount} mensagens marcadas como lidas`);
          
          // Em vez de recarregar (loadMessages), atualizamos o estado local
          setMessages(prev => prev.map(m => ({ ...m, read: true })));
          
          // Atualizar notificações
          updateNotifications();
        }
      } catch (error) {
        console.error('Erro ao marcar mensagens como lidas:', error);
      } finally {
        // Limpar referência após processamento
        lastMarkedReadRef.current = null;
      }
    }, 2000); // Aumentado para 2 segundos
  }, [clientId, updateNotifications]);

  // EFEITO PRINCIPAL: Gerencia mudanças de clientId
  useEffect(() => {
    console.log('🔄 ClientId changed:', { clientId, clientsLoaded: !isLoadingClients });
    
    if (!clientId) {
      // Sem cliente selecionado - limpar estado
      clearMessagesState();
      return;
    }

    // Limpar estado anterior imediatamente
    clearMessagesState();
    
    // Se os clientes ainda não foram carregados, aguardar
    if (isLoadingClients) {
      console.log('⏳ Aguardando clientes carregarem...');
      return;
    }

    // Encontrar o cliente na lista
    const client = clients.find(c => c.id === clientId);
    if (!client) {
      console.warn(`❌ Cliente ${clientId} não encontrado na lista`);
      return;
    }

    console.log(`✅ Cliente encontrado: ${client.name || client.phone}`);
    setSelectedClient(client);
    
    // Carregar mensagens (agora com cache)
    loadMessages(clientId);
    
    // Marcar mensagens como lidas (com debounce mais robusto)
    markMessagesAsRead(clientId);
    
  }, [clientId, isLoadingClients, clearMessagesState, loadMessages, markMessagesAsRead]);

  // Efeito para carregar clientes no início
  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Efeito para scroll automático
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Cleanup na desmontagem
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (markReadTimeoutRef.current) {
        clearTimeout(markReadTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Limpar cache
      messagesCacheRef.current = {};
    };
  }, []);

  // Funções auxiliares
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Função para enviar mensagem
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !clientId || !selectedClient || isSendingMessage) {
      return;
    }

    setIsSendingMessage(true);
    console.log('🚀 Enviando mensagem:', newMessage.trim());

    try {
      await dashboardAPI.sendMessage(clientId, newMessage.trim());
      
      // Adicionar mensagem local imediatamente
      const newMsg: Message = {
        id: Date.now().toString(),
        client_id: clientId,
        content: newMessage.trim(),
        role: "assistant",
        created_at: new Date().toISOString(),
        read: false,
      };
      
      setMessages(prev => [...prev, newMsg]);
      setNewMessage("");
      console.log('✅ Mensagem enviada com sucesso');
    } catch (error) {
      console.error("❌ Erro ao enviar mensagem:", error);
      alert(`Erro ao enviar mensagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsSendingMessage(false);
    }
  }, [newMessage, clientId, selectedClient, isSendingMessage]);

  // Função para alternar IA
  const toggleAI = useCallback(async (targetClientId: string) => {
    try {
      const response = await dashboardAPI.toggleAI(targetClientId);

      setClients(prev =>
        prev.map(client =>
          client.id === targetClientId
            ? { ...client, ai_enabled: response.ai_enabled }
            : client
        )
      );

      if (selectedClient?.id === targetClientId) {
        setSelectedClient(prev =>
          prev ? { ...prev, ai_enabled: response.ai_enabled } : null
        );
      }
    } catch (error) {
      console.error("Erro ao alternar IA:", error);
    }
  }, [selectedClient]);

  // Função para digitação
  const handleTyping = useCallback(async (isTyping: boolean) => {
    if (!selectedClient) return;
    try {
      await dashboardAPI.sendTyping(selectedClient.id, isTyping);
    } catch (error) {
      console.error("Erro ao enviar status de digitação:", error);
    }
  }, [selectedClient]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    handleTyping(true);

    typingTimeoutRef.current = setTimeout(() => {
      handleTyping(false);
    }, 2000);
  };

  // Clientes filtrados
  const filteredClients = clients.filter(
    (client) =>
      client.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ height: "100%" }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: "bold" }}>
        Conversas
      </Typography>

      <Grid container spacing={2} sx={{ height: "calc(100vh - 200px)" }}>
        {/* Lista de Clientes */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
              <TextField
                fullWidth
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <List sx={{ flexGrow: 1, overflow: "auto", p: 0 }}>
              {isLoadingClients ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : filteredClients.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    Nenhum cliente encontrado
                  </Typography>
                </Box>
              ) : (
                filteredClients.map((client) => (
                  <ListItem key={client.id} disablePadding>
                    <ListItemButton
                      onClick={() => {
                        console.log('🔄 Cliente clicado:', client.id);
                        navigate(`/conversations/${client.id}`);
                      }}
                      selected={selectedClient?.id === client.id}
                      sx={{
                        borderBottom: 1,
                        borderColor: "divider",
                        "&.Mui-selected": {
                          backgroundColor: "#e8f5e8",
                        },
                      }}
                    >
                      <ListItemAvatar>
                        <Badge
                          badgeContent={notifications.clientUnreadCounts[client.id] || 0}
                          color="error"
                          overlap="circular"
                          sx={{
                            '& .MuiBadge-badge': {
                              right: -3,
                              top: 3,
                              border: '2px solid #fff',
                              padding: '0 4px',
                            },
                          }}
                        >
                          <Avatar sx={{ bgcolor: "#25D366" }}>
                            <PersonIcon />
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                              {client.name || client.phone}
                            </Typography>
                            {notifications.clientUnreadCounts[client.id] > 0 && (
                              <Typography variant="caption" color="error">
                                {notifications.clientUnreadCounts[client.id]} nova
                                {notifications.clientUnreadCounts[client.id] !== 1 ? "s" : ""}
                              </Typography>
                            )}
                          </Box>
                        }
                        secondary={
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              mt: 0.5,
                            }}
                          >
                            <Typography variant="body2" color="text.secondary" component="div">
                              {client.phone}
                            </Typography>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <OnlineIcon
                                sx={{
                                  fontSize: 12,
                                  color: client.ai_enabled ? "#4CAF50" : "#9E9E9E",
                                }}
                              />
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                component="div"
                              >
                                {client.ai_enabled ? "IA Ativa" : "IA Pausada"}
                              </Typography>
                            </Box>
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                ))
              )}
            </List>
          </Paper>
        </Grid>

        {/* Chat Interface */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {selectedClient ? (
              <>
                {/* Header do Chat */}
                <Box
                  sx={{
                    p: 2,
                    borderBottom: 1,
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      badgeContent={
                        <Tooltip title={selectedClient.isTyping ? "Digitando..." : "Online"}>
                          <OnlineIcon
                            sx={{
                              fontSize: 12,
                              color: selectedClient.isTyping ? "#FFA726" : "#4CAF50",
                            }}
                          />
                        </Tooltip>
                      }
                    >
                      <Avatar sx={{ bgcolor: "#25D366" }}>
                        <PersonIcon />
                      </Avatar>
                    </Badge>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                        {selectedClient.name || selectedClient.phone}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedClient.isTyping ? "Digitando..." : selectedClient.phone}
                      </Typography>
                    </Box>
                  </Box>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={selectedClient.ai_enabled}
                        onChange={() => toggleAI(selectedClient.id)}
                        color="primary"
                      />
                    }
                    label={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <AIIcon />
                        <Typography variant="body2">
                          IA {selectedClient.ai_enabled ? "Ativa" : "Pausada"}
                        </Typography>
                      </Box>
                    }
                  />
                </Box>

                {/* Mensagens */}
                <Box
                  sx={{
                    flexGrow: 1,
                    overflow: "auto",
                    p: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  {isLoadingMessages ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <CircularProgress />
                      <Typography sx={{ ml: 2 }}>Carregando mensagens...</Typography>
                    </Box>
                  ) : messages.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <Typography color="text.secondary">
                        Nenhuma mensagem ainda. Inicie a conversa!
                      </Typography>
                    </Box>
                  ) : (
                    messages.map((message) => (
                      <Box
                        key={message.id}
                        sx={{
                          display: "flex",
                          justifyContent: message.role === "user" ? "flex-start" : "flex-end",
                          mb: 1,
                        }}
                      >
                        <Paper
                          sx={{
                            p: 2,
                            maxWidth: "70%",
                            backgroundColor: message.role === "user" ? "#f5f5f5" : "#25D366",
                            color: message.role === "user" ? "text.primary" : "white",
                          }}
                        >
                          <Typography variant="body1">{message.content}</Typography>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: 0.5,
                              mt: 0.5,
                            }}
                          >
                            <Typography variant="caption" sx={{ opacity: 0.7 }}>
                              {formatTime(message.created_at)}
                            </Typography>
                            {message.role === "assistant" && (
                              <Tooltip title="Enviada">
                                <CheckIcon sx={{ fontSize: 16, color: "#9E9E9E" }} />
                              </Tooltip>
                            )}
                          </Box>
                        </Paper>
                      </Box>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </Box>

                {/* Input de Mensagem */}
                <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Tooltip title="Anexar arquivo">
                        <IconButton>
                          <AttachFileIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Enviar imagem">
                        <IconButton>
                          <ImageIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Gravar áudio">
                        <IconButton>
                          <MicIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <TextField
                      fullWidth
                      placeholder="Digite sua mensagem..."
                      value={newMessage}
                      onChange={handleMessageChange}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      multiline
                      maxRows={3}
                      disabled={isSendingMessage}
                    />
                    <IconButton
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || isSendingMessage}
                      sx={{
                        bgcolor: "#25D366",
                        color: "white",
                        "&:hover": { bgcolor: "#128C7E" },
                        "&:disabled": { bgcolor: "#ccc" },
                      }}
                    >
                      {isSendingMessage ? <CircularProgress size={24} /> : <SendIcon />}
                    </IconButton>
                  </Box>
                </Box>
              </>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                }}
              >
                <Typography variant="h6" color="text.secondary">
                  {isLoadingClients ? "Carregando..." : "Selecione uma conversa para começar"}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Conversations;
