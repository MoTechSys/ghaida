// يولّد ghcrypto.mjs (ESM للـWorker/Node) من ghcrypto.js (المصدر الوحيد — نفس الملف يُضمَّن داخل الكتاب).
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const d = path.dirname(url.fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(d, 'ghcrypto.js'), 'utf8').replace(/^if \(typeof module[^\n]*$/m, '');
fs.writeFileSync(path.join(d, 'ghcrypto.mjs'), '// AUTO-GENERATED from ghcrypto.js by make-esm.mjs — do not edit\n' + src + '\nexport default GHC;\n');
console.log('ghcrypto.mjs regenerated');
