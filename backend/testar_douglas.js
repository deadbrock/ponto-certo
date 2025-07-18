// Teste rápido para Douglas
const RegistroPonto = require('./src/models/registroPontoModel');

async function testarDouglas() {
    console.log('🧪 TESTE - Verificando registro para Douglas');
    console.log('===========================================');
    
    try {
        // Simular ID do Douglas (assumindo que é um ID existente)
        const colaborador_id = 1; // Ajustar conforme necessário
        
        console.log('📅 Horário atual:', new Date().toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'}));
        console.log('🕐 Hora:', new Date().getHours(), 'Minutos:', new Date().getMinutes());
        console.log('');
        
        // 1. Detectar turno
        console.log('🔍 1. Detectando turno...');
        const turno = await RegistroPonto.detectarTurnoColaborador(colaborador_id);
        console.log('   Turno detectado:', turno);
        
        // 2. Verificar último registro
        console.log('\n🔍 2. Verificando último registro...');
        const ultimoRegistro = await RegistroPonto.getUltimoRegistro(colaborador_id);
        if (ultimoRegistro) {
            console.log('   Último registro:', ultimoRegistro.tipo_registro, 'às', ultimoRegistro.data_hora);
        } else {
            console.log('   ✅ Nenhum registro hoje - pode fazer entrada');
        }
        
        // 3. Tentar determinar próximo tipo (modo normal)
        console.log('\n🧪 3. Testando modo normal...');
        try {
            const proximoTipo = await RegistroPonto.determinarProximoTipo(colaborador_id);
            console.log('   ✅ SUCESSO! Próximo tipo:', proximoTipo);
        } catch (error) {
            console.log('   ❌ Falhou:', error.message);
            
            // 4. Tentar modo de emergência
            console.log('\n🆘 4. Testando modo de emergência...');
            try {
                const tipoEmergencia = await RegistroPonto.determinarProximoTipoEmergencia(colaborador_id);
                console.log('   ✅ EMERGÊNCIA OK! Tipo:', tipoEmergencia);
            } catch (emergenciaError) {
                console.log('   ❌ Emergência falhou:', emergenciaError.message);
            }
        }
        
        // 5. Verificar informações de turno
        console.log('\n📋 5. Informações do turno...');
        const infoTurno = await RegistroPonto.obterInfoTurno(colaborador_id);
        console.log('   Tipos de registro:', infoTurno.tipos_registro);
        console.log('   Horários entrada:', infoTurno.horarios.entrada);
        console.log('   Horários saída:', infoTurno.horarios.saida);
        
        console.log('\n🎉 TESTE CONCLUÍDO!');
        
    } catch (error) {
        console.error('❌ ERRO NO TESTE:', error.message);
    } finally {
        process.exit(0);
    }
}

testarDouglas(); 