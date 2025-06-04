import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  WhatsApp as WhatsAppIcon,
  Phone as PhoneIcon,
  FitnessCenter as FitnessCenterIcon,
  Schedule as ScheduleIcon,
  Height as HeightIcon,
  MonitorWeight as WeightIcon
} from '@mui/icons-material';
import { dashboardAPI } from '../services/api';
import type { Client, ClientStats } from '../services/api';

const ClientProfile: React.FC = () => {
  const { clientId } = useParams();
  const [client, setClient] = useState<Client | null>(null);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedClient, setEditedClient] = useState<Partial<Client>>({});
  const [showPlanModal, setShowPlanModal] = useState(false);
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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography variant="h6">Carregando perfil do cliente...</Typography>
      </Box>
    );
  }

  if (!client) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography variant="h6">Cliente não encontrado</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>
        Perfil do Cliente
      </Typography>

      <Grid container spacing={3}>
        {/* Informações Básicas */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Informações Pessoais
              </Typography>
              {!isEditing ? (
                <Button
                  startIcon={<EditIcon />}
                  onClick={() => setIsEditing(true)}
                  variant="outlined"
                >
                  Editar
                </Button>
              ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    variant="contained"
                    color="primary"
                  >
                    Salvar
                  </Button>
                  <Button
                    startIcon={<CancelIcon />}
                    onClick={handleCancel}
                    variant="outlined"
                  >
                    Cancelar
                  </Button>
                </Box>
              )}
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nome"
                  value={isEditing ? editedClient.name || '' : client.name || ''}
                  onChange={(e) => setEditedClient({ ...editedClient, name: e.target.value })}
                  disabled={!isEditing}
                  InputProps={{
                    startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Telefone"
                  value={client.phone}
                  disabled
                  InputProps={{
                    startAdornment: <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Idade"
                  type="number"
                  value={isEditing ? editedClient.age || '' : client.age || ''}
                  onChange={(e) => setEditedClient({ ...editedClient, age: parseInt(e.target.value) || undefined })}
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Gênero"
                  select
                  value={isEditing ? editedClient.gender || '' : client.gender || ''}
                  onChange={(e) => setEditedClient({ ...editedClient, gender: e.target.value })}
                  disabled={!isEditing}
                >
                  <MenuItem value="masculino">Masculino</MenuItem>
                  <MenuItem value="feminino">Feminino</MenuItem>
                  <MenuItem value="outro">Outro</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Altura (cm)"
                  type="number"
                  value={isEditing ? editedClient.height || '' : client.height || ''}
                  onChange={(e) => setEditedClient({ ...editedClient, height: parseFloat(e.target.value) || undefined })}
                  disabled={!isEditing}
                  InputProps={{
                    startAdornment: <HeightIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Peso (kg)"
                  type="number"
                  value={isEditing ? editedClient.weight || '' : client.weight || ''}
                  onChange={(e) => setEditedClient({ ...editedClient, weight: parseFloat(e.target.value) || undefined })}
                  disabled={!isEditing}
                  InputProps={{
                    startAdornment: <WeightIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Objetivo"
                  value={isEditing ? editedClient.goal || '' : client.goal || ''}
                  onChange={(e) => setEditedClient({ ...editedClient, goal: e.target.value })}
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nível de Atividade"
                  select
                  value={isEditing ? editedClient.activity_level || '' : client.activity_level || ''}
                  onChange={(e) => setEditedClient({ ...editedClient, activity_level: e.target.value })}
                  disabled={!isEditing}
                >
                  <MenuItem value="sedentario">Sedentário</MenuItem>
                  <MenuItem value="leve">Levemente ativo</MenuItem>
                  <MenuItem value="moderado">Moderadamente ativo</MenuItem>
                  <MenuItem value="intenso">Muito ativo</MenuItem>
                  <MenuItem value="extremo">Extremamente ativo</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Restrições Alimentares"
                  multiline
                  rows={3}
                  value={isEditing ? editedClient.dietary_restrictions || '' : client.dietary_restrictions || ''}
                  onChange={(e) => setEditedClient({ ...editedClient, dietary_restrictions: e.target.value })}
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Data de Cadastro"
                  value={formatDate(client.created_at)}
                  disabled
                  InputProps={{
                    startAdornment: <ScheduleIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={<WhatsAppIcon />}
                label={client.ai_enabled ? 'IA Ativa' : 'IA Pausada'}
                color={client.ai_enabled ? 'success' : 'default'}
              />
              <Chip
                label={client.paid ? 'Cliente Pago' : 'Cliente Gratuito'}
                color={client.paid ? 'primary' : 'secondary'}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Configurações e Estatísticas */}
        <Grid item xs={12} md={4}>
          <Grid container spacing={3}>
            {/* Configurações */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Configurações
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={client.ai_enabled}
                      onChange={toggleAI}
                      color="primary"
                    />
                  }
                  label="IA Ativa"
                />
              </Paper>
            </Grid>

            {/* Estatísticas */}
            {stats && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                    Estatísticas
                  </Typography>
                  <List dense>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary="Total de Mensagens"
                        secondary={stats.totalMessages}
                      />
                    </ListItem>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary="Planos Recebidos"
                        secondary={stats.plansReceived}
                      />
                    </ListItem>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary="Última Atividade"
                        secondary={stats.lastActivity ? formatDate(stats.lastActivity) : 'Nenhuma atividade'}
                      />
                    </ListItem>
                  </List>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Grid>

        {/* Plano Atual */}
        {client.plan_text && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Plano Atual
                </Typography>
                <Button
                  startIcon={<FitnessCenterIcon />}
                  onClick={() => setShowPlanModal(true)}
                  variant="outlined"
                >
                  Ver Plano Completo
                </Button>
              </Box>
              
              <Typography
                variant="body2"
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 5,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-line'
                }}
              >
                {client.plan_text}
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Modal do Plano */}
      <Dialog
        open={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FitnessCenterIcon />
            <Typography variant="h6">Plano do Cliente</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography
            variant="body1"
            sx={{
              whiteSpace: 'pre-line',
              lineHeight: 1.8
            }}
          >
            {client.plan_text}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPlanModal(false)}>
            Fechar
          </Button>
          {client.plan_url && (
            <Button
              variant="contained"
              onClick={() => window.open(client.plan_url, '_blank')}
            >
              Ver PDF
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClientProfile; 