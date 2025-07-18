import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Contrato, KPIsContrato, Colaborador, DocumentoContrato, AlteracaoContrato } from '../types/contratos';

export class ContratosExportService {
  
  // Exportar relatório completo do contrato em Excel
  static async exportarRelatorioExcel(
    contrato: Contrato, 
    kpis: KPIsContrato, 
    colaboradores: Colaborador[],
    documentos: DocumentoContrato[],
    historico: AlteracaoContrato[]
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    
    // Metadados do arquivo
    workbook.creator = 'Sistema Ponto Certo FG';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.company = 'FG Services';

    // 1. Aba - Dados Gerais do Contrato
    const dadosSheet = workbook.addWorksheet('Dados do Contrato', {
      headerFooter: {
        firstHeader: 'Relatório de Contrato - Ponto Certo FG',
        firstFooter: `Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`
      }
    });

    // Cabeçalho principal
    dadosSheet.mergeCells('A1:D1');
    const titleCell = dadosSheet.getCell('A1');
    titleCell.value = `RELATÓRIO DO CONTRATO: ${contrato.nome.toUpperCase()}`;
    titleCell.font = { bold: true, size: 16, color: { argb: 'FF1976D2' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F7FF' } };

    // Dados básicos do contrato
    let currentRow = 3;
    const addDataRow = (label: string, value: string | number, col1 = 'A', col2 = 'B') => {
      dadosSheet.getCell(`${col1}${currentRow}`).value = label;
      dadosSheet.getCell(`${col1}${currentRow}`).font = { bold: true };
      dadosSheet.getCell(`${col2}${currentRow}`).value = value;
      currentRow++;
    };

    addDataRow('Nome do Contrato:', contrato.nome);
    addDataRow('Cliente:', contrato.cliente);
    addDataRow('Localização:', contrato.localizacao);
    addDataRow('Valor Total:', contrato.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
    addDataRow('Vigência Início:', format(new Date(contrato.vigenciaInicio), 'dd/MM/yyyy'));
    addDataRow('Vigência Fim:', format(new Date(contrato.vigenciaFim), 'dd/MM/yyyy'));
    addDataRow('Status:', contrato.status);
    addDataRow('Responsável:', contrato.responsavel || 'Não informado');
    addDataRow('Número do Contrato:', contrato.numeroContrato || 'Não informado');

    // KPIs em duas colunas
    currentRow += 2;
    dadosSheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const kpiTitleCell = dadosSheet.getCell(`A${currentRow}`);
    kpiTitleCell.value = 'INDICADORES DE PERFORMANCE (KPIs)';
    kpiTitleCell.font = { bold: true, size: 14, color: { argb: 'FF1976D2' } };
    kpiTitleCell.alignment = { horizontal: 'center' };
    currentRow += 2;

    addDataRow('Total de Colaboradores:', kpis.totalColaboradores.toString(), 'A', 'B');
    addDataRow('Percentual de Presença:', `${kpis.percentualPresenca.toFixed(1)}%`, 'C', 'D');
    currentRow--;
    addDataRow('Número de Afastamentos:', kpis.numeroAfastamentos.toString(), 'A', 'B');
    addDataRow('Rotatividade:', `${kpis.rotatividade.toFixed(1)}%`, 'C', 'D');
    currentRow--;
    addDataRow('Dias Restantes:', kpis.diasRestantes.toString(), 'A', 'B');
    addDataRow('Valor Mensal:', kpis.valorMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'C', 'D');

    // Formatação da planilha
    dadosSheet.columns = [
      { width: 25 }, { width: 25 }, { width: 25 }, { width: 25 }
    ];

    // 2. Aba - Quadro Funcional
    const colaboradoresSheet = workbook.addWorksheet('Quadro Funcional');
    
    // Cabeçalho da tabela de colaboradores
    colaboradoresSheet.mergeCells('A1:F1');
    const collabTitleCell = colaboradoresSheet.getCell('A1');
    collabTitleCell.value = `QUADRO FUNCIONAL - ${colaboradores.length} COLABORADORES`;
    collabTitleCell.font = { bold: true, size: 14, color: { argb: 'FF1976D2' } };
    collabTitleCell.alignment = { horizontal: 'center' };

    // Headers da tabela
    const headers = ['Nome', 'Cargo', 'Status', 'CPF', 'Telefone', 'E-mail'];
    headers.forEach((header, index) => {
      const cell = colaboradoresSheet.getCell(3, index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Dados dos colaboradores
    colaboradores.forEach((colaborador, index) => {
      const row = index + 4;
      const rowData = [
        colaborador.nome,
        colaborador.cargo,
        colaborador.status,
        colaborador.cpf || 'Não informado',
        colaborador.telefone || 'Não informado',
        colaborador.email || 'Não informado'
      ];

      rowData.forEach((data, colIndex) => {
        const cell = colaboradoresSheet.getCell(row, colIndex + 1);
        cell.value = data;
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        
        // Colorir status
        if (colIndex === 2) { // Status column
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: colaborador.status === 'Ativo' ? 'FFE8F5E8' : 'FFFFEEE6' }
          };
        }
      });
    });

    // Ajustar largura das colunas
    colaboradoresSheet.columns = [
      { width: 30 }, { width: 25 }, { width: 15 }, { width: 18 }, { width: 18 }, { width: 30 }
    ];

    // 3. Aba - Documentos
    const documentosSheet = workbook.addWorksheet('Documentos');
    
    documentosSheet.mergeCells('A1:E1');
    const docTitleCell = documentosSheet.getCell('A1');
    docTitleCell.value = `DOCUMENTOS DO CONTRATO - ${documentos.length} ARQUIVOS`;
    docTitleCell.font = { bold: true, size: 14, color: { argb: 'FF1976D2' } };
    docTitleCell.alignment = { horizontal: 'center' };

    // Headers dos documentos
    const docHeaders = ['Nome do Documento', 'Tipo', 'Data de Criação', 'Criado Por', 'Tamanho'];
    docHeaders.forEach((header, index) => {
      const cell = documentosSheet.getCell(3, index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Dados dos documentos
    documentos.forEach((documento, index) => {
      const row = index + 4;
      const rowData = [
        documento.nome,
        documento.tipo,
        format(new Date(documento.criadoEm), 'dd/MM/yyyy HH:mm'),
        documento.criadoPor,
        documento.tamanho ? `${(documento.tamanho / 1024 / 1024).toFixed(2)} MB` : 'N/A'
      ];

      rowData.forEach((data, colIndex) => {
        const cell = documentosSheet.getCell(row, colIndex + 1);
        cell.value = data;
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    documentosSheet.columns = [
      { width: 40 }, { width: 15 }, { width: 20 }, { width: 25 }, { width: 15 }
    ];

    // 4. Aba - Histórico de Alterações
    const historicoSheet = workbook.addWorksheet('Histórico');
    
    historicoSheet.mergeCells('A1:F1');
    const histTitleCell = historicoSheet.getCell('A1');
    histTitleCell.value = `HISTÓRICO DE ALTERAÇÕES - ${historico.length} REGISTROS`;
    histTitleCell.font = { bold: true, size: 14, color: { argb: 'FF1976D2' } };
    histTitleCell.alignment = { horizontal: 'center' };

    // Headers do histórico
    const histHeaders = ['Data/Hora', 'Campo Alterado', 'Valor Anterior', 'Valor Novo', 'Alterado Por', 'Observações'];
    histHeaders.forEach((header, index) => {
      const cell = historicoSheet.getCell(3, index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Dados do histórico (ordenado por data)
    const historicoOrdenado = historico.sort((a, b) => 
      new Date(b.dataAlteracao).getTime() - new Date(a.dataAlteracao).getTime()
    );

    historicoOrdenado.forEach((alteracao, index) => {
      const row = index + 4;
      const rowData = [
        format(new Date(alteracao.dataAlteracao), 'dd/MM/yyyy HH:mm'),
        alteracao.campoAlterado,
        alteracao.valorAntigo,
        alteracao.valorNovo,
        alteracao.alteradoPor,
        alteracao.observacoes || 'N/A'
      ];

      rowData.forEach((data, colIndex) => {
        const cell = historicoSheet.getCell(row, colIndex + 1);
        cell.value = data;
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    historicoSheet.columns = [
      { width: 18 }, { width: 20 }, { width: 25 }, { width: 25 }, { width: 20 }, { width: 30 }
    ];

    // Salvar arquivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_contrato_${contrato.nome.replace(/\s+/g, '_')}_${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // Exportar listagem de contratos em Excel
  static async exportarListagemContratos(contratos: Contrato[]): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema Ponto Certo FG';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Lista de Contratos');

    // Título
    worksheet.mergeCells('A1:J1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `LISTAGEM DE CONTRATOS - ${contratos.length} REGISTROS`;
    titleCell.font = { bold: true, size: 16, color: { argb: 'FF1976D2' } };
    titleCell.alignment = { horizontal: 'center' };

    // Headers
    const headers = [
      'Nome do Contrato', 'Cliente', 'Localização', 'Valor', 'Vigência Início', 
      'Vigência Fim', 'Status', 'Colaboradores', 'Responsável', 'Número'
    ];

    headers.forEach((header, index) => {
      const cell = worksheet.getCell(3, index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Dados
    contratos.forEach((contrato, index) => {
      const row = index + 4;
      const rowData = [
        contrato.nome,
        contrato.cliente,
        contrato.localizacao,
        contrato.valor,
        format(new Date(contrato.vigenciaInicio), 'dd/MM/yyyy'),
        format(new Date(contrato.vigenciaFim), 'dd/MM/yyyy'),
        contrato.status,
        contrato.colaboradores.length,
        contrato.responsavel || 'N/A',
        contrato.numeroContrato || 'N/A'
      ];

      rowData.forEach((data, colIndex) => {
        const cell = worksheet.getCell(row, colIndex + 1);
        
        if (colIndex === 3) { // Valor - formatação monetária
          cell.value = data as number;
          cell.numFmt = 'R$ #,##0.00';
        } else {
          cell.value = data;
        }

        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        // Colorir status
        if (colIndex === 6) { // Status column
          const status = data as string;
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { 
              argb: status === 'Ativo' ? 'FFE8F5E8' : 
                    status === 'Vencido' ? 'FFFFE6E6' : 'FFFFF4E6'
            }
          };
        }
      });
    });

    // Ajustar largura das colunas
    worksheet.columns = [
      { width: 30 }, { width: 25 }, { width: 25 }, { width: 15 }, { width: 15 },
      { width: 15 }, { width: 20 }, { width: 15 }, { width: 20 }, { width: 15 }
    ];

    // Salvar
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `listagem_contratos_${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // Exportar em CSV
  static exportarCSV(contratos: Contrato[]): void {
    const headers = [
      'Nome', 'Cliente', 'Localização', 'Valor', 'Vigência Início', 
      'Vigência Fim', 'Status', 'Colaboradores', 'Responsável', 'Número do Contrato'
    ];

    const csvContent = [
      headers.join(','),
      ...contratos.map(contrato => [
        `"${contrato.nome}"`,
        `"${contrato.cliente}"`,
        `"${contrato.localizacao}"`,
        contrato.valor.toFixed(2),
        format(new Date(contrato.vigenciaInicio), 'dd/MM/yyyy'),
        format(new Date(contrato.vigenciaFim), 'dd/MM/yyyy'),
        `"${contrato.status}"`,
        contrato.colaboradores.length,
        `"${contrato.responsavel || 'N/A'}"`,
        `"${contrato.numeroContrato || 'N/A'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `contratos_${format(new Date(), 'dd-MM-yyyy')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Gerar relatório de presença por contrato
  static async exportarRelatorioPresenca(contratoId: string, periodo: { inicio: Date; fim: Date }): Promise<void> {
    try {
      const response = await fetch(`/api/contratos/${contratoId}/relatorio-presenca`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(periodo)
      });

      if (response.ok) {
        const data = await response.json();
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Relatório de Presença');

        // Título
        worksheet.mergeCells('A1:F1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = `RELATÓRIO DE PRESENÇA - ${data.contrato.nome}`;
        titleCell.font = { bold: true, size: 16, color: { argb: 'FF1976D2' } };
        titleCell.alignment = { horizontal: 'center' };

        // Período
        worksheet.mergeCells('A2:F2');
        const periodoCell = worksheet.getCell('A2');
        periodoCell.value = `Período: ${format(periodo.inicio, 'dd/MM/yyyy')} a ${format(periodo.fim, 'dd/MM/yyyy')}`;
        periodoCell.alignment = { horizontal: 'center' };

        // Headers
        const headers = ['Colaborador', 'Dias Trabalhados', 'Faltas', '% Presença', 'Horas Extras', 'Observações'];
        headers.forEach((header, index) => {
          const cell = worksheet.getCell(4, index + 1);
          cell.value = header;
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
          cell.alignment = { horizontal: 'center' };
        });

        // Dados (simulados para exemplo)
        const dadosPresenca = data.presenca || [];
        dadosPresenca.forEach((item: any, index: number) => {
          const row = index + 5;
          worksheet.getCell(row, 1).value = item.colaborador;
          worksheet.getCell(row, 2).value = item.diasTrabalhados;
          worksheet.getCell(row, 3).value = item.faltas;
          worksheet.getCell(row, 4).value = `${item.percentualPresenca}%`;
          worksheet.getCell(row, 5).value = item.horasExtras;
          worksheet.getCell(row, 6).value = item.observacoes || 'N/A';
        });

        worksheet.columns = [
          { width: 30 }, { width: 18 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 25 }
        ];

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `presenca_${data.contrato.nome.replace(/\s+/g, '_')}_${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Erro ao gerar relatório de presença:', error);
      throw error;
    }
  }
} 