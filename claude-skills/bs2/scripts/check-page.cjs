const { chromium } = require(process.cwd()+'/node_modules/playwright');
(async()=>{const b=await chromium.launch();for(const [w,n] of [[1200,'desk'],[390,'mob']]){const p=await b.newPage({viewport:{width:w,height:900}});await p.goto(process.argv[2],{waitUntil:'networkidle'});const t=await p.$$('table');console.log(n,'tables',t.length);if(t[0]){await t[0].scrollIntoViewIfNeeded();await p.screenshot({path:process.argv[3]+'/'+n+'.png'});}
const sw=await p.evaluate(()=>document.documentElement.scrollWidth);console.log(n,'scrollWidth',sw);}await b.close();})();
