const db = require('./src/config/database');

async function criarTabelas() {
  try {
    console.log('🚀 Criando tabelas do módulo relatórios...');
    
    // 1. Criar tabela registros_ponto
    await db.query(`
      CREATE TABLE IF NOT EXISTS registros_ponto (
          id SERIAL PRIMARY KEY,
          id_colaborador INTEGER REFERENCES colaboradores(id) ON DELETE CASCADE,
          data_hora TIMESTAMP NOT NULL,
          origem VARCHAR(20) DEFAULT 'arquivo_txt' CHECK (origem IN ('arquivo_txt', 'manual', 'totem', 'biometrico')),
          status VARCHAR(20) DEFAULT 'importado' CHECK (status IN ('importado', 'pendente', 'validado', 'rejeitado')),
          observacoes TEXT,
          criado_em TIMESTAMP DEFAULT NOW(),
          atualizado_em TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela registros_ponto criada');
    
    // 2. Criar tabela arquivos_importados
    await db.query(`
      CREATE TABLE IF NOT EXISTS arquivos_importados (
          id SERIAL PRIMARY KEY,
          nome_arquivo VARCHAR(255) NOT NULL,
          caminho_arquivo VARCHAR(500),
          tamanho_arquivo BIGINT,
          tipo_arquivo VARCHAR(50) DEFAULT 'txt',
          id_usuario INTEGER,
          data_upload TIMESTAMP DEFAULT NOW(),
          total_registros INTEGER DEFAULT 0,
          registros_validos INTEGER DEFAULT 0,
          registros_invalidos INTEGER DEFAULT 0,
          status_processamento VARCHAR(30) DEFAULT 'processado' CHECK (status_processamento IN ('pendente', 'processando', 'processado', 'erro')),
          detalhes_erros TEXT,
          hash_arquivo VARCHAR(64),
          criado_em TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela arquivos_importados criada');
    
    // 3. Criar índices apenas se as colunas existirem
    try {
      await db.query('CREATE INDEX IF NOT EXISTS idx_registros_ponto_colaborador ON registros_ponto(id_colaborador)');
      await db.query('CREATE INDEX IF NOT EXISTS idx_registros_ponto_data_hora ON registros_ponto(data_hora)');
      await db.query('CREATE INDEX IF NOT EXISTS idx_registros_ponto_origem ON registros_ponto(origem)');
      await db.query('CREATE INDEX IF NOT EXISTS idx_registros_ponto_status ON registros_ponto(status)');
      await db.query('CREATE INDEX IF NOT EXISTS idx_arquivos_importados_data ON arquivos_importados(data_upload)');
      await db.query('CREATE INDEX IF NOT EXISTS idx_arquivos_importados_hash ON arquivos_importados(hash_arquivo)');
      console.log('✅ Índices criados');
    } catch (indexError) {
      console.log('⚠️ Alguns índices não puderam ser criados:', indexError.message);
    }
    
    // 4. Criar função de trigger
    await db.query(`
      CREATE OR REPLACE FUNCTION update_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.atualizado_em = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log('✅ Função update_timestamp criada');
    
    // 5. Criar trigger
    await db.query(`
      DROP TRIGGER IF EXISTS trigger_update_registros_ponto_timestamp ON registros_ponto;
      CREATE TRIGGER trigger_update_registros_ponto_timestamp
          BEFORE UPDATE ON registros_ponto
          FOR EACH ROW
          EXECUTE FUNCTION update_timestamp()
    `);
    console.log('✅ Trigger criado');
    
    console.log('🎉 Todas as tabelas do módulo relatórios foram criadas com sucesso!');
    
    // Verificar estrutura
    const result = await db.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('registros_ponto', 'arquivos_importados')
      ORDER BY table_name, ordinal_position
    `);
    
    console.log('\n📊 Estrutura das tabelas criadas:');
    let currentTable = '';
    result.rows.forEach(row => {
      if (row.table_name !== currentTable) {
        console.log(`\n🗂️  ${row.table_name}:`);
        currentTable = row.table_name;
      }
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error.message);
    process.exit(1);
  }
}

criarTabelas();