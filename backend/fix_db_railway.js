const { Client } = require('pg');
const bcrypt = require('bcrypt');

// URL de conexão do Railway (substitua pela sua)
const DATABASE_URL = 'postgresql://postgres:acAshacscvQtOROcjEpuxaiXXUFyJDqC@tramway.proxy.rlwy.net:43129/railway';

async function corrigirBanco() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔌 Conectando ao PostgreSQL Railway...');
        await client.connect();
        console.log('✅ Conectado!');

        // 1. Verificar estrutura atual
        console.log('🔍 Verificando estrutura da tabela usuarios...');
        const estrutura = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'usuarios' 
            ORDER BY ordinal_position
        `);
        console.log('📋 Estrutura atual:', estrutura.rows);

        // 2. Recriar tabela usuarios
        console.log('🔧 Recriando tabela usuarios...');
        await client.query('DROP TABLE IF EXISTS usuarios CASCADE');
        
        await client.query(`
            CREATE TABLE usuarios (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                senha_hash VARCHAR(255) NOT NULL,
                perfil VARCHAR(20) NOT NULL,
                ativo BOOLEAN DEFAULT true,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabela usuarios criada!');

        // 3. Gerar hash correto para admin123
        console.log('🔒 Gerando hash para senha admin123...');
        const senhaHash = await bcrypt.hash('admin123', 10);
        console.log('✅ Hash gerado:', senhaHash.substring(0, 20) + '...');

        // 4. Inserir usuário administrador
        console.log('👤 Inserindo usuário administrador...');
        const resultado = await client.query(`
            INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING id, nome, email, perfil
        `, ['Administrador', 'admin@fgservices.com', senhaHash, 'administrador', true]);
        
        console.log('✅ Usuário criado:', resultado.rows[0]);

        // 5. Verificar login
        console.log('🧪 Testando senha...');
        const usuario = await client.query('SELECT * FROM usuarios WHERE email = $1', ['admin@fgservices.com']);
        const senhaValida = await bcrypt.compare('admin123', usuario.rows[0].senha_hash);
        console.log('🔍 Senha válida:', senhaValida);

        // 6. Criar/verificar tabela configuracoes
        console.log('⚙️ Verificando tabela configuracoes...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS configuracoes (
                id SERIAL PRIMARY KEY,
                chave VARCHAR(100) UNIQUE NOT NULL,
                valor TEXT NOT NULL,
                descricao TEXT
            )
        `);

        await client.query(`
            INSERT INTO configuracoes (chave, valor, descricao) VALUES 
            ('sistema_inicializado', 'true', 'Sistema inicializado'),
            ('versao_sistema', '2.0', 'Versão do sistema')
            ON CONFLICT (chave) DO NOTHING
        `);
        console.log('✅ Configurações inseridas!');

        console.log('\n🎉 BANCO CORRIGIDO COM SUCESSO!');
        console.log('📧 Email: admin@fgservices.com');
        console.log('🔑 Senha: admin123');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await client.end();
        console.log('🔌 Conexão fechada');
    }
}

corrigirBanco();