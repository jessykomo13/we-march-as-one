// ================================================================ kit de la ville : matériaux, textures et objets réutilisables
// Tout est généré par code (aucun fichier), et partagé : une géométrie et un matériau par type d'objet.
const texCache=new Map();
const md=(a,n)=>((a%n)+n)%n;
function cTex(key,w,h,draw,rep=true){let t=texCache.get(key);if(!t){t=canvasTex(w,h,draw,rep);texCache.set(key,t);}return t;}
const mat=(o)=>new THREE.MeshStandardMaterial(Object.assign({roughness:0.85},o));
// --- panneaux et enseignes : texte sur fond, mis en cache par texte
function signMat(text,bg="#123a6b",fg="#ffffff",opt={}){
  const key="sign|"+text+bg+fg+(opt.cross||"")+(opt.border||"");
  let m=texCache.get(key+"|m");if(m)return m;
  const W=opt.w||512,H=opt.h||128;
  const t=canvasTex(W,H,(g)=>{g.fillStyle=bg;g.fillRect(0,0,W,H);
    if(opt.border){g.strokeStyle=opt.border;g.lineWidth=H*0.08;g.strokeRect(H*0.06,H*0.06,W-H*0.12,H-H*0.12);}
    let x=W/2;if(opt.cross){g.fillStyle=opt.cross;const s=H*0.5,cx=H*0.55,cy=H/2;g.fillRect(cx-s*0.18,cy-s/2,s*0.36,s);g.fillRect(cx-s/2,cy-s*0.18,s,s*0.36);x=W/2+H*0.3;}
    g.fillStyle=fg;let fs=H*0.52;g.font=`700 ${fs}px system-ui,sans-serif`;while(g.measureText(text).width>W*(opt.cross?0.72:0.9)&&fs>10){fs-=2;g.font=`700 ${fs}px system-ui,sans-serif`;}
    g.textAlign="center";g.textBaseline="middle";g.fillText(text,x,H/2+fs*0.04);},false);
  m=mat({map:t,roughness:0.6,emissive:opt.glow?0xffffff:0,emissiveMap:opt.glow?t:null,emissiveIntensity:opt.glow?0.35:0});texCache.set(key+"|m",m);return m;
}
// --- textures de façades
const KM={
  houseWall:["#efe6d6","#f6f3ec","#f1d7c9","#d9e6e3","#efe1b8","#e2ddd3"].map((c,i)=>mat({map:cTex("hw"+i,96,90,(g,w,h)=>{g.fillStyle=c;g.fillRect(0,0,w,h);
    g.fillStyle="rgba(0,0,0,.05)";for(let y=0;y<h;y+=6)g.fillRect(0,y,w,1);
    g.fillStyle="#f7f7f4";g.fillRect(28,24,40,42);g.fillStyle="#36475a";g.fillRect(32,28,32,34);g.fillStyle="rgba(190,215,235,.5)";g.fillRect(34,30,13,30);g.fillRect(49,30,13,30);
    g.fillStyle=["#4a6b8a","#7a4f3a","#3f6b4f","#8a8a8a"][i%4];g.fillRect(20,24,7,42);g.fillRect(69,24,7,42);})})),
  roofTile:mat({map:cTex("roofT",128,128,(g,w,h)=>{g.fillStyle="#a9583b";g.fillRect(0,0,w,h);for(let y=0;y<h;y+=16)for(let x=(y/16%2)*8;x<w;x+=16){g.fillStyle=`rgb(${150+Math.random()*30},${70+Math.random()*20},${45+Math.random()*12})`;g.fillRect(x,y,15,14);}}),roughness:0.9}),
  roofSlate:mat({map:cTex("roofS",128,128,(g,w,h)=>{g.fillStyle="#4b5058";g.fillRect(0,0,w,h);for(let y=0;y<h;y+=12)for(let x=(y/12%2)*10;x<w;x+=20){g.fillStyle=`rgb(${62+Math.random()*16},${66+Math.random()*16},${74+Math.random()*16})`;g.fillRect(x,y,19,11);}}),roughness:0.8}),
  door:mat({map:cTex("door",64,128,(g,w,h)=>{g.fillStyle="#6b4429";g.fillRect(0,0,w,h);g.strokeStyle="#4a2e1b";g.lineWidth=4;g.strokeRect(8,8,w-16,h/2-12);g.strokeRect(8,h/2+4,w-16,h/2-12);g.fillStyle="#d8b66a";g.fillRect(w-14,h/2,5,5);}),roughness:0.7}),
  garage:mat({map:cTex("garage",128,96,(g,w,h)=>{g.fillStyle="#d6d3cc";g.fillRect(0,0,w,h);g.fillStyle="#b9b5ad";for(let y=6;y<h;y+=12)g.fillRect(0,y,w,3);})}),
  shop:mat({map:cTex("shopF",128,112,(g,w,h)=>{g.fillStyle="#2c2f33";g.fillRect(0,0,w,h);g.fillStyle="#7fa9c4";g.fillRect(6,18,74,86);g.fillStyle="rgba(255,255,255,.25)";g.fillRect(10,22,22,78);
    g.fillStyle="#3d4148";g.fillRect(86,18,36,86);g.fillStyle="#9cc0d6";g.fillRect(90,22,28,80);g.fillStyle="#cfa040";g.fillRect(112,60,3,10);}),roughness:0.4,metalness:0.2}),
  tower:["#5e88a8","#6fa39a","#7f8fa8"].map((c,i)=>mat({map:cTex("tw"+i,64,64,(g,w,h)=>{g.fillStyle=c;g.fillRect(0,0,w,h);g.fillStyle="rgba(255,255,255,.18)";g.fillRect(4,4,26,24);g.fillRect(34,4,26,24);
    g.fillStyle="#c9ced4";g.fillRect(0,30,w,4);g.fillRect(30,0,3,h);g.fillStyle="rgba(255,255,255,.1)";g.fillRect(4,36,26,24);g.fillRect(34,36,26,24);}),roughness:0.15,metalness:0.6,envMapIntensity:1.3})),
  corrug:mat({map:cTex("corr",64,64,(g,w,h)=>{for(let x=0;x<w;x++){const v=200+Math.sin(x/w*Math.PI*8)*40;g.fillStyle=`rgb(${v},${v},${v})`;g.fillRect(x,0,1,h);}}),roughness:0.6,metalness:0.3}),
  roller:mat({map:cTex("roll",64,64,(g,w,h)=>{g.fillStyle="#9aa0a6";g.fillRect(0,0,w,h);g.fillStyle="#7c8288";for(let y=0;y<h;y+=5)g.fillRect(0,y,w,2);}),roughness:0.5,metalness:0.4}),
  water:mat({color:0x2d6f8f,roughness:0.08,metalness:0.1,transparent:true,opacity:0.92,map:cTex("water",256,256,(g,w,h)=>{g.fillStyle="#3f88a8";g.fillRect(0,0,w,h);for(let i=0;i<700;i++){g.fillStyle=`rgba(255,255,255,${Math.random()*0.18})`;g.fillRect(Math.random()*w,Math.random()*h,8+Math.random()*20,2);}})}),
  pool:mat({color:0x5fc4e0,roughness:0.05,metalness:0.1,emissive:0x0b3b50,emissiveIntensity:0.4}),
  court:mat({map:cTex("court",256,256,(g,w,h)=>{g.fillStyle="#b35a37";g.fillRect(0,0,w,h);g.fillStyle="#2f6a9a";g.fillRect(20,20,w-40,h-40);g.strokeStyle="#fff";g.lineWidth=4;g.strokeRect(20,20,w-40,h-40);
    g.beginPath();g.moveTo(w/2,20);g.lineTo(w/2,h-20);g.stroke();g.beginPath();g.arc(w/2,h/2,30,0,7);g.stroke();g.beginPath();g.arc(20,h/2,60,-Math.PI/2,Math.PI/2);g.stroke();g.beginPath();g.arc(w-20,h/2,60,Math.PI/2,Math.PI*1.5);g.stroke();},false),roughness:0.8}),
  park:mat({map:cTex("parkL",64,256,(g,w,h)=>{g.clearRect(0,0,w,h);g.fillStyle="#e9e6dc";g.fillRect(0,0,4,h);},false),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}),
  hedge:mat({map:cTex("hedge",64,64,(g,w,h)=>{for(let i=0;i<w*h/6;i++){const v=Math.random();g.fillStyle=`rgb(${40+v*40},${70+v*50},${30+v*20})`;g.fillRect(Math.random()*w,Math.random()*h,3,3);}}),roughness:1}),
  plank:mat({map:cTex("plank",64,64,(g,w,h)=>{g.fillStyle="#a07850";g.fillRect(0,0,w,h);g.fillStyle="#7d5a3a";for(let x=0;x<w;x+=11)g.fillRect(x,0,2,h);})}),
  chain:mat({map:cTex("chain",32,32,(g,w,h)=>{g.clearRect(0,0,w,h);g.strokeStyle="#b8bcc0";g.lineWidth=2;g.beginPath();g.moveTo(0,0);g.lineTo(w,h);g.moveTo(w,0);g.lineTo(0,h);g.stroke();}),alphaTest:0.5,side:THREE.DoubleSide,metalness:0.5,roughness:0.5}),
  white:mat({color:0xf2f0ea}),dark:mat({color:0x222428,roughness:0.6}),glass:mat({color:0x1d2a36,roughness:0.1,metalness:0.6}),tire:mat({color:0x151515,roughness:0.9}),
  chrome:mat({color:0xbfc4c9,roughness:0.25,metalness:0.9}),red:mat({color:0xb3261e}),yellow:mat({color:0xe3b62b}),blue:mat({color:0x1f4fa0}),green:mat({color:0x2d6b3f}),
  stone:mat({color:0xbdb5a6,roughness:0.95}),sandM:null,terracotta:mat({color:0xb5643c}),orange:mat({color:0xe0782b}),
  conifer:mat({color:0x2f5532,roughness:0.95}),leafL:mat({color:0x6f9a3e,roughness:0.9}),fruit:["#d23a2a","#f2a23a","#e6d23a","#5aa53a"].map(c=>mat({color:c}))
};
KM.water.map.repeat.set(40,40);
const CAR_PAINT=["#c9ccd1","#1d1f24","#f2f2f0","#8a1f1f","#1f3e7a","#5a6a74","#c48a2a","#2d5e45","#a8b0b8","#6a2a4f"].map(c=>mat({color:c,roughness:0.35,metalness:0.55}));
const STRIPES=[["#c8102e","#f4efe6"],["#1f5e9a","#f4efe6"],["#2d7a46","#f4efe6"],["#e08a1e","#fff6e0"],["#5b3a8a","#f4efe6"]].map(([a,b],i)=>mat({side:THREE.DoubleSide,map:cTex("awn"+i,64,8,(g,w,h)=>{for(let x=0;x<w;x+=16){g.fillStyle=a;g.fillRect(x,0,8,h);g.fillStyle=b;g.fillRect(x+8,0,8,h);}})}));
// --- noms inventés (aucune vraie marque)
const SHOPS=[["Boulangerie Lumière","#8a5a2b"],["Café du Port","#2d5e45"],["Pharmacie","#1f7a3a",{cross:"#3dff7a"}],["Supérette Coralie","#b3261e"],["Coiffure Ondine","#6a2a4f"],["Pizzeria Bella Onda","#a8321e"],["Laverie Mousse","#1f4fa0"],["Tabac Presse","#7a1f1f"],
  ["Glacier Banquise","#3a8ab0"],["Surf Shop Vague","#0e6b7a"],["Fleuriste Hibiscus","#b8416e"],["Boucherie Martin","#8a1f1f"],["Optique Clair","#2a3a5a"],["Librairie Écume","#5a4a2a"],["Taqueria Sol","#c46a1e"],["Sushi Corail","#1a1a1a"],
  ["Burger Phare","#c8102e"],["Banque Azur","#123a6b"],["Agence Immo Lagune","#2d5e45"],["Salle de sport Énergie","#e08a1e"],["Cordonnerie","#4a3a2a"],["Épicerie Fine","#6b5a2b"],["Tacos Express","#d4402a"],["Friperie Retro","#7a3a8a"]];
const ADS=[["SOLAIRA","La boisson du soleil","#f2a23a"],["VOLTA","La voiture électrique de la ville","#1f4fa0"],["CORAL BANK","Votre argent au chaud","#123a6b"],["SURF FEST","Plage du Sud · ce week-end","#0e6b7a"],["NOVA PHONE","Plus fin. Plus rapide.","#1a1a1a"],["FRESKO","Jus pressés minute","#2d7a46"],["MÉGA SOLDES","Marché Azur −50 %","#c8102e"],["RADIO VAGUE","98.4 FM","#6a2a8a"]];
function adMat(i){i=md(i,ADS.length);const [t,s,c]=ADS[i],key="ad|"+i;let m=texCache.get(key);if(m)return m;
  const tx=canvasTex(512,256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,w,h);gr.addColorStop(0,c);gr.addColorStop(1,"#111");g.fillStyle=gr;g.fillRect(0,0,w,h);
    g.fillStyle="#fff";g.font="900 96px system-ui";g.textAlign="center";g.fillText(t,w/2,h*0.52);g.font="500 30px system-ui";g.fillText(s,w/2,h*0.8);},false);
  m=mat({map:tx,emissive:0xffffff,emissiveMap:tx,emissiveIntensity:0.25,roughness:0.5});texCache.set(key,m);return m;}
// graffitis (inventés) pour les murs
function graffitiMat(seed){const key="graf|"+(seed%6);let m=texCache.get(key);if(m)return m;
  const words=["SOLEIL","VAGUE","KOZ","ZÉNITH","LIBRE","PLAGE","WAVE","NOVA"],cols=["#ff3d7f","#3dd6ff","#ffd23d","#7dff5a","#b06aff","#ff8a3d"];
  const t=canvasTex(512,128,(g,w,h)=>{g.fillStyle="#b9b3a8";g.fillRect(0,0,w,h);const rr=mulberry(seed*31+7);
    for(let i=0;i<5;i++){g.fillStyle=cols[Math.floor(rr()*6)];g.globalAlpha=0.8;g.beginPath();g.ellipse(rr()*w,rr()*h,30+rr()*60,15+rr()*30,rr()*3,0,7);g.fill();}
    g.globalAlpha=1;for(let i=0;i<3;i++){const wd=words[Math.floor(rr()*words.length)];g.font=`900 ${50+rr()*30}px Impact,system-ui`;g.lineWidth=8;g.strokeStyle="#111";g.fillStyle=cols[Math.floor(rr()*6)];const x=20+i*165+rr()*20,y=70+rr()*40;g.save();g.translate(x,y);g.rotate((rr()-0.5)*0.3);g.strokeText(wd,0,0);g.fillText(wd,0,0);g.restore();}},false);
  m=mat({map:t,roughness:0.9});texCache.set(key,m);return m;}
// --- petites briques
const BX=(w,h,d)=>geo(`B${w},${h},${d}`,()=>new THREE.BoxGeometry(w,h,d));
const CY=(r1,r2,h,n=12)=>geo(`C${r1},${r2},${h},${n}`,()=>new THREE.CylinderGeometry(r1,r2,h,n));
function put(gm,m,x,y,z,g,ry=0,sx=1,sy=1,sz=1){const o=new THREE.Mesh(gm,m);o.position.set(x,y,z);o.rotation.y=ry;o.scale.set(sx,sy,sz);g.add(o);return o;}
function box(x0,z0,x1,z1,y0,y1,m,g){return put(geo("unitBox",()=>new THREE.BoxGeometry(1,1,1).translate(0,0.5,0)),m,(x0+x1)/2,y0,(z0+z1)/2,g,0,x1-x0,y1-y0,z1-z0);}
function wallPlane(len,h,m,cx,y0,cz,ry,g,tu=3,tv=2.8){const o=new THREE.Mesh(scaledUV(new THREE.PlaneGeometry(len,h),len/tu,h/tv),m);o.position.set(cx,y0+h/2,cz);o.rotation.y=ry;g.add(o);return o;}
// 4 murs texturés d'un volume rectangulaire
function walls(x0,z0,x1,z1,y0,h,m,g,tu,tv){const w=x1-x0,d=z1-z0,cx=(x0+x1)/2,cz=(z0+z1)/2;
  wallPlane(w,h,m,cx,y0,z1,0,g,tu,tv);wallPlane(w,h,m,cx,y0,z0,Math.PI,g,tu,tv);wallPlane(d,h,m,x1,y0,cz,Math.PI/2,g,tu,tv);wallPlane(d,h,m,x0,y0,cz,-Math.PI/2,g,tu,tv);}
// toit à deux pans (faîtage le long de l'axe le plus long)
function gableRoof(x0,z0,x1,z1,y,rise,m,g){
  const w=x1-x0,d=z1-z0,alongX=w>=d,L=(alongX?w:d)+0.5,S=(alongX?d:w)/2+0.35;
  const sh=new THREE.Shape([new THREE.Vector2(-S,0),new THREE.Vector2(S,0),new THREE.Vector2(0,rise)]);
  const gm=new THREE.ExtrudeGeometry(sh,{depth:L,bevelEnabled:false});gm.translate(0,0,-L/2);if(alongX)gm.rotateY(Math.PI/2);
  const uv=gm.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*0.4,uv.getY(i)*0.4);
  put(gm,m,(x0+x1)/2,y,(z0+z1)/2,g);
}
// --- arbres (3 sortes)
function treeAt(x,z,kind,s,g,obsR=0.3){
  const y=groundAt(x,z);
  if(kind==="palm"){put(geo("palmT",()=>new THREE.CylinderGeometry(0.12,0.2,6,8)),WM.trunk,x,y+3*s,z,g,0,s,s,s);
    for(let i=0;i<7;i++){const f=put(geo("frond",()=>new THREE.PlaneGeometry(0.7,3.2).translate(0,1.6,0)),WM.palm,x,y+6*s,z,g);f.rotation.set(1.1,i/7*Math.PI*2,0,"YXZ");f.scale.setScalar(s);}}
  else if(kind==="conifer"){put(CY(0.12,0.18,1.2,8),WM.trunk,x,y+0.6*s,z,g,0,s,s,s);put(geo("con1",()=>new THREE.ConeGeometry(1.4,3.2,9)),KM.conifer,x,y+2.4*s,z,g,0,s,s,s);put(geo("con2",()=>new THREE.ConeGeometry(1,2.4,9)),KM.conifer,x,y+3.9*s,z,g,0,s,s,s);}
  else{put(geo("treeT",()=>new THREE.CylinderGeometry(0.14,0.22,2.6,9)),WM.trunk,x,y+1.3*s,z,g,0,s,s,s);
    const L=kind==="light"?KM.leafL:OM.leaf;for(const [ox,oy,oz,r,m] of [[0,3.2,0,1.5,L],[0.7,2.8,0.3,1.0,OM.leaf2],[-0.6,3.6,-0.3,1.0,OM.leaf2]])put(geo("leafI"+r,()=>new THREE.IcosahedronGeometry(r,1)),m,x+ox*s,y+oy*s,z+oz*s,g,0,s,s,s);}
  if(obsR)addObstacle({type:"circle",x,z,r:obsR*s,tall:true});
}
// --- voiture garée (alignée sur les axes) ; dir = cap en radians (0 = vers +z)
function parkedCar(x,z,ry,g,paint,kind){
  if(TAKEN.has(carKey(x,z)))return;   // déjà volée
  const h=Math.abs(Math.sin(x*12.9+z*78.2)*43758.5)%1;if(!kind||kind==="auto")kind=pickCarModel(h,x,z);
  const P=paint||paintMat(carPaintHex(carModelOf(kind),(h*7.31)%1)),y=groundAt(x,z),c=carMesh(P,kind);c.position.set(x,y,z);c.rotation.y=ry;g.add(c);
  const pc={x,z,ry,paint:P,kind,ranges:[]};c.userData.pcar=pc;const M=CAR_MODELS[carModelOf(kind)];
  const al=Math.abs(Math.cos(ry))>0.5;addObstacle({type:"box",x,z,hx:al?M.W/2+0.03:M.L/2,hz:al?M.L/2:M.W/2+0.03,pcar:pc});
}
const HEADL=mat({color:0xffffff,emissive:0xfff2c0,emissiveIntensity:0.15}),TAILL=mat({color:0xb3261e,emissive:0xff2010,emissiveIntensity:0.1});
// --- clôtures, haies, portails
function fenceRun(x0,z0,x1,z1,kind,g,gaps=[]){
  const L=Math.hypot(x1-x0,z1-z0),ax=Math.abs(x1-x0)>Math.abs(z1-z0),y=groundAt((x0+x1)/2,(z0+z1)/2);
  // segments entre les ouvertures (portails)
  const cuts=[0,...gaps.flatMap(([a,b])=>[a,b]),L].sort((a,b)=>a-b);
  for(let k=0;k<cuts.length;k+=2){const a=cuts[k],b=cuts[k+1];if(b-a<0.2)continue;
    const sx=x0+(x1-x0)*a/L,sz=z0+(z1-z0)*a/L,ex=x0+(x1-x0)*b/L,ez=z0+(z1-z0)*b/L,cx=(sx+ex)/2,cz=(sz+ez)/2,len=b-a;
    if(kind==="hedge"){put(BX(1,1,1),KM.hedge,cx,y+0.75,cz,g,ax?0:Math.PI/2,len,1.5,0.7);addObstacle({type:"box",x:cx,z:cz,hx:ax?len/2:0.35,hz:ax?0.35:len/2,tall:true});}
    else if(kind==="wood"){put(BX(1,1,1),KM.plank,cx,y+0.55,cz,g,ax?0:Math.PI/2,len,1.1,0.06);for(let t=0;t<=len;t+=2)put(BX(0.09,1.2,0.09),OM.wood,sx+(ex-sx)*t/len,y+0.6,sz+(ez-sz)*t/len,g);addObstacle({type:"box",x:cx,z:cz,hx:ax?len/2:0.08,hz:ax?0.08:len/2});}
    else if(kind==="chain"){const p=new THREE.Mesh(scaledUV(new THREE.PlaneGeometry(len,2),len*3,6),KM.chain);p.position.set(cx,y+1,cz);p.rotation.y=ax?0:Math.PI/2;g.add(p);
      for(let t=0;t<=len;t+=2.5)put(CY(0.04,0.04,2.1,6),OM.metal,sx+(ex-sx)*t/len,y+1.05,sz+(ez-sz)*t/len,g);addObstacle({type:"box",x:cx,z:cz,hx:ax?len/2:0.06,hz:ax?0.06:len/2});}
    else{ // muret + grille
      put(BX(1,1,1),KM.stone,cx,y+0.3,cz,g,ax?0:Math.PI/2,len,0.6,0.25);for(let t=0.2;t<len;t+=0.18)put(BX(0.025,0.7,0.025),OM.metal,sx+(ex-sx)*t/len,y+0.95,sz+(ez-sz)*t/len,g);
      put(BX(1,1,1),OM.metal,cx,y+1.3,cz,g,ax?0:Math.PI/2,len,0.04,0.05);addObstacle({type:"box",x:cx,z:cz,hx:ax?len/2:0.14,hz:ax?0.14:len/2});}
  }
}
// portail : deux piliers et deux battants entrouverts (on peut passer)
function gate(x,z,ax,w,g,open=0.55){
  const y=groundAt(x,z),e=ax?new V3(1,0,0):new V3(0,0,1);
  for(const s of [-1,1]){const p=new V3(x,0,z).addScaledVector(e,s*(w/2+0.15));put(BX(0.3,1.6,0.3),KM.stone,p.x,y+0.8,p.z,g);put(BX(0.36,0.08,0.36),KM.white,p.x,y+1.64,p.z,g);addObstacle({type:"circle",x:p.x,z:p.z,r:0.2});
    const leaf=new THREE.Group();leaf.position.set(p.x,y,p.z);leaf.rotation.y=(ax?0:Math.PI/2)+(s<0?Math.PI:0)+s*open*(s<0?-1:1);g.add(leaf);
    for(let t=0.1;t<w/2;t+=0.14)put(BX(0.025,1.25,0.025),OM.metal,-(t),0.75,0,leaf);put(BX(w/2,0.05,0.05),OM.metal,-w/4,1.38,0,leaf);put(BX(w/2,0.05,0.05),OM.metal,-w/4,0.18,0,leaf);}
}
// --- mobilier urbain
function hydrant(x,z,g){const y=groundAt(x,z);put(CY(0.12,0.14,0.6,10),KM.red,x,y+0.3,z,g);put(geo("hydTop",()=>new THREE.SphereGeometry(0.12,10,6,0,Math.PI*2,0,Math.PI/2)),KM.red,x,y+0.6,z,g);put(CY(0.05,0.05,0.36,6).clone().rotateZ(Math.PI/2),KM.red,x,y+0.4,z,g);addObstacle({type:"circle",x,z,r:0.16});}
function signPost(x,z,face,m,g,h=2.4,w=0.6,hh=0.6,round){const y=groundAt(x,z);put(CY(0.035,0.035,h,6),KM.chrome,x,y+h/2,z,g);
  const p=put(round?geo("rsign",()=>new THREE.CircleGeometry(0.32,20)):geo(`sgn${w},${hh}`,()=>new THREE.PlaneGeometry(w,hh)),m,x,y+h-0.05,z,g,face);const b=put(round?geo("rsignB",()=>new THREE.CircleGeometry(0.32,20)):geo(`sgn${w},${hh}`,()=>new THREE.PlaneGeometry(w,hh)),KM.chrome,x,y+h-0.05,z,g,face+Math.PI);
  p.position.addScaledVector(new V3(Math.sin(face),0,Math.cos(face)),0.03);addObstacle({type:"circle",x,z,r:0.08});}
const ROADSIGN={stop:()=>signMat("STOP","#c8102e","#fff",{w:256,h:256}),slow:()=>signMat("30","#fff","#111",{w:256,h:256,border:"#c8102e"}),park:()=>signMat("P","#1f4fa0","#fff",{w:256,h:256}),bus:()=>signMat("BUS","#1f4fa0","#fff",{w:256,h:256}),
  noent:()=>signMat("—","#c8102e","#fff",{w:256,h:256}),school:()=>signMat("ÉCOLE","#f2c12e","#111",{w:256,h:256,border:"#c8102e"})};
function streetNameSign(x,z,ax,name,g){const y=groundAt(x,z);put(CY(0.035,0.035,2.8,6),OM.metal,x,y+1.4,z,g);
  const m=signMat(name,"#1b3f7a","#fff",{w:512,h:96,border:"#fff"});const p=put(geo("sn",()=>new THREE.BoxGeometry(1.4,0.26,0.04)),m,x,y+2.65,z,g,ax?0:Math.PI/2);addObstacle({type:"circle",x,z,r:0.07});}
function busStop(x,z,face,g){const y=groundAt(x,z),f=new V3(Math.sin(face),0,Math.cos(face)),r=new V3(f.z,0,-f.x);
  for(const s of [-1.6,1.6])put(BX(0.07,2.3,0.07),OM.metal,x+r.x*s-f.x*0.6,y+1.15,z+r.z*s-f.z*0.6,g);
  put(BX(3.4,0.08,1.4),OM.metal,x,y+2.32,z,g,face);put(BX(3.3,1.9,0.03),KM.glass,x-f.x*0.65,y+1.25,z-f.z*0.65,g,face);
  put(BX(1.3,1.8,0.06),adMat(Math.floor(Math.abs(x*7+z))),x+r.x*1.6-f.x*0.2,y+1.15,z+r.z*1.6-f.z*0.2,g,face+Math.PI/2);
  makeObstacle("bench",x-f.x*0.3,z-f.z*0.3,face,g);
  signPost(x+r.x*-2.1,z+r.z*-2.1,face,ROADSIGN.bus(),g,2.6,0.5,0.5);
  addObstacle({type:"box",x:x-f.x*0.65,z:z-f.z*0.65,hx:Math.abs(f.z)>0.5?1.7:0.1,hz:Math.abs(f.z)>0.5?0.1:1.7,tall:false});
}
function billboard(x,z,face,i,g){const y=groundAt(x,z);for(const s of [-1.6,1.6]){const r=new V3(Math.cos(face),0,-Math.sin(face));put(CY(0.08,0.08,3.4,8),OM.metal,x+r.x*s,y+1.7,z+r.z*s,g);}
  put(BX(4.4,2.3,0.12),adMat(i),x,y+4.4,z,g,face);put(BX(4.5,2.4,0.08),KM.dark,x-Math.sin(face)*0.09,y+4.4,z-Math.cos(face)*0.09,g,face);addObstacle({type:"box",x,z,hx:Math.abs(Math.cos(face))>0.5?2.2:0.2,hz:Math.abs(Math.cos(face))>0.5?0.2:2.2});}
function kiosk(x,z,g,label){const y=groundAt(x,z);put(CY(1.2,1.2,2.4,10),KM.green,x,y+1.2,z,g);put(geo("kRoof",()=>new THREE.ConeGeometry(1.6,1.0,10)),KM.green,x,y+2.9,z,g);put(BX(1.5,0.35,0.05),signMat(label||"Journaux","#1d3b2a","#f2e6b8",{w:256,h:64}),x,y+2.2,z+1.2,g);addObstacle({type:"circle",x,z,r:1.25,tall:true});addShop(label||"Journaux",x,z+1.9);}
function bikeRack(x,z,ax,g){const y=groundAt(x,z);for(let i=0;i<4;i++){const o=put(geo("rack",()=>new THREE.TorusGeometry(0.35,0.025,6,12,Math.PI)),KM.chrome,x+(ax?i*0.6-0.9:0),y,z+(ax?0:i*0.6-0.9),g,ax?0:Math.PI/2);}addObstacle({type:"box",x,z,hx:ax?1.2:0.15,hz:ax?0.15:1.2});}
function mailbox(x,z,g,face=0){const y=groundAt(x,z);put(CY(0.04,0.04,1,6),OM.metal,x,y+0.5,z,g);put(BX(0.36,0.3,0.5),KM.yellow,x,y+1.1,z,g,face);addObstacle({type:"circle",x,z,r:0.15});}
function manhole(x,z,g){put(geo("manh",()=>new THREE.CircleGeometry(0.4,16).rotateX(-Math.PI/2)),KM.dark,x,0.012,z,g);}
function fountain(x,z,g){const y=groundAt(x,z);put(CY(3.2,3.4,0.55,28),KM.stone,x,y+0.27,z,g);put(CY(2.95,2.95,0.04,28),KM.pool,x,y+0.57,z,g);put(CY(0.35,0.5,1.6,12),KM.stone,x,y+1.2,z,g);put(CY(1.1,0.6,0.25,16),KM.stone,x,y+2.0,z,g);put(CY(0.95,0.95,0.04,16),KM.pool,x,y+2.14,z,g);
  put(geo("jet",()=>new THREE.ConeGeometry(0.12,1.0,8)),mat({color:0xdff4ff,transparent:true,opacity:0.6}),x,y+2.6,z,g);addObstacle({type:"circle",x,z,r:3.35});}
function statue(x,z,g){const y=groundAt(x,z);put(BX(1.6,1.6,1.6),KM.stone,x,y+0.8,z,g);put(geo("statue",()=>new THREE.CapsuleGeometry(0.35,1.4,6,10)),mat({color:0x6f7a5e,metalness:0.6,roughness:0.4}),x,y+2.6,z,g);put(geo("stHead",()=>new THREE.SphereGeometry(0.28,10,8)),mat({color:0x6f7a5e,metalness:0.6,roughness:0.4}),x,y+3.65,z,g);addObstacle({type:"box",x,z,hx:0.85,hz:0.85,tall:true});}
function terraceSet(x,z,g,col){const y=groundAt(x,z);put(CY(0.4,0.4,0.04,14),KM.white,x,y+0.74,z,g);put(CY(0.04,0.04,0.72,6),OM.metal,x,y+0.37,z,g);
  for(const a of [0,Math.PI]){const cx=x+Math.sin(a)*0.65,cz=z+Math.cos(a)*0.65;put(BX(0.42,0.05,0.42),OM.wood,cx,y+0.45,cz,g);put(BX(0.42,0.45,0.04),OM.wood,cx+Math.sin(a)*0.2,y+0.7,cz+Math.cos(a)*0.2,g,a);for(const [dx,dz] of [[-0.18,-0.18],[0.18,-0.18],[-0.18,0.18],[0.18,0.18]])put(BX(0.03,0.45,0.03),OM.metal,cx+dx,y+0.22,cz+dz,g);}
  put(CY(0.03,0.03,2.3,6),KM.white,x,y+1.15,z,g);put(geo("parasol",()=>new THREE.ConeGeometry(1.4,0.5,8,1,true)),col,x,y+2.35,z,g);addObstacle({type:"circle",x,z,r:0.9});}
function marketStall(x,z,face,g,k){const y=groundAt(x,z),f=new V3(Math.sin(face),0,Math.cos(face)),r=new V3(f.z,0,-f.x);
  put(BX(2.6,0.85,1.1),OM.wood,x,y+0.42,z,g,face);for(let i=0;i<10;i++){const p=new V3(x,0,z).addScaledVector(r,-1.1+i*0.24).addScaledVector(f,((i%3)-1)*0.25);put(geo("fruit",()=>new THREE.SphereGeometry(0.1,8,6)),KM.fruit[(i+k)%4],p.x,y+0.92,p.z,g);}
  for(const s of [-1.25,1.25])for(const t of [-0.5,0.5]){const p=new V3(x,0,z).addScaledVector(r,s).addScaledVector(f,t);put(CY(0.03,0.03,2.2,6),OM.metal,p.x,y+1.1,p.z,g);}
  const aw=put(BX(2.8,0.04,1.5),STRIPES[md(k,STRIPES.length)],x,y+2.25,z,g,face);aw.rotation.x=0.12;addObstacle({type:"box",x,z,hx:Math.abs(f.z)>0.5?1.35:0.6,hz:Math.abs(f.z)>0.5?0.6:1.35});}
function playground(x,z,g){const y=groundAt(x,z);
  // toboggan
  put(BX(0.8,1.8,0.8),KM.red,x-2,y+0.9,z,g);const s=put(BX(0.7,0.05,3),KM.yellow,x-2,y+1,z+1.7,g);s.rotation.x=-0.55;
  for(let i=0;i<6;i++)put(BX(0.7,0.04,0.12),KM.blue,x-2,y+0.25+i*0.28,z-0.6-i*0.05,g);
  // balançoires
  for(const s2 of [-1,1])for(const t of [-0.9,0.9]){const o=put(CY(0.05,0.05,2.6,6),KM.blue,x+2+t,y+1.2,z+s2*0.8,g);o.rotation.x=s2*0.3;}
  put(CY(0.05,0.05,2.0,6).clone().rotateZ(Math.PI/2),KM.blue,x+2,y+2.45,z,g);
  for(const t of [-0.4,0.4]){put(BX(0.45,0.04,0.2),KM.dark,x+2+t,y+0.5,z,g);put(CY(0.008,0.008,1.95,4),KM.chrome,x+2+t-0.18,y+1.48,z,g);put(CY(0.008,0.008,1.95,4),KM.chrome,x+2+t+0.18,y+1.48,z,g);}
  addObstacle({type:"box",x:x-2,z:z+0.8,hx:0.5,hz:2.4});addObstacle({type:"box",x:x+2,z,hx:1.1,hz:1.0});}
function basketHoop(x,z,face,g){const y=groundAt(x,z);put(CY(0.07,0.07,3.2,8),OM.metal,x,y+1.6,z,g);const f=new V3(Math.sin(face),0,Math.cos(face));
  put(BX(1.6,1.0,0.05),KM.white,x+f.x*0.6,y+3.3,z+f.z*0.6,g,face);put(geo("ring",()=>new THREE.TorusGeometry(0.23,0.02,6,16).rotateX(Math.PI/2)),KM.orange,x+f.x*0.95,y+3.0,z+f.z*0.95,g);registerHoop(new V3(x+f.x*0.95,y+3.0,z+f.z*0.95),face,g);addObstacle({type:"circle",x,z,r:0.12});}
function container(x,z,ax,level,g,k){const y=groundAt(x,z)+level*2.6;const m=mat({color:["#a8321e","#1f4fa0","#2d6b3f","#c48a2a","#5a6a74","#7a2a5a"][k%6],map:KM.corrug.map,roughness:0.6,metalness:0.3});
  put(BX(ax?6:2.44,2.6,ax?2.44:6),m,x,y+1.3,z,g);if(level===0)addObstacle({type:"box",x,z,hx:ax?3:1.22,hz:ax?1.22:3,tall:true});}
function lifeguard(x,z,g){const y=groundAt(x,z);for(const [dx,dz] of [[-0.9,-0.9],[0.9,-0.9],[-0.9,0.9],[0.9,0.9]])put(CY(0.07,0.07,2.4,6),OM.wood,x+dx,y+1.2,z+dz,g);
  box(x-1.2,z-1.2,x+1.2,z+1.2,y+2.4,y+3.9,mat({color:0xe8c33a}),g);put(geo("lgRoof",()=>new THREE.ConeGeometry(2,0.8,4).rotateY(Math.PI/4)),KM.red,x,y+4.3,z,g);
  const r=put(BX(0.7,0.06,3),OM.wood,x-1.7,y+1.2,z,g);r.rotation.z=0.75;addObstacle({type:"box",x,z,hx:1.1,hz:1.1,tall:true});}
function beachUmbrella(x,z,g,k){const y=groundAt(x,z);put(CY(0.03,0.03,2.2,6),KM.white,x,y+1.1,z,g);put(geo("bumb",()=>new THREE.ConeGeometry(1.2,0.4,10,1,true)),STRIPES[md(k,STRIPES.length)],x,y+2.25,z,g);
  const t=put(BX(0.8,0.02,1.8),STRIPES[md((k+2),STRIPES.length)],x+0.9,y+0.02,z+0.3,g);addObstacle({type:"circle",x,z,r:0.12});}
function shoppingCart(x,z,g,ry){const c=new THREE.Group();c.position.set(x,groundAt(x,z),z);c.rotation.y=ry;g.add(c);put(BX(0.55,0.45,0.85),KM.chrome,0,0.75,0,c);for(const [a,b] of [[-0.22,-0.35],[0.22,-0.35],[-0.22,0.35],[0.22,0.35]])put(CY(0.06,0.06,0.04,8).clone().rotateZ(Math.PI/2),KM.tire,a,0.06,b,c);addObstacle({type:"circle",x,z,r:0.4});}
function pumps(x,z,g){const y=groundAt(x,z);put(BX(0.6,1.7,0.9),KM.white,x,y+0.85,z,g);put(BX(0.62,0.4,0.92),KM.green,x,y+1.5,z,g);put(BX(0.4,0.3,0.02),KM.dark,x,y+1.2,z+0.46,g);addObstacle({type:"box",x,z,hx:0.35,hz:0.5});}
// --- îlots : trottoir périphérique, arbres d'alignement, mobilier aux coins
function edgeTrees(X,Z,g,r,kind,skip){const bx0=X-12,bz0=Z-12,bx1=X+20,bz1=Z+20;
  for(let t=6;t<=26;t+=10){for(const [x,z] of [[bx0+1.1,bz0+t],[bx1-1.1,bz0+t],[bx0+t,bz0+1.1],[bx0+t,bz1-1.1]]){if(skip&&skip(x,z))continue;if(obsAt(new V3(x,0,z)).some(o=>obstacleClosest(o,new V3(x,0,z)).d<1.2))continue;treeAt(x,z,kind,0.8+r()*0.25,g,0.25);}}}
