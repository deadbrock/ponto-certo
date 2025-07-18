// Configuração de cores do tema Ponto Certo FG
export const themeColors = {
  // Cores principais da empresa
  primary: {
    main: '#354a80',
    light: '#5c71b3',
    dark: '#2a3a66',
    gradient: 'linear-gradient(90deg, #354a80 0%, #2a3a66 100%)'
  },
  
  // Cores de ação/destaque
  action: {
    main: '#a2122a',
    light: '#c41e3a',
    dark: '#8a0f23',
    hover: '#8a0f23'
  },
  
  // Cores de status
  status: {
    success: '#4caf50',
    warning: '#ff9800',
    error: '#a2122a',
    info: '#354a80'
  },
  
  // Cores de fundo
  background: {
    header: 'linear-gradient(90deg, #354a80 0%, #2a3a66 100%)',
    sidebar: '#f8f9fa',
    content: '#ffffff',
    hover: 'rgba(53, 74, 128, 0.04)',
    logoContainer: '#ffffff'
  },
  
  // Especificações de layout
  layout: {
    logo: {
      container: {
        backgroundColor: '#ffffff',
        padding: '6px',
        borderRadius: '8px',
                 marginRight: '16px'
      },
      maxHeight: '40px'
    }
  },
  
  // Cores de texto
  text: {
    primary: '#2c3e50',
    secondary: '#6c757d',
    onPrimary: '#ffffff',
    onAction: '#ffffff'
  }
};

// Configurações específicas para Material-UI
export const muiThemeOverrides = {
  palette: {
    primary: {
      main: themeColors.primary.main,
      light: themeColors.primary.light,
      dark: themeColors.primary.dark,
    },
    secondary: {
      main: themeColors.action.main,
      light: themeColors.action.light,
      dark: themeColors.action.dark,
    },
    error: {
      main: themeColors.action.main,
    },
    success: {
      main: themeColors.status.success,
    },
    warning: {
      main: themeColors.status.warning,
    },
    info: {
      main: themeColors.status.info,
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: themeColors.background.header,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          '&.action-button': {
            backgroundColor: themeColors.action.main,
            color: themeColors.text.onAction,
            '&:hover': {
              backgroundColor: themeColors.action.hover,
            },
          },
        },
      },
    },
  },
};

export default themeColors; 