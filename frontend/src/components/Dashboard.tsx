import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  Button,
  Paper
} from '@mui/material';
import {
  People as PeopleIcon,
  Chat as ChatIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  Circle as CircleIcon
} from '@mui/icons-material';
import { dashboardAPI } from '../services/api';
import type { DashboardStats, RecentActivity } from '../services/api';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeConversations: 0,
    pendingPlans: 0,
    todayMessages: 0
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, activityData] = await Promise.all([
        dashboardAPI.getDashboardStats(),
        dashboardAPI.getRecentActivity()
      ]);

      setStats(statsData);
      setRecentActivity(Array.isArray(activityData) ? activityData : []);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      // Manter valores padrão em caso de erro
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d atrás`;
  };

  const statCards = [
    {
      title: 'Total de Clientes',
      value: stats.totalClients,
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      color: '#25D366',
      bgColor: '#e8f5e8'
    },
    {
      title: 'Conversas Ativas',
      value: stats.activeConversations,
      icon: <ChatIcon sx={{ fontSize: 40 }} />,
      color: '#2196F3',
      bgColor: '#e3f2fd'
    },
    {
      title: 'Planos Pendentes',
      value: stats.pendingPlans,
      icon: <AssignmentIcon sx={{ fontSize: 40 }} />,
      color: '#FF9800',
      bgColor: '#fff3e0'
    },
    {
      title: 'Mensagens Hoje',
      value: stats.todayMessages,
      icon: <TrendingUpIcon sx={{ fontSize: 40 }} />,
      color: '#4CAF50',
      bgColor: '#e8f5e8'
    }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <ChatIcon />;
      case 'plan':
        return <AssignmentIcon />;
      case 'client':
        return <PeopleIcon />;
      default:
        return <CircleIcon />;
    }
  };

  const getStatusColor = (status?: string): 'success' | 'warning' | 'info' | 'default' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'completed':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography variant="h6">Carregando dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>
        Dashboard
      </Typography>

      {/* Cards de Estatísticas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((card, index) => (
          <Grid xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                height: '100%',
                background: `linear-gradient(135deg, ${card.bgColor} 0%, ${card.bgColor}dd 100%)`,
                border: `1px solid ${card.color}22`,
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 'bold', color: card.color }}>
                      {card.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.title}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: card.color, width: 60, height: 60 }}>
                    {card.icon}
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Atividade Recente */}
      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              Atividade Recente
            </Typography>
            {recentActivity.length > 0 ? (
              <List>
                {recentActivity.map((activity) => (
                  <ListItem key={activity.id} sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#25D366' }}>
                        {getActivityIcon(activity.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1">
                            {activity.content}
                          </Typography>
                          {activity.status && (
                            <Chip
                              label={activity.status}
                              size="small"
                              color={getStatusColor(activity.status)}
                            />
                          )}
                        </Box>
                      }
                      secondary={`${activity.clientName || activity.clientPhone} • ${formatTimestamp(activity.timestamp)}`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                Nenhuma atividade recente encontrada
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              Ações Rápidas
            </Typography>
            <Button
              variant="contained"
              fullWidth
              sx={{ mb: 2 }}
              startIcon={<ChatIcon />}
              onClick={() => window.location.href = '/conversations'}
            >
              Ver Todas as Conversas
            </Button>
            <Button
              variant="outlined"
              fullWidth
              sx={{ mb: 2 }}
              startIcon={<AssignmentIcon />}
              onClick={() => window.location.href = '/pending-plans'}
            >
              Revisar Planos Pendentes
            </Button>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<PeopleIcon />}
              onClick={() => window.location.href = '/conversations'}
            >
              Gerenciar Clientes
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 