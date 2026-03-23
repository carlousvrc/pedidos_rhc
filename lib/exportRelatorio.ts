import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

export interface RelatorioData {
    filtroUnidade: string;
    filtroDe: string;
    filtroAte: string;
    totalPedidos: number;
    pendentes: number;
    emCotacao: number;
    realizados: number;
    recebidos: number;
    totalItensQtd: number;
    totalAtendida: number;
    totalRecebida: number;
    taxaAtendimento: number;
    taxaRecebimento: number;
    totalRemanejamentos: number;
    totalQtdRemanejada: number;
    valorTotalSolicitado: number;
    valorTotalAtendido: number;
    valorTotalRecebido: number;
    topItens: { nome: string; codigo: string; qtd: number; valor_unitario: number; valor_total: number }[];
    pedidosPorUnidade: [string, number][];
    itensParcialmenteAtendidos: {
        item_nome: string;
        item_codigo: string;
        fornecedor?: string;
        pedido_id: string;
        quantidade: number;
        quantidade_atendida: number;
    }[];
    itensNaoAtendidos: {
        item_nome: string;
        item_codigo: string;
        fornecedor?: string;
        pedido_id: string;
        quantidade: number;
        quantidade_atendida: number;
    }[];
    itensDivergentes: {
        pedido_numero: string;
        unidade_nome: string;
        item_solicitado_nome: string;
        item_solicitado_codigo: string;
        item_recebido_nome: string;
        item_recebido_codigo: string;
        observacao: string;
        quantidade_recebida: number;
    }[];
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function formatDate(iso: string) {
    if (!iso) return '—';
    return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR');
}

function fmtBRL(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function geradoEm() {
    return new Date().toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

async function getLogoBase64(): Promise<string | null> {
    try {
        const res = await fetch('/logo.png');
        const blob = await res.blob();
        return await new Promise<string>(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

// ────────────────────────────────────────────────────────────
// PDF Export
// ────────────────────────────────────────────────────────────

export async function exportPDF(data: RelatorioData) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const PRIMARY   = [0, 26, 114] as [number, number, number];   // #001A72
    const SECONDARY = [71, 85, 105] as [number, number, number];   // slate-600
    const LIGHT     = [248, 250, 252] as [number, number, number]; // slate-50
    const WHITE     = [255, 255, 255] as [number, number, number];
    const AMBER     = [217, 119, 6] as [number, number, number];
    const RED       = [185, 28, 28] as [number, number, number];
    const GREEN     = [5, 150, 105] as [number, number, number];

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    let y = 0;

    // ── Cabeçalho branco ─────────────────────────────────────
    // Fundo branco com linha de destaque na base
    doc.setFillColor(...WHITE);
    doc.rect(0, 0, pageW, 36, 'F');
    doc.setFillColor(...PRIMARY);
    doc.rect(0, 34, pageW, 2, 'F');   // linha azul fina na base do header

    // Logo com proporção correta
    const logo = await getLogoBase64();
    let logoEndX = margin;   // ponto X onde o título começa (depois da logo)
    if (logo) {
        try {
            const imgProps = doc.getImageProperties(logo);
            const maxH = 24;   // altura máxima em mm
            const maxW = 55;   // largura máxima em mm
            const ratio = imgProps.width / imgProps.height;
            let logoW = maxH * ratio;
            let logoH = maxH;
            if (logoW > maxW) { logoW = maxW; logoH = maxW / ratio; }
            const logoY = (34 - logoH) / 2;   // centralizado verticalmente no header
            doc.addImage(logo, 'PNG', margin, logoY, logoW, logoH);
            logoEndX = margin + logoW + 6;
        } catch { /* mantém logoEndX = margin */ }
    }

    // Título (texto escuro sobre fundo branco)
    const titleX = logoEndX;
    doc.setTextColor(...PRIMARY);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DE PEDIDOS', titleX, 14);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...SECONDARY);
    doc.text('Hospital Casa · RHC Pedidos', titleX, 21);

    // Gerado em + filtros (alinhado à direita)
    doc.setFontSize(7.5);
    doc.setTextColor(...SECONDARY);
    doc.text(`Gerado em: ${geradoEm()}`, pageW - margin, 12, { align: 'right' });

    const periodoParts = [];
    if (data.filtroDe || data.filtroAte) {
        periodoParts.push(`Período: ${data.filtroDe ? formatDate(data.filtroDe) : 'início'} a ${data.filtroAte ? formatDate(data.filtroAte) : 'hoje'}`);
    }
    if (data.filtroUnidade) periodoParts.push(`Unidade: ${data.filtroUnidade}`);
    if (periodoParts.length === 0) periodoParts.push('Todos os períodos e unidades');
    doc.text(periodoParts.join('   ·   '), pageW - margin, 20, { align: 'right' });

    y = 44;

    // ── Seção: KPIs ─────────────────────────────────────────
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRIMARY);
    doc.text('1. RESUMO GERAL', margin, y);
    y += 5;

    // Linha separadora
    doc.setDrawColor(...PRIMARY);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 4;

    autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Indicador', 'Valor', 'Indicador', 'Valor']],
        body: [
            ['Total de Pedidos', data.totalPedidos.toString(), 'Pendentes', data.pendentes.toString()],
            ['Em Cotação', data.emCotacao.toString(), 'Realizados', data.realizados.toString()],
            ['Recebidos', data.recebidos.toString(), 'Remanejamentos', data.totalRemanejamentos.toString()],
            ['Total Qtd Solicitada', data.totalItensQtd.toLocaleString('pt-BR'), 'Total Qtd Atendida', data.totalAtendida.toLocaleString('pt-BR')],
            ['Taxa de Atendimento', `${data.taxaAtendimento}%`, 'Taxa de Recebimento', `${data.taxaRecebimento}%`],
            ['Valor Solicitado', fmtBRL(data.valorTotalSolicitado), 'Valor Atendido', fmtBRL(data.valorTotalAtendido)],
            ['Valor Recebido', fmtBRL(data.valorTotalRecebido), 'Diferença não atendida', fmtBRL(data.valorTotalSolicitado - data.valorTotalAtendido)],
        ],
        headStyles: { fillColor: PRIMARY, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: SECONDARY },
        alternateRowStyles: { fillColor: LIGHT },
        columnStyles: {
            0: { fontStyle: 'bold', textColor: SECONDARY },
            2: { fontStyle: 'bold', textColor: SECONDARY },
        },
        theme: 'grid',
    });

    y = (doc as any).lastAutoTable.finalY + 8;

    // ── Seção: Funil de Atendimento ──────────────────────────
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRIMARY);
    doc.text('2. FUNIL DE ATENDIMENTO', margin, y);
    y += 5;
    doc.setDrawColor(...PRIMARY);
    doc.line(margin, y, pageW - margin, y);
    y += 4;

    const funnelW = (pageW - margin * 2) / 3 - 3;
    const funnelSteps = [
        { label: 'Solicitado', value: data.totalItensQtd, pct: 100, color: PRIMARY },
        { label: 'Atendido', value: data.totalAtendida, pct: data.taxaAtendimento, color: [59, 130, 246] as [number, number, number] },
        { label: 'Recebido', value: data.totalRecebida, pct: data.taxaRecebimento, color: GREEN },
    ];

    funnelSteps.forEach((step, i) => {
        const x = margin + i * (funnelW + 3);
        // Card background
        doc.setFillColor(...LIGHT);
        doc.roundedRect(x, y, funnelW, 22, 2, 2, 'F');
        doc.setFillColor(...step.color);
        doc.roundedRect(x, y, funnelW, 6, 2, 2, 'F');
        doc.setFillColor(...step.color);
        doc.rect(x, y + 4, funnelW, 2, 'F');

        doc.setTextColor(...WHITE);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(step.label.toUpperCase(), x + funnelW / 2, y + 4.5, { align: 'center' });

        doc.setTextColor(...step.color);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(step.value.toLocaleString('pt-BR'), x + funnelW / 2, y + 16, { align: 'center' });

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...SECONDARY);
        doc.text(`${step.pct}%`, x + funnelW / 2, y + 21, { align: 'center' });
    });

    y += 28;

    // ── Seção: Top 10 Itens ──────────────────────────────────
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRIMARY);
    doc.text('3. TOP 10 ITENS MAIS SOLICITADOS', margin, y);
    y += 5;
    doc.setDrawColor(...PRIMARY);
    doc.line(margin, y, pageW - margin, y);
    y += 4;

    if (data.topItens.length === 0) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...SECONDARY);
        doc.text('Sem dados no período selecionado.', margin, y + 5);
        y += 14;
    } else {
        autoTable(doc, {
            startY: y,
            margin: { left: margin, right: margin },
            head: [['#', 'Item', 'Código', 'Qtd Total', 'Vlr Unit.', 'Vlr Total']],
            body: data.topItens.map((item, i) => [
                (i + 1).toString(),
                item.nome,
                item.codigo,
                item.qtd.toLocaleString('pt-BR'),
                item.valor_unitario ? fmtBRL(item.valor_unitario) : '—',
                item.valor_total ? fmtBRL(item.valor_total) : '—',
            ]),
            headStyles: { fillColor: PRIMARY, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
            bodyStyles: { fontSize: 8, textColor: SECONDARY },
            alternateRowStyles: { fillColor: LIGHT },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                3: { halign: 'right', cellWidth: 20 },
                4: { halign: 'right', cellWidth: 22 },
                5: { halign: 'right', cellWidth: 24 },
            },
            theme: 'grid',
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ── Seção: Pedidos por Unidade ───────────────────────────
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRIMARY);
    doc.text('4. PEDIDOS POR UNIDADE', margin, y);
    y += 5;
    doc.setDrawColor(...PRIMARY);
    doc.line(margin, y, pageW - margin, y);
    y += 4;

    if (data.pedidosPorUnidade.length === 0) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...SECONDARY);
        doc.text('Sem dados no período selecionado.', margin, y + 5);
        y += 14;
    } else {
        autoTable(doc, {
            startY: y,
            margin: { left: margin, right: margin },
            head: [['Unidade', 'Qtd Pedidos', '% do Total']],
            body: data.pedidosPorUnidade.map(([nome, qtd]) => [
                nome,
                qtd.toString(),
                `${data.totalPedidos > 0 ? Math.round((qtd / data.totalPedidos) * 100) : 0}%`,
            ]),
            headStyles: { fillColor: PRIMARY, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
            bodyStyles: { fontSize: 8, textColor: SECONDARY },
            alternateRowStyles: { fillColor: LIGHT },
            columnStyles: {
                1: { halign: 'center', cellWidth: 30 },
                2: { halign: 'center', cellWidth: 24 },
            },
            theme: 'grid',
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ── Seção: Alertas ───────────────────────────────────────
    if (data.itensParcialmenteAtendidos.length > 0 || data.itensNaoAtendidos.length > 0) {
        // Check if we need a new page
        if (y > pageH - 60) {
            doc.addPage();
            y = 16;
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PRIMARY);
        doc.text('5. ALERTAS DE ATENDIMENTO', margin, y);
        y += 5;
        doc.setDrawColor(...PRIMARY);
        doc.line(margin, y, pageW - margin, y);
        y += 6;

        // Parcialmente atendidos
        if (data.itensParcialmenteAtendidos.length > 0) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...AMBER);
            doc.text(`⚠  Parcialmente Atendidos (${data.itensParcialmenteAtendidos.length})`, margin, y);
            y += 4;

            autoTable(doc, {
                startY: y,
                margin: { left: margin, right: margin },
                head: [['Item', 'Código', 'Fornecedor', 'Pedido', 'Atendido', 'Pendente']],
                body: data.itensParcialmenteAtendidos.map(pi => [
                    pi.item_nome,
                    pi.item_codigo,
                    pi.fornecedor || '—',
                    pi.quantidade.toString(),
                    pi.quantidade_atendida.toString(),
                    (pi.quantidade - pi.quantidade_atendida).toString(),
                ]),
                headStyles: { fillColor: [217, 119, 6] as [number, number, number], textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
                bodyStyles: { fontSize: 7.5, textColor: SECONDARY },
                alternateRowStyles: { fillColor: [255, 251, 235] as [number, number, number] },
                columnStyles: {
                    3: { halign: 'center', cellWidth: 20 },
                    4: { halign: 'center', cellWidth: 20 },
                    5: { halign: 'center', cellWidth: 20, fontStyle: 'bold', textColor: RED },
                },
                theme: 'grid',
            });
            y = (doc as any).lastAutoTable.finalY + 8;
        }

        // Não atendidos
        if (data.itensNaoAtendidos.length > 0) {
            if (y > pageH - 40) { doc.addPage(); y = 16; }

            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...RED);
            doc.text(`✕  Não Atendidos (${data.itensNaoAtendidos.length})`, margin, y);
            y += 4;

            autoTable(doc, {
                startY: y,
                margin: { left: margin, right: margin },
                head: [['Item', 'Código', 'Fornecedor', 'Qtd Pedida']],
                body: data.itensNaoAtendidos.map(pi => [
                    pi.item_nome,
                    pi.item_codigo,
                    pi.fornecedor || '—',
                    pi.quantidade.toString(),
                ]),
                headStyles: { fillColor: RED, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
                bodyStyles: { fontSize: 7.5, textColor: SECONDARY },
                alternateRowStyles: { fillColor: [254, 242, 242] as [number, number, number] },
                columnStyles: {
                    3: { halign: 'center', cellWidth: 24 },
                },
                theme: 'grid',
            });
        }
    }

    // ── Seção: Divergências ───────────────────────────────────
    if (data.itensDivergentes.length > 0) {
        if (y > pageH - 60) {
            doc.addPage();
            y = 16;
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PRIMARY);
        doc.text('6. DIVERGÊNCIAS DE RECEBIMENTO', margin, y);
        y += 5;
        doc.setDrawColor(...PRIMARY);
        doc.line(margin, y, pageW - margin, y);
        y += 4;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...AMBER);
        doc.text(`⚠  Itens recebidos diferentes do solicitado (${data.itensDivergentes.length})`, margin, y);
        y += 4;

        autoTable(doc, {
            startY: y,
            margin: { left: margin, right: margin },
            head: [['Pedido', 'Unidade', 'Item Solicitado', 'Item Recebido', 'Qtd Rec.', 'Observação']],
            body: data.itensDivergentes.map(d => [
                d.pedido_numero,
                d.unidade_nome,
                `${d.item_solicitado_codigo} — ${d.item_solicitado_nome}`,
                `${d.item_recebido_codigo} — ${d.item_recebido_nome}`,
                d.quantidade_recebida.toString(),
                d.observacao,
            ]),
            headStyles: { fillColor: [217, 119, 6] as [number, number, number], textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
            bodyStyles: { fontSize: 7.5, textColor: SECONDARY },
            alternateRowStyles: { fillColor: [255, 251, 235] as [number, number, number] },
            columnStyles: {
                4: { halign: 'center', cellWidth: 20 },
            },
            theme: 'grid',
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ── Rodapé em todas as páginas ───────────────────────────
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFillColor(...LIGHT);
        doc.rect(0, pageH - 10, pageW, 10, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(0, pageH - 10, pageW, pageH - 10);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...SECONDARY);
        doc.text('Hospital Casa · RHC Pedidos — Documento confidencial', margin, pageH - 4);
        doc.text(`Página ${i} de ${totalPages}`, pageW - margin, pageH - 4, { align: 'right' });
    }

    doc.save(`relatorio_rhc_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ────────────────────────────────────────────────────────────
// Excel Export (styled with ExcelJS)
// ────────────────────────────────────────────────────────────

const PRIMARY   = '001A72';
const WHITE     = 'FFFFFFFF';
const SLATE50   = 'FFF8FAFC';
const SLATE600  = 'FF475569';
const SLATE800  = 'FF1E293B';
const AMBER700  = 'FFB45309';
const AMBER50   = 'FFFFFBEB';
const RED700    = 'FFB91C1C';
const RED50     = 'FFFEF2F2';
const BLUE50    = 'FFEFF6FF';
const GREEN700  = 'FF059669';
const ORANGE600 = 'FFEA580C';
const BLUE700   = 'FF1D4ED8';

function xlFill(hex: string): ExcelJS.Fill {
    return { type: 'pattern', pattern: 'solid', fgColor: { argb: hex.length === 6 ? 'FF' + hex : hex } };
}
function xlFont(bold: boolean, size: number, argb: string): Partial<ExcelJS.Font> {
    return { bold, size, color: { argb: argb.length === 6 ? 'FF' + argb : argb }, name: 'Calibri' };
}
function xlAlign(h: ExcelJS.Alignment['horizontal'], v: ExcelJS.Alignment['vertical'] = 'middle'): Partial<ExcelJS.Alignment> {
    return { horizontal: h, vertical: v, wrapText: false };
}

function applyHeader(cell: ExcelJS.Cell, bg = PRIMARY) {
    cell.fill = xlFill(bg);
    cell.font = xlFont(true, 10, 'FFFFFF');
    cell.alignment = xlAlign('left');
}
function applyColHeader(cell: ExcelJS.Cell, align: ExcelJS.Alignment['horizontal'] = 'center', bg = PRIMARY) {
    cell.fill = xlFill(bg);
    cell.font = xlFont(true, 9, 'FFFFFF');
    cell.alignment = xlAlign(align);
}
function applyRow(cell: ExcelJS.Cell, alt: boolean, align: ExcelJS.Alignment['horizontal'] = 'left', bold = false, colorArgb = SLATE800) {
    cell.fill = xlFill(alt ? SLATE50 : 'FFFFFFFF');
    cell.font = { bold, size: 9, color: { argb: colorArgb }, name: 'Calibri' };
    cell.alignment = xlAlign(align);
}
function applyAmberRow(cell: ExcelJS.Cell, alt: boolean, align: ExcelJS.Alignment['horizontal'] = 'left', bold = false) {
    cell.fill = xlFill(alt ? AMBER50 : 'FFFFFFFF');
    cell.font = { bold, size: 9, color: { argb: alt ? 'FF92400E' : 'FF78350F' }, name: 'Calibri' };
    cell.alignment = xlAlign(align);
}
function applyRedRow(cell: ExcelJS.Cell, alt: boolean, align: ExcelJS.Alignment['horizontal'] = 'left', bold = false) {
    cell.fill = xlFill(alt ? RED50 : 'FFFFFFFF');
    cell.font = { bold, size: 9, color: { argb: alt ? 'FF7F1D1D' : 'FF991B1B' }, name: 'Calibri' };
    cell.alignment = xlAlign(align);
}

function sectionRow(ws: ExcelJS.Worksheet, title: string, colCount: number, rowHeight = 18) {
    const row = ws.addRow([title]);
    row.height = rowHeight;
    const cell = row.getCell(1);
    applyHeader(cell);
    if (colCount > 1) ws.mergeCells(row.number, 1, row.number, colCount);
    return row;
}

export async function exportExcel(data: RelatorioData) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'RHC Pedidos';
    wb.created = new Date();

    // Fetch logo
    let logoBuffer: ArrayBuffer | null = null;
    try {
        const res = await fetch('/logo.png');
        logoBuffer = await res.arrayBuffer();
    } catch { /* sem logo */ }

    const periodo = data.filtroDe || data.filtroAte
        ? `${data.filtroDe ? formatDate(data.filtroDe) : 'início'} a ${data.filtroAte ? formatDate(data.filtroAte) : 'hoje'}`
        : 'Todo o histórico';

    // ── Helper: adicionar logo + cabeçalho de página em cada aba ──
    function addPageHeader(ws: ExcelJS.Worksheet, colCount: number): number {
        ws.addRow([]); // row 1: logo (reservada)
        ws.addRow([]); // row 2: logo
        ws.addRow([]); // row 3: logo

        // Linha do título
        const titleRow = ws.addRow(['RELATÓRIO DE PEDIDOS — HOSPITAL CASA (RHC)']);
        titleRow.height = 22;
        const titleCell = titleRow.getCell(1);
        titleCell.fill = xlFill(PRIMARY);
        titleCell.font = xlFont(true, 14, 'FFFFFF');
        titleCell.alignment = xlAlign('left');
        if (colCount > 1) ws.mergeCells(titleRow.number, 1, titleRow.number, colCount);

        // Linha de subtítulo
        const subRow = ws.addRow(['Hospital Casa · RHC Pedidos', '', geradoEm()]);
        subRow.height = 14;
        const subCell = subRow.getCell(1);
        subCell.fill = xlFill(BLUE50.replace('FF', ''));
        subCell.font = xlFont(false, 8, SLATE600.replace('FF', ''));
        subCell.alignment = xlAlign('left');
        if (colCount > 1) {
            ws.mergeCells(subRow.number, 1, subRow.number, colCount - 1);
            const dateCell = subRow.getCell(colCount);
            dateCell.fill = xlFill(BLUE50.replace('FF', ''));
            dateCell.font = xlFont(false, 8, SLATE600.replace('FF', ''));
            dateCell.alignment = xlAlign('right');
        }

        ws.addRow([]); // espaço

        // Logo
        if (logoBuffer) {
            try {
                const imgId = wb.addImage({ buffer: logoBuffer, extension: 'png' });
                ws.addImage(imgId, {
                    tl: { col: 0, row: 0 },
                    br: { col: 1.8, row: 3 },
                    editAs: 'oneCell',
                } as any);
            } catch { /* ignora se falhar */ }
        }

        return ws.rowCount;
    }

    // ── Aba: Resumo Geral ────────────────────────────────────
    const wsResumo = wb.addWorksheet('Resumo Geral');
    wsResumo.columns = [
        { width: 30 }, { width: 18 }, { width: 30 }, { width: 18 },
    ];
    addPageHeader(wsResumo, 4);

    // Filtros
    sectionRow(wsResumo, 'FILTROS APLICADOS', 4);
    (() => {
        const r = wsResumo.addRow(['Unidade', data.filtroUnidade || 'Todas']);
        r.getCell(1).fill = xlFill('EFF6FF'); r.getCell(1).font = xlFont(true, 9, SLATE600.replace('FF',''));
        r.getCell(2).font = xlFont(true, 10, PRIMARY); r.getCell(2).alignment = xlAlign('right');
        const r2 = wsResumo.addRow(['Período', periodo]);
        r2.getCell(1).fill = xlFill('EFF6FF'); r2.getCell(1).font = xlFont(true, 9, SLATE600.replace('FF',''));
        r2.getCell(2).font = xlFont(true, 10, PRIMARY); r2.getCell(2).alignment = xlAlign('right');
    })();
    wsResumo.addRow([]);

    // KPIs
    sectionRow(wsResumo, 'INDICADORES GERAIS', 4);
    const kpiHeaderRow = wsResumo.addRow(['Indicador', 'Valor', 'Indicador', 'Valor']);
    kpiHeaderRow.height = 16;
    [1,2,3,4].forEach(i => applyColHeader(kpiHeaderRow.getCell(i), i % 2 === 0 ? 'right' : 'left'));

    const kpis = [
        ['Total de Pedidos', data.totalPedidos, 'Remanejamentos', data.totalRemanejamentos],
        ['Pendentes', data.pendentes, 'Qtd Remanejada', data.totalQtdRemanejada],
        ['Em Cotação', data.emCotacao, '', ''],
        ['Realizados', data.realizados, '', ''],
        ['Recebidos', data.recebidos, '', ''],
    ];
    const kpiColors: Record<string, string> = {
        'Pendentes': ORANGE600, 'Em Cotação': AMBER700, 'Realizados': BLUE700, 'Recebidos': GREEN700,
    };
    kpis.forEach((row, i) => {
        const r = wsResumo.addRow(row);
        r.height = 15;
        r.getCell(1).fill = xlFill('EFF6FF');
        r.getCell(1).font = xlFont(true, 9, SLATE600.replace('FF',''));
        r.getCell(2).fill = xlFill('FFFFFFFF');
        r.getCell(2).font = { bold: true, size: 11, color: { argb: kpiColors[row[0] as string] || 'FF' + PRIMARY }, name: 'Calibri' };
        r.getCell(2).alignment = xlAlign('right');
        if (row[2]) {
            r.getCell(3).fill = xlFill('EFF6FF');
            r.getCell(3).font = xlFont(true, 9, SLATE600.replace('FF',''));
            r.getCell(4).fill = xlFill('FFFFFFFF');
            r.getCell(4).font = xlFont(true, 11, PRIMARY);
            r.getCell(4).alignment = xlAlign('right');
        }
    });
    wsResumo.addRow([]);

    // Funil
    sectionRow(wsResumo, 'FUNIL DE ATENDIMENTO', 4);
    const funilHeader = wsResumo.addRow(['Etapa', 'Quantidade', 'Taxa (%)', '']);
    funilHeader.height = 16;
    [1,2,3].forEach(i => applyColHeader(funilHeader.getCell(i), i === 1 ? 'left' : 'center'));

    const funilData = [
        ['Solicitado', data.totalItensQtd, '100%', 'FF' + PRIMARY],
        ['Atendido', data.totalAtendida, `${data.taxaAtendimento}%`, BLUE700],
        ['Recebido', data.totalRecebida, `${data.taxaRecebimento}%`, GREEN700],
    ];
    funilData.forEach(([label, qty, pct, color], i) => {
        const r = wsResumo.addRow([label, qty, pct]);
        r.height = 15;
        r.getCell(1).fill = xlFill(i % 2 === 0 ? SLATE50.replace('FF','') : 'FFFFFF');
        r.getCell(1).font = xlFont(true, 9, SLATE600.replace('FF',''));
        r.getCell(2).fill = xlFill('FFFFFF');
        r.getCell(2).font = xlFont(true, 11, PRIMARY);
        r.getCell(2).alignment = xlAlign('right');
        r.getCell(3).fill = xlFill(i % 2 === 0 ? SLATE50.replace('FF','') : 'FFFFFF');
        r.getCell(3).font = { bold: true, size: 9, color: { argb: color as string }, name: 'Calibri' };
        r.getCell(3).alignment = xlAlign('center');
    });

    wsResumo.addRow([]);

    // Valores Financeiros
    if (data.valorTotalSolicitado > 0) {
        sectionRow(wsResumo, 'VALORES FINANCEIROS', 4);
        const valHeader = wsResumo.addRow(['Indicador', 'Valor (R$)', 'Indicador', 'Valor (R$)']);
        valHeader.height = 16;
        [1,2,3,4].forEach(i => applyColHeader(valHeader.getCell(i), i % 2 === 0 ? 'right' : 'left'));

        const valRows = [
            ['Valor Solicitado', fmtBRL(data.valorTotalSolicitado), 'Valor Atendido', fmtBRL(data.valorTotalAtendido)],
            ['Valor Recebido', fmtBRL(data.valorTotalRecebido), 'Diferença não atendida', fmtBRL(data.valorTotalSolicitado - data.valorTotalAtendido)],
        ];
        valRows.forEach((row) => {
            const r = wsResumo.addRow(row);
            r.height = 15;
            r.getCell(1).fill = xlFill('EFF6FF'); r.getCell(1).font = xlFont(true, 9, SLATE600.replace('FF',''));
            r.getCell(2).font = xlFont(true, 11, PRIMARY); r.getCell(2).alignment = xlAlign('right');
            if (row[2]) {
                r.getCell(3).fill = xlFill('EFF6FF'); r.getCell(3).font = xlFont(true, 9, SLATE600.replace('FF',''));
                r.getCell(4).font = xlFont(true, 11, PRIMARY); r.getCell(4).alignment = xlAlign('right');
            }
        });
    }

    // ── Aba: Top Itens ───────────────────────────────────────
    const wsTop = wb.addWorksheet('Top Itens');
    wsTop.columns = [{ width: 6 }, { width: 44 }, { width: 16 }, { width: 12 }, { width: 16 }, { width: 18 }];
    addPageHeader(wsTop, 6);
    sectionRow(wsTop, 'TOP 10 ITENS MAIS SOLICITADOS', 6);
    const topH = wsTop.addRow(['#', 'Item', 'Código', 'Qtd Total', 'Vlr Unit.', 'Vlr Total']);
    topH.height = 16;
    [1,2,3,4,5,6].forEach((i) => applyColHeader(topH.getCell(i), i === 2 ? 'left' : 'center'));
    data.topItens.forEach((item, i) => {
        const alt = i % 2 === 0;
        const r = wsTop.addRow([i + 1, item.nome, item.codigo, item.qtd, item.valor_unitario ? fmtBRL(item.valor_unitario) : '—', item.valor_total ? fmtBRL(item.valor_total) : '—']);
        r.height = 14;
        applyRow(r.getCell(1), alt, 'center', true, i === 0 ? 'FF' + PRIMARY : SLATE600);
        applyRow(r.getCell(2), alt, 'left');
        applyRow(r.getCell(3), alt, 'center', false, SLATE600);
        applyRow(r.getCell(4), alt, 'right', true, 'FF' + PRIMARY);
        applyRow(r.getCell(5), alt, 'right', false, SLATE600);
        applyRow(r.getCell(6), alt, 'right', true, GREEN700.replace('FF', ''));
    });

    // ── Aba: Por Unidade ─────────────────────────────────────
    const wsUnidade = wb.addWorksheet('Por Unidade');
    wsUnidade.columns = [{ width: 36 }, { width: 16 }, { width: 14 }];
    addPageHeader(wsUnidade, 3);
    sectionRow(wsUnidade, 'PEDIDOS POR UNIDADE', 3);
    const unidH = wsUnidade.addRow(['Unidade', 'Qtd Pedidos', '% do Total']);
    unidH.height = 16;
    [1,2,3].forEach(i => applyColHeader(unidH.getCell(i), i === 1 ? 'left' : 'center'));
    data.pedidosPorUnidade.forEach(([nome, qtd], i) => {
        const alt = i % 2 === 0;
        const pct = data.totalPedidos > 0 ? `${Math.round((qtd / data.totalPedidos) * 100)}%` : '0%';
        const r = wsUnidade.addRow([nome, qtd, pct]);
        r.height = 14;
        applyRow(r.getCell(1), alt);
        applyRow(r.getCell(2), alt, 'right');
        applyRow(r.getCell(3), alt, 'center');
    });

    // ── Aba: Parcialmente Atendidos ──────────────────────────
    if (data.itensParcialmenteAtendidos.length > 0) {
        const wsParcial = wb.addWorksheet('Parcialmente Atendidos');
        wsParcial.columns = [{ width: 46 }, { width: 16 }, { width: 24 }, { width: 12 }, { width: 14 }, { width: 12 }, { width: 12 }];
        addPageHeader(wsParcial, 7);
        sectionRow(wsParcial, 'ITENS PARCIALMENTE ATENDIDOS', 7, 18);
        const pHdr = wsParcial.addRow(['Item', 'Código', 'Fornecedor', 'Qtd Pedida', 'Qtd Atendida', 'Pendente', '% Atendido']);
        pHdr.height = 16;
        [1,2,3,4,5,6,7].forEach(i => applyColHeader(pHdr.getCell(i), i <= 3 ? 'left' : 'center', AMBER700.replace('FF','')));
        data.itensParcialmenteAtendidos.forEach((pi, i) => {
            const alt = i % 2 === 0;
            const pct = pi.quantidade > 0 ? `${Math.round((pi.quantidade_atendida / pi.quantidade) * 100)}%` : '0%';
            const r = wsParcial.addRow([pi.item_nome, pi.item_codigo, pi.fornecedor || '—', pi.quantidade, pi.quantidade_atendida, pi.quantidade - pi.quantidade_atendida, pct]);
            r.height = 14;
            applyAmberRow(r.getCell(1), alt);
            applyAmberRow(r.getCell(2), alt, 'center');
            applyAmberRow(r.getCell(3), alt);
            applyAmberRow(r.getCell(4), alt, 'right');
            applyAmberRow(r.getCell(5), alt, 'right');
            applyAmberRow(r.getCell(6), alt, 'right', true);
            r.getCell(6).font = { bold: true, size: 9, color: { argb: RED700 }, name: 'Calibri' };
            applyAmberRow(r.getCell(7), alt, 'center');
        });
    }

    // ── Aba: Não Atendidos ───────────────────────────────────
    if (data.itensNaoAtendidos.length > 0) {
        const wsNao = wb.addWorksheet('Não Atendidos');
        wsNao.columns = [{ width: 46 }, { width: 16 }, { width: 24 }, { width: 12 }];
        addPageHeader(wsNao, 4);
        sectionRow(wsNao, 'ITENS NÃO ATENDIDOS', 4, 18);
        const nHdr = wsNao.addRow(['Item', 'Código', 'Fornecedor', 'Qtd Pedida']);
        nHdr.height = 16;
        [1,2,3,4].forEach(i => applyColHeader(nHdr.getCell(i), i <= 3 ? 'left' : 'center', RED700.replace('FF','')));
        data.itensNaoAtendidos.forEach((pi, i) => {
            const alt = i % 2 === 0;
            const r = wsNao.addRow([pi.item_nome, pi.item_codigo, pi.fornecedor || '—', pi.quantidade]);
            r.height = 14;
            applyRedRow(r.getCell(1), alt);
            applyRedRow(r.getCell(2), alt, 'center');
            applyRedRow(r.getCell(3), alt);
            applyRedRow(r.getCell(4), alt, 'right', true);
        });
    }

    // ── Aba: Divergências ────────────────────────────────────
    if (data.itensDivergentes.length > 0) {
        const wsDiv = wb.addWorksheet('Divergências');
        wsDiv.columns = [{ width: 10 }, { width: 22 }, { width: 38 }, { width: 16 }, { width: 38 }, { width: 16 }, { width: 12 }, { width: 42 }];
        addPageHeader(wsDiv, 8);
        sectionRow(wsDiv, 'DIVERGÊNCIAS DE RECEBIMENTO', 8, 18);
        const dHdr = wsDiv.addRow(['Pedido', 'Unidade', 'Item Solicitado', 'Cód. Solicitado', 'Item Recebido', 'Cód. Recebido', 'Qtd Rec.', 'Observação']);
        dHdr.height = 16;
        [1,2,3,4,5,6,7,8].forEach(i => applyColHeader(dHdr.getCell(i), [1,4,6,7].includes(i) ? 'center' : 'left', AMBER700.replace('FF','')));
        data.itensDivergentes.forEach((d, i) => {
            const alt = i % 2 === 0;
            const r = wsDiv.addRow([`#${d.pedido_numero}`, d.unidade_nome, d.item_solicitado_nome, d.item_solicitado_codigo, d.item_recebido_nome, d.item_recebido_codigo, d.quantidade_recebida, d.observacao]);
            r.height = 14;
            r.getCell(1).fill = xlFill(alt ? AMBER50.replace('FF','') : 'FFFFFF');
            r.getCell(1).font = xlFont(true, 9, PRIMARY);
            r.getCell(1).alignment = xlAlign('center');
            applyAmberRow(r.getCell(2), alt);
            applyAmberRow(r.getCell(3), alt);
            applyAmberRow(r.getCell(4), alt, 'center');
            r.getCell(5).fill = xlFill(alt ? AMBER50.replace('FF','') : 'FFFFFF');
            r.getCell(5).font = { size: 9, color: { argb: BLUE700 }, name: 'Calibri' };
            r.getCell(6).fill = xlFill(alt ? AMBER50.replace('FF','') : 'FFFFFF');
            r.getCell(6).font = { size: 9, color: { argb: BLUE700 }, name: 'Calibri' };
            r.getCell(6).alignment = xlAlign('center');
            applyAmberRow(r.getCell(7), alt, 'right');
            applyAmberRow(r.getCell(8), alt);
        });
    }

    // ── Gerar e salvar ───────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_rhc_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
}
