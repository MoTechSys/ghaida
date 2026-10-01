// يولّد src/qrlib.ts من مكتبة qrcode-generator (نص يُضمَّن في صفحة التسليم)
import fs from 'fs';
const dir='node_modules/qrcode-generator/dist/';
const f=fs.readdirSync(dir).find(x=>/qrcode\.js$/.test(x))||fs.readdirSync(dir).find(x=>x.endsWith('.js'));
let src=fs.readFileSync(dir+f,'utf8').replace(/^export\s+default\s+qrcode;?\s*$/m,'').replace(/\bexport\s+/g,'');
fs.writeFileSync('src/qrlib.ts','// generated from qrcode-generator (MIT) — do not edit\nexport default '+JSON.stringify(src)+';\n');
console.log('qrlib from',f,src.length);
