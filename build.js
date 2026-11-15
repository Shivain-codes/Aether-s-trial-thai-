// Concatenates src/*.js and styles.css into one self-contained legacy-2d.html
const fs=require('fs'),path=require('path');
const order=['config','collision','elements','projectiles','combat','world','enemies','bosses','levels','progression','inventory','loot','minimap','hud','audio','particles','sprites','renderer','cinematic','input','camera','player','engine'];
const src=n=>fs.readFileSync(path.join(__dirname,'src',n),'utf8');
const js=order.map(n=>'/* ==== '+n+'.js ==== */\n'+src(n+'.js')).join('\n').replace(/<\/script/gi,'<\\/script');
const html=`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Aether's Trial</title>
<style>
${src('styles.css')}
</style></head>
<body>
<canvas id="game" width="960" height="540" tabindex="0"></canvas>
<div id="narrFallback"></div>
<script>
${js}
</script>
</body></html>
`;
fs.writeFileSync(path.join(__dirname,'legacy-2d.html'),html);
console.log('legacy-2d.html',html.length,'bytes');
