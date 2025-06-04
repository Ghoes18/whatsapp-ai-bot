import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
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
} from "@mui/material";
import {
  Send as SendIcon,
  SmartToy as AIIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Circle as OnlineIcon,
} from "@mui/icons-material";
import { dashboardAPI } from '../services/api';
import type { Client, Message } from '../services/api';

const Conversations: React.FC = () => {
  const { clientId } = useParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (clientId) {
      const client = clients.find((c) => c.id === clientId);
      if (client) {
        setSelectedClient(client);
        loadMessages();
      }
    }
  }, [clientId, clients]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadClients = async () => {
    try {
      const response = await dashboardAPI.getClients();
      setClients(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      setClients([]);
    }
  };

  const loadMessages = async () => {
    if (!clientId) return;
    
    try {
      const response = await dashboardAPI.getMessages(clientId);
      setMessages(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedClient) return;

    try {
      await dashboardAPI.sendMessage(selectedClient.id, newMessage);

      // Adicionar mensagem localmente
      const newMsg: Message = {
        id: Date.now().toString(),
        client_id: selectedClient.id,
        role: "assistant",
        content: newMessage,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, newMsg]);
      setNewMessage("");
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
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
                      setSelectedClient(client);
                      loadMessages();
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
                      <Avatar sx={{ bgcolor: "#25D366" }}>
                        <PersonIcon />
                      </Avatar>
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
                        </Box>
                      }
                      secondary={
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            mt: 0.5,
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
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
                    <Avatar sx={{ bgcolor: "#25D366" }}>
                      <PersonIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                        {selectedClient.name || selectedClient.phone}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedClient.phone}
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
                        <Typography
                          variant="caption"
                          sx={{
                            display: "block",
                            mt: 0.5,
                            opacity: 0.7,
                            textAlign: "right",
                          }}
                        >
                          {formatTime(message.created_at)}
                        </Typography>
                      </Paper>
                    </Box>
                  ))}
                  <div ref={messagesEndRef} />
                </Box>

                {/* Input de Mensagem */}
                <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <TextField
                      fullWidth
                      placeholder="Digite sua mensagem..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      multiline
                      maxRows={3}
                    />
                    <IconButton
                      onClick={sendMessage}
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
