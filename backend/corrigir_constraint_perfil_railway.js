const db = require('./src/config/database');

async function corrigirConstraintPerfilRailway() {
  try {
    console.log('🔧 Iniciando correção da constraint de perfil no Railway...');

    // 1. Verificar constraint atual
    console.log('📋 Verificando constraint atual...');
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

    // 3. Verificar usuários existentes e seus perfis
    console.log('👥 Verificando usuários existentes...');
    const usuariosExistentes = await db.query('SELECT id, nome, email, perfil FROM usuarios');
    console.log('👥 Usuários encontrados:', usuariosExistentes.rows);

    // 4. Padronizar perfis existentes para maiúsculo
    if (usuariosExistentes.rows.length > 0) {
      console.log('🔄 Padronizando perfis para maiúsculo...');
      await db.query(`
        UPDATE usuarios 
        SET perfil = UPPER(perfil) 
        WHERE perfil IN ('administrador', 'rh', 'colaborador', 'gestor')
      `);
      console.log('✅ Perfis padronizados');
    }

    // 5. Criar nova constraint com valores corretos
    console.log('➕ Criando nova constraint...');
    const novaConstraint = `
      ALTER TABLE usuarios 
      ADD CONSTRAINT usuarios_perfil_check 
      CHECK (perfil IN ('ADMINISTRADOR', 'RH', 'COLABORADOR', 'GESTOR'))
    `;
    
    await db.query(novaConstraint);
    console.log('✅ Nova constraint criada com valores: ADMINISTRADOR, RH, COLABORADOR, GESTOR');

    // 6. Verificar constraint final
    const constraintFinal = await db.query(verificarConstraint);
    console.log('📋 Constraint final:', constraintFinal.rows);

    // 7. Verificar usuários após correção
    const usuariosFinal = await db.query('SELECT id, nome, email, perfil FROM usuarios');
    console.log('👥 Usuários após correção:', usuariosFinal.rows);

    // 8. Testar inserção de teste
    console.log('🧪 Testando inserção com novo perfil...');
    try {
      await db.query(`
        INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo) 
        VALUES ('Teste RH', 'teste@fgservices.com', 'teste123', 'RH', true)
      `);
      console.log('✅ Teste de inserção bem-sucedido');
      
      // Remover usuário de teste
      await db.query("DELETE FROM usuarios WHERE email = 'teste@fgservices.com'");
      console.log('🗑️ Usuário de teste removido');
      
    } catch (testError) {
      console.error('❌ Erro no teste de inserção:', testError.message);
    }

    console.log('🎉 Correção da constraint concluída com sucesso!');
    return true;

  } catch (error) {
    console.error('❌ Erro ao corrigir constraint:', error);
    return false;
  } finally {
    // Fechar conexão se necessário
    if (db.end) {
      await db.end();
    }
    process.exit(0);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  corrigirConstraintPerfilRailway().then((sucesso) => {
    console.log(sucesso ? '✅ Script executado com sucesso' : '❌ Script falhou');
  });
}

module.exports = { corrigirConstraintPerfilRailway };
