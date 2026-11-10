// Podatkowa księga przychodów i rozchodów (KPIR) – plik Excel w układzie wzoru księgowej: jeden plik na rok, osobna zakładka na każdy miesiąc.
// d = {name,address,activity,year,months:[{month,rows:[{date:'RRRR-MM-DD',number,party,nip,addr,desc,type:'inc'|'oth'|'exp',amount}]}]}
(function (root) {
  const MN = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
  const SUM = ['G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'Q'];
  const WIDTHS = { A: 3.6, B: 13.3, C: 25, D: 31, E: 34.1, F: 23.3, G: 13.9, H: 14, I: 14, J: 12.6, K: 10.7, L: 12.9, M: 11.7, N: 13.7, O: 9, P: 18.7, Q: 10.3, R: 8.6 };
  const r2 = x => Math.round((x + Number.EPSILON) * 100) / 100;
  const thin = { style: 'thin' };
  const box = { top: thin, left: thin, bottom: thin, right: thin };

  function buildKpir(ExcelJS, d) {
    const wb = new ExcelJS.Workbook();
    wb.calcProperties.fullCalcOnLoad = true;
    let prev = null;
    d.months.slice().sort((a, b) => a.month - b.month).forEach(mo => {
      const rows = mo.rows.map((r, i) => ({ r, i })).sort((a, b) => (a.r.date || '').localeCompare(b.r.date || '') || a.i - b.i).map(x => x.r);
      if (!rows.length) return;
      const name = `KPIR_${String(mo.month).padStart(2, '0')}.${d.year}`;
      const ws = wb.addWorksheet(name, { pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 } } });
      ws.properties.defaultRowHeight = 12.75;
      Object.keys(WIDTHS).forEach(c => ws.getColumn(c).width = WIDTHS[c]);
      ws.getColumn('S').width = 3;
      const font = (o) => Object.assign({ name: 'Times New Roman', size: 10 }, o);
      const put = (addr, v, o = {}) => { const c = ws.getCell(addr); c.value = v; c.font = font(o.font); if (o.align) c.alignment = o.align; if (o.numFmt) c.numFmt = o.numFmt; return c; };

      put('C1', 'PODATKOWA KSIĘGA PRZYCHODÓW I ROZCHODÓW', { font: { bold: true, size: 18 } });
      put('C3', d.name || '', { font: { bold: true } });
      put('C4', '(imię i nazwisko (firma))', { font: { size: 8, italic: true } });
      put('C6', d.address || '');
      put('C7', '(adres)', { font: { size: 8, italic: true } });
      put('C9', d.activity || '');
      put('C10', 'Rodzaj działalności', { font: { size: 8, italic: true } });
      put('A12', 'Strona 1', { font: { bold: true } });
      put('C12', 'Miesiąc:', { font: { bold: true } });
      put('D12', MN[mo.month - 1], { font: { bold: true } });
      put('E12', 'rok: ' + d.year, { font: { bold: true } });
      put('N12', 'Strona 1', { font: { bold: true } });

      const head = { A14: 'Lp.', B14: 'Data zdarzenia gospodarczego', C14: 'Numer dokumentu księgowego', D14: 'Kontrahent', F14: 'Opis zdarzenia gospodarczego', G14: 'Przychód',
        J14: 'Zakup towarów handlowych i materiałów wg cen zakupu', K14: 'Wydatki (koszty)', P14: 'Koszty działalności badawczo-rozwojowej, o których mowa w art. 26e ustawy o podatku dochodowym', R14: 'Uwagi',
        D15: 'Imię i nazwisko (firma)', E15: 'Adres', G15: 'Wartość sprzedanych towarów i usług', H15: 'Pozostałe przychody', I15: 'Razem przychód', K15: 'Koszty uboczne zakupu',
        L15: 'Wynagrodzenia w gotówce i w naturze', M15: 'Pozostałe wydatki', N15: 'Razem wydatki (12 + 13 + 14)', O15: 'INNE', P15: 'opis kosztu', Q15: 'wartość' };
      ['A14:A15', 'B14:B15', 'C14:C15', 'D14:E14', 'F14:F15', 'G14:I14', 'J14:J15', 'K14:O14', 'P14:Q14', 'R14:R15', 'P16:Q16'].forEach(m => ws.mergeCells(m));
      Object.keys(head).forEach(a => put(a, head[a], { font: { bold: true, size: 9 } }));
      'ABCDEFGHIJKLMNOPQR'.split('').forEach((c, i) => {
        if (c === 'Q') return;
        const n = c === 'R' ? 17 : i + 1;
        put(c + '16', n, { font: { size: 8 } });
      });
      for (let r = 14; r <= 16; r++) 'ABCDEFGHIJKLMNOPQR'.split('').forEach(c => {
        const cell = ws.getCell(c + r);
        cell.border = box;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      });
      ws.getRow(1).height = 22.5; ws.getRow(14).height = 25.5; ws.getRow(15).height = 51.75; ws.getRow(16).height = 15.75;

      const first = 18, last = first + rows.length - 1;
      const tot = {}; SUM.forEach(c => tot[c] = 0);
      rows.forEach((x, i) => {
        const r = first + i, inc = x.type === 'inc', oth = x.type === 'oth', exp = x.type === 'exp';
        const amt = r2(x.amount || 0), p = (x.date || '').split('-').map(Number);
        const D = (a, v, o) => put(a, v, Object.assign({ align: { vertical: 'top', wrapText: true } }, o));
        D('A' + r, i + 1, { align: { vertical: 'top', horizontal: 'center' } });
        D('B' + r, p.length === 3 ? new Date(Date.UTC(p[0], p[1] - 1, p[2])) : '', { numFmt: 'dd.mm.yyyy', align: { vertical: 'top', horizontal: 'center' } });
        D('C' + r, x.number || '');
        D('D' + r, (x.party || '') + (x.nip ? '\nNIP: ' + x.nip : ''));
        D('E' + r, x.addr || '');
        D('F' + r, x.desc || '');
        const money = { numFmt: '#,##0.00', align: { vertical: 'top' } };
        D('G' + r, inc ? amt : 0, money);
        if (oth) D('H' + r, amt, money);
        D('I' + r, { formula: `G${r}+H${r}`, result: inc || oth ? amt : 0 }, money);
        D('M' + r, exp ? amt : 0, money);
        D('N' + r, { formula: `K${r}+L${r}+M${r}`, result: exp ? amt : 0 }, money);
        if (inc) { tot.G += amt; tot.I += amt; } if (oth) { tot.H += amt; tot.I += amt; } if (exp) { tot.M += amt; tot.N += amt; }
        ws.getRow(r).height = 30;
      });
      SUM.forEach(c => tot[c] = r2(tot[c]));
      const sr = last + 1, pr = last + 2, mr = last + 3, yr = last + 4;
      const ytd = {}; SUM.forEach(c => ytd[c] = r2(tot[c] + (prev ? prev.ytd[c] : 0)));
      const labels = { [sr]: 'Suma strony', [pr]: 'Razem z poprzedniej strony', [mr]: 'Razem za miesiąc', [yr]: 'Razem od początku roku' };
      Object.keys(labels).forEach(r => put('F' + r, labels[r], { font: { bold: true }, align: { horizontal: 'right' } }));
      SUM.forEach(c => {
        const money = { numFmt: '#,##0.00', font: { bold: true } };
        put(c + sr, { formula: `SUM(${c}${first}:${c}${last})`, result: tot[c] }, money);
        put(c + pr, 0, money);
        put(c + mr, { formula: `${c}${sr}+${c}${pr}`, result: tot[c] }, money);
        put(c + yr, prev ? { formula: `${c}${mr}+'${prev.name}'!${c}${prev.yr}`, result: ytd[c] } : { formula: `${c}${mr}`, result: ytd[c] }, money);
      });
      for (let r = first; r <= yr; r++) 'ABCDEFGHIJKLMNOPQR'.split('').forEach(c => { ws.getCell(c + r).border = box; });
      const dr = yr + 3;
      [['Dochód – suma strony', sr, tot], ['Dochód – z poprzedniej strony', pr, null], ['Dochód – za miesiąc', mr, tot], ['Dochód – od początku roku', yr, ytd]].forEach(([lab, row, v], i) => {
        const r = dr + i;
        put('F' + r, lab, { font: { bold: true }, align: { horizontal: 'right' } });
        put('G' + r, { formula: `I${row}-N${row}`, result: v ? r2(v.I - v.N) : 0 }, { numFmt: '#,##0.00', font: { bold: true } });
      });
      prev = { name, yr, ytd };
    });
    return wb.xlsx.writeBuffer();
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { buildKpir }; else root.buildKpir = buildKpir;
})(typeof window !== 'undefined' ? window : globalThis);
