# Third-party software / Oprogramowanie osób trzecich

Accountancy Helper uses the following free software. Each remains under its own licence.
Program korzysta z poniższego wolnego oprogramowania; każdy składnik pozostaje na własnej licencji.

| Component | Used for | Licence |
|---|---|---|
| [Electron](https://www.electronjs.org/) 45 | the desktop application shell (includes Chromium; its notices are shipped in the installer) | MIT |
| [pdf.js](https://github.com/mozilla/pdf.js) (pdfjs-dist 3.11) | reading text from PDF invoices | Apache-2.0 |
| [ExcelJS](https://github.com/exceljs/exceljs) 4.4 | writing the KPIR Excel file | MIT |
| [Tesseract.js](https://github.com/naptha/tesseract.js) 7 and tesseract.js-core | text recognition (OCR) for scans and photos | Apache-2.0 |
| [tessdata (Polish)](https://www.npmjs.com/package/@tesseract.js-data/pol) (@tesseract.js-data/pol) | Polish OCR language data | MIT (package) |
| [JSZip](https://stuk.github.io/jszip/) 3.10 | opening ZIP archives (used under the MIT option of its dual licence) | MIT OR GPL-3.0-or-later |
| [bir1](https://www.npmjs.com/package/bir1) 4.2 | optional GUS REGON company lookup | MIT |
| [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) 5, [entities](https://github.com/fb55/entities) 7 | XML handling inside bir1 | MIT, BSD-2-Clause |
| [electron-builder](https://www.electron.build/) (build tool only) | creating the Windows installer | MIT |

Full licence texts are in each package's folder under `node_modules` and, for Electron and Chromium, in the installed program folder.
Pełne teksty licencji znajdują się w folderach pakietów w `node_modules` oraz, dla Electron i Chromium, w folderze zainstalowanego programu.
