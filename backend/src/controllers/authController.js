const Colaborador = require('../models/colaboradorModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../config/database');

const register = async (req, res) => {
    const { nome, cpf, senha } = req.body;
    if (!nome || !cpf || !senha) {
        return res.status(400).json({ error: 'Nome, CPF e senha são obrigatórios.' });
    }

    try {
        const existingColaborador = await Colaborador.findByCpf(cpf);
        if (existingColaborador) {
            return res.status(409).json({ error: 'CPF já cadastrado.' });
        }

        const novoColaborador = await Colaborador.create(nome, cpf, senha);
        res.status(201).json(novoColaborador);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao registrar colaborador.', details: error.message });
    }
};

const login = async (req, res) => {
    const { cpf, senha } = req.body;
    if (!cpf || !senha) {
        return res.status(400).json({ error: 'CPF e senha são obrigatórios.' });
    }

    try {
        const colaborador = await Colaborador.findByCpf(cpf);
        if (!colaborador) {
            return res.status(404).json({ error: 'Colaborador não encontrado.' });
        }

        const senhaValida = await Colaborador.comparePassword(senha, colaborador.senha);
        if (!senhaValida) {
            return res.status(401).json({ error: 'Senha inválida.' });
        }

        // Gera o token JWT
        const token = jwt.sign(
            { id: colaborador.id, cpf: colaborador.cpf },
            process.env.JWT_SECRET || 'ponto-digital-jwt-secret-key-2024',
            { expiresIn: '8h' }
        );

        // Não retornar a senha no objeto final
        delete colaborador.senha;

        res.status(200).json({ colaborador, token });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao realizar login.', details: error.message });
    }
};

// Login para usuários administrativos (painel web)
const loginAdmin = async (req, res) => {
    console.log('🔐 LOGIN ADMIN: Tentativa de login recebida');
    console.log('📋 Headers:', req.headers);
    console.log('📦 Body:', req.body);
    
    const { email, senha } = req.body;
    
    if (!email || !senha) {
        console.log('❌ LOGIN ADMIN: Email ou senha não fornecidos');
        return res.status(400).json({ 
            success: false,
            error: 'Email e senha são obrigatórios.' 
        });
    }
    
    console.log(`🔍 LOGIN ADMIN: Tentando login para email: ${email}`);

    try {
        // Buscar usuário na tabela usuarios
        const query = 'SELECT * FROM usuarios WHERE email = $1 AND ativo = true';
        const result = await db.query(query, [email]);
        
        console.log(`📊 Usuários encontrados: ${result.rows.length}`);
        
        if (result.rows.length === 0) {
            console.log('❌ LOGIN ADMIN: Usuário não encontrado');
            return res.status(401).json({ 
                success: false,
                error: 'Credenciais inválidas.' 
            });
        }

        const usuario = result.rows[0];
        console.log('👤 Usuário encontrado:', {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            perfil: usuario.perfil,
            ativo: usuario.ativo,
            senha_hash_presente: !!usuario.senha_hash
        });

        console.log(`🔐 Comparando senha '${senha}' com hash...`);
        
        // Verificar senha
        const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
        console.log(`🔍 Resultado da comparação: ${senhaValida}`);
        
        if (!senhaValida) {
            console.log('❌ LOGIN ADMIN: Senha inválida');
            return res.status(401).json({ 
                success: false,
                error: 'Credenciais inválidas.' 
            });
        }

        // Gerar token JWT
        const token = jwt.sign(
            { 
                id: usuario.id, 
                email: usuario.email, 
                perfil: usuario.perfil 
            },
            process.env.JWT_SECRET || 'ponto-digital-jwt-secret-key-2024',
            { expiresIn: '8h' }
        );

        // Retornar dados do usuário (sem a senha)
        const { senha_hash, ...usuarioSemSenha } = usuario;

        console.log('✅ LOGIN ADMIN: Login bem-sucedido!');
        console.log('📋 Usuário:', usuarioSemSenha);

        return res.status(200).json({ 
            success: true,
            token: token,
            usuario: usuarioSemSenha,
            message: 'Login realizado com sucesso'
        });

    } catch (error) {
        console.error('❌ LOGIN ADMIN: Erro no login:', error);
        return res.status(500).json({ 
            success: false,
            error: 'Erro interno do servidor.',
            details: error.message
        });
    }
};

// Endpoint de emergência para criar usuário admin
const criarAdminEmergencia = async (req, res) => {
    try {
        console.log('🚨 Criando/verificando usuário administrador de emergência...');
        
        // 1. Verificar e corrigir constraint de perfil primeiro
        try {
            console.log('🔧 Verificando constraint de perfil...');
            
            // Remover constraint existente se houver
            const constraintQuery = `
                SELECT conname FROM pg_constraint 
                WHERE conname = 'usuarios_perfil_check'
            `;
            const constraintResult = await db.query(constraintQuery);
            
            if (constraintResult.rows.length > 0) {
                console.log('🗑️ Removendo constraint antiga...');
                await db.query('ALTER TABLE usuarios DROP CONSTRAINT usuarios_perfil_check');
            }
            
            // Criar nova constraint com valores corretos
            console.log('➕ Criando constraint corrigida...');
            await db.query(`
                ALTER TABLE usuarios 
                ADD CONSTRAINT usuarios_perfil_check 
                CHECK (perfil IN ('ADMINISTRADOR', 'RH', 'COLABORADOR', 'GESTOR', 'administrador', 'rh', 'colaborador', 'gestor'))
            `);
            console.log('✅ Constraint de perfil corrigida');
            
        } catch (constraintError) {
            console.log('⚠️ Aviso constraint:', constraintError.message);
        }
        
        // 2. Verificar se a tabela usuarios existe e tem a estrutura correta
        try {
            const estruturaQuery = `
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'usuarios' 
                ORDER BY ordinal_position
            `;
            const estruturaResult = await db.query(estruturaQuery);
            console.log('📋 Estrutura da tabela usuarios:', estruturaResult.rows);
            
            // Verificar se tem o campo senha_hash
            const temSenhaHash = estruturaResult.rows.some(col => col.column_name === 'senha_hash');
            const temSenha = estruturaResult.rows.some(col => col.column_name === 'senha');
            
            console.log(`🔍 Campo senha_hash: ${temSenhaHash}, Campo senha: ${temSenha}`);
            
            // Se não tem senha_hash, corrigir estrutura
            if (!temSenhaHash && temSenha) {
                console.log('🔧 Corrigindo estrutura da tabela...');
                await db.query('ALTER TABLE usuarios RENAME COLUMN senha TO senha_hash');
                console.log('✅ Campo senha renomeado para senha_hash');
            }
            
        } catch (estructError) {
            console.error('❌ Erro verificando estrutura:', estructError.message);
        }
        
        // 3. Verificar se já existe usuário admin
        const verificarQuery = 'SELECT * FROM usuarios WHERE email = $1';
        const verificarResult = await db.query(verificarQuery, ['admin@fgservices.com']);
        
        if (verificarResult.rows.length > 0) {
            console.log('✅ Usuário admin já existe!');
            const usuario = verificarResult.rows[0];
            
            // Verificar se tem senha_hash válida
            if (usuario.senha_hash && usuario.senha_hash.length > 10) {
                try {
                    const senhaValida = await bcrypt.compare('admin123', usuario.senha_hash);
                    
                    if (senhaValida) {
                        console.log('✅ Senha está correta!');
                        return res.status(200).json({
                            success: true,
                            message: 'Usuário administrador já existe e senha está correta',
                            usuario: {
                                id: usuario.id,
                                nome: usuario.nome,
                                email: usuario.email,
                                perfil: usuario.perfil,
                                senha_ok: true
                            }
                        });
                    }
                } catch (bcryptError) {
                    console.log('❌ Erro no bcrypt ou hash inválido:', bcryptError.message);
                }
            }
            
            console.log('❌ Senha incorreta ou hash inválido, recriando usuário...');
            await db.query('DELETE FROM usuarios WHERE email = $1', ['admin@fgservices.com']);
        }
        
        // 3. Criar usuário admin com senha correta
        console.log('🔒 Gerando hash para senha admin123...');
        const senhaHash = await bcrypt.hash('admin123', 10);
        console.log('✅ Hash gerado:', senhaHash.substring(0, 20) + '...');
        
        const criarQuery = `
            INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, nome, email, perfil, ativo
        `;
        
        const criarResult = await db.query(criarQuery, [
            'Administrador FG',
            'admin@fgservices.com', 
            senhaHash,
            'ADMINISTRADOR',
            true
        ]);
        
        console.log('✅ Usuário administrador criado com sucesso!');
        
        // 4. Testar a senha imediatamente
        const testarSenha = await bcrypt.compare('admin123', senhaHash);
        console.log('🧪 Teste da senha recém-criada:', testarSenha);
        
        return res.status(201).json({
            success: true,
            message: 'Usuário administrador criado/atualizado com sucesso',
            usuario: criarResult.rows[0],
            senha_testada: testarSenha,
            hash_gerado: senhaHash.substring(0, 20) + '...'
        });
        
    } catch (error) {
        console.error('❌ Erro ao criar usuário admin:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message,
            stack: error.stack
        });
    }
};

// Endpoint temporário para corrigir constraint
const corrigirConstraintPerfil = async (req, res) => {
    try {
        console.log('🔧 Executando correção da constraint de perfil...');
        
        // 1. Verificar constraint atual
        const verificarConstraint = `
            SELECT conname 
            FROM pg_constraint 
            WHERE conname = 'usuarios_perfil_check'
        `;
        const constraintResult = await db.query(verificarConstraint);
        
        // 2. Remover constraint existente
        if (constraintResult.rows.length > 0) {
            await db.query('ALTER TABLE usuarios DROP CONSTRAINT usuarios_perfil_check');
        }
        
        // 3. Padronizar perfis existentes
        await db.query(`
            UPDATE usuarios 
            SET perfil = UPPER(perfil) 
            WHERE perfil IN ('administrador', 'rh', 'colaborador', 'gestor')
        `);
        
        // 4. Criar nova constraint
        await db.query(`
            ALTER TABLE usuarios 
            ADD CONSTRAINT usuarios_perfil_check 
            CHECK (perfil IN ('ADMINISTRADOR', 'RH', 'COLABORADOR', 'GESTOR'))
        `);
        
        // 5. Verificar resultado
        const constraintFinal = await db.query(verificarConstraint);
        const usuariosFinal = await db.query('SELECT id, nome, email, perfil FROM usuarios');
        
        return res.status(200).json({
            success: true,
            message: 'Constraint de perfil corrigida com sucesso',
            constraint_existia_antes: constraintResult.rows.length > 0,
            constraint_existe_agora: constraintFinal.rows.length > 0,
            usuarios: usuariosFinal.rows
        });
        
    } catch (error) {
        console.error('❌ Erro ao corrigir constraint:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao corrigir constraint',
            details: error.message
        });
    }
};

// Endpoint de teste para validar constraint
const testarConstraint = async (req, res) => {
    try {
        console.log('🧪 Testando constraint de perfil...');
        
        // Teste 1: Tentar criar usuário com perfil válido (deve funcionar)
        const bcrypt = require('bcrypt');
        const senhaHashTeste = await bcrypt.hash('teste123', 10);
        
        try {
            await db.query(`
                INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo) 
                VALUES ('Teste RH Válido', 'teste.rh.valido@test.com', $1, 'RH', true)
            `, [senhaHashTeste]);
            console.log('✅ Teste 1 passou: Perfil RH aceito');
        } catch (err1) {
            console.log('❌ Teste 1 falhou:', err1.message);
        }
        
        // Teste 2: Tentar criar usuário com perfil inválido (deve falhar)
        let teste2Falhou = false;
        try {
            await db.query(`
                INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo) 
                VALUES ('Teste Inválido', 'teste.invalido@test.com', $1, 'PERFIL_INVALIDO', true)
            `, [senhaHashTeste]);
            console.log('❌ Teste 2 falhou: Perfil inválido foi aceito (não deveria)');
        } catch (err2) {
            console.log('✅ Teste 2 passou: Perfil inválido rejeitado corretamente');
            teste2Falhou = true;
        }
        
        // Limpar dados de teste
        await db.query("DELETE FROM usuarios WHERE email LIKE '%@test.com'");
        
        // Verificar usuários existentes
        const usuarios = await db.query('SELECT id, nome, email, perfil FROM usuarios');
        
        return res.status(200).json({
            success: true,
            message: 'Teste de constraint concluído',
            teste_perfil_valido: 'RH aceito',
            teste_perfil_invalido: teste2Falhou ? 'PERFIL_INVALIDO rejeitado (correto)' : 'PERFIL_INVALIDO aceito (erro)',
            constraint_funcionando: teste2Falhou,
            usuarios_atuais: usuarios.rows
        });
        
    } catch (error) {
        console.error('❌ Erro no teste:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro no teste de constraint',
            details: error.message
        });
    }
};

module.exports = {
    register,
    login,
    loginAdmin,
    criarAdminEmergencia,
    corrigirConstraintPerfil,
    testarConstraint
}; 