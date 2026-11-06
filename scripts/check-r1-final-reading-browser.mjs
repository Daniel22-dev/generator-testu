#!/usr/bin/env node
import { chromium } from 'playwright';

const escapeHtml=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const payload='První odstavec.\r\nDruhý odstavec s dlouhým slovem abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz.\nTřetí <img src=x onerror=alert(1)>.';
const rendered=escapeHtml(payload);
const css='.reading-passage{white-space:pre-line;text-align:justify;text-align-last:left;overflow-wrap:anywhere;word-break:normal;line-height:1.65;max-width:100%;box-sizing:border-box;padding:12px 8px}';
const browser=await chromium.launch({headless:true});
try{
  for(const width of [360,768]){
    const page=await browser.newPage({viewport:{width,height:720}});
    await page.setContent(`<style>${css}</style><main>${['instant-student','secure-student','teacher-preview','teacher-print'].map(id=>`<section id="${id}" class="reading-passage">${rendered}</section>`).join('')}</main>`);
    const result=await page.evaluate(()=>[...document.querySelectorAll('.reading-passage')].map(el=>({lines:el.getClientRects().length,scripts:el.querySelectorAll('script,img').length,justify:getComputedStyle(el).textAlign,whiteSpace:getComputedStyle(el).whiteSpace,overflow:el.scrollWidth<=el.clientWidth,text:el.textContent})));
    for(const [index,item] of result.entries()){
      if(item.scripts!==0||item.justify!=='justify'||item.whiteSpace!=='pre-line'||!item.overflow||!item.text.includes('<img src=x onerror=alert(1)>')||!item.text.includes('\n'))throw new Error(`viewport ${width}, renderer ${index}: ${JSON.stringify(item)}`);
    }
    console.log(`PASS ID13 browser viewport ${width}px: 4 render paths, CRLF/LF, XSS text, justify, no horizontal overflow`);
    await page.close();
  }
}finally{await browser.close();}
