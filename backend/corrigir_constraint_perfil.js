const db = require('./src/config/database');

async function corrigirConstraintPerfil() {
  try {
    console.log('🔧 Iniciando correção da constraint de perfil...');

    // 1. Verificar constraint atual
    const verificarConstraint = `
      SELECT conname, consrc 
      FROM pg_constraint 
      WHERE conname = 'usuarios_perfil_check'
    `;
    
    const constraintResult = await db.query(verificarConstraint);
    console.log('📋 Constraint atual:', constraintResult.rows);

    // 2. Remover constraint existente se houver
    if (constraintResult.rows.length > 0) {
      console.log('🗑️ Removendo constraint antiga...');
      await db.query('ALTER TABLE usuarios DROP CONSTRAINT usuarios_perfil_check');
      console.log('✅ Constraint antiga removida');
    }

    // 3. Criar nova constraint com valores corretos
    console.log('➕ Criando nova constraint...');
    const novaConstraint = `
      ALTER TABLE usuarios 
      ADD CONSTRAINT usuarios_perfil_check 
      CHECK (perfil IN ('ADMINISTRADOR', 'RH', 'COLABORADOR', 'GESTOR', 'administrador', 'rh', 'colaborador', 'gestor'))
    `;
    
    await db.query(novaConstraint);
    console.log('✅ Nova constraint criada com valores: ADMINISTRADOR, RH, COLABORADOR, GESTOR (maiúsculo e minúsculo)');

    // 4. Verificar usuários existentes
    const usuariosExistentes = await db.query('SELECT id, nome, email, perfil FROM usuarios');
    console.log('👥 Usuários existentes:', usuariosExistentes.rows);

    // 5. Corrigir perfis existentes para maiúsculo
    if (usuariosExistentes.rows.length > 0) {
      console.log('🔄 Padronizando perfis para maiúsculo...');
      await db.query(`
        UPDATE usuarios 
        SET perfil = UPPER(perfil) 
        WHERE perfil IN ('administrador', 'rh', 'colaborador', 'gestor')
      `);
      console.log('✅ Perfis padronizados');
    }

    console.log('🎉 Correção da constraint concluída com sucesso!');
    return true;

  } catch (error) {
    console.error('❌ Erro ao corrigir constraint:', error);
    return false;
  } finally {
    // Não fechar a conexão aqui para permitir outros usos
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  corrigirConstraintPerfil().then((sucesso) => {
    process.exit(sucesso ? 0 : 1);
  });
}

module.exports = { corrigirConstraintPerfil };
