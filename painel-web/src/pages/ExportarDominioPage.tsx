import React, { useState } from 'react';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';

interface RegistroDominio {
  codigoEmpregado: number;
  codigoRubrica: number;
  valor: number;
}

const ExportarDominioPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [competencia, setCompetencia] = useState('');
  const [mes, setMes] = useState('');
  const [ano, setAno] = useState('');
  const [tipoFolha, setTipoFolha] = useState('11');
  const [codigoEmpresa, setCodigoEmpresa] = useState('1');
  const [registros, setRegistros] = useState<RegistroDominio[]>([
    { codigoEmpregado: 0, codigoRubrica: 0, valor: 0 }
  ]);
  const [carregando, setCarregando] = useState(false);

  // Atualizar competência quando mês ou ano mudarem
  React.useEffect(() => {
    if (ano && mes) {
      setCompetencia(`${ano}${mes.padStart(2, '0')}`);
    }
  }, [ano, mes]);

  const tiposFolha = [
    { value: '11', label: '11 - Folha Mensal' },
    { value: '41', label: '41 - Férias' },
    { value: '42', label: '42 - Adiantamento' },
    { value: '51', label: '51 - 13º Salário (1ª Parcela)' },
    { value: '52', label: '52 - 13º Salário (2ª Parcela)' }
  ];

  const adicionarRegistro = () => {
    setRegistros([...registros, { codigoEmpregado: 0, codigoRubrica: 0, valor: 0 }]);
  };

  const removerRegistro = (index: number) => {
    const novosRegistros = registros.filter((_, i) => i !== index);
    setRegistros(novosRegistros);
  };

  const atualizarRegistro = (index: number, campo: keyof RegistroDominio, valor: any) => {
    const novosRegistros = [...registros];
    novosRegistros[index] = { ...novosRegistros[index], [campo]: valor };
    setRegistros(novosRegistros);
  };

  const gerarArquivo = async () => {
    try {
      // Validações
      if (!competencia || competencia.length !== 6) {
        showError('Informe uma competência válida (AAAAMM)');
        return;
      }

      if (!codigoEmpresa || parseInt(codigoEmpresa) <= 0) {
        showError('Informe um código de empresa válido');
        return;
      }

      if (registros.length === 0) {
        showError('Adicione pelo menos um registro');
        return;
      }

      // Validar registros
      for (let i = 0; i < registros.length; i++) {
        const reg = registros[i];
        if (!reg.codigoEmpregado || !reg.codigoRubrica || reg.valor === undefined) {
          showError(`Registro ${i + 1}: preencha todos os campos`);
          return;
        }
      }

      setCarregando(true);

      const dados = {
        competencia,
        tipoFolha,
        codigoEmpresa: parseInt(codigoEmpresa),
        registros
      };

      console.log('📤 Enviando dados para exportação:', dados);

      // Fazer requisição
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL || 'https://ponto-certo-production.up.railway.app/api'}/exportar-dominio`,
        dados,
        {
          responseType: 'blob',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      // Criar URL do blob e fazer download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `exportacao_dominio_${competencia}.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess('✅ Arquivo gerado com sucesso!');
      console.log('✅ Download concluído');

    } catch (error: any) {
      console.error('❌ Erro ao gerar arquivo:', error);
      
      if (error.response?.status === 401) {
        showError('Sessão expirada. Faça login novamente.');
      } else if (error.response?.data) {
        // Tentar ler a mensagem de erro do blob
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorData = JSON.parse(reader.result as string);
            showError(errorData.erro || 'Erro ao gerar arquivo');
          } catch {
            showError('Erro ao gerar arquivo');
          }
        };
        reader.readAsText(error.response.data);
      } else {
        showError('Erro ao gerar arquivo. Tente novamente.');
      }
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Card Principal */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Cabeçalho */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Exportar Arquivo Domínio
            </h1>
            <p className="text-gray-600">
              Gere arquivo .txt para importação de lançamentos de ponto no sistema Domínio
            </p>
          </div>

          {/* Formulário */}
          <div className="space-y-6">
            {/* Competência */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mês *
                </label>
                <select
                  value={mes}
                  onChange={(e) => setMes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a2122a] focus:border-transparent"
                >
                  <option value="">Selecione o mês</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{m.toString().padStart(2, '0')} - {
                      ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][m - 1]
                    }</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ano *
                </label>
                <input
                  type="number"
                  value={ano}
                  onChange={(e) => setAno(e.target.value)}
                  placeholder="2025"
                  min="2020"
                  max="2099"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a2122a] focus:border-transparent"
                />
              </div>
            </div>

            {/* Competência (gerada automaticamente) */}
            {competencia && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Competência:</span> {competencia}
                </p>
              </div>
            )}

            {/* Tipo de Folha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Folha *
              </label>
              <select
                value={tipoFolha}
                onChange={(e) => setTipoFolha(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a2122a] focus:border-transparent"
              >
                {tiposFolha.map(tipo => (
                  <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                ))}
              </select>
            </div>

            {/* Código da Empresa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código da Empresa *
              </label>
              <input
                type="number"
                value={codigoEmpresa}
                onChange={(e) => setCodigoEmpresa(e.target.value)}
                placeholder="1"
                min="1"
                max="9999"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a2122a] focus:border-transparent"
              />
            </div>

            {/* Registros */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Registros de Lançamento *
                </label>
                <button
                  type="button"
                  onClick={adicionarRegistro}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  + Adicionar Registro
                </button>
              </div>

              <div className="space-y-3">
                {registros.map((registro, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-semibold text-gray-700">Registro {index + 1}</h3>
                      {registros.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removerRegistro(index)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Remover
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Código Empregado
                        </label>
                        <input
                          type="number"
                          value={registro.codigoEmpregado || ''}
                          onChange={(e) => atualizarRegistro(index, 'codigoEmpregado', parseInt(e.target.value) || 0)}
                          placeholder="12"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a2122a] focus:border-transparent text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Código Rubrica
                        </label>
                        <input
                          type="number"
                          value={registro.codigoRubrica || ''}
                          onChange={(e) => atualizarRegistro(index, 'codigoRubrica', parseInt(e.target.value) || 0)}
                          placeholder="150"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a2122a] focus:border-transparent text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Valor (R$ ou Horas)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={registro.valor || ''}
                          onChange={(e) => atualizarRegistro(index, 'valor', parseFloat(e.target.value) || 0)}
                          placeholder="15.50"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a2122a] focus:border-transparent text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Botão de Gerar */}
            <div className="pt-4">
              <button
                type="button"
                onClick={gerarArquivo}
                disabled={carregando}
                className="w-full bg-[#a2122a] text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-opacity-90 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {carregando ? 'Gerando arquivo...' : 'Gerar Arquivo Domínio'}
              </button>
            </div>

            {/* Informações */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
              <h4 className="font-semibold text-yellow-800 mb-2">ℹ️ Informações</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• O arquivo será gerado no formato .txt compatível com Domínio Sistemas</li>
                <li>• Layout fixo: 10 + Código Emp (10) + Competência (6) + Rubrica (3) + Tipo (2) + Valor (11) + Empresa (4)</li>
                <li>• Valores serão convertidos automaticamente (R$ 15,50 = 00000001550)</li>
                <li>• O download iniciará automaticamente após a geração</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportarDominioPage;

