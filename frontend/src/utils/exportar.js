// Exportacion de los reportes del Sprint 3 (HU-19, HU-20, HU-21 y HU-22) a PDF y Excel.
// Se generan en el navegador con los mismos datos que muestra la pantalla:
// - PDF: jsPDF + AutoTable (src/vendor/jspdf.js, se carga solo al exportar).
// - Excel (.xlsx): libro generado aqui mismo (Office Open XML sin dependencias).
//
// reporte = {
//   titulo, subtitulo, filtros: [texto], resumen: [texto], generado: { fecha, hora, usuario },
//   columnas: [{ titulo, campo, numero? }], filas: [{...}], totales?: {...}, archivo
// }

const EMPRESA = 'Kairos Digital Systems S.R.L.';
const SISTEMA = 'Sistema de Control de Ingreso a Exámenes Masivos';
const TEAL = [24, 100, 102];

function valorCelda(fila, col) {
  const v = typeof col.valor === 'function' ? col.valor(fila) : fila[col.campo];
  return v === null || v === undefined ? '' : v;
}

function textoGenerado(g) {
  return g ? `Generado el ${g.fecha} a las ${g.hora}${g.usuario ? ` por ${g.usuario}` : ''}` : '';
}

function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------- PDF

export async function exportarPDF(r) {
  const { jsPDF, autoTable } = await import('../vendor/jspdf');
  const horizontal = r.columnas.length > 6;
  const doc = new jsPDF({ orientation: horizontal ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();
  let y = 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...TEAL);
  doc.text(EMPRESA, 14, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110);
  doc.text(SISTEMA, 14, y + 4.5);
  doc.text(textoGenerado(r.generado), ancho - 14, y, { align: 'right' });
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.5);
  doc.line(14, y + 7, ancho - 14, y + 7);
  y += 15;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30);
  doc.text(r.titulo, 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(70);
  const lineas = [r.subtitulo, ...(r.filtros?.length ? [`Filtros: ${r.filtros.join(' · ')}`] : []), ...(r.resumen ?? [])].filter(Boolean);
  lineas.forEach((l) => {
    const partes = doc.splitTextToSize(l, ancho - 28);
    doc.text(partes, 14, y);
    y += 4.5 * partes.length;
  });

  const cuerpo = r.filas.map((f) => r.columnas.map((c) => String(valorCelda(f, c))));
  const pie = r.totales ? [r.columnas.map((c, i) => (i === 0 ? 'Total' : String(r.totales[c.campo] ?? '')))] : undefined;

  autoTable(doc, {
    startY: y + 2,
    head: [r.columnas.map((c) => c.titulo)],
    body: cuerpo,
    foot: pie,
    showFoot: 'lastPage',
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.8, lineColor: [210, 225, 225], lineWidth: 0.1, textColor: 40 },
    headStyles: { fillColor: TEAL, textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [238, 252, 251], textColor: 30, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [247, 252, 252] },
    columnStyles: Object.fromEntries(r.columnas.map((c, i) => [i, c.numero ? { halign: 'right' } : {}])),
    margin: { left: 14, right: 14, bottom: 14 },
  });

  // Pie de pagina con el numero de pagina (cuando ya se conoce el total).
  const paginas = doc.internal.getNumberOfPages();
  for (let p = 1; p <= paginas; p += 1) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(130);
    doc.text(`${EMPRESA} · ${r.titulo}`, 14, doc.internal.pageSize.getHeight() - 7);
    doc.setTextColor(130);
    doc.text(`Página ${p} de ${paginas}`, ancho - 14, doc.internal.pageSize.getHeight() - 7, { align: 'right' });
  }

  doc.save(`${r.archivo}.pdf`);
}

// ---------------------------------------------------------------- Excel (.xlsx)

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = TABLA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ZIP sin compresion (metodo "store"), suficiente para un .xlsx.
function zip(archivos) {
  const enc = new TextEncoder();
  const partes = [];
  const central = [];
  let desplazamiento = 0;
  archivos.forEach(({ nombre, contenido }) => {
    const nombreB = enc.encode(nombre);
    const datos = enc.encode(contenido);
    const crc = crc32(datos);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint16(8, 0, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, datos.length, true);
    local.setUint32(22, datos.length, true);
    local.setUint16(26, nombreB.length, true);
    partes.push(new Uint8Array(local.buffer), nombreB, datos);

    const cab = new DataView(new ArrayBuffer(46));
    cab.setUint32(0, 0x02014b50, true);
    cab.setUint16(4, 20, true);
    cab.setUint16(6, 20, true);
    cab.setUint16(8, 0x0800, true);
    cab.setUint32(16, crc, true);
    cab.setUint32(20, datos.length, true);
    cab.setUint32(24, datos.length, true);
    cab.setUint16(28, nombreB.length, true);
    cab.setUint32(42, desplazamiento, true);
    central.push(new Uint8Array(cab.buffer), nombreB);
    desplazamiento += 30 + nombreB.length + datos.length;
  });
  const tamCentral = central.reduce((s, b) => s + b.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, archivos.length, true);
  fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tamCentral, true);
  fin.setUint32(16, desplazamiento, true);
  return new Blob([...partes, ...central, new Uint8Array(fin.buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

const xml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Caracteres de control no validos en XML.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

function columnaLetra(i) {
  let s = '';
  let n = i + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// Estilos: 0 normal, 1 titulo, 2 encabezado de tabla, 3 negrita, 4 texto gris
const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="5"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><color rgb="FF186466"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><sz val="10"/><color rgb="FF555555"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF186466"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD2E1E1"/></left><right style="thin"><color rgb="FFD2E1E1"/></right><top style="thin"><color rgb="FFD2E1E1"/></top><bottom style="thin"><color rgb="FFD2E1E1"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/><xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

export function exportarExcel(r) {
  const filasXml = [];
  let fila = 0;
  const celda = (col, valor, estilo = 0) => {
    const ref = `${columnaLetra(col)}${fila}`;
    if (typeof valor === 'number' && Number.isFinite(valor)) return `<c r="${ref}" s="${estilo}"><v>${valor}</v></c>`;
    return `<c r="${ref}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${xml(valor)}</t></is></c>`;
  };
  // Cada fila es una lista de [valor, estilo]; la fila se numera antes de armar sus celdas.
  const agregar = (valores) => {
    fila += 1;
    filasXml.push(`<row r="${fila}">${valores.map(([v, e], i) => celda(i, v, e)).join('')}</row>`);
  };

  agregar([[r.titulo, 1]]);
  agregar([[`${EMPRESA} · ${SISTEMA}`, 4]]);
  [r.subtitulo, ...(r.filtros?.length ? [`Filtros: ${r.filtros.join(' · ')}`] : []), ...(r.resumen ?? []), textoGenerado(r.generado)]
    .filter(Boolean)
    .forEach((l) => agregar([[l, 4]]));
  fila += 1; // fila en blanco
  const filaEncabezado = fila + 1;
  agregar(r.columnas.map((c) => [c.titulo, 2]));
  r.filas.forEach((f) => agregar(r.columnas.map((c) => [valorCelda(f, c), 0])));
  if (r.totales) agregar(r.columnas.map((c, i) => [i === 0 ? 'Total' : r.totales[c.campo] ?? '', 3]));

  const anchos = r.columnas.map((c) =>
    Math.min(60, Math.max(String(c.titulo).length, ...r.filas.map((f) => String(valorCelda(f, c)).length)) + 3)
  );
  const hoja = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="${filaEncabezado}" topLeftCell="A${filaEncabezado + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${anchos.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>
<sheetData>${filasXml.join('')}</sheetData>
</worksheet>`;

  const nombreHoja = xml(r.hoja ?? 'Reporte').slice(0, 31);
  const blob = zip([
    {
      nombre: '[Content_Types].xml',
      contenido: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    },
    {
      nombre: '_rels/.rels',
      contenido: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      nombre: 'xl/workbook.xml',
      contenido: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${nombreHoja}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      nombre: 'xl/_rels/workbook.xml.rels',
      contenido: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    { nombre: 'xl/styles.xml', contenido: ESTILOS },
    { nombre: 'xl/worksheets/sheet1.xml', contenido: hoja },
  ]);
  descargar(blob, `${r.archivo}.xlsx`);
}
