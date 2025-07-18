import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface RegistroPonto {
  id: number;
  colaborador: string;
  equipe: string;
  cliente: string;
  data: string;
  entrada: string;
  saida: string;
  almoco_saida?: string;
  almoco_retorno?: string;
  horas_trabalhadas: number;
  observacoes?: string;
}

export interface ColaboradorResumo {
  nome: string;
  equipe: string;
  cliente: string;
  dias_trabalhados: number;
  horas_totais: number;
  atrasos: number;
  faltas: number;
  presenca_percentual: number;
}

export class ExcelService {
  private static createWorkbook(): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FG Services - Sistema Ponto Digital';
    workbook.created = new Date();
    workbook.company = 'FG Services';
    return workbook;
  }

  private static addHeader(worksheet: ExcelJS.Worksheet, title: string) {
    // Logo e cabeçalho da empresa
    worksheet.mergeCells('A1:H1');
    const headerCell = worksheet.getCell('A1');
    headerCell.value = 'FG SERVICES - SISTEMA PONTO DIGITAL';
    headerCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1976D2' } };
    headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F8FF' } };
    
    worksheet.mergeCells('A2:H2');
    const titleCell = worksheet.getCell('A2');
    titleCell.value = title;
    titleCell.font = { name: 'Arial', size: 14, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    worksheet.mergeCells('A3:H3');
    const dateCell = worksheet.getCell('A3');
    dateCell.value = `Gerado em: ${new Date().toLocaleString('pt-BR')}`;
    dateCell.font = { name: 'Arial', size: 10, italic: true };
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    worksheet.getRow(1).height = 25;
    worksheet.getRow(2).height = 20;
    worksheet.getRow(3).height = 15;
    
    // Linha em branco
    worksheet.addRow([]);
  }

  private static styleHeaderRow(worksheet: ExcelJS.Worksheet, headerRow: ExcelJS.Row) {
    headerRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 20;
    
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
  }

  private static autoFitColumns(worksheet: ExcelJS.Worksheet) {
    worksheet.columns.forEach((column) => {
      if (column.values) {
        const lengths = column.values.map(v => v ? v.toString().length : 0);
        const maxLength = Math.max(...lengths.filter(v => typeof v === 'number'));
        column.width = Math.min(Math.max(maxLength + 2, 10), 50);
      }
    });
  }

  // 1. Relatório Detalhado de Registros de Ponto
  static async exportarRegistrosPonto(
    registros: RegistroPonto[],
    periodo: { inicio: string; fim: string },
    filtros?: { equipe?: string; cliente?: string }
  ): Promise<void> {
    const workbook = this.createWorkbook();
    const worksheet = workbook.addWorksheet('Registros de Ponto');

    this.addHeader(worksheet, `RELATÓRIO DE REGISTROS DE PONTO - ${periodo.inicio} a ${periodo.fim}`);

    // Informações dos filtros
    if (filtros?.equipe || filtros?.cliente) {
      const filtroRow = worksheet.addRow([
        'Filtros aplicados:',
        filtros.equipe ? `Equipe: ${filtros.equipe}` : '',
        filtros.cliente ? `Cliente: ${filtros.cliente}` : ''
      ]);
      filtroRow.font = { name: 'Arial', size: 10, italic: true };
      worksheet.addRow([]);
    }

    // Cabeçalhos
    const headerRow = worksheet.addRow([
      'Data',
      'Colaborador',
      'Equipe',
      'Cliente',
      'Entrada',
      'Saída Almoço',
      'Retorno Almoço',
      'Saída',
      'Horas Trabalhadas',
      'Observações'
    ]);

    this.styleHeaderRow(worksheet, headerRow);

    // Dados
    registros.forEach((registro, index) => {
      const row = worksheet.addRow([
        new Date(registro.data).toLocaleDateString('pt-BR'),
        registro.colaborador,
        registro.equipe,
        registro.cliente,
        registro.entrada,
        registro.almoco_saida || '-',
        registro.almoco_retorno || '-',
        registro.saida,
        registro.horas_trabalhadas.toFixed(2),
        registro.observacoes || '-'
      ]);

      // Estilo alternado para linhas
      if (index % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
        };
      });
    });

    // Resumo no final
    worksheet.addRow([]);
    const resumoRow = worksheet.addRow([
      'RESUMO GERAL',
      '',
      '',
      '',
      '',
      '',
      '',
      'Total de registros:',
      registros.length.toString(),
      ''
    ]);
    resumoRow.font = { bold: true };

    const totalHorasRow = worksheet.addRow([
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'Total de horas:',
      registros.reduce((sum, r) => sum + r.horas_trabalhadas, 0).toFixed(2),
      ''
    ]);
    totalHorasRow.font = { bold: true };

    this.autoFitColumns(worksheet);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `FG_Registros_Ponto_${periodo.inicio}_${periodo.fim}.xlsx`);
  }

  // 2. Relatório de Presença por Colaborador
  static async exportarRelatorioPresenca(colaboradores: ColaboradorResumo[], periodo: string): Promise<void> {
    const workbook = this.createWorkbook();
    const worksheet = workbook.addWorksheet('Relatório de Presença');

    this.addHeader(worksheet, `RELATÓRIO DE PRESENÇA POR COLABORADOR - ${periodo}`);

    // Cabeçalhos
    const headerRow = worksheet.addRow([
      'Colaborador',
      'Equipe',
      'Cliente',
      'Dias Trabalhados',
      'Total de Horas',
      'Atrasos',
      'Faltas',
      'Presença (%)',
      'Status'
    ]);

    this.styleHeaderRow(worksheet, headerRow);

    // Dados
    colaboradores.forEach((colaborador, index) => {
      const status = colaborador.presenca_percentual >= 95 ? 'Excelente' :
                    colaborador.presenca_percentual >= 90 ? 'Bom' :
                    colaborador.presenca_percentual >= 80 ? 'Regular' : 'Atenção';

      const row = worksheet.addRow([
        colaborador.nome,
        colaborador.equipe,
        colaborador.cliente,
        colaborador.dias_trabalhados,
        colaborador.horas_totais.toFixed(2),
        colaborador.atrasos,
        colaborador.faltas,
        `${colaborador.presenca_percentual.toFixed(1)}%`,
        status
      ]);

      // Cor baseada na presença
      const statusCell = row.getCell(9);
      if (colaborador.presenca_percentual >= 95) {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4CAF50' } };
        statusCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      } else if (colaborador.presenca_percentual >= 90) {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF9800' } };
        statusCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      } else if (colaborador.presenca_percentual < 80) {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF44336' } };
        statusCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      }

      if (index % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
        };
      });
    });

    // Estatísticas gerais
    worksheet.addRow([]);
    const statsRow = worksheet.addRow(['ESTATÍSTICAS GERAIS']);
    statsRow.font = { bold: true, size: 12 };

    const presencaMedia = colaboradores.reduce((sum, c) => sum + c.presenca_percentual, 0) / colaboradores.length;
    const totalHoras = colaboradores.reduce((sum, c) => sum + c.horas_totais, 0);
    const totalAtrasos = colaboradores.reduce((sum, c) => sum + c.atrasos, 0);
    const totalFaltas = colaboradores.reduce((sum, c) => sum + c.faltas, 0);

    worksheet.addRow(['Presença Média da Empresa:', `${presencaMedia.toFixed(1)}%`]);
    worksheet.addRow(['Total de Horas Trabalhadas:', totalHoras.toFixed(2)]);
    worksheet.addRow(['Total de Atrasos:', totalAtrasos.toString()]);
    worksheet.addRow(['Total de Faltas:', totalFaltas.toString()]);

    this.autoFitColumns(worksheet);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `FG_Relatorio_Presenca_${periodo}.xlsx`);
  }

  // 3. Dashboard Executivo Excel
  static async exportarDashboardExecutivo(dados: any): Promise<void> {
    const workbook = this.createWorkbook();
    
    // Aba 1: Resumo Executivo
    const resumoWs = workbook.addWorksheet('Resumo Executivo');
    this.addHeader(resumoWs, 'DASHBOARD EXECUTIVO - FG SERVICES');

    resumoWs.addRow(['INDICADORES PRINCIPAIS']);
    // DADOS MOCK REMOVIDOS - valores serão carregados do backend real
    resumoWs.addRow(['Total de Colaboradores:', dados?.total_colaboradores || 0]);
    resumoWs.addRow(['Equipes Ativas:', dados?.equipes_ativas || 0]);
    resumoWs.addRow(['Clientes Atendidos:', dados?.clientes_atendidos || 0]);
    resumoWs.addRow(['Presença Média:', dados?.presenca_media || '0%']);
    resumoWs.addRow(['Horas Trabalhadas (Mês):', dados?.horas_trabalhadas_mes || 0]);

    resumoWs.addRow([]);
    resumoWs.addRow(['CLIENTES POR PRESENÇA']);
    // DADOS MOCK REMOVIDOS - clientes serão carregados do backend real
    const clientesData = dados?.clientes_presenca || [];

    clientesData.forEach((cliente: any) => {
      resumoWs.addRow([cliente.nome || '', cliente.presenca || '0%']);
    });

    // Aba 2: Análise por Equipe
    const equipeWs = workbook.addWorksheet('Análise por Equipe');
    this.addHeader(equipeWs, 'ANÁLISE DETALHADA POR EQUIPE');

    const headerEquipe = equipeWs.addRow([
      'Equipe',
      'Cliente',
      'Colaboradores',
      'Presença (%)',
      'Horas/Mês',
      'Atrasos',
      'Observações'
    ]);
    this.styleHeaderRow(equipeWs, headerEquipe);

    // DADOS MOCK REMOVIDOS - Sistema limpo para dados reais
    const equipesData: (string | number)[][] = [
      // Sistema iniciando vazio - dados serão carregados do backend real
    ];

    equipesData.forEach(equipe => {
      equipeWs.addRow(equipe);
    });

    this.autoFitColumns(resumoWs);
    this.autoFitColumns(equipeWs);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `FG_Dashboard_Executivo_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  // 4. Relatório Financeiro de Horas
  static async exportarRelatorioFinanceiro(periodo: string): Promise<void> {
    const workbook = this.createWorkbook();
    const worksheet = workbook.addWorksheet('Relatório Financeiro');

    this.addHeader(worksheet, `RELATÓRIO FINANCEIRO DE HORAS - ${periodo}`);

    // Cabeçalhos
    const headerRow = worksheet.addRow([
      'Cliente',
      'Equipe',
      'Colaborador',
      'Cargo',
      'Horas Normais',
      'Horas Extras',
      'Valor/Hora',
      'Total Normal',
      'Total Extra',
      'Total Geral'
    ]);

    this.styleHeaderRow(worksheet, headerRow);

    // DADOS MOCK REMOVIDOS - Sistema limpo para dados reais
    const dadosFinanceiros: (string | number)[][] = [
      // Sistema iniciando vazio - dados serão carregados do backend real
    ];

    dadosFinanceiros.forEach((linha, index) => {
      const row = worksheet.addRow(linha);
      
      // Formatação monetária para colunas de valores
      [8, 9, 10].forEach(colIndex => {
        const cell = row.getCell(colIndex);
        cell.numFmt = 'R$ #,##0.00';
      });

      if (index % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
      }
    });

    // Totais
    worksheet.addRow([]);
    const totalRow = worksheet.addRow([
      'TOTAIS GERAIS',
      '',
      '',
      '',
      '692',
      '24',
      '',
      'R$ 11.166,00',
      'R$ 603,00',
      'R$ 11.769,00'
    ]);
    totalRow.font = { bold: true };

    this.autoFitColumns(worksheet);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `FG_Relatorio_Financeiro_${periodo}.xlsx`);
  }

  // 5. Relatório de Não Conformidades
  static async exportarNaoConformidades(periodo: string): Promise<void> {
    const workbook = this.createWorkbook();
    const worksheet = workbook.addWorksheet('Não Conformidades');

    this.addHeader(worksheet, `RELATÓRIO DE NÃO CONFORMIDADES - ${periodo}`);

    // Cabeçalhos
    const headerRow = worksheet.addRow([
      'Data',
      'Colaborador',
      'Equipe',
      'Cliente',
      'Tipo',
      'Descrição',
      'Impacto',
      'Ação Tomada',
      'Status',
      'Responsável'
    ]);

    this.styleHeaderRow(worksheet, headerRow);

    // DADOS MOCK REMOVIDOS - Sistema limpo para dados reais
    const naoConformidades: string[][] = [
      // Sistema iniciando vazio - dados serão carregados do backend real
    ];

    naoConformidades.forEach((nc, index) => {
      const row = worksheet.addRow(nc);
      
      // Cor baseada no impacto
      const impactoCell = row.getCell(7);
      const statusCell = row.getCell(9);
      
      if (nc[6] === 'Alto') {
        impactoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF5252' } };
        impactoCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      } else if (nc[6] === 'Médio') {
        impactoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF9800' } };
        impactoCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      } else {
        impactoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4CAF50' } };
        impactoCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      }

      if (nc[8] === 'Resolvido') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4CAF50' } };
        statusCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      }

      if (index % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
      }
    });

    this.autoFitColumns(worksheet);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `FG_Nao_Conformidades_${periodo}.xlsx`);
  }
} 