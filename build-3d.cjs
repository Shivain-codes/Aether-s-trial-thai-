const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const root=__dirname,read=p=>fs.readFileSync(path.join(root,p),'utf8');
const audio='data:audio/mpeg;base64,'+fs.readFileSync(path.join(root,'src3d/narration.mp3')).toString('base64');
const result=esbuild.buildSync({entryPoints:[path.join(root,'src3d/main.js')],bundle:true,minify:true,write:false,format:'iife',target:['es2020'],legalComments:'inline',define:{INTRO_VIDEO_DATA:JSON.stringify('data:video/mp4;base64,'+fs.readFileSync(path.join(root,'src3d/assets/windborne-intro.mp4')).toString('base64')),NARRATION_DATA:JSON.stringify(audio),AVATAR_BASE64:JSON.stringify(fs.readFileSync(path.join(root,'src3d/assets/traveler.vrm')).toString('base64'))}});
const js=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
const html=`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#5a989e"><title>Aether’s Trial — Windborne</title><style>${read('src3d/style.css')}</style></head><body>${read('src3d/ui.html')}<noscript>Please enable JavaScript to enter Windrise Valley.</noscript><script>${js}</script></body></html>`;
fs.writeFileSync(path.join(root,'index.html'),html);console.log('Built offline index.html:',Buffer.byteLength(html),'bytes');
