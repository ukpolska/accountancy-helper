// Generuje PDF instrukcji: npx electron docs/makepdf.js
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadFile(path.join(__dirname, 'manual.html'));
  const pdf = await win.webContents.printToPDF({ pageSize: 'A4', printBackground: true, preferCSSPageSize: true });
  fs.writeFileSync(path.join(__dirname, '..', 'Instrukcja-Manual.pdf'), pdf);
  app.quit();
});
