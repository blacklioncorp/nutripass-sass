/**
 * Premium Excel export using ExcelJS + file-saver.
 * Generates a fully styled .xlsx with corporate headers, green column headers,
 * and currency-formatted money columns.
 */
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { TransactionDetail } from '@/app/(dashboard)/school/actions';

// Re-export types so SchoolDashboardBI can reference them
export type SaleRow = {
  date: string;
  sales: number;
  date_iso?: string;
};

export type TopProduct = {
  name: string;
  quantity: number;
  revenue: number;
};

// ─── Premium Excel Export ─────────────────────────────────────────────────────

export async function downloadPremiumExcel(
  rows: TransactionDetail[],
  schoolName: string,
  daysBack = 30
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SafeLunch Platform';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Reporte de Ventas', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
    views: [{ state: 'frozen', ySplit: 5 }],
  });

  // ── Column Definitions ──────────────────────────────────────────────────────
  sheet.columns = [
    { key: 'folio',          header: 'Folio',           width: 12 },
    { key: 'fecha',          header: 'Fecha',           width: 14 },
    { key: 'hora',           header: 'Hora',            width: 10 },
    { key: 'consumidor',     header: 'Consumidor',      width: 26 },
    { key: 'identificador',  header: 'Matrícula / ID',  width: 16 },
    { key: 'producto',       header: 'Producto',        width: 32 },
    { key: 'tipo_billetera', header: 'Billetera',       width: 12 },
    { key: 'cantidad',       header: 'Cant.',           width: 8  },
    { key: 'precio_unitario',header: 'Precio Unit.',    width: 14 },
    { key: 'total',          header: 'Total',           width: 14 },
    { key: 'metodo_pago',    header: 'Método Pago',     width: 18 },
  ];

  // ── Row 1: Corporate Header ─────────────────────────────────────────────────
  sheet.mergeCells('A1:K1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `SafeLunch — Reporte de Ventas`;
  titleCell.font = { name: 'Calibri', size: 20, bold: true, color: { argb: 'FF1a3a5c' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(1).height = 36;

  // ── Row 2: School Name ──────────────────────────────────────────────────────
  sheet.mergeCells('A2:K2');
  const schoolCell = sheet.getCell('A2');
  schoolCell.value = schoolName.toUpperCase();
  schoolCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF004B87' } };
  schoolCell.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(2).height = 24;

  // ── Row 3: Period Label ─────────────────────────────────────────────────────
  sheet.mergeCells('A3:K3');
  const periodCell = sheet.getCell('A3');
  const dateLabel = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
  periodCell.value = `Período: Últimos ${daysBack} días — Generado el ${dateLabel}`;
  periodCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF8aa8cc' } };
  periodCell.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(3).height = 18;

  // ── Row 4: Empty spacer ─────────────────────────────────────────────────────
  sheet.getRow(4).height = 10;

  // ── Row 5: Column Headers (Green Background) ────────────────────────────────
  const headerRow = sheet.getRow(5);
  headerRow.height = 28;

  const headers = [
    'Folio', 'Fecha', 'Hora', 'Consumidor', 'Matrícula / ID',
    'Producto', 'Billetera', 'Cant.', 'Precio Unit.', 'Total', 'Método Pago'
  ];

  headers.forEach((header, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = header;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF10B981' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF059669' } },
    };
  });

  // ── Rows 6+: Data ───────────────────────────────────────────────────────────
  const currencyFormat = '"$"#,##0.00';
  const altFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF0FDF4' }, // very light green tint for alt rows
  };

  rows.forEach((row, idx) => {
    const excelRow = sheet.addRow({
      folio:           row.folio,
      fecha:           row.fecha,
      hora:            row.hora,
      consumidor:      row.consumidor,
      identificador:   row.identificador,
      producto:        row.producto,
      tipo_billetera:  row.tipo_billetera,
      cantidad:        row.cantidad,
      precio_unitario: row.precio_unitario,
      total:           row.total,
      metodo_pago:     row.metodo_pago,
    });

    excelRow.height = 20;

    // Apply currency format to money columns (9=Precio Unit., 10=Total)
    ['precio_unitario', 'total'].forEach(key => {
      const colIndex = sheet.columns.findIndex(c => c.key === key) + 1;
      const cell = excelRow.getCell(colIndex);
      cell.numFmt = currencyFormat;
    });

    // Alternating row fill
    if (idx % 2 === 0) {
      excelRow.eachCell(cell => {
        cell.fill = altFill;
      });
    }

    // Center-align certain columns
    ['folio', 'fecha', 'hora', 'tipo_billetera', 'cantidad', 'metodo_pago'].forEach(key => {
      const colIndex = sheet.columns.findIndex(c => c.key === key) + 1;
      excelRow.getCell(colIndex).alignment = { horizontal: 'center', vertical: 'middle' };
    });
  });

  // ── Totals Row ──────────────────────────────────────────────────────────────
  if (rows.length > 0) {
    const totalRow = sheet.addRow({});
    totalRow.height = 24;

    const labelCell = totalRow.getCell(1);
    labelCell.value = `TOTAL (${rows.length} transacciones)`;
    labelCell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FF1a3a5c' } };
    sheet.mergeCells(`A${totalRow.number}:H${totalRow.number}`);

    const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);
    const totalCell = totalRow.getCell(10); // 'total' column
    totalCell.value = grandTotal;
    totalCell.numFmt = currencyFormat;
    totalCell.font = { name: 'Calibri', bold: true, size: 12, color: { argb: 'FF10B981' } };
    totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6FAF3' } };
  }

  // ── Generate & Download ─────────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const dateStr = new Date().toISOString().split('T')[0];
  saveAs(blob, `SafeLunch_Reporte_${schoolName.replace(/\s+/g, '_')}_${dateStr}.xlsx`);
}

// ─── CSV Utility (unchanged) ──────────────────────────────────────────────────

export function downloadCSV(data: any[], filename: string) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const val = row[header];
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',')
    )
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
