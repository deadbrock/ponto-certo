import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const CalendarioPage: React.FC = () => {
  const [events, setEvents] = useState([
    {
      id: '1',
      title: 'Feriado Nacional - Independência',
      start: '2024-09-07',
      backgroundColor: '#f44336',
      borderColor: '#d32f2f'
    },
    {
      id: '2',
      title: 'Treinamento Segurança',
      start: '2024-09-15T09:00:00',
      end: '2024-09-15T17:00:00',
      backgroundColor: '#2196f3',
      borderColor: '#1976d2'
    },
    {
      id: '3',
      title: 'Reunião Diretoria',
      start: '2024-09-20T14:00:00',
      end: '2024-09-20T16:00:00',
      backgroundColor: '#ff9800',
      borderColor: '#f57c00'
    },
    {
      id: '4',
      title: 'Workshop React Native',
      start: '2024-09-25T08:00:00',
      end: '2024-09-25T18:00:00',
      backgroundColor: '#4caf50',
      borderColor: '#388e3c'
    }
  ]);

  const [openDialog, setOpenDialog] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    start: '',
    end: '',
    tipo: 'evento'
  });

  const handleDateClick = (arg: any) => {
    setNewEvent({
      ...newEvent,
      start: arg.dateStr,
      end: arg.dateStr
    });
    setOpenDialog(true);
  };

  const handleEventClick = (clickInfo: any) => {
    alert(`Evento: ${clickInfo.event.title}\nData: ${clickInfo.event.startStr}`);
  };

  const handleAddEvent = () => {
    if (newEvent.title && newEvent.start) {
      const event = {
        id: Date.now().toString(),
        title: newEvent.title,
        start: newEvent.start,
        end: newEvent.end || undefined,
        backgroundColor: newEvent.tipo === 'feriado' ? '#f44336' : 
                         newEvent.tipo === 'treinamento' ? '#2196f3' :
                         newEvent.tipo === 'reuniao' ? '#ff9800' : '#4caf50',
        borderColor: newEvent.tipo === 'feriado' ? '#d32f2f' : 
                     newEvent.tipo === 'treinamento' ? '#1976d2' :
                     newEvent.tipo === 'reuniao' ? '#f57c00' : '#388e3c'
      };

      setEvents([...events, event]);
      setOpenDialog(false);
      setNewEvent({ title: '', start: '', end: '', tipo: 'evento' });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
        color: 'white',
        p: 3,
        borderRadius: 2,
        boxShadow: '0 4px 20px rgba(25, 118, 210, 0.3)'
      }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            📅 Calendário Corporativo
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            Gerencie feriados, treinamentos, reuniões e eventos da empresa
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{
            bgcolor: 'rgba(255,255,255,0.2)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}
        >
          Novo Evento
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f4433620, #f4433610)', border: '1px solid #f4433650' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" fontWeight="bold" color="#f44336">1</Typography>
              <Typography variant="caption" color="text.secondary">Feriados</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #2196f320, #2196f310)', border: '1px solid #2196f350' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" fontWeight="bold" color="#2196f3">1</Typography>
              <Typography variant="caption" color="text.secondary">Treinamentos</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #ff980020, #ff980010)', border: '1px solid #ff980050' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" fontWeight="bold" color="#ff9800">1</Typography>
              <Typography variant="caption" color="text.secondary">Reuniões</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4caf5020, #4caf5010)', border: '1px solid #4caf5050' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" fontWeight="bold" color="#4caf50">1</Typography>
              <Typography variant="caption" color="text.secondary">Eventos</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          initialView="dayGridMonth"
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          events={events}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          height="600px"
          locale="pt-br"
          buttonText={{
            today: 'Hoje',
            month: 'Mês',
            week: 'Semana',
            day: 'Dia'
          }}
          eventDisplay="block"
        />
      </Paper>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
          color: 'white',
          fontWeight: 'bold'
        }}>
          ➕ Adicionar Novo Evento
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              fullWidth
              label="Título do Evento"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              required
            />
            <Grid container spacing={2}>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Evento</InputLabel>
                  <Select
                    value={newEvent.tipo}
                    label="Tipo de Evento"
                    onChange={(e) => setNewEvent({ ...newEvent, tipo: e.target.value })}
                  >
                    <MenuItem value="feriado">Feriado</MenuItem>
                    <MenuItem value="treinamento">Treinamento</MenuItem>
                    <MenuItem value="reuniao">Reunião</MenuItem>
                    <MenuItem value="evento">Evento</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Data/Hora Início"
                  value={newEvent.start}
                  onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
            </Grid>
            <TextField
              fullWidth
              type="datetime-local"
              label="Data/Hora Fim"
              value={newEvent.end}
              onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenDialog(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAddEvent} 
            variant="contained"
            disabled={!newEvent.title || !newEvent.start}
          >
            Adicionar Evento
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CalendarioPage; 