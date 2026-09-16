/* ===========================================================
   VISUAL UPGRADE — Pixel art 2.5D
   Reemplaza los renderizadores básicos sin tocar las reglas del juego.
   =========================================================== */
'use strict';

const VFX = {
  clouds: Array.from({length: 18}, (_, i) => ({x:(i*173)%1600, y:35+(i*47)%130, s:0.6+(i%4)*0.16, v:2+i%3})),
  spark: [],
  dust: []
};

function vPixelRect(x,y,w,h,c){ CX.fillStyle=c; CX.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); }
function vShadow(x,y,w,h=0.42){
  CX.save(); CX.fillStyle='rgba(3,5,10,.38)'; CX.beginPath(); CX.ellipse(x,y,w,h*w,0,0,Math.PI*2); CX.fill(); CX.restore();
}
function vOutlineRect(x,y,w,h,fill,edge='#151321',th=2){
  vPixelRect(x,y,w,h,edge); vPixelRect(x+th,y+th,w-th*2,h-th*2,fill);
}
function vNoiseTile(x,y,base,seed){
  const r=hash2(x,y,seed); const c=r>.72?shade(base,1.10):r<.24?shade(base,.88):base;
  CX.fillStyle=c; CX.fillRect(x,y,TS,TS);
}
function vSpriteCanvas(kind, pal, dir, frame, scale){
  const key='v2|'+kind+'|'+(pal&&pal.key||'x')+'|'+dir+'|'+frame+'|'+scale;
  if(_sprCache.has(key)) return _sprCache.get(key);
  const w=32,h=40,s=scale;
  const cv=document.createElement('canvas'); cv.width=w*s; cv.height=h*s;
  const x=cv.getContext('2d'); x.imageSmoothingEnabled=false;
  const q=(px,py,pw,ph,c)=>{x.fillStyle=c;x.fillRect(px*s,py*s,pw*s,ph*s)};
  const skin=pal.S||'#e7ad86', hair=pal.H||'#35251f', coat=pal.C||'#526aa8', hi=pal.A||'#86a9df', dark=pal.P||'#24243a', ink=pal.O||'#171321';
  const step=frame===1?-1:frame===2?1:0;
  // shadow is deliberately built into sprite for clean pixel silhouette
  q(6,34,20,3,'rgba(0,0,0,.25)');
  if(dir==='up'){
    q(8,5,16,10,hair); q(6,8,20,10,hair); q(9,11,14,9,skin);
    q(7,18,18,11,coat); q(5,20,4,9,coat); q(23,20,4,9,coat);
    q(8,29,6,7,dark); q(18,29,6,7,dark); q(7+step,35,7,3,ink); q(18-step,35,7,3,ink);
    q(10,19,12,2,hi);
  } else {
    q(9,4,14,3,hair); q(6,7,20,8,hair); q(8,11,16,9,skin);
    if(dir==='left') { q(7,13,3,2,ink); q(20,13,2,2,ink); q(5,16,4,3,skin); }
    else if(dir==='right'){ q(23,13,3,2,ink); q(10,13,2,2,ink); q(24,16,3,3,skin); }
    else { q(10,13,3,2,ink); q(19,13,3,2,ink); }
    q(6,19,20,11,coat); q(4,21,4,8,coat); q(24,21,4,8,coat);
    q(9,20,14,3,hi); q(12,23,8,6,dark);
    q(8+step,29,6,7,dark); q(18-step,29,6,7,dark);
    q(7+step,35,7,3,ink); q(18-step,35,7,3,ink);
  }
  // one-pixel highlights give the sprite a modern HD-pixel look
  q(7,10,2,5,shade(skin,1.12)); q(24,10,2,4,shade(skin,.82));
  if(frame!==0){ q(4,28+Math.max(0,step),3,2,hi); q(25,28-Math.min(0,step),3,2,hi); }
  _sprCache.set(key,cv); return cv;
}
function humanSprite(pal,dir,frame,scale){ return vSpriteCanvas('human',pal,dir,frame,scale); }

function vCreatureCanvas(d,scale){
  const key='vcreature|'+d.grid+'|'+(d.pal&&d.pal.key||'x')+'|'+scale;
  if(_sprCache.has(key)) return _sprCache.get(key);
  const cv=document.createElement('canvas'); cv.width=40*scale; cv.height=40*scale;
  const x=cv.getContext('2d'); x.imageSmoothingEnabled=false;
  const q=(a,b,c,e,col)=>{x.fillStyle=col;x.fillRect(a*scale,b*scale,c*scale,e*scale)};
  const p=d.pal||{}; const a=p.A||'#6f7890',b=p.B||'#293044',w=p.W||'#e9edf5',e=p.E||'#201527',m=p.m||'#6a3040';
  // silhouette depends on the original grid id, but is rendered as layered pixel art
  const type=d.grid||'fantasma';
  const cx=20;
  q(8,30,24,4,'rgba(0,0,0,.25)');
  if(type.includes('correo')||type.includes('notif')){
    q(5,10,30,20,e);q(7,8,26,22,b);q(10,11,20,4,a);q(9,16,22,11,b);q(12,18,4,4,w);q(24,18,4,4,w);q(13,19,3,3,e);q(24,19,3,3,e);q(14,25,12,3,m);q(4,12,3,10,a);q(33,12,3,10,a);
  } else if(type.includes('silla')||type.includes('maquina')){
    q(10,5,12,5,a);q(7,9,18,14,b);q(10,12,12,5,w);q(13,13,3,3,e);q(20,13,3,3,e);q(11,19,10,3,m);q(13,23,4,9,a);q(23,23,4,9,a);q(7,31,8,3,e);q(24,31,8,3,e);
  } else if(type.includes('vagon')||type.includes('torniquete')){
    q(4,8,32,23,e);q(7,5,26,28,b);q(10,10,20,10,a);q(12,12,5,5,w);q(23,12,5,5,w);q(13,13,3,3,e);q(24,13,3,3,e);q(12,21,16,4,m);q(7,28,26,3,a);
  } else if(type.includes('reloj')||type.includes('espejo')){
    q(6,5,28,28,e);q(8,7,24,24,b);q(11,10,18,18,w);q(13,12,3,3,e);q(24,12,3,3,e);q(15,19,10,3,m);q(19,14,3,8,a);q(16,20,3,3,a);
  } else if(type.includes('grafico')){
    q(5,29,30,4,e);q(8,10,4,19,a);q(14,18,4,11,b);q(20,14,4,15,a);q(26,8,4,21,w);q(9,8,4,4,m);q(15,13,4,4,m);q(21,9,4,4,m);q(27,4,4,4,m);
  } else {
    q(8,7,24,27,e);q(10,6,20,28,b);q(13,9,14,12,w);q(15,12,3,3,e);q(22,12,3,3,e);q(15,17,10,4,m);q(12,22,16,7,a);q(9,29,7,3,b);q(24,29,7,3,b);
  }
  // eye shine + 2-frame breathing via CSS/canvas redraw handled by caller
  q(cx-2,9,1,1,'#ffffff');
  _sprCache.set(key,cv); return cv;
}
function creatureSprite(gridName,pal,scale){
  const d={grid:gridName,pal}; return vCreatureCanvas(d,scale);
}

function drawTreeV(px,py,base,phase){
  const sway=Math.sin(tGlobal*1.1+phase)*1.1;
  vShadow(px+12,py+22,9,.35);
  vPixelRect(px+9,py+7,7,16,'#3a241b'); vPixelRect(px+11,py+5,5,18,shade(base,.58));
  vPixelRect(px+3+sway,py-1,17,10,shade(base,.72)); vPixelRect(px+1+sway,py+3,22,12,base); vPixelRect(px+5+sway,py-4,14,8,shade(base,1.12));
  vPixelRect(px+7+sway,py-2,5,4,shade(base,1.25)); vPixelRect(px+17+sway,py+4,4,5,shade(base,.84));
}
function drawBuildingV(px,py,base,x,y,th){
  const neigh=(tileAt(x-1,y)===T.BUILD)+(tileAt(x+1,y)===T.BUILD)+(tileAt(x,y-1)===T.BUILD)+(tileAt(x,y+1)===T.BUILD);
  const roof=shade(base,1.08), side=shade(base,.58), dark=shade(base,.42);
  // chunky pseudo-3D roof + wall, with edge only on exposed faces
  vPixelRect(px+2,py+5,20,21,'rgba(0,0,0,.28)');
  vPixelRect(px,py+4,24,20,dark); vPixelRect(px+1,py+2,22,18,side); vPixelRect(px+1,py,22,18,roof);
  vPixelRect(px+1,py,22,3,shade(roof,1.16));
  const win=th==='office'?'#a6c8e8':'#f0c879';
  if(neigh<3){vPixelRect(px+4,py+5,5,5,win);vPixelRect(px+15,py+5,5,5,win);vPixelRect(px+4,py+12,5,4,shade(win,.72));vPixelRect(px+15,py+12,5,4,shade(win,.72));}
}
function drawRockV(px,py,base){vShadow(px+12,py+20,8,.32);vPixelRect(px+4,py+9,16,11,shade(base,.55));vPixelRect(px+6,py+5,13,14,base);vPixelRect(px+10,py+3,6,4,shade(base,1.16));}
function drawWaterV(px,py,base,x,y){
  vPixelRect(px,py,24,24,base); const off=Math.sin(tGlobal*2.2+x*.7+y)*3;
  vPixelRect(px+2,py+7+off,8,2,shade(base,1.32)); vPixelRect(px+14,py+15-off*.4,7,2,shade(base,1.22));
  if((x+y)%3===0)vPixelRect(px+9,py+18,4,1,shade(base,.72));
}
function drawPathV(px,py,base,x,y){vPixelRect(px,py,24,24,base);if(hash2(x,y,311)>.56)vPixelRect(px+4,py+5,3,2,shade(base,.82));if(hash2(x,y,312)>.68)vPixelRect(px+15,py+15,5,2,shade(base,1.08));}

// World renderer upgraded: richer tile language, landmarks, animated ambience and stronger depth.
drawWorld = function(dt){
  const z=ZONES[World.zone], th=THEMES[z.theme];
  camX=lerp(camX,clamp(G.px-VW*.5,0,Math.max(0,World.w*TS-VW)),.16);
  camY=lerp(camY,clamp(G.py-VH*.5,0,Math.max(0,World.h*TS-VH)),.16);
  const ox=Math.floor(camX),oy=Math.floor(camY);
  const sky=th.sky; const grad=CX.createLinearGradient(0,0,0,VH);grad.addColorStop(0,sky);grad.addColorStop(1,shade(sky,.58));CX.fillStyle=grad;CX.fillRect(0,0,VW,VH);
  const x0=Math.max(0,Math.floor(ox/TS)-1),x1=Math.min(World.w-1,Math.floor((ox+VW)/TS)+1),y0=Math.max(0,Math.floor(oy/TS)-2),y1=Math.min(World.h-1,Math.floor((oy+VH)/TS)+2);
  const list=[];
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const t=tileAt(x,y);if(t===T.VOID)continue;const px=x*TS-ox,py=y*TS-oy,base=tileColor(th,t,x,y),el=ELEVATED[t]||0;
    if(t===T.WATER){drawWaterV(px,py,base,x,y);continue;}
    if(t===T.PATH||t===T.FLOOR||t===T.CARPET||t===T.METAL||t===T.SAND||t===T.SNOW||t===T.RAIL){
      if(t===T.PATH)drawPathV(px,py,base,x,y); else vNoiseTile(px,py,base,x*17+y*31);
      if(t===T.RAIL){vPixelRect(px,py+7,24,3,'#292633');vPixelRect(px,py+17,24,3,'#292633');vPixelRect(px+3,py+6,2,14,'#8a7560');}
      if(t===T.CARPET){vPixelRect(px+3,py+3,18,18,shade(base,1.05));vPixelRect(px+3,py+3,18,2,shade(base,.75));}
      if(t===T.METAL){vPixelRect(px+2,py+3,20,2,'rgba(255,255,255,.10)');}
      if(t===T.SAND && hash2(x,y,99)>.84){vPixelRect(px+6,py+13,8,2,'rgba(120,80,30,.22)');}
      if(t===T.SNOW && hash2(x,y,98)>.72){vPixelRect(px+5,py+8,3,2,'rgba(100,120,150,.22)');}
    } else if(t===T.TALL){vNoiseTile(px,py,base,x+91);for(let k=0;k<4;k++){vPixelRect(px+4+k*5,py+12,2,9,shade(base,.72));vPixelRect(px+3+k*5,py+10,2,5,shade(base,1.15));}}
    else if(t===T.TREE) list.push({y:y*TS+TS,f:()=>drawTreeV(px,py,base,x+y)});
    else if(t===T.BUILD) list.push({y:y*TS+TS,f:()=>drawBuildingV(px,py,base,x,y,z.theme)});
    else if(t===T.ROCK) list.push({y:y*TS+TS,f:()=>drawRockV(px,py,base)});
    else if(t===T.WALL||t===T.DESK){
      list.push({y:y*TS+TS,f:()=>{vShadow(px+12,py+22,9,.3);vPixelRect(px+1,py+4,22,19,shade(base,.48));vPixelRect(px,py+1,24,19,shade(base,.82));vPixelRect(px+1,py+1,22,4,shade(base,1.14));if(t===T.DESK){vPixelRect(px+3,py+5,18,9,'#40382e');vPixelRect(px+5,py+6,14,6,'#79a9cf');vPixelRect(px+8,py+13,2,7,'#2b2630');vPixelRect(px+15,py+13,2,7,'#2b2630');}}});
    } else if(t===T.DOOR){vPixelRect(px+2,py+3,20,21,'#3b2630');vPixelRect(px+5,py+1,14,23,'#8a5e3a');vPixelRect(px+8,py+5,8,19,'#4a3040');vPixelRect(px+16,py+13,2,2,'#ffd36b');}
    else if(t===T.BRIDGE){vPixelRect(px,py,24,24,'#79543b');for(let k=2;k<23;k+=5)vPixelRect(px+k,py,2,24,'#a4774f');vPixelRect(px,py+2,24,2,'#d19a63');}
  }
  World.exits.forEach(e=>list.push({y:e.y*TS+12,f:()=>drawExitV(e,ox,oy)}));
  World.chests.forEach(c=>{if(!G.chestsOpened[c.key])list.push({y:c.y*TS+22,f:()=>drawChestV(c,ox,oy)});});
  World.npcs.forEach(n=>list.push({y:n.y*TS+TS,f:()=>drawNPCV(n,ox,oy)}));
  World.bosses.forEach(b=>{if(!G.flags[b.flag]&&bossAvailable(b))list.push({y:b.y*TS+TS,f:()=>drawBossV(b,ox,oy)});});
  list.push({y:G.py+10,f:()=>drawPlayerV(ox,oy)});list.sort((a,b)=>a.y-b.y);list.forEach(o=>o.f());
  // ambient parallax specks make the world feel alive without expensive particles
  if(z.theme==='town'||z.theme==='finance'||z.theme==='office'){
    for(let i=0;i<10;i++){const xx=((i*137+tGlobal*8)% (VW+80))-40, yy=40+(i*53)%Math.max(80,VH-80);vPixelRect(xx,yy,2,2,'rgba(255,235,170,.18)');}
  }
  drawLightAndWeatherV(th,z,dt,ox,oy);
};

function drawPlayerV(ox,oy){
  const px=Math.floor(G.px-ox),py=Math.floor(G.py-oy);vShadow(px,py+15,10,.34);
  const f=G.moving?(Math.floor(G.anim)%3):0;const spr=humanSprite(CHARS.alex.pal,G.dir,f,1.35);
  const bob=G.moving?Math.sin(tGlobal*14)*1.2:Math.sin(tGlobal*2.2)*.6;CX.drawImage(spr,px-spr.width/2,py-spr.height*.72+bob);
  if(G.moving&&Math.floor(tGlobal*10)%2===0){vPixelRect(px-7,py+14,4,2,'rgba(230,220,180,.25)');vPixelRect(px+5,py+14,4,2,'rgba(230,220,180,.18)');}
}
function drawNPCV(n,ox,oy){const px=n.x*TS+12-ox,py=n.y*TS+12-oy;vShadow(px,py+14,9,.34);const bob=Math.sin(tGlobal*2+n.x*.8)*.7;const spr=humanSprite(npcPal(n.p),'down',Math.floor((tGlobal*2+n.y)%3),1.22);CX.drawImage(spr,px-spr.width/2,py-spr.height*.72+bob);if(n.shop){vPixelRect(px-4,py-30,8,5,'#ffd166');vPixelRect(px-2,py-29,4,3,'#5a3b1d');}}
function drawBossV(b,ox,oy){const px=b.x*TS+12-ox,py=b.y*TS+12-oy,d=enemyDef(b.id),spr=creatureSprite(d.grid,d.pal,2.2),pulse=1+Math.sin(tGlobal*3)*.045;vShadow(px,py+20,16,.35);CX.save();CX.translate(px,py-4);CX.scale(pulse,pulse);CX.globalAlpha=.97;CX.drawImage(spr,-spr.width/2,-spr.height*.58);CX.restore();CX.fillStyle='rgba(255,70,100,'+(.42+Math.sin(tGlobal*5)*.22)+')';CX.fillRect(px-2,py-40,4,7);CX.fillRect(px-5,py-37,10,2);}
function drawChestV(c,ox,oy){const px=c.x*TS+12-ox,py=c.y*TS+12-oy;vShadow(px,py+9,9,.35);vPixelRect(px-10,py-7,20,14,'#271b1b');vPixelRect(px-8,py-8,16,7,'#9a6239');vPixelRect(px-8,py-4,16,4,'#6d432d');vPixelRect(px-2,py-3,4,6,'#ffd66e');vPixelRect(px-12,py-11,24,3,'rgba(255,220,100,.18)');}
function drawExitV(e,ox,oy){const px=e.x*TS-ox,py=e.y*TS-oy,open=exitOpen(e),c=open?'#7ef0c2':'#e16a78';CX.fillStyle=open?'rgba(80,240,190,.13)':'rgba(225,70,90,.12)';CX.fillRect(px,py,24,24);CX.strokeStyle=c;CX.lineWidth=2;CX.strokeRect(px+1,py+1,22,22);CX.fillStyle=c;CX.font='6px monospace';CX.textAlign='center';CX.fillText(e.label.slice(0,15),px+12,py-4);CX.textAlign='left';}
function drawLightAndWeatherV(th,z,dt,ox,oy){
  // softer vignette than the original, preserving color while adding depth
  const v=CX.createRadialGradient(VW*.5,VH*.42,VH*.18,VW*.5,VH*.42,VH*.9);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(4,6,12,'+(0.58-th.amb*.35)+')');CX.fillStyle=v;CX.fillRect(0,0,VW,VH);
  const wk=z.weather;if(!wk)return;
  if(World.particles.length<110)for(let i=0;i<3;i++)World.particles.push({x:Math.random()*VW,y:Math.random()*VH});
  const cfg={rain:[-100,430,'rgba(170,210,255,.48)',1,8],snow:[20,55,'rgba(255,255,255,.75)',2,2],fog:[18,7,'rgba(210,225,240,.035)',50,20],wind:[170,24,'rgba(220,235,210,.22)',7,1],sand:[220,22,'rgba(245,205,130,.30)',6,1],ash:[-25,38,'rgba(205,205,225,.28)',2,2]}[wk]||[0,100,'rgba(255,255,255,.2)',1,3];
  World.particles.forEach(p=>{p.x+=cfg[0]*dt;p.y+=cfg[1]*dt;if(p.y>VH+20||p.x<-80||p.x>VW+80){p.x=Math.random()*VW;p.y=-10;}CX.fillStyle=cfg[2];CX.fillRect(p.x,p.y,cfg[3],cfg[4]);});
}

// Combat arena upgrade: richer staging, platforms, dramatic lighting, idle/breathing and hit effects.
drawBattle = function(dt){
  const th=THEMES[B.theme], top=th.sky, bot=shade(th.sky,.48);const g=CX.createLinearGradient(0,0,0,VH);g.addColorStop(0,top);g.addColorStop(.58,shade(top,.72));g.addColorStop(1,bot);CX.fillStyle=g;CX.fillRect(0,0,VW,VH);
  // distant silhouettes
  CX.fillStyle='rgba(0,0,0,.16)';for(let i=0;i<12;i++){const bx=i*VW/10-(tGlobal*5%80),bh=35+(i%4)*18;CX.fillRect(bx,VH*.34-bh,40,bh);CX.fillRect(bx+8,VH*.34-bh-8,24,8);}
  CX.fillStyle=shade((th[0]||['#3b3b44'])[0],.86);CX.beginPath();CX.ellipse(VW*.52,VH*.78,VW*.55,VH*.27,0,0,Math.PI*2);CX.fill();
  // tactical grid / platform rings
  CX.strokeStyle='rgba(255,255,255,.075)';CX.lineWidth=1;for(let i=0;i<7;i++){CX.beginPath();CX.ellipse(VW*.52,VH*(.57+i*.045),VW*(.18+i*.055),VH*(.08+i*.018),0,0,Math.PI*2);CX.stroke();}
  B.foes.forEach((f,i)=>{if(!f.alive)return;const sc=f.boss?3.0:2.0;const spr=creatureSprite(f.def.grid,f.def.pal,sc);const x=VW*f.x+(f.boss?VW*.09:0),y=VH*f.y;const bob=Math.sin(tGlobal*(f.boss?1.7:2.3)+i)*3;const shake=f.anim>0?Math.sin(f.anim*70)*5:0;vShadow(x+spr.width/2,y+spr.height*.86,spr.width*.42,.35);CX.save();if(f.anim>0){CX.globalAlpha=.65+Math.sin(f.anim*45)*.35;CX.translate(shake,0);}CX.drawImage(spr,Math.floor(x),Math.floor(y+bob));CX.restore();const bw=Math.max(72,spr.width+18);bar(x+spr.width/2-bw/2,y-16,bw,6,f.hp/f.max,'#ee5d6b','#26141b');CX.fillStyle='#fff';CX.font='7px monospace';CX.textAlign='center';CX.fillText(f.name+' · LV '+f.lvl,x+spr.width/2,y-21);statusIcons(f,x+spr.width/2-20,y-7);CX.textAlign='left';if(f.anim>0)f.anim-=dt;});
  B.allies.forEach((a,i)=>{const x=VW*.57+i*58,y=VH*.55+i*18,active=B.sel===a&&B.phase==='player',frame=a.alive?(active?Math.floor(tGlobal*7)%3:Math.floor(tGlobal*2)%3):0,spr=humanSprite(a.pal,'left',frame,1.55);vShadow(x+spr.width/2,y+spr.height*.82,spr.width*.36,.35);CX.save();if(!a.alive)CX.globalAlpha=.25;if(a.anim>0){CX.globalAlpha=.6+Math.sin(a.anim*40)*.4;a.anim-=dt;}if(active){CX.shadowColor='#ffd166';CX.shadowBlur=14;}CX.drawImage(spr,Math.floor(x),Math.floor(y));CX.restore();statusIcons(a,x,y-7);});
  // target reticle
  if(B.targeting){const t=B.targeting;let x,y;if(t.side==='foe'){const spr=creatureSprite(t.def.grid,t.def.pal,t.boss?3:2);x=VW*t.x+(t.boss?VW*.09:0)+spr.width/2;y=VH*t.y+spr.height*.4;}else{const i=B.allies.indexOf(t);x=VW*.57+i*58+22;y=VH*.55+i*18+24;}CX.strokeStyle='#ffd166';CX.lineWidth=2;CX.strokeRect(x-18,y-18,36,36);}
  for(let i=FloatTexts.length-1;i>=0;i--){const f=FloatTexts[i];f.life-=dt*1.5;if(f.life<=0){FloatTexts.splice(i,1);continue;}let x,y;if(f.u.side==='foe'){const spr=creatureSprite(f.u.def.grid,f.u.def.pal,f.u.boss?3:2);x=VW*f.u.x+(f.u.boss?VW*.09:0)+spr.width/2;y=VH*f.u.y+16;}else{const ii=B.allies.indexOf(f.u);x=VW*.57+ii*58+24;y=VH*.55+ii*18+18;}CX.font='bold 12px monospace';CX.textAlign='center';CX.fillStyle='rgba(0,0,0,.65)';CX.fillText(f.t,x+1,y-(1-f.life)*32+1);CX.fillStyle=f.c;CX.fillText(f.t,x,y-(1-f.life)*32);CX.textAlign='left';}
};

