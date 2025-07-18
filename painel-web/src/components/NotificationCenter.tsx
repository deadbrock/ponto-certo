import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Badge,
  IconButton,
  Popover,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
  Button,
  Divider,
  Tabs,
  Tab,
  Alert,
  Avatar,
  Tooltip,
  Fade,
  Grow
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  Close as CloseIcon,
  MarkEmailRead as MarkReadIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  AccessTime as TimeIcon,
  People as PeopleIcon,
  Computer as SystemIcon,
  AttachMoney as FinanceIcon,
  Work as WorkIcon,
  Circle as CircleIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { notificationService, Notification } from '../services/notificationService';
import { useNavigate } from 'react-router-dom';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`notification-tabpanel-${index}`}
      aria-labelledby={`notification-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Adicionar listener para notificações
    const handleNotificationsUpdate = (newNotifications: Notification[]) => {
      const oldCount = notifications.length;
      const newCount = newNotifications.length;
      
      setNotifications(newNotifications);
      
      // Tocar som para novas notificações críticas
      if (newCount > oldCount) {
        const latestNotification = newNotifications[0];
        if (latestNotification && (latestNotification.priority === 'critical' || latestNotification.priority === 'high')) {
          setHasNewNotifications(true);
          playNotificationSound();
        }
      }
    };

    notificationService.addListener(handleNotificationsUpdate);
    setNotifications(notificationService.getNotifications());

    return () => {
      notificationService.removeListener(handleNotificationsUpdate);
    };
  }, [notifications.length]);

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(err => console.log('Erro ao tocar som:', err));
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    setHasNewNotifications(false);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleNotificationClick = (notification: Notification) => {
    notificationService.markAsRead(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      handleClose();
    }
  };

  const handleMarkAllRead = () => {
    notificationService.markAllAsRead();
  };

  const handleClearAll = () => {
    notificationService.clearAll();
    handleClose();
  };

  const getNotificationIcon = (notification: Notification) => {
    const iconProps = { fontSize: 'small' as const };
    
    switch (notification.type) {
      case 'error':
        return <ErrorIcon {...iconProps} sx={{ color: '#f44336' }} />;
      case 'warning':
        return <WarningIcon {...iconProps} sx={{ color: '#ff9800' }} />;
      case 'success':
        return <SuccessIcon {...iconProps} sx={{ color: '#4caf50' }} />;
      case 'info':
      default:
        return <InfoIcon {...iconProps} sx={{ color: '#354a80' }} />;
    }
  };

  const getCategoryIcon = (category: string) => {
    const iconProps = { fontSize: 'small' as const, sx: { color: '#666' } };
    
    switch (category) {
      case 'ponto':
        return <TimeIcon {...iconProps} />;
      case 'presenca':
        return <PeopleIcon {...iconProps} />;
      case 'sistema':
        return <SystemIcon {...iconProps} />;
      case 'financeiro':
        return <FinanceIcon {...iconProps} />;
      case 'rh':
        return <WorkIcon {...iconProps} />;
      default:
        return <CircleIcon {...iconProps} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '#a2122a';
      case 'high':
        return '#ff9800';
      case 'medium':
        return '#354a80';
      case 'low':
      default:
        return '#4caf50';
    }
  };

  const formatNotificationTime = (timestamp: Date) => {
    return formatDistanceToNow(timestamp, { 
      addSuffix: true, 
      locale: ptBR 
    });
  };

  const getFilteredNotifications = () => {
    switch (tabValue) {
      case 1: // Não lidas
        return notifications.filter(n => !n.read);
      case 2: // Críticas
        return notifications.filter(n => n.priority === 'critical' || n.priority === 'high');
      case 3: // Ponto
        return notifications.filter(n => n.category === 'ponto');
      case 4: // Presença
        return notifications.filter(n => n.category === 'presenca');
      case 0: // Todas
      default:
        return notifications;
    }
  };

  const unreadCount = notificationService.getUnreadCount();
  const open = Boolean(anchorEl);

  return (
    <>
      {/* Áudio para notificações */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIZCXHK8siCMQkGZrfr6IZTEQ5KnOPlv2seDjCLzfDNfD0CFnLG7t2QQgwTXbLk6KlPEAk8muLyu2MdCWfE6siHOQkGYcHo7IVhEgxClOCqr1wOAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIZCXHK8siCMQkGZrfr6IZTEQ5KnOPlv2seDjCLzfDNfD0CFnLG7t2QQgwTXbLk6KlPEAk8muLyu2MdCWfE6siHOQkGYcHo7IVhEgxClOCqr1wO" type="audio/wav" />
      </audio>

      <Tooltip title={`${unreadCount} notificações não lidas`}>
        <IconButton
          color="inherit"
          onClick={handleClick}
          sx={{
            position: 'relative',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          <Badge 
            badgeContent={unreadCount} 
            color="error"
            max={99}
            sx={{
              '& .MuiBadge-badge': {
                animation: hasNewNotifications ? 'pulse 2s infinite' : 'none',
                '@keyframes pulse': {
                  '0%': {
                    transform: 'scale(1)',
                  },
                  '50%': {
                    transform: 'scale(1.2)',
                  },
                  '100%': {
                    transform: 'scale(1)',
                  },
                }
              }
            }}
          >
            {hasNewNotifications || unreadCount > 0 ? (
              <Grow in={true}>
                <NotificationsActiveIcon sx={{ 
                  color: hasNewNotifications ? '#a2122a' : 'inherit',
                  animation: hasNewNotifications ? 'shake 0.5s ease-in-out' : 'none',
                  '@keyframes shake': {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '25%': { transform: 'translateX(-2px)' },
                    '75%': { transform: 'translateX(2px)' }
                  }
                }} />
              </Grow>
            ) : (
              <NotificationsIcon />
            )}
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 420,
            maxHeight: 600,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            borderRadius: '16px',
            overflow: 'hidden'
          }
        }}
      >
        {/* Header */}
        <Box sx={{ 
          p: 2, 
          bgcolor: 'linear-gradient(135deg, #354a80 0%, #2a3a66 100%)',
          background: 'linear-gradient(135deg, #354a80 0%, #2a3a66 100%)',
          color: 'white'
        }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              🔔 Centro de Notificações
            </Typography>
            <Box>
              <Tooltip title="Marcar todas como lidas">
                <IconButton 
                  size="small" 
                  onClick={handleMarkAllRead}
                  sx={{ color: 'white', mr: 1 }}
                  disabled={unreadCount === 0}
                >
                  <MarkReadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Limpar todas">
                <IconButton 
                  size="small" 
                  onClick={handleClearAll}
                  sx={{ color: 'white' }}
                  disabled={notifications.length === 0}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          {/* Stats */}
          <Box display="flex" gap={2} mt={1}>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              {notifications.length} total
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              {unreadCount} não lidas
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              {notifications.filter(n => n.priority === 'critical').length} críticas
            </Typography>
          </Box>
        </Box>

        {/* Tabs */}
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: '1px solid #e0e0e0',
            minHeight: 48,
            '& .MuiTab-root': {
              minWidth: 60,
              fontSize: '0.8rem',
              fontWeight: 500
            }
          }}
        >
          <Tab label="Todas" />
          <Tab label={`Não lidas (${unreadCount})`} />
          <Tab label="Críticas" />
          <Tab label="Ponto" />
          <Tab label="Presença" />
        </Tabs>

        {/* Content */}
        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
          {getFilteredNotifications().length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {tabValue === 1 ? '✅ Todas as notificações foram lidas!' : 
                 tabValue === 2 ? '👍 Nenhuma notificação crítica.' :
                 '📭 Nenhuma notificação encontrada.'}
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {getFilteredNotifications().map((notification, index) => (
                <Fade in={true} timeout={300 * (index + 1)} key={notification.id}>
                  <ListItem
                    sx={{
                      cursor: 'pointer',
                      bgcolor: notification.read ? 'transparent' : 'rgba(53, 74, 128, 0.04)',
                      borderLeft: `4px solid ${getPriorityColor(notification.priority)}`,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.04)',
                        transform: 'translateX(4px)'
                      },
                      py: 1.5,
                      px: 2
                    }}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Box position="relative">
                        {getNotificationIcon(notification)}
                        {!notification.read && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: -2,
                              right: -2,
                              width: 8,
                              height: 8,
                              bgcolor: '#a2122a',
                              borderRadius: '50%',
                              border: '1px solid white'
                            }}
                          />
                        )}
                      </Box>
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Typography 
                            variant="subtitle2" 
                            sx={{ 
                              fontWeight: notification.read ? 400 : 600,
                              fontSize: '0.9rem',
                              color: notification.read ? 'text.secondary' : 'text.primary'
                            }}
                          >
                            {notification.title}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'text.secondary',
                              fontSize: '0.75rem',
                              ml: 1
                            }}
                          >
                            {formatNotificationTime(notification.timestamp)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: 'text.secondary',
                              fontSize: '0.8rem',
                              lineHeight: 1.3,
                              mt: 0.5
                            }}
                          >
                            {notification.message}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1} mt={1}>
                            <Chip
                              icon={getCategoryIcon(notification.category)}
                              label={notification.category.toUpperCase()}
                              size="small"
                              variant="outlined"
                              sx={{
                                height: 20,
                                fontSize: '0.7rem',
                                '& .MuiChip-label': {
                                  px: 1
                                }
                              }}
                            />
                            <Chip
                              label={notification.priority.toUpperCase()}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.7rem',
                                bgcolor: getPriorityColor(notification.priority),
                                color: 'white',
                                '& .MuiChip-label': {
                                  px: 1
                                }
                              }}
                            />
                            {notification.colaborador && (
                              <Chip
                                label={notification.colaborador}
                                size="small"
                                variant="outlined"
                                sx={{
                                  height: 20,
                                  fontSize: '0.7rem',
                                  '& .MuiChip-label': {
                                    px: 1
                                  }
                                }}
                              />
                            )}
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                </Fade>
              ))}
            </List>
          )}
        </Box>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Divider />
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Button
                size="small"
                startIcon={<SettingsIcon />}
                onClick={() => {
                  navigate('/configuracoes-infra');
                  handleClose();
                }}
                sx={{ fontSize: '0.8rem' }}
              >
                Configurar Notificações
              </Button>
            </Box>
          </>
        )}
      </Popover>
    </>
  );
};

export default NotificationCenter; 