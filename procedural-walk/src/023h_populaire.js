// ================================================================ MODULE 17 : quartier populaire « Barrio Coral »
// Maisons de ville colorées avec balcons et linge, épiceries, coiffeurs, cafés à terrasse,
// marché couvert de guirlandes, place des dominos, fresques, musique dans la rue et passants aux couleurs vives.
const POP={i0:-9,i1:-4,j0:4,j1:10,name:"Barrio Coral"};
function inPop(cx,cz){return cx>=-9&&cx<=-4&&cz>=4&&cz<=10;}   // littéraux : appelé avant l'initialisation de POP (skyline)
function popType(cx,cz){
  const h=hash(cx*31.7+cz*17.3+5.5);
  if(cx===-7&&cz===7)return "pop_marche";
  if(cx===-5&&cz===5)return "pop_place";
  return h<0.1?"pop_place":h<0.18?"pop_marche":h<0.24?"terrain":"pop_rue";
}
const POP_COLS=["#f2a5b3","#7fd1c7","#f5d06f","#a8d88a","#f39a7b","#9ec5f0","#f7c59f","#c9a6e8","#ffe3a3","#86c9a8"];
const SHUTTER_COLS=["#2f7d6b","#2b5f9e","#b0452f","#e8e2d0","#6b4a8f"];
const POP_MAT=POP_COLS.map((c,i)=>mat({roughness:0.95,map:cTex("popw"+i,64,64,(g,w,h)=>{
  g.fillStyle=c;g.fillRect(0,0,w,h);g.fillStyle="rgba(0,0,0,.05)";for(let k=0;k<40;k++)g.fillRect(Math.random()*w,Math.random()*h,2,2);
  const sh=SHUTTER_COLS[i%SHUTTER_COLS.length];
  g.fillStyle="#f4efe4";g.fillRect(19,10,26,40);g.fillStyle="#3a4d5c";g.fillRect(22,13,20,34);g.fillStyle="rgba(255,255,255,.25)";g.fillRect(22,13,9,34);
  g.fillStyle=sh;g.fillRect(9,11,9,38);g.fillRect(46,11,9,38);g.fillStyle="rgba(0,0,0,.18)";for(let y=13;y<48;y+=4){g.fillRect(9,y,9,1);g.fillRect(46,y,9,1);}
  g.fillStyle="rgba(0,0,0,.12)";g.fillRect(0,60,w,4);
})}));
const POP_SHOPS=["Épicerie Sol","Coiffeur Rico","Cafecito","Fruits Tropicaux","Bodega Luz","Panadería Coral","Botanica Mar","Tienda Mía","Cafecito Abuela","Jus de Canne","Pastelitos","Disques Salsa","Ferretería","Cuban Sandwich Lola"];
const POP_MURAL=["#e94f37","#f6bd60","#2a9d8f","#3d5a80","#ef476f","#06d6a0","#ffd166","#118ab2"];
function muralMat(k){return cTex("mural"+k,256,128,(g,w,h)=>{const c=i=>POP_MURAL[(k*3+i)%POP_MURAL.length];
  g.fillStyle=c(0);g.fillRect(0,0,w,h);
  g.fillStyle=c(1);g.beginPath();g.arc(w*0.25,h*0.55,h*0.38,0,7);g.fill();             // soleil
  g.fillStyle=c(2);for(let i=0;i<6;i++){g.beginPath();g.moveTo(i*w/6,h);g.quadraticCurveTo(i*w/6+w/12,h*0.35,(i+1)*w/6,h);g.fill();}   // vagues / collines
  g.fillStyle=c(3);g.fillRect(w*0.62,h*0.2,6,h*0.6);g.beginPath();g.ellipse(w*0.63,h*0.22,30,10,0.4,0,7);g.fill();g.beginPath();g.ellipse(w*0.6,h*0.2,26,8,-0.6,0,7);g.fill(); // palmier
  g.fillStyle="#fff";g.font="bold 26px sans-serif";g.fillText(["CORAL","¡VIVA!","SABOR","BARRIO"][k%4],w*0.66,h*0.85);
},false);}
const POP_MURAL_M=[0,1,2,3].map(k=>new THREE.MeshStandardMaterial({map:muralMat(k),roughness:0.9}));
const LAUNDRY_M=["#ffffff","#e94f37","#2a9d8f","#ffd166","#3d5a80"].map(c=>mat({color:c,side:THREE.DoubleSide}));
const BULB_M=[0xffd166,0xef476f,0x06d6a0,0x118ab2,0xffffff].map(c=>new THREE.MeshBasicMaterial({color:c}));
// guirlande lumineuse suspendue entre deux points
function stringLights(x0,z0,x1,z1,y,g,sag=0.9){const n=Math.max(4,Math.round(Math.hypot(x1-x0,z1-z0)/0.9));
  for(let i=0;i<=n;i++){const t=i/n;put(geo("bulb",()=>new THREE.SphereGeometry(0.08,6,4)),BULB_M[i%5],lerp(x0,x1,t),y-Math.sin(t*Math.PI)*sag,lerp(z0,z1,t),g);}}
// une maison de ville : façade colorée, toit-terrasse avec parapet, balcon, éventuellement une boutique en rez-de-chaussée
function rowHouse(x0,z0,x1,z1,face,floors,k,r,base,mid,detail){
  const H=floors*3.2,m=POP_MAT[k%POP_MAT.length];
  walls(x0,z0,x1,z1,0.12,H,m,base,3.2,3.2);box(x0-0.12,z0-0.12,x1+0.12,z1+0.12,0.12+H,0.12+H+0.6,KM.white,base);put(BX(x1-x0,0.05,z1-z0),KT_ROOF,(x0+x1)/2,0.12+H+0.3,(z0+z1)/2,base);
  addObstacle({type:"box",x:(x0+x1)/2,z:(z0+z1)/2,hx:(x1-x0)/2,hz:(z1-z0)/2,tall:true,bld:true});
  // façade sur rue
  const f=new V3(Math.sin(face),0,Math.cos(face)),cx=(x0+x1)/2,cz=(z0+z1)/2,hw=Math.abs(f.z)>0.5?(x1-x0)/2:(z1-z0)/2,hd=Math.abs(f.z)>0.5?(z1-z0)/2:(x1-x0)/2;
  const fx=cx+f.x*hd,fz=cz+f.z*hd,rg=new V3(f.z,0,-f.x);
  // balcon à l'étage avec garde-corps et linge
  if(floors>=2&&r()<0.75){const by=0.12+3.2;put(BX(hw*1.3,0.15,0.9),KM.white,fx+f.x*0.45,by,fz+f.z*0.45,mid,face);
    put(BX(hw*1.3,0.06,0.05),OM.metal,fx+f.x*0.88,by+0.95,fz+f.z*0.88,mid,face);for(let s=-hw*0.6;s<=hw*0.6;s+=0.3)put(BX(0.03,0.9,0.03),OM.metal,fx+f.x*0.88+rg.x*s,by+0.5,fz+f.z*0.88+rg.z*s,detail);
    if(r()<0.6)for(let s=-hw*0.5,i=0;s<hw*0.5;s+=0.55,i++)if(r()<0.75)put(BX(0.4,0.5+r()*0.3,0.02),LAUNDRY_M[(i+k)%5],fx+f.x*0.7+rg.x*s,by+1.6,fz+f.z*0.7+rg.z*s,detail,face);
    if(r()<0.5)put(CY(0.18,0.14,0.3,8),KM.terracotta||KM.white,fx+f.x*0.8+rg.x*hw*0.5,by+0.25,fz+f.z*0.8+rg.z*hw*0.5,detail);}
  // rez-de-chaussée : boutique (vitrine, enseigne, store) ou porte
  if(r()<0.55){const name=POP_SHOPS[Math.floor(r()*POP_SHOPS.length)];
    put(BX(hw*1.5,2.1,0.05),KM.shop,fx+f.x*0.03,1.2,fz+f.z*0.03,base,face);
    put(BX(Math.min(hw*1.8,5),0.6,0.08),signMat(name,["#7a1f3d","#1f5e5b","#3d2a7a","#7a4a12"][k%4],"#fff4d6",{w:512,h:72}),fx+f.x*0.07,2.75,fz+f.z*0.07,base,face);
    const aw=put(BX(hw*1.8,0.04,1.3),STRIPES[k%STRIPES.length],fx+f.x*0.65,2.45,fz+f.z*0.65,mid,face);aw.rotation.x=f.z>0.5?-0.18:f.z<-0.5?0.18:0;if(Math.abs(f.x)>0.5)aw.rotation.z=f.x>0?0.18:-0.18;
    addShop(name,fx+f.x*1.3,fz+f.z*1.3);
    if(/Caf|Pastel|Jus|Sandwich/.test(name)&&r()<0.8)terraceSet(fx+f.x*1.9+rg.x*(hw*0.4),fz+f.z*1.9+rg.z*(hw*0.4),detail,STRIPES[(k+1)%STRIPES.length]);
    if(/Fruits/.test(name))marketStall(fx+f.x*1.2,fz+f.z*1.2,face,detail,k);}
  else{put(BX(1.1,2.2,0.06),KM.door||KM.dark,fx+f.x*0.04,1.22,fz+f.z*0.04,base,face);put(BX(1.5,0.1,0.6),KM.white,fx+f.x*0.3,2.45,fz+f.z*0.3,mid,face);}
}
BUILDERS.pop_rue=function(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop}=C;
  const I=2.8,D=8;let k=Math.floor(r()*10);
  // rangées sur les 4 côtés de l'îlot, largeur de maison variable, cour intérieure plantée
  const row=(along,fixed0,fixed1,a0,a1,face)=>{let a=a0;while(a<a1-3){const w=Math.min(a1-a,4.5+r()*2.5);const fl=2+(r()<0.45?1:0)+(r()<0.1?1:0);
      if(along==="x")rowHouse(a,fixed0,a+w,fixed1,face,fl,k++,r,base,mid,detail);else rowHouse(fixed0,a,fixed1,a+w,face,fl,k++,r,base,mid,detail);a+=w;}};
  row("x",bz0+I,bz0+I+D,bx0+I,bx1-I,Math.PI);           // côté nord, façade vers -z
  row("x",bz1-I-D,bz1-I,bx0+I,bx1-I,0);                 // côté sud
  row("z",bx0+I,bx0+I+D,bz0+I+D,bz1-I-D,-Math.PI/2);   // côté ouest
  row("z",bx1-I-D,bx1-I,bz0+I+D,bz1-I-D,Math.PI/2);    // côté est
  // cour intérieure (privée) : arbres et linge tendu
  treeAt(bcx-2,bcz,"round",1,mid);treeAt(bcx+3,bcz+2,"light",0.9,mid);
  for(let i=0;i<3;i++){const z=bcz-4+i*3;for(let x=bcx-5;x<bcx+5;x+=0.6)if(r()<0.7)put(BX(0.45,0.55,0.02),LAUNDRY_M[Math.floor(r()*5)],x,4.5,z,detail);}
  // fresque sur un pignon d'angle, guirlandes au-dessus du trottoir
  const mk=Math.floor(r()*4);wallPlane(6,4,POP_MURAL_M[mk],bx0+I+3.5,0.6,bz0+I-0.02,Math.PI,mid,6,4);
  if(r()<0.6)stringLights(bx0+3,bz0+1.4,bx1-3,bz0+1.4,4.6,detail,0.5);
  // trottoir animé : bancs, poubelles, bornes
  prop("bin",bx0+1.4,bz0+8,0);prop("bench",bx1-1.4,bz1-10,-Math.PI/2);
  if(r()<0.3)addAmb("radio",bx0+I+2,bz0+1.6,0);
};
BUILDERS.pop_marche=function(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop}=C;
  // sol en carreaux colorés
  const tile=mat({roughness:0.9,map:cTex("popTile",64,64,(g,w,h)=>{const c=["#c9583e","#e8d5b5","#2a9d8f","#e8d5b5"];for(let i=0;i<4;i++)for(let j=0;j<4;j++){g.fillStyle=c[(i+j)%4];g.fillRect(i*16,j*16,16,16);}})});
  put(scaledUV(new THREE.PlaneGeometry(28,28).rotateX(-Math.PI/2),7,7),tile,bcx,0.125,bcz,base);
  let k=0;for(const z of [bz0+6,bcz,bz1-6])for(let x=bx0+5;x<bx1-3;x+=4.4)marketStall(x,z,z<bcz?0:Math.PI,detail,k++);
  for(let i=0;i<4;i++)stringLights(bx0+3,bz0+4+i*8,bx1-3,bz0+4+i*8,4.4,detail,0.6);
  for(const [x,z] of [[bx0+3,bz0+3],[bx1-3,bz0+3],[bx0+3,bz1-3],[bx1-3,bz1-3]])put(CY(0.06,0.06,4.6,6),OM.metal,x,2.3,z,mid);
  put(BX(6,0.8,0.1),signMat("Mercado Coral","#c9583e","#fff4d6",{w:512,h:72}),bcx,3.2,bz0+1.4,detail);
  addShop("Fruits Tropicaux du marché",bx0+5,bz0+7.4);addShop("Jus de Canne",bx1-6,bz1-7.4);
  addAmb("radio",bcx,bcz+2,0);addAmb("marchand",bx0+9.4,bz0+5,180);addAmb("marchand",bx1-9,bz1-5,0);
  edgeTrees(X,Z,mid,r,"palm");
};
BUILDERS.pop_place=function(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop}=C;
  fountain(bcx,bcz,mid);
  // tables de dominos à l'ombre
  for(const [dx,dz] of [[-7,-6],[7,-6],[-7,6]]){const x=bcx+dx,z=bcz+dz;put(BX(1.1,0.06,1.1),OM.wood,x,0.87,z,detail);put(CY(0.08,0.08,0.75,6),OM.metal,x,0.5,z,detail);
    for(let i=0;i<8;i++)put(BX(0.05,0.012,0.1),KM.white,x-0.3+i*0.08,0.91,z+(i%2)*0.1,detail,i*0.3);
    for(const [sx,sz] of [[0.9,0],[-0.9,0],[0,0.9],[0,-0.9]])put(CY(0.2,0.2,0.45,8),OM.wood,x+sx,0.35,z+sz,detail);
    put(CY(0.04,0.04,2.4,6),KM.white,x,1.2,z,detail);put(geo("parasol",()=>new THREE.ConeGeometry(1.4,0.5,8,1,true)),STRIPES[3],x,2.45,z,detail);
    addObstacle({type:"circle",x,z,r:1.2});addAmb("domino",x+1.3,z,90);addAmb("domino",x-1.3,z,-90);}
  wallPlane(10,4.5,POP_MURAL_M[Math.floor(r()*4)],bcx,0.12,bz1-2.63,Math.PI,mid,10,4.5);box(bcx-5,bz1-2.6,bcx+5,bz1-2.35,0.12,4.6,KM.white,base);addObstacle({type:"box",x:bcx,z:bz1-2.5,hx:5,hz:0.2,tall:true});
  for(let i=0;i<5;i++)stringLights(bx0+2,bcz-8+i*4,bx1-2,bcz-8+i*4,4.2,detail,0.4);
  for(const x of [bx0+3,bx1-3])for(const z of [bz0+3,bcz])treeAt(x,z,"palm",1,mid);
  prop("bench",bcx-4,bcz+4,0);prop("bench",bcx+4,bcz+4,0);prop("bin",bcx,bcz+6,0);
  put(BX(5,0.7,0.1),signMat("Place des Dominos","#2a9d8f","#fff",{w:512,h:72}),bcx,2.6,bz0+1.4,detail);put(CY(0.05,0.05,2.6,6),OM.metal,bcx-2.3,1.3,bz0+1.4,detail);put(CY(0.05,0.05,2.6,6),OM.metal,bcx+2.3,1.3,bz0+1.4,detail);
  addShop("Glaces Coco",bcx+8,bcz+2);addAmb("radio",bcx-6,bcz+2,0);
};
// ---------------------------------------------------------------- musique de rue (procédurale, clave + basse + piano montuno)
const MUSIC={g:null,next:0,step:0,on:false,lvl:0};
function musicNodes(){const A=audio();if(!A)return null;if(!MUSIC.g){MUSIC.g=A.createGain();MUSIC.g.gain.value=0;MUSIC.lp=A.createBiquadFilter();MUSIC.lp.type="lowpass";MUSIC.lp.frequency.value=2600;MUSIC.g.connect(MUSIC.lp);MUSIC.lp.connect(sfxOut());}return A;}
const MTF=n=>440*Math.pow(2,(n-69)/12);
const CHORDS=[[60,64,67],[65,69,72],[67,71,74],[65,69,72]];   // Do – Fa – Sol – Fa
const BASS=[36,41,43,41],CLAVE=[0,3,6,10,12];                  // clave 3-2 sur 16 doubles-croches
const MONT=[0,2,3,5,6,8,10,11,13,14];
function mNote(A,t,f,type,dur,vol,att=0.005,bend=0){const o=A.createOscillator(),g=A.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(bend)o.frequency.exponentialRampToValueAtTime(f*bend,t+dur);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+att);g.gain.exponentialRampToValueAtTime(0.0008,t+dur);o.connect(g);g.connect(MUSIC.g);o.start(t);o.stop(t+dur+0.05);}
function updateMusic(dt){
  // source la plus proche (radios des places, du marché, des épiceries)
  let best=1e9;for(const a of ambSpots)if(a.role==="radio"){const d=Math.hypot(a.x-player.root.x,a.z-player.root.z);if(d<best)best=d;}
  const target=best<48&&!menuOpen?Math.pow(1-best/48,1.6)*0.16*(SET.music??1):0;
  MUSIC.lvl=lerp(MUSIC.lvl,target,1-Math.exp(-2*dt));
  if(MUSIC.lvl<0.003){if(MUSIC.g)MUSIC.g.gain.value=0;MUSIC.next=0;return;}
  const A=musicNodes();if(!A||A.state!=="running")return;
  MUSIC.g.gain.setTargetAtTime(MUSIC.lvl,A.currentTime,0.1);
  const sixteenth=60/104/4;if(MUSIC.next<A.currentTime)MUSIC.next=A.currentTime+0.05;
  while(MUSIC.next<A.currentTime+0.25){
    const t=MUSIC.next,s=MUSIC.step%16,bar=Math.floor(MUSIC.step/16)%4,sw=(s%2)?sixteenth*0.12:0;
    if(CLAVE.includes(s))mNote(A,t,2400,"sine",0.06,0.5);
    if(s===0||s===6||s===10)mNote(A,t,MTF(BASS[bar]+(s===6?7:0)),"triangle",0.35,0.9,0.01);
    if(MONT.includes(s)){const c=CHORDS[bar];for(const n of (s%3?c.slice(1):c))mNote(A,t+sw,MTF(n+12),"square",0.12,0.06);}
    if(s===7||s===15)mNote(A,t,210,"sine",0.18,0.55,0.003,0.6);          // conga
    if(s===4||s===12)mNote(A,t,320,"sine",0.12,0.35,0.003,0.7);
    if(s%4===2)mNote(A,t,6000,"square",0.02,0.04);                        // güiro
    MUSIC.next+=sixteenth;MUSIC.step++;
  }
}
