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
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { notifications, updateNotifications } = useNotifications();
  console.log('🔍 Conversations component loaded - clientId from URL:', clientId);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cache de mensagens usando useMemo
  const messagesCache = useRef<Map<string, { messages: Message[], timestamp: number }>>(new Map());
  const CACHE_DURATION = 30000; // 30 segundos

  // Salva mensagens no localStorage específico do cliente
  useEffect(() => {
    if (clientId) {
      localStorage.setItem(`messages_${clientId}`, JSON.stringify(messages));

      // Atualiza contagem de mensagens não lidas para cada cliente
      setClients((prevClients) =>
        prevClients.map((client) => {
          const clientMessages = messages.filter(
            (msg) => msg.client_id === client.id && msg.role === "user"
          );
          return {
            ...client,
            unreadCount: clientMessages.length,
          };
        })
      );
    }
  }, [messages, clientId]);

  // Carrega mensagens quando o cliente é selecionado
  useEffect(() => {
    console.log('🔄 useEffect clientId changed:', { clientId, clientsLength: clients.length });
    if (clientId) {
      // Se já temos clientes carregados, procurar o cliente
      if (clients.length > 0) {
        const client = clients.find((c) => c.id === clientId);
        console.log('👤 Cliente encontrado:', client);
        
        if (client) {
          setSelectedClient(client);
          console.log('✅ Cliente selecionado, carregando mensagens...');
          loadMessages();
        } else {
          console.warn('❌ Cliente não encontrado na lista de clientes');
        }
      } else {
        // Se clients ainda não foi carregado, apenas carregar mensagens diretamente
        console.log('⏳ Clientes ainda não carregados, carregando mensagens diretamente...');
        loadMessages();
      }
    } else {
      console.log('⚠️ Nenhum clientId na URL');
      setSelectedClient(null);
      setMessages([]);
    }
  }, [clientId]); // APENAS clientId como dependência

  // Efeito separado para quando clients carrega e temos um clientId
  useEffect(() => {
    if (clientId && clients.length > 0 && !selectedClient) {
      console.log('🔄 Clients carregado, tentando encontrar cliente...');
      const client = clients.find((c) => c.id === clientId);
      if (client) {
        console.log('👤 Cliente encontrado após carregamento:', client);
        setSelectedClient(client);
      }
    }
  }, [clients.length]); // Apenas reagir ao tamanho da lista, não ao conteúdo

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Função para enviar notificação de digitação
  const handleTyping = async (isTyping: boolean) => {
    if (!selectedClient) return;
    try {
      await dashboardAPI.sendTyping(selectedClient.id, isTyping);
    } catch (error) {
      console.error("Erro ao enviar status de digitação:", error);
    }
  };

  // Atualiza status de digitação quando o usuário digita
  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    // Limpa o timeout anterior
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Envia notificação de digitação
    handleTyping(true);

    // Define timeout para parar a digitação
    typingTimeoutRef.current = setTimeout(() => {
      handleTyping(false);
    }, 2000);
  };

  // Limpa o timeout quando o componente é desmontado
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const loadClients = async () => {
    try {
      const response = await dashboardAPI.getClients();
      setClients(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      setClients([]);
    }
  };

  const loadMessages = useCallback(async (forceReload = false) => {
    if (!clientId) {
      console.log('❌ loadMessages: clientId não definido');
      return;
    }

    // Verificar cache se não for reload forçado
    if (!forceReload) {
      const cached = messagesCache.current.get(clientId);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`📨 Usando mensagens do cache para cliente: ${clientId}`);
        const sortedMessages = [...cached.messages].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setMessages(sortedMessages);
        return;
      }
    }

    console.log(`📨 Carregando mensagens para cliente: ${clientId}`);
    
    try {
      const response = await dashboardAPI.getMessages(clientId);
      console.log('📨 Resposta da API getMessages:', response);
      
      const newMessages = Array.isArray(response) ? response : [];
      console.log(`📨 Mensagens processadas: ${newMessages.length} mensagens`);

      // Ordenar mensagens por data
      const sortedMessages = [...newMessages].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      // Atualizar cache
      messagesCache.current.set(clientId, {
        messages: sortedMessages,
        timestamp: Date.now()
      });

      console.log(`📨 Mensagens ordenadas cronologicamente: ${sortedMessages.length} mensagens`);
      setMessages(sortedMessages);
      
      // Rolar para baixo após carregar mensagens
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error("❌ Erro ao carregar mensagens:", error);
    }
  }, [clientId]);

  const handleSendMessage = async () => {
    console.log('🚀 handleSendMessage chamada!');
    console.log('Estado atual:', { newMessage, clientId, selectedClient });
    
    if (!newMessage.trim() || !clientId) {
      console.warn('Tentativa de envio sem mensagem ou cliente selecionado:', {
        newMessage: newMessage.trim(),
        clientId
      });
      return;
    }

    console.log('Iniciando envio de mensagem:', {
      clientId,
      message: newMessage.trim(),
      selectedClient
    });

    try {
      console.log('Enviando mensagem via API...');
      const response = await dashboardAPI.sendMessage(clientId, newMessage.trim());
      console.log('Resposta da API:', response);
      
      const newMsg: Message = {
        id: Date.now().toString(),
        client_id: clientId,
        content: newMessage.trim(),
        role: "assistant",
        created_at: new Date().toISOString(),
        read: false,
      };
      
      console.log('Adicionando mensagem local:', newMsg);
      setMessages(prevMessages => [...prevMessages, newMsg]);
      setNewMessage("");
      
      // Rolar para baixo após enviar mensagem
      setTimeout(() => scrollToBottom(), 100);
      
      console.log('Mensagem enviada com sucesso!');
      
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      console.error("Detalhes do erro:", {
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        response: (error as { response?: { data?: unknown } })?.response?.data,
        status: (error as { response?: { status?: number } })?.response?.status
      });
      
      // Mostrar erro para o usuário
      alert(`Erro ao enviar mensagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const toggleAI = async (clientId: string) => {
    try {
      const response = await dashboardAPI.toggleAI(clientId);

      setClients((prev) =>
        prev.map((client) =>
          client.id === clientId
            ? { ...client, ai_enabled: response.ai_enabled }
            : client
        )
      );

      if (selectedClient?.id === clientId) {
        setSelectedClient((prev) =>
          prev ? { ...prev, ai_enabled: response.ai_enabled } : null
        );
      }
    } catch (error) {
      console.error("Erro ao alternar IA:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredClients = clients.filter(
    (client) =>
      client.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Atualizar notificações quando uma mensagem é lida
  const markMessagesAsRead = useCallback(async (clientId: string) => {
    try {
      console.log(`📖 Marcando mensagens como lidas para cliente: ${clientId}`);
      
      // Usar o novo endpoint otimizado
      const result = await dashboardAPI.markClientMessagesAsRead(clientId);
      
      if (result.success && result.markedCount > 0) {
        console.log(`✅ ${result.markedCount} mensagens marcadas como lidas`);
        
        // Invalidar cache local para recarregar mensagens atualizadas
        messagesCache.current.delete(clientId);
        
        // Atualizar notificações após marcar como lidas
        updateNotifications();
      }
    } catch (error) {
      console.error('Erro ao marcar mensagens como lidas:', error);
      // Fallback para o método antigo se o novo falhar
      try {
        const messages = await dashboardAPI.getMessages(clientId);
        const unreadMessages = messages.filter(msg => msg.role === 'user' && !msg.read);
        
        if (unreadMessages.length > 0) {
          await Promise.allSettled(
            unreadMessages.map(async (msg) => {
              try {
                await dashboardAPI.markMessageAsRead(msg.id);
              } catch (error) {
                console.warn(`Erro ao marcar mensagem ${msg.id} como lida:`, error);
              }
            })
          );
          updateNotifications();
        }
      } catch (fallbackError) {
        console.error('Erro no fallback para marcar mensagens como lidas:', fallbackError);
      }
    }
  }, [updateNotifications]);

  // Carregar mensagens quando o cliente é selecionado
  useEffect(() => {
    if (clientId) {
      loadMessages();
    }
  }, [clientId]); // Apenas clientId como dependência

  // Atualizar cliente selecionado quando clientId muda
  useEffect(() => {
    if (clientId && clients.length > 0) {
      const client = clients.find(c => c.id === clientId);
      if (client) {
        setSelectedClient(client);
      }
    } else {
      setSelectedClient(null);
    }
  }, [clientId, clients]);

  // Marcar mensagens como lidas quando um cliente é selecionado
  useEffect(() => {
    if (selectedClient) {
      markMessagesAsRead(selectedClient.id);
    }
  }, [selectedClient]);

  return (
    <Box sx={{ height: "100%" }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: "bold" }}>
        Conversas
      </Typography>



      <Grid container spacing={2} sx={{ height: "calc(100vh - 200px)" }}>
        {/* Lista de Clientes */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{ height: "100%", display: "flex", flexDirection: "column" }}
          >
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
              {filteredClients.map((client) => (
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
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: "bold" }}
                          >
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
                                color: client.ai_enabled
                                  ? "#4CAF50"
                                  : "#9E9E9E",
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
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Chat Interface */}
        <Grid item xs={12} md={8}>
          <Paper
            sx={{ height: "100%", display: "flex", flexDirection: "column" }}
          >
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
                        <Tooltip
                          title={
                            selectedClient.isTyping ? "Digitando..." : "Online"
                          }
                        >
                          <OnlineIcon
                            sx={{
                              fontSize: 12,
                              color: selectedClient.isTyping
                                ? "#FFA726"
                                : "#4CAF50",
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
                        {selectedClient.isTyping
                          ? "Digitando..."
                          : selectedClient.phone}
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
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
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
                  {messages.map((message) => (
                    <Box
                      key={message.id}
                      sx={{
                        display: "flex",
                        justifyContent:
                          message.role === "user" ? "flex-start" : "flex-end",
                        mb: 1,
                      }}
                    >
                      <Paper
                        sx={{
                          p: 2,
                          maxWidth: "70%",
                          backgroundColor:
                            message.role === "user" ? "#f5f5f5" : "#25D366",
                          color:
                            message.role === "user" ? "text.primary" : "white",
                        }}
                      >
                        <Typography variant="body1">
                          {message.content}
                        </Typography>
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
                              <Box
                                sx={{ display: "flex", alignItems: "center" }}
                              >
                                <CheckIcon
                                  sx={{ fontSize: 16, color: "#9E9E9E" }}
                                />
                              </Box>
                            </Tooltip>
                          )}
                        </Box>
                      </Paper>
                    </Box>
                  ))}
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
                        console.log('Tecla pressionada:', e.key, 'shiftKey:', e.shiftKey);
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          console.log('Enter pressionado - chamando handleSendMessage');
                          handleSendMessage();
                        }
                      }}
                      multiline
                      maxRows={3}
                    />
                    <IconButton
                      onClick={() => {
                        console.log('Botão de envio clicado');
                        handleSendMessage();
                      }}
                      disabled={!newMessage.trim()}
                      sx={{
                        bgcolor: "#25D366",
                        color: "white",
                        "&:hover": { bgcolor: "#128C7E" },
                        "&:disabled": { bgcolor: "#ccc" },
                      }}
                    >
                      <SendIcon />
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
                  Selecione uma conversa para começar
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
