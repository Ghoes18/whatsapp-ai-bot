import React, { useState, useEffect, useRef } from "react";
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

// interface MessageStatus {
//   delivered: boolean;
//   read: boolean;
// }

interface ClientWithUnread extends Client {
  unreadCount: number;
  isTyping?: boolean;
}

const Conversations: React.FC = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  console.log('🔍 Conversations component loaded - clientId from URL:', clientId);
  
  const [clients, setClients] = useState<ClientWithUnread[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientWithUnread | null>(
    null
  );
  const [messages, setMessages] = useState<Message[]>(() => {
    // Tenta recuperar mensagens do localStorage específicas do cliente atual
    if (clientId) {
      const savedMessages = localStorage.getItem(`messages_${clientId}`);
      return savedMessages ? JSON.parse(savedMessages) : [];
    }
    return [];
  });
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadMessagesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Salva mensagens no localStorage específico do cliente
  useEffect(() => {
    if (clientId) {
      localStorage.setItem(`messages_${clientId}`, JSON.stringify(messages));

      // Atualiza contagem de mensagens não lidas para cada cliente
      setClients((prevClients) =>
        prevClients.map((client) => {
          const clientMessages = messages.filter(
            (msg) =>
              msg.client_id === client.id && msg.role === "user" && !msg.read
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

  // Função para enviar notificação de digitação - SIMPLIFICADA
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
      if (loadMessagesTimeoutRef.current) {
        clearTimeout(loadMessagesTimeoutRef.current);
      }
    };
  }, []);

  const loadClients = async () => {
    try {
      const response = await dashboardAPI.getClients();
      const clientsWithUnread = Array.isArray(response)
        ? response.map((client) => ({
            ...client,
            unreadCount: 0,
          }))
        : [];
      setClients(clientsWithUnread);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      setClients([]);
    }
  };

  const loadMessages = async () => {
    if (!clientId) {
      console.log('❌ loadMessages: clientId não definido');
      return;
    }

    // Limpar timeout anterior se existir
    if (loadMessagesTimeoutRef.current) {
      clearTimeout(loadMessagesTimeoutRef.current);
    }

    // Debounce de 500ms para evitar chamadas excessivas
    loadMessagesTimeoutRef.current = setTimeout(async () => {
      console.log(`📨 Carregando mensagens para cliente: ${clientId}`);
      
      try {
        const response = await dashboardAPI.getMessages(clientId);
        console.log('📨 Resposta da API getMessages:', response);
        
        const newMessages = Array.isArray(response) ? response : [];
        console.log(`📨 Mensagens processadas: ${newMessages.length} mensagens`);

        // Ordena mensagens por data (mais antiga primeiro, ordem cronológica correta)
        const sortedMessages = [...newMessages].sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        console.log(`📨 Mensagens ordenadas cronologicamente: ${sortedMessages.length} mensagens`);
        setMessages(sortedMessages);
        
        // Rolar para baixo após carregar mensagens
        setTimeout(() => scrollToBottom(), 100);
      } catch (error) {
        console.error("❌ Erro ao carregar mensagens:", error);
        console.error("❌ Detalhes do erro:", {
          message: error instanceof Error ? error.message : 'Erro desconhecido',
          stack: error instanceof Error ? error.stack : undefined,
          response: (error as { response?: { data?: unknown } })?.response?.data,
          status: (error as { response?: { status?: number } })?.response?.status
        });
      }
    }, 500);
  };

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
        role: "user",
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

  return (
    <Box sx={{ height: "100%" }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: "bold" }}>
        Conversas
      </Typography>

      {/* Debug Info - TEMPORÁRIO PARA TESTE */}
      <Box sx={{ mb: 2, p: 2, bgcolor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: 1 }}>
        <Typography variant="h6" sx={{ color: '#d63031', mb: 1 }}>🔧 Debug Info:</Typography>
        <Typography variant="body2">URL clientId: {clientId || 'NENHUM'}</Typography>
        <Typography variant="body2">Selected Client: {selectedClient?.name || selectedClient?.phone || 'NENHUM'}</Typography>
        <Typography variant="body2">Total Clients: {clients.length}</Typography>
        <Typography variant="body2">Total Messages: {messages.length}</Typography>
        <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
          <button onClick={() => loadClients()} style={{ padding: '4px 8px', fontSize: '12px' }}>
            🔄 Recarregar Clientes
          </button>
          <button onClick={() => loadMessages()} style={{ padding: '4px 8px', fontSize: '12px' }}>
            📨 Recarregar Mensagens
          </button>
          <button onClick={() => console.log('State:', { clientId, selectedClient, messages, clients })} style={{ padding: '4px 8px', fontSize: '12px' }}>
            📋 Log State
          </button>
          <button 
            onClick={async () => {
              try {
                console.log('🧹 Iniciando limpeza...');
                const response = await fetch('/api/dashboard/cleanup/messages', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' }
                });
                const result = await response.json();
                console.log('Resultado da limpeza:', result);
                
                if (result.success) {
                  alert(`✅ Limpeza concluída!\n${result.message}\nRecarregue as mensagens para ver o resultado.`);
                  // Automaticamente recarregar mensagens
                  setTimeout(() => loadMessages(), 1000);
                } else {
                  alert(`❌ Erro na limpeza: ${result.error || 'Erro desconhecido'}`);
                }
              } catch (error) {
                console.error('Erro na limpeza:', error);
                alert('❌ Erro na limpeza. Verifique se o backend está rodando.');
              }
            }} 
            style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#ff6b6b', color: 'white' }}
          >
            🧹 Limpar Conversas
          </button>
        </Box>
      </Box>

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
                        badgeContent={client.unreadCount}
                        color="error"
                        overlap="circular"
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
                          {client.unreadCount > 0 && (
                            <Typography variant="caption" color="error">
                              {client.unreadCount} nova
                              {client.unreadCount !== 1 ? "s" : ""}
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
