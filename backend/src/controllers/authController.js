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
        
        // Verificar se já existe
        const verificarQuery = 'SELECT * FROM usuarios WHERE email = $1';
        const verificarResult = await db.query(verificarQuery, ['admin@fgservices.com']);
        
        if (verificarResult.rows.length > 0) {
            console.log('✅ Usuário admin já existe!');
            const usuario = verificarResult.rows[0];
            
            // Verificar se conseguimos fazer login com a senha admin123
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
            } else {
                console.log('❌ Senha está incorreta, recriando usuário...');
                // Deletar e recriar com senha correta
                await db.query('DELETE FROM usuarios WHERE email = $1', ['admin@fgservices.com']);
            }
        }
        
        // Criar usuário admin com senha correta
        console.log('🔒 Gerando hash para senha admin123...');
        const senhaHash = await bcrypt.hash('admin123', 10);
        console.log('✅ Hash gerado:', senhaHash.substring(0, 20) + '...');
        
        const criarQuery = `
            INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, nome, email, perfil, ativo
        `;
        
        const criarResult = await db.query(criarQuery, [
            'Administrador',
            'admin@fgservices.com', 
            senhaHash,
            'administrador',
            true
        ]);
        
        console.log('✅ Usuário administrador criado com sucesso!');
        
        // Testar a senha imediatamente
        const testarSenha = await bcrypt.compare('admin123', senhaHash);
        console.log('🧪 Teste da senha recém-criada:', testarSenha);
        
        return res.status(201).json({
            success: true,
            message: 'Usuário administrador criado/atualizado com sucesso',
            usuario: criarResult.rows[0],
            senha_testada: testarSenha
        });
        
    } catch (error) {
        console.error('❌ Erro ao criar usuário admin:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};

module.exports = {
    register,
    login,
    loginAdmin,
    criarAdminEmergencia
}; 