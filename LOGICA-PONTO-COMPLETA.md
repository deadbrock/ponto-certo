# 🔄 Lógica Completa do Sistema de Ponto Digital

## 📋 Visão Geral

O sistema de ponto digital foi desenvolvido para atender **dois tipos de colaboradores**:

1. **👥 Colaboradores Diurnos**: Trabalham durante o dia com pausa para almoço
2. **🌙 Colaboradores Noturnos**: Trabalham durante a madrugada com pausa para descanso

## 🎯 Cenários de Uso

### 📅 **Turno Diurno** (Padrão)
**Horário típico**: 6h às 18h
**Sequência de registros**:
1. 🟢 **Entrada** (6h-10h) - Chegada no cliente
2. 🟠 **Parada Almoço** (11h-14h) - Saída para almoço 
3. 🔵 **Volta Almoço** (11h30-15h) - Retorno do almoço
4. 🔴 **Saída** (14h-23h) - Fim do expediente

### 🌙 **Turno Noturno** (22h às 6h)
**Horário típico**: 22h às 6h
**Sequência de registros**:
1. 🟢 **Entrada** (20h-23h30) - Chegada no cliente
2. 🟣 **Parada Descanso** (1h-5h) - Pausa para descanso
3. 🔵 **Volta Descanso** (1h30-5h30) - Retorno do descanso  
4. 🔴 **Saída** (5h-8h) - Fim do expediente

## 🧠 Lógica Inteligente

### 🔍 **Detecção Automática de Turno**

O sistema detecta automaticamente o turno do colaborador baseado em:

1. **Último registro de entrada**: Hora da última entrada registrada
2. **Horário atual**: Se não há registros anteriores
3. **Regra de detecção**:
   - ⏰ Entrada entre 20h-8h = **Turno Noturno**
   - ⏰ Entrada entre 8h-20h = **Turno Diurno**

```javascript
// Exemplo de detecção
const turno = await RegistroPonto.detectarTurnoColaborador(colaborador_id);
// Retorna: 'diurno' ou 'noturno'
```

### ⚡ **Validações Inteligentes**

#### ✅ **1. Validação de Horários**
- **Turno Diurno**: Horários lineares (6h → 23h)
- **Turno Noturno**: Horários que cruzam meia-noite (20h → 8h)

#### ✅ **2. Validação de Sequência**
```javascript
// Turno Diurno
entrada → [parada_almoco, saida]
parada_almoco → [volta_almoco]
volta_almoco → [saida]
saida → [] // Fim do dia

// Turno Noturno  
entrada → [parada_descanso, saida]
parada_descanso → [volta_descanso]
volta_descanso → [saida]
saida → [] // Fim do dia
```

#### ✅ **3. Validação de Intervalos**
- **Almoço (Diurno)**: 30min - 2h
- **Descanso (Noturno)**: 20min - 1h
- **Entre registros**: Mínimo 2 minutos

### 🕐 **Cálculo de Horas Trabalhadas**

#### 📊 **Turno Diurno**
```
Entrada: 08:00
Parada Almoço: 12:00
Volta Almoço: 13:00  
Saída: 17:00

Horas Trabalhadas = (17:00 - 08:00) - (13:00 - 12:00) = 8h
```

#### 🌙 **Turno Noturno (Cruza Meia-noite)**
```
Entrada: 22:00 (Dia 1)
Parada Descanso: 02:00 (Dia 2)
Volta Descanso: 02:30 (Dia 2)
Saída: 06:00 (Dia 2)

Horas Trabalhadas = (06:00+24h - 22:00) - (02:30 - 02:00) = 7h30min
```

## 🔧 **Configuração por Turno**

### ⚙️ **Estrutura de Configuração**

```javascript
configuracoesTurnos: {
    'diurno': {
        tipos_registro: ['entrada', 'parada_almoco', 'volta_almoco', 'saida'],
        horarios: {
            'entrada': { inicio: 6, fim: 10 },
            'parada_almoco': { inicio: 11, fim: 14 },
            'volta_almoco': { inicio: 11.5, fim: 15 },
            'saida': { inicio: 14, fim: 23 }
        },
        sequencias: { /* ... */ },
        logica_pausa: {
            tipo_parada: 'parada_almoco',
            tipo_volta: 'volta_almoco',
            intervalo_min: 30,
            intervalo_max: 120,
            horario_sugestao: { inicio: 11, fim: 14 }
        }
    },
    'noturno': {
        tipos_registro: ['entrada', 'parada_descanso', 'volta_descanso', 'saida'],
        horarios: {
            'entrada': { inicio: 20, fim: 23.5 },
            'parada_descanso': { inicio: 1, fim: 5 },
            'volta_descanso': { inicio: 1.5, fim: 5.5 },
            'saida': { inicio: 5, fim: 8 }
        },
        sequencias: { /* ... */ },
        logica_pausa: {
            tipo_parada: 'parada_descanso',
            tipo_volta: 'volta_descanso',
            intervalo_min: 20,
            intervalo_max: 60,
            horario_sugestao: { inicio: 1, fim: 4 }
        }
    }
}
```

## 🚀 **Novos Endpoints da API**

### 📡 **GET /api/ponto/turno/:colaborador_id**
Obter informações completas do turno do colaborador.

**Resposta:**
```json
{
    "success": true,
    "colaborador_nome": "João Silva",
    "turno": "noturno",
    "tipos_registro": ["entrada", "parada_descanso", "volta_descanso", "saida"],
    "horarios": {
        "entrada": { "inicio": 20, "fim": 23.5 },
        "parada_descanso": { "inicio": 1, "fim": 5 },
        "volta_descanso": { "inicio": 1.5, "fim": 5.5 },
        "saida": { "inicio": 5, "fim": 8 }
    },
    "logica_pausa": {
        "tipo_parada": "parada_descanso",
        "tipo_volta": "volta_descanso",
        "intervalo_min": 20,
        "intervalo_max": 60
    }
}
```

### 📡 **GET /api/ponto/proximo-tipo/:colaborador_id** (Atualizado)
Determinar próximo tipo de registro baseado no turno.

**Resposta:**
```json
{
    "success": true,
    "colaborador_nome": "Maria Santos",
    "turno": "diurno",
    "proximo_tipo": "parada_almoco",
    "proximo_tipo_nome": "Parada para Almoço",
    "erro": null
}
```

### 📡 **GET /api/ponto/estatisticas/:colaborador_id** (Atualizado)
Estatísticas com informações de turno.

**Resposta:**
```json
{
    "success": true,
    "colaborador_nome": "Pedro Oliveira",
    "data": "2024-01-15",
    "estatisticas": {
        "turno": "noturno",
        "registros": 4,
        "entrada": "2024-01-15T22:00:00.000Z",
        "pausaInicio": "2024-01-16T02:00:00.000Z",
        "pausaFim": "2024-01-16T02:30:00.000Z",
        "saida": "2024-01-16T06:00:00.000Z",
        "horasTrabalhadas": 7.5,
        "tempoPausa": 30,
        "status": "completo"
    }
}
```

## 📊 **Status do Dia por Turno**

### 🌅 **Turno Diurno**
- 🔘 `não_iniciado` - Nenhum registro
- 🟢 `trabalhando` - Apenas entrada
- 🟠 `almoco` - Em pausa para almoço
- 🔵 `pos_almoco` - Voltou do almoço
- ✅ `completo` - Todos os registros feitos

### 🌙 **Turno Noturno**
- 🔘 `não_iniciado` - Nenhum registro
- 🟢 `trabalhando` - Apenas entrada
- 🟣 `descanso` - Em pausa para descanso
- 🔵 `pos_descanso` - Voltou do descanso
- ✅ `completo` - Todos os registros feitos

## 🔍 **Tratamento de Registros Cross-Date**

### 🌙 **Problema do Turno Noturno**
Registros do turno noturno podem estar em **dois dias diferentes**:
- **Entrada**: 22h do Dia 1
- **Saída**: 6h do Dia 2

### ✅ **Solução Implementada**
```javascript
async getRegistrosDoDia(colaborador_id, data = null) {
    const turno = await this.detectarTurnoColaborador(colaborador_id);
    
    if (turno === 'noturno' && horaAtual >= 0 && horaAtual < 12) {
        // Buscar registros de ONTEM e HOJE para turno noturno
        // Considera entrada a partir das 20h do dia anterior
    } else {
        // Busca normal para turno diurno
    }
}
```

## 🎮 **Exemplos de Uso**

### 📱 **No App Mobile**

#### 1. **Detectar Turno Automático**
```javascript
// GET /api/ponto/turno/123
const infoTurno = await fetch('/api/ponto/turno/123');
// Configurar UI baseado no turno retornado
```

#### 2. **Verificar Próximo Registro**
```javascript
// GET /api/ponto/proximo-tipo/123  
const proximo = await fetch('/api/ponto/proximo-tipo/123');
// Mostrar botão: "Registrar Parada para Descanso"
```

#### 3. **Registrar Ponto**
```javascript
// POST /api/ponto/registrar-facial
const registro = await fetch('/api/ponto/registrar-facial', {
    body: JSON.stringify({
        colaborador_id: 123,
        latitude: -7.85,
        longitude: -34.91
    })
});
// Sistema determina automaticamente o tipo correto
```

### 💻 **No Painel Web**

#### 1. **Visualizar Estatísticas**
```javascript
// GET /api/ponto/estatisticas/123
const stats = await fetch('/api/ponto/estatisticas/123');
// Mostrar: "Turno Noturno - 7h30 trabalhadas"
```

#### 2. **Histórico Cross-Date**
```javascript
// GET /api/ponto/dia-completo/123?data=2024-01-15
const historico = await fetch('/api/ponto/dia-completo/123?data=2024-01-15');
// Retorna registros do turno noturno que começou no dia 15
```

## ✅ **Vantagens da Nova Lógica**

### 🎯 **Para Colaboradores**
- ✅ **Automático**: Sistema detecta turno automaticamente
- ✅ **Inteligente**: Sugere próximo registro correto
- ✅ **Flexível**: Suporta horários noturnos complexos
- ✅ **Validado**: Impede registros incorretos

### 📊 **Para Gestores**  
- ✅ **Precisão**: Cálculo correto de horas cross-date
- ✅ **Relatórios**: Separação por turno de trabalho
- ✅ **Compliance**: Validações de intervalos obrigatórios
- ✅ **Auditoria**: Rastreamento completo de registros

### 🔧 **Para Desenvolvedores**
- ✅ **Configurável**: Fácil ajuste de horários por turno
- ✅ **Extensível**: Novos turnos podem ser adicionados
- ✅ **Testável**: Endpoint de simulação para testes
- ✅ **Monitorado**: Logs detalhados de todas as operações

## 🚀 **Próximos Passos**

### 📋 **Para Implementação**
1. ✅ **Backend atualizado** com lógica de turnos
2. ✅ **Endpoints criados** para novos recursos
3. 🔄 **Frontend** precisa usar novos endpoints
4. 🔄 **Mobile App** precisa detectar turno automático
5. 🔄 **Testes** em ambiente de produção

### 🎯 **Melhorias Futuras**
- 📅 **Configuração por colaborador**: Definir turno específico
- 🕐 **Horários customizáveis**: Ajustar horários por empresa
- 🔔 **Notificações**: Alertas de horário de pausa
- 📊 **Dashboard**: Métricas por turno de trabalho

---

## 🎉 **Conclusão**

O sistema agora suporta **completamente** os dois cenários solicitados:

✅ **Colaboradores Diurnos**: Entrada → Almoço → Volta → Saída  
✅ **Colaboradores Noturnos**: Entrada(22h) → Descanso → Volta → Saída(6h)

A lógica é **100% automática**, **inteligente** e **robusta** para todos os cenários de uso! 