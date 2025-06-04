import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Badge,
  Divider
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Chat as ChatIcon,
  Assignment as AssignmentIcon,
  WhatsApp as WhatsAppIcon
} from '@mui/icons-material';

const drawerWidth = 280;

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/',
    },
    {
      text: 'Conversas',
      icon: <ChatIcon />,
      path: '/conversations',
    },
    {
      text: 'Planos Pendentes',
      icon: <AssignmentIcon />,
      path: '/pending-plans',
      badge: 3, // Você pode implementar um hook para buscar o número real
    },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: '#f8f9fa',
          borderRight: '1px solid #e0e0e0',
        },
      }}
    >
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <WhatsAppIcon sx={{ fontSize: 40, color: '#25D366', mb: 1 }} />
        <Typography variant="h6" component="h1" sx={{ fontWeight: 'bold' }}>
          WhatsApp AI Bot
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Dashboard
        </Typography>
      </Box>
      
      <Divider />
      
      <List sx={{ pt: 2 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 1, px: 2 }}>
            <ListItemButton
              onClick={() => navigate(item.path)}
              selected={location.pathname === item.path}
              sx={{
                borderRadius: 2,
                '&.Mui-selected': {
                  backgroundColor: '#25D366',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: '#128C7E',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
                '&:hover': {
                  backgroundColor: '#e8f5e8',
                },
              }}
            >
              <ListItemIcon sx={{ color: location.pathname === item.path ? 'white' : '#25D366' }}>
                {item.badge ? (
                  <Badge badgeContent={item.badge} color="error">
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{
                  fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

export default Sidebar; 