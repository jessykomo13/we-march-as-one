// ================================================================ MODULE 32 (1/2) : modèles de la banque + agences
// Modèles d'après les plans fournis (distributeur, guichet, coffre, casiers, file d'attente, caméra, liasse, sac,
// fourgon blindé, carte), refaits avec des géométries et des matériaux PARTAGÉS (un seul de chaque) pour rester léger.
// Toutes les marques sont inventées : « Banque Azur », « Azur Pay », « Azur Transfert ».
var BANK_LIST=null,BANK_MAP=null;
const BKMC=new Map();
function bkm(k,o){let m=BKMC.get(k);if(!m){m=new THREE.MeshStandardMaterial(Object.assign({roughness:0.7,metalness:0},o));BKMC.set(k,m);}return m;}
function bkb(w,h,d,m,x,y,z,p,ry=0){const o=new THREE.Mesh(BX(+w.toFixed(3),+h.toFixed(3),+d.toFixed(3)),m);o.position.set(x,y,z);o.rotation.y=ry;p.add(o);return o;}
function bkc(r1,r2,h,n,m,x,y,z,p,rx=0,rz=0){const o=new THREE.Mesh(CY(r1,r2,h,n),m);o.position.set(x,y,z);o.rotation.set(rx,0,rz);p.add(o);return o;}
function bkSign(txt,bg,fg,w,h){return signMat(txt,bg,fg,{w,h});}
const BKM={
  get body(){return bkm("body",{color:0x536879,roughness:0.62,metalness:0.12});},get dark(){return bkm("dark",{color:0x17232c,roughness:0.42,metalness:0.18});},
  get trim(){return bkm("trim",{color:0x9aaab3,roughness:0.38,metalness:0.55});},get key(){return bkm("key",{color:0x263944,roughness:0.45,metalness:0.12});},
  get canopy(){return bkm("canopy",{color:0x174a67,roughness:0.52,metalness:0.2});},get glow(){return bkm("glow",{color:0x128dff,emissive:0x087cff,emissiveIntensity:1.2,roughness:0.32});},
  get glowOff(){return bkm("glowOff",{color:0x1a1f24,roughness:0.4});},get bill(){return bkm("bill",{color:0x8bc9dd,roughness:0.75});},
  get stone(){return bkm("stone",{color:0xb0a28c,roughness:0.82});},get glass(){return bkm("glass",{color:0x9bd7e6,roughness:0.22,metalness:0.08,transparent:true,opacity:0.38});},
  get glassD(){return bkm("glassD",{color:0x2b4a62,roughness:0.1,metalness:0.6});},get metal(){return bkm("metal",{color:0x34444d,roughness:0.42,metalness:0.55});},
  get wood(){return bkm("wood",{color:0x6d4933,roughness:0.78});},get screen(){return bkm("screen",{color:0x142a38,emissive:0x092c48,emissiveIntensity:0.7,roughness:0.3});},
  get seat(){return bkm("seat",{color:0x25313a,roughness:0.76});},get steel(){return bkm("steel",{color:0x59646a,roughness:0.32,metalness:0.82});},
  get steelD(){return bkm("steelD",{color:0x26343b,roughness:0.38,metalness:0.7});},get brass(){return bkm("brass",{color:0xb58c47,roughness:0.32,metalness:0.76});},
  get locker(){return bkm("locker",{color:0x52636d,roughness:0.46,metalness:0.72});},get chrome(){return bkm("chrome",{color:0xc7d0d4,roughness:0.24,metalness:0.88});},
  get cord(){return bkm("cord",{color:0x1265b0,roughness:0.72,metalness:0.04});},get housing(){return bkm("housing",{color:0xd8dedf,roughness:0.56,metalness:0.28});},
  get led(){return bkm("led",{color:0xff2222,emissive:0xff0808,emissiveIntensity:1.4,roughness:0.3});},get paper(){return bkm("paper",{color:0x91b69a,roughness:0.9});},
  get band(){return bkm("band",{color:0xe3d3a9,roughness:0.9});},get cloth(){return bkm("cloth",{color:0x9a805a,roughness:0.96});},get tie(){return bkm("tie",{color:0x68543b,roughness:0.9});},
  get van(){return bkm("van",{color:0xe5e5dd,roughness:0.58,metalness:0.18});},get rubber(){return bkm("rubber",{color:0x171a1b,roughness:0.92});},
  get hub(){return bkm("hub",{color:0x7b8588,roughness:0.4,metalness:0.72});},get orange(){return bkm("orange",{color:0xff8a1e,emissive:0xff5c00,emissiveIntensity:0.55,roughness:0.3});},
  get card(){return bkm("card",{color:0x183f62,roughness:0.4,metalness:0.22});},get gold(){return bkm("gold",{color:0xd4ad55,roughness:0.34,metalness:0.78});},
  get euro(){let m=BKMC.get("euro");if(!m){m=new THREE.MeshStandardMaterial({map:cTex("bkEuro",128,128,(g,w,h)=>{g.clearRect(0,0,w,h);g.fillStyle="#f0df9e";g.font="bold 100px sans-serif";g.textAlign="center";g.textBaseline="middle";g.fillText("€",w/2,h/2+4);},false),transparent:true,roughness:0.8});BKMC.set("euro",m);}return m;},
};
// ---------------------------------------------------------------- distributeur (variante "mur" ou "borne"), devant vers +Z
function model_distributeur(opts={}){
  const g=new THREE.Group(),borne=opts.variant==="borne",bH=borne?1.65:1.9,bY=borne?1.075:0.95,bD=borne?0.48:0.38,f=bD/2;
  if(borne){bkb(0.88,0.25,0.58,BKM.dark,0,0.125,0,g);bkb(0.72,0.13,0.52,BKM.trim,0,0.315,0,g);}
  bkb(0.9,bH,bD,BKM.body,0,bY,0,g);bkb(0.84,0.035,bD+0.025,BKM.trim,0,1.88,0,g);
  const scr=new THREE.Group();scr.name="ecran";scr.position.set(0,1.42,f+0.012);bkb(0.49,0.31,0.025,BKM.dark,0,0,0,scr);const s=bkb(0.44,0.25,0.009,BKM.glow,0,0,0.018,scr);s.name="dalle";g.add(scr);
  bkb(0.2,0.025,0.025,BKM.dark,0,1.13,f+0.02,g);
  for(let r=0;r<4;r++)for(let c=0;c<3;c++)bkb(0.09,0.055,0.025,BKM.key,-0.13+c*0.13,0.98-r*0.08,f+0.025,g);
  bkb(0.19,0.027,0.035,BKM.dark,0,0.55,f+0.02,g);bkb(0.29,0.035,0.035,BKM.dark,0,0.34,f+0.02,g);
  const bil=new THREE.Group();bil.name="billets";bil.position.set(0,0.34,f+0.028);bkb(0.19,0.026,0.05,BKM.bill,0,0.034,0.025,bil);bil.visible=false;g.add(bil);
  bkb(0.44,0.035,0.19,BKM.canopy,0,1.91,f+0.08,g);
  const logo=new THREE.Mesh(geo("bkLogoP",()=>new THREE.PlaneGeometry(0.38,0.095)),bkSign("Banque Azur","#123e59","#ffffff",512,128));logo.position.set(0,borne?1.68:1.75,f+0.025);g.add(logo);
  g.userData.size={x:0.9,y:1.9,z:borne?0.58:0.55};return g;
}
// ---------------------------------------------------------------- guichet (côté client vers +Z, employé côté -Z)
function model_guichet(){
  const g=new THREE.Group();
  bkb(4,0.88,0.72,BKM.wood,0,0.44,0.18,g);bkb(4.08,0.12,0.82,BKM.metal,0,0.94,0.18,g);bkb(3.94,0.07,0.76,BKM.wood,0,1.035,0.18,g);
  bkb(3.8,0.08,0.08,BKM.metal,0,2.05,0.28,g);bkb(0.08,1.08,0.08,BKM.metal,-1.86,1.51,0.28,g);bkb(0.08,1.08,0.08,BKM.metal,1.86,1.51,0.28,g);bkb(3.72,1.02,0.025,BKM.glass,0,1.52,0.28,g);
  for(const x of [-1.05,1.05]){bkb(0.72,0.48,0.045,BKM.metal,x,1.37,-0.2,g);bkb(0.62,0.36,0.018,BKM.screen,x,1.39,-0.165,g);bkb(0.72,0.045,0.42,BKM.metal,x,1.08,-0.22,g);}
  for(const x of [-1.05,1.05]){bkb(0.52,0.12,0.48,BKM.seat,x,0.52,-1.05,g);bkb(0.52,0.68,0.12,BKM.seat,x,0.91,-1.23,g);bkb(0.08,0.52,0.08,BKM.metal,x,0.26,-1.05,g);}
  g.userData.size={x:4.08,y:2.12,z:1.95};return g;
}
// ---------------------------------------------------------------- porte de coffre ronde (devant +Z) : "porte" (charnière à gauche) et "volant"
function model_coffre(){
  const g=new THREE.Group(),R=Math.PI/2;
  const tun=new THREE.Mesh(geo("bkTun",()=>new THREE.CylinderGeometry(1.2,1.2,0.3,20,1,true)),bkm("tun",{color:0x3a464c,roughness:0.4,metalness:0.6,side:THREE.DoubleSide}));tun.rotation.x=R;tun.position.set(0,1.15,-0.14);g.add(tun);
  const fr=new THREE.Mesh(geo("bkTorF",()=>new THREE.TorusGeometry(1.18,0.12,8,20)),BKM.brass);fr.position.set(0,1.15,0.02);g.add(fr);
  for(const y of [0.45,1.15,1.85])bkc(0.09,0.09,0.34,10,BKM.brass,-1.27,y,0.02,g,R);
  const porte=new THREE.Group();porte.name="porte";porte.position.set(-1.08,1.15,0.06);
  bkc(1.1,1.1,0.2,20,BKM.steel,1.08,0,0,porte,R);
  const rim=new THREE.Mesh(geo("bkTorR",()=>new THREE.TorusGeometry(1.0,0.045,6,20)),BKM.steelD);rim.position.set(1.08,0,0.12);porte.add(rim);
  for(let i=0;i<8;i++){const a=i*Math.PI/4,b=new THREE.Mesh(geo("bkBolt",()=>new THREE.SphereGeometry(0.055,8,6)),BKM.brass);b.position.set(1.08+Math.cos(a)*0.82,Math.sin(a)*0.82,0.15);porte.add(b);}
  const vol=new THREE.Group();vol.name="volant";vol.position.set(1.08,0,0.19);
  vol.add(new THREE.Mesh(geo("bkTorV",()=>new THREE.TorusGeometry(0.29,0.035,6,14)),BKM.brass));bkc(0.09,0.09,0.07,10,BKM.brass,0,0,0,vol,R);
  for(let i=0;i<6;i++){const a=i*Math.PI/3,s=bkb(0.035,0.27,0.035,BKM.brass,Math.cos(a)*0.135,Math.sin(a)*0.135,0,vol);s.rotation.z=a-Math.PI/2;}
  porte.add(vol);g.add(porte);g.userData.size={x:2.65,y:2.45,z:0.6};return g;
}
// ---------------------------------------------------------------- mur de casiers (30 portes ; "casier0..2" s'ouvrent)
function model_casiers(){
  const g=new THREE.Group();bkb(3,2.2,0.5,BKM.steelD,0,1.1,0,g);
  for(let c=0;c<=6;c++)bkb(0.025,2.2,0.025,BKM.locker,-1.5+c*0.5,1.1,0.255,g);for(let r=0;r<=5;r++)bkb(3,0.025,0.025,BKM.locker,0,r*0.44,0.255,g);
  let n=0;for(let row=0;row<5;row++)for(let col=0;col<6;col++,n++){
    const xl=-1.5+col*0.5+0.0125,y=0.22+(4-row)*0.44,piv=n<3;let p=g,cx=xl+0.2375,yy=y,zz=0.27;
    if(piv){p=new THREE.Group();p.name="casier"+n;p.position.set(xl,y,0.27);g.add(p);cx=0.2375;yy=0;zz=0;}
    bkb(0.475,0.415,0.035,BKM.locker,cx,yy,zz,p);bkb(0.035,0.09,0.045,BKM.steelD,cx+0.16,yy,zz+0.035,p);
    const lab=new THREE.Mesh(geo("bkLab",()=>new THREE.PlaneGeometry(0.12,0.07)),bkSign(String(n+1).padStart(2,"0"),"#203d4d","#f2f5f6",96,56));lab.position.set(cx-0.06,yy+0.1,zz+0.019);p.add(lab);}
  g.userData.size={x:3,y:2.2,z:0.5};return g;
}
// ---------------------------------------------------------------- file d'attente (3 × 1 m, ouverte d'un côté)
function model_file_attente(){
  const g=new THREE.Group(),P=[[-1.46,-0.46],[1.46,-0.46],[1.46,0.46],[-1.46,0.46]];
  for(const [x,z] of P){bkc(0.105,0.12,0.045,12,BKM.metal,x,0.0225,z,g);bkc(0.032,0.042,0.91,8,BKM.chrome,x,0.5,z,g);}
  for(let i=0;i<3;i++){const a=new V3(P[i][0],0.78,P[i][1]),b=new V3(P[i+1][0],0.78,P[i+1][1]),m=a.clone().add(b).multiplyScalar(0.5);m.y-=0.12;
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a,m,b),8,0.022,5,false),BKM.cord));}
  g.userData.size={x:3,y:1,z:1};return g;
}
// ---------------------------------------------------------------- caméra de surveillance (tête "tete" qui pivote)
function model_camera_securite(){
  const g=new THREE.Group();bkb(0.09,0.16,0.025,BKM.metal,0,0.15,-0.12,g);bkc(0.022,0.022,0.11,8,BKM.metal,0,0.15,-0.06,g,Math.PI/2);
  const t=new THREE.Group();t.name="tete";t.position.set(0,0.15,-0.01);bkb(0.17,0.095,0.12,BKM.housing,0,0.015,0.055,t);bkc(0.034,0.042,0.045,10,BKM.metal,0,0.015,0.135,t,Math.PI/2);
  const led=new THREE.Mesh(geo("bkLed",()=>new THREE.SphereGeometry(0.014,6,4)),BKM.led);led.position.set(0.06,0.052,0.12);t.add(led);g.add(t);g.userData.size={x:0.3,y:0.3,z:0.3};return g;
}
// ---------------------------------------------------------------- liasse de billets, sac d'argent, carte bancaire
function model_liasse(){const g=new THREE.Group();bkb(0.15,0.02,0.07,BKM.paper,0,0.01,0,g);bkb(0.033,0.022,0.073,BKM.band,0,0.01,0,g);g.userData.size={x:0.15,y:0.02,z:0.07};return g;}
function model_sac_argent(){
  const g=new THREE.Group(),s=new THREE.Mesh(geo("bkSac",()=>new THREE.SphereGeometry(0.155,10,8)),BKM.cloth);s.scale.set(1,1.12,0.88);s.position.y=0.18;g.add(s);
  bkc(0.085,0.12,0.12,8,BKM.cloth,0,0.335,0,g);const k=new THREE.Mesh(geo("bkKnot",()=>new THREE.SphereGeometry(0.035,6,5)),BKM.tie);k.position.y=0.41;g.add(k);
  const e=new THREE.Mesh(geo("bkEuroP",()=>new THREE.PlaneGeometry(0.14,0.14)),BKM.euro);e.position.set(0,0.2,0.137);g.add(e);g.userData.size={x:0.34,y:0.43,z:0.31};return g;
}
function model_carte_bancaire(){const g=new THREE.Group();bkb(0.085,0.054,0.001,BKM.card,0,0.027,0,g);bkb(0.014,0.011,0.0006,BKM.gold,-0.022,0.031,0.0008,g);
  const l=new THREE.Mesh(geo("bkPayP",()=>new THREE.PlaneGeometry(0.043,0.0215)),bkSign("Azur Pay","#183f62","#f6f8fa",256,128));l.position.set(0.018,0.034,0.0011);g.add(l);return g;}
// ---------------------------------------------------------------- fourgon blindé « Azur Transfert » (nez vers +Z)
function model_fourgon(){
  const g=new THREE.Group(),P=BKM.van,D=BKM.steelD,G=BKM.glassD;
  bkb(2.05,1.83,4.0,P,0,1.56,-0.43,g);                 // caisse blindée
  bkb(2.0,1.25,1.25,P,0,1.27,2.18,g);                   // cabine (capot plus bas)
  bkb(1.96,0.12,4.1,P,0,2.53,-0.43,g);bkb(2.08,0.34,5.3,D,0,0.42,-0.02,g);  // toit, bas de caisse / pare-chocs
  bkb(1.7,0.6,0.04,G,0,1.66,2.81,g);                   // pare-brise
  for(const s of [-1,1]){bkb(0.04,0.5,0.95,G,s*1.005,1.6,2.2,g);bkb(0.04,0.3,0.5,G,s*1.03,1.95,-0.3,g);bkb(0.05,0.08,1.1,D,s*1.04,1.05,2.2,g);}
  bkb(0.9,0.28,0.05,D,0,0.95,2.82,g);for(const x of [-0.72,0.72]){bkb(0.26,0.15,0.05,bkm("headB",{color:0xfff6d0,emissive:0xfff0c0,emissiveIntensity:0.3}),x,1.1,2.82,g);bkb(0.22,0.12,0.05,bkm("tailB",{color:0xc81e1e,emissive:0x600000}),x,1.15,-2.47,g);}
  [[-1.06,1.9],[1.06,1.9],[-1.06,-1.7],[1.06,-1.7]].forEach(([x,z],i)=>{const r=new THREE.Group();r.name="roue"+i;r.position.set(x,0.43,z);bkc(0.41,0.41,0.24,12,BKM.rubber,0,0,0,r,0,Math.PI/2);bkc(0.22,0.22,0.25,10,BKM.hub,0,0,0,r,0,Math.PI/2);g.add(r);});
  for(const s of [-1,1]){const d=new THREE.Group();d.name=s<0?"porteArrG":"porteArrD";d.position.set(s*1.0,0.64,-2.45);bkb(1.0,1.6,0.07,P,-s*0.5,0.8,0,d);bkb(0.06,0.6,0.035,D,-s*0.86,0.82,-0.055,d);g.add(d);}
  bkb(0.34,0.05,0.24,D,0,2.61,1.6,g);const bc=bkc(0.11,0.14,0.18,10,BKM.orange,0,2.72,1.6,g);bc.name="gyro";
  const lm=bkSign("AZUR TRANSFERT","#173f58","#ffffff",640,160);
  for(const s of [-1,1]){const l=new THREE.Mesh(geo("bkVanL",()=>new THREE.PlaneGeometry(2.2,0.5)),lm);l.rotation.y=s*Math.PI/2;l.position.set(s*1.03,1.45,-0.6);g.add(l);}
  g.userData.size={x:2.2,y:2.8,z:5.6};return g;
}
// ---------------------------------------------------------------- où sont les agences
function bankList(){
  if(BANK_LIST)return BANK_LIST;
  const L=[[-2,2,"Agence Centrale"],[4,-4,"Agence Bellevue"],[-7,6,"Agence Coral"],[9,4,"Agence des Plages"]];
  try{for(const T of TOWNS){const ci=Math.round((T.i0+T.i1)/2),cj=Math.round((T.j0+T.j1)/2),bi=ci+1<=T.i1?ci+1:ci-1;L.push([bi,cj,"Agence "+(/^Les /.test(T.name)?"des "+T.name.slice(4):/^Le /.test(T.name)?"du "+T.name.slice(3):/^[AEIOUÉ]/.test(T.name)?"d'"+T.name:"de "+T.name)]);}}catch(e){}
  BANK_LIST=L.map(([cx,cz,name],k)=>{const bcx=cx*40+4,bz0=cz*40-12;return {id:k,cx,cz,name,x:bcx,doorX:bcx,doorZ:bz0+9,x0:bcx-9,x1:bcx+9,z0:bz0+9,z1:bz0+23,refs:null};});
  BANK_MAP=new Map(BANK_LIST.map(B=>[B.cx+","+B.cz,B]));return BANK_LIST;
}
function bankChunkAt(cx,cz){if(!BANK_MAP)bankList();return BANK_MAP.get(cx+","+cz)||null;}
// ---------------------------------------------------------------- constructeur d'îlot « banque »
BUILDERS.banque=function(ch,C){const {bx0,bz0,bx1,bz1,bcx,bcz,base,mid,detail,prop,r,X,Z,cx,cz}=C;
  const B=bankChunkAt(cx,cz)||{name:"Agence",id:-1},x0=bcx-9,x1=bcx+9,z0=bz0+9,z1=bz0+23,h=7.5,y=SIDEWALK;
  walls(x0,z0,x1,z1,0,h,FACADES[1],base,4,3.2);box(x0,z0,x1,z1,h,h+0.5,KM.stone,base);
  addObstacle({type:"box",x:bcx,z:(z0+z1)/2,hx:9,hz:7,tall:true,bld:true,bankDoor:{x:bcx,z:z0+0.25,side:"n"}});
  // façade : soubassement, colonnes, entablement, enseigne, vitrages
  box(x0-0.2,z0-0.35,x1+0.2,z0,0,0.5,BKM.stone,base);box(x0-0.3,z0-0.5,x1+0.3,z0,h-1.3,h-0.7,BKM.stone,base);
  for(const dx of [-8.2,-4.3,4.3,8.2]){put(CY(0.3,0.34,h-1.8,12),BKM.stone,bcx+dx,(h-1.8)/2+0.5,z0-0.4,base);addObstacle({type:"circle",x:bcx+dx,z:z0-0.4,r:0.36});}
  put(BX(5.6,0.85,0.12),signMat("BANQUE AZUR","#114865","#ffffff",{w:768,h:116,glow:true}),bcx,h-1.0,z0-0.57,base);
  put(BX(2.2,0.12,0.16),BKM.metal,bcx,2.42,z0-0.08,base);for(const s of [-1,1])put(BX(0.12,2.4,0.16),BKM.metal,bcx+s*1.0,1.2,z0-0.08,base);
  put(BX(1.9,0.04,1.6),bkm("mat",{color:0x2a2f36,roughness:1}),bcx,y+0.02,z0-1.0,detail);
  // portes vitrées animées (non fusionnées)
  const doors=new THREE.Group();doors.userData.keep=true;const legs=[];
  for(const s of [-1,1]){const d=new THREE.Group();d.position.set(bcx+s*0.9,y,z0-0.06);put(BX(0.88,2.28,0.05),BKM.metal,-s*0.44,1.14,0,d);put(BX(0.74,2.0,0.06),BKM.glass,-s*0.44,1.16,0,d);put(BX(0.04,0.4,0.06),BKM.chrome,-s*0.78,1.1,-0.05,d);doors.add(d);legs.push(d);}
  const back=put(BX(1.76,2.3,0.02),bkm("vest",{color:0x0d141a,roughness:1}),bcx,y+1.15,z0-0.02,doors);base.add(doors);
  // distributeurs de façade
  for(const s of [-1,1]){const a=model_distributeur({variant:"mur"});a.position.set(bcx+s*3.3,y,z0-0.2);a.rotation.y=Math.PI;a.userData.keep=true;base.add(a);addObstacle({type:"box",x:bcx+s*3.3,z:z0-0.2,hx:0.46,hz:0.22,atm:true});}
  // fourgon blindé garé sur le parvis (zone de livraison)
  const fx=bx0+6.2,fz=bz0+5.6;plane(6.4,2.8,bkm("livr",{color:0xd8c25a,roughness:0.9}),fx,y+0.012,fz,detail);put(BX(3,0.5,0.02),signMat("LIVRAISON","#d8c25a","#222",{w:256,h:48}),fx,y+0.016,fz,detail,0).rotation.x=-Math.PI/2;
  const van=model_fourgon();van.position.set(fx,y,fz);van.rotation.y=Math.PI/2;van.userData.keep=true;base.add(van);
  const vo=addObstacle({type:"box",x:fx,z:fz,hx:2.8,hz:1.12,tall:true,van:true});
  for(const x of [bx0+22,bx1-3])prop("bench",x,bz0+4.2,Math.PI);
  for(const x of [bx0+12,bx1-1.5])treeAt(x,bz0+7.4,"palm",1,mid);
  if(B.id>=0)B.refs={doors:legs,back,atms:[...base.children].filter(o=>o.userData.size&&o.userData.size.x===0.9),van,vo,fx,fz,t:0,open:0};
};
