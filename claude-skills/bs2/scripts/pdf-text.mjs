import * as pdfjs from './node_modules/pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
const doc = await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(process.argv[2]))}).promise;
let out='';for(let i=1;i<=doc.numPages;i++){const c=await (await doc.getPage(i)).getTextContent();out+=`\n[p${i}] `+c.items.map(x=>x.str).join(' ');}
fs.writeFileSync(process.argv[3],out);
