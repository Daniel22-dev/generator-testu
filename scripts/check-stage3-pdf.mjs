import fs from 'node:fs';
const teacher=fs.readFileSync('src/js/13f-secure-teacher-verifier.js','utf8')+'\n'+fs.readFileSync('src/js/13fa-secure-teacher-verifier-pdf.js','utf8');
const pkg=fs.readFileSync('src/js/13c-secure-package.js','utf8');
const checks=[
 ['contract',teacher.includes("PDF_STAGE3_CONTRACT='ghrab-verifier-pdf-v1'")],
 ['student direct PDF',teacher.includes('downloadDirectPdf(false)')],
 ['teacher direct PDF',teacher.includes('downloadDirectPdf(true)')],
 ['binary PDF header',teacher.includes("'%PDF-1.4\\n'")],
 ['application/pdf blob',teacher.includes("type:'application/pdf'")],
 ['origin-clean DOM rasterizer',teacher.includes('pdf3Rasterize')&&!teacher.includes('<foreignObject')&&!teacher.includes('foreignObject width=')],
 ['safe pagination',teacher.includes('pdf3PageCuts')&&teacher.includes('pdf3SafeBlockCut')&&teacher.includes('pdf3SafeTextCut')],
 ['print fallback',teacher.includes('openPrint(false)')&&teacher.includes('openPrint(true)')],
 ['embedded school logo config',teacher.includes('schoolLogoDataUri')&&pkg.includes('secureSchoolLogoDataUri')],
 ['Czech labels',teacher.includes('Jméno:')&&teacher.includes('Známka:')&&teacher.includes('uložit jako PDF')&&teacher.includes('Výchozí věta:')&&teacher.includes('Vysvětlení:')&&!teacher.includes('Vychozi veta:')&&!teacher.includes('Vysvetleni:')],
 ['student filename',teacher.includes("'student_'")],
 ['teacher filename',teacher.includes("'ucitel_klic_'")],
];
let bad=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)bad++;}
if(bad)process.exit(1);
console.log('PASS Stage 3 PDF contract');
