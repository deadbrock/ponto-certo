const db = require('../config/database');

/**
 * Script para aplicar schema completo do banco automaticamente
 * Executa na inicialização do servidor para garantir que todas as tabelas existem
 */

const criarTabelasEssenciais = async () => {
  try {
    console.log('🗄️ Verificando e criando schema do banco...');

    // 1. Criar tabela usuarios (se não existir)
    await db.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        senha_hash VARCHAR(255) NOT NULL,
        perfil VARCHAR(50) DEFAULT 'COLABORADOR' CHECK (perfil IN ('ADMINISTRADOR', 'RH', 'COLABORADOR', 'ADMIN')),
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela usuarios verificada');

    // 2. Criar tabela colaboradores (se não existir)
    await db.query(`
      CREATE TABLE IF NOT EXISTS colaboradores (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        cpf VARCHAR(11) UNIQUE,
        pis VARCHAR(11),
        matricula VARCHAR(20),
        email VARCHAR(255),
        telefone VARCHAR(20),
        cargo VARCHAR(100),
        departamento VARCHAR(100),
        senha VARCHAR(255),
        data_admissao DATE,
        ativo BOOLEAN DEFAULT true,
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela colaboradores verificada');

    // 3. Criar tabela contratos (se não existir)
    await db.query(`
      CREATE TABLE IF NOT EXISTS contratos (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        cliente VARCHAR(255) NOT NULL,
        localizacao VARCHAR(255),
        valor DECIMAL(15,2) DEFAULT 0,
        vigencia_inicio DATE,
        vigencia_fim DATE,
        status VARCHAR(50) DEFAULT 'Ativo',
        descricao TEXT,
        responsavel VARCHAR(255),
        numero_contrato VARCHAR(100),
        objeto TEXT,
        coordenadas_latitude DECIMAL(10,8),
        coordenadas_longitude DECIMAL(11,8),
        criado_por INTEGER,
        atualizado_por INTEGER,
        criado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela contratos verificada');

    // 4. Criar tabela registros_ponto (para o módulo relatórios)
    await db.query(`
      CREATE TABLE IF NOT EXISTS registros_ponto (
        id SERIAL PRIMARY KEY,
        colaborador_id INTEGER REFERENCES colaboradores(id) ON DELETE CASCADE,
        data_hora TIMESTAMP NOT NULL,
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        origem VARCHAR(20) DEFAULT 'totem' CHECK (origem IN ('arquivo_txt', 'manual', 'totem', 'biometrico')),
        status VARCHAR(20) DEFAULT 'registrado' CHECK (status IN ('importado', 'pendente', 'validado', 'rejeitado', 'registrado')),
        caminho_foto VARCHAR(500),
        tablet_id VARCHAR(100),
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela registros_ponto verificada');

    // 5. Criar tabela arquivos_importados (módulo relatórios)
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
        status_processamento VARCHAR(30) DEFAULT 'processado',
        detalhes_erros TEXT,
        hash_arquivo VARCHAR(64),
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela arquivos_importados verificada');

    // 6. Criar índices importantes
    await db.query('CREATE INDEX IF NOT EXISTS idx_registros_ponto_colaborador ON registros_ponto(colaborador_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_registros_ponto_data_hora ON registros_ponto(data_hora)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_colaboradores_cpf ON colaboradores(cpf)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_colaboradores_pis ON colaboradores(pis)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email)');
    console.log('✅ Índices verificados');

    // 7. Criar usuário admin padrão (se não existir)
    const adminExists = await db.query('SELECT id FROM usuarios WHERE email = $1', ['admin@fgservices.com']);
    
    if (adminExists.rows.length === 0) {
      await db.query(`
        INSERT INTO usuarios (nome, email, senha_hash, perfil) 
        VALUES ('Administrador FG', 'admin@fgservices.com', 'admin123', 'ADMINISTRADOR')
      `);
      console.log('✅ Usuário admin criado: admin@fgservices.com / admin123');
    }

    // 8. Criar colaboradores de exemplo (se não existirem)
    const colaboradoresExist = await db.query('SELECT COUNT(*) as count FROM colaboradores');
    
    if (parseInt(colaboradoresExist.rows[0].count) === 0) {
      await db.query(`
        INSERT INTO colaboradores (nome, cpf, pis, email, senha) VALUES 
        ('João Silva', '12345678901', '12345678901', 'joao@fgservices.com', '123456'),
        ('Maria Santos', '98765432109', '98765432109', 'maria@fgservices.com', '123456'),
        ('Pedro Oliveira', '11111111111', '11111111111', 'pedro@fgservices.com', '123456')
      `);
      console.log('✅ Colaboradores de exemplo criados');
    }

    // 9. Criar contratos de exemplo (se não existirem)
    const contratosExist = await db.query('SELECT COUNT(*) as count FROM contratos');
    
    if (parseInt(contratosExist.rows[0].count) === 0) {
      await db.query(`
        INSERT INTO contratos (nome, cliente, localizacao, valor, vigencia_inicio, vigencia_fim, status) VALUES 
        ('Contrato Segurança SP', 'Empresa A', 'São Paulo - SP', 50000.00, '2024-01-01', '2024-12-31', 'Ativo'),
        ('Contrato Limpeza RJ', 'Empresa B', 'Rio de Janeiro - RJ', 30000.00, '2024-06-01', '2025-05-31', 'Ativo'),
        ('Contrato Vigilância MG', 'Empresa C', 'Belo Horizonte - MG', 25000.00, '2024-03-01', '2024-08-31', 'Próximo do vencimento')
      `);
      console.log('✅ Contratos de exemplo criados');
    }

    console.log('🎉 Schema do banco aplicado com sucesso!');
    return true;

  } catch (error) {
    console.error('❌ Erro ao aplicar schema:', error.message);
    return false;
  }
};

module.exports = {
  criarTabelasEssenciais
};
