// ================================================================ au nord : campagne, autoroute, ville de Port-Soleil
// L'autoroute A1 part de l'avenue x = 184 au bord nord de la ville (z = -576) et monte jusqu'à Port-Soleil.
// Entre les deux : champs, fermes, forêts, éoliennes, une aire de repos et un relais routier.
const CZ_MIN=-34,WORLD_N=1480,HWY_X=184,HWY_Z0=-578,HWY_Z1=-1068;
const TOWN={i0:1,i1:8,j0:-33,j1:-27,name:"Port-Soleil"};
function inTown(i,j){return i>=TOWN.i0&&i<=TOWN.i1&&j>=TOWN.j0&&j<=TOWN.j1;}
function inCity(i,j){return Math.abs(i)<=14&&Math.abs(j)<=14;}
function chunkExists(cx,cz){return Math.abs(cx)<=14&&cz>=CZ_MIN&&cz<=14;}
function isCountry(cx,cz){return cz<-14&&!inTown(cx,cz);}
// ---------------------------------------------------------------- matériaux de campagne
const CMP={
  field:["#8f9a3e","#b7a64a","#6f8a3a","#a5803c"].map((c,i)=>mat({roughness:1,map:cTex("field"+i,64,64,(g,w,h)=>{g.fillStyle=c;g.fillRect(0,0,w,h);for(let x=0;x<w;x+=8){g.fillStyle="rgba(0,0,0,.18)";g.fillRect(x,0,3,h);}for(let i2=0;i2<300;i2++){g.fillStyle=`rgba(255,255,255,${Math.random()*0.08})`;g.fillRect(Math.random()*w,Math.random()*h,2,2);}})})),
  meadow:mat({roughness:1,map:cTex("meadow",128,128,(g,w,h)=>{g.fillStyle="#6c8f45";g.fillRect(0,0,w,h);for(let i=0;i<1400;i++){const v=Math.random();g.fillStyle=`rgb(${80+v*50},${110+v*50},${50+v*25})`;g.fillRect(Math.random()*w,Math.random()*h,2,2);}for(let i=0;i<40;i++){g.fillStyle=["#f4e04d","#ffffff","#d85a8a"][i%3];g.fillRect(Math.random()*w,Math.random()*h,2,2);}})}),
  dirt:mat({roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,map:cTex("dirt",128,128,(g,w,h)=>{g.fillStyle="#8a7356";g.fillRect(0,0,w,h);for(let i=0;i<900;i++){const v=Math.random();g.fillStyle=`rgb(${110+v*40},${90+v*30},${65+v*25})`;g.fillRect(Math.random()*w,Math.random()*h,2,2);}})}),
  barn:mat({color:0x8a2a22,map:KM.corrug.map}),silo:mat({color:0xc9ccd0,metalness:0.4,roughness:0.4}),
  guard:mat({color:0xb8bcc2,metalness:0.7,roughness:0.35}),pond:mat({color:0x3d6f7f,roughness:0.1,metalness:0.2}),
  hay:mat({color:0xd8b860,roughness:1}),blade:mat({color:0xf2f2f2,roughness:0.5})
};
const HWY_LINE=mat({roughness:0.8,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4,map:cTex("hwyDash",16,64,(g,w,h)=>{g.clearRect(0,0,w,h);g.fillStyle="#efece3";g.fillRect(0,0,w,40);},false)});
// sols : herbe au nord, asphalte sous Port-Soleil
{
  const gr=new THREE.Mesh(scaledUV(new THREE.PlaneGeometry(1200,880).rotateX(-Math.PI/2),300,220),CMP.meadow);gr.position.set(0,-0.012,-1040);gr.receiveShadow=true;scene.add(gr);
  const ax0=TOWN.i0*CHUNK-20,ax1=TOWN.i1*CHUNK+28,az0=TOWN.j0*CHUNK-20,az1=TOWN.j1*CHUNK+28;
  const a=new THREE.Mesh(scaledUV(new THREE.PlaneGeometry(ax1-ax0,az1-az0).rotateX(-Math.PI/2),(ax1-ax0)/4,(az1-az0)/4),WM.asphalt);
  a.position.set((ax0+ax1)/2,0.001,(az0+az1)/2);a.receiveShadow=true;scene.add(a);
}
// ---------------------------------------------------------------- éoliennes (les pales tournent)
const turbines=[];
const KMP_BUSH=mat({color:0x5f8a3a,roughness:0.95});
function windTurbine(x,z,g){put(CY(0.5,0.9,40,10),KM.white,x,20,z,g);put(BX(1.4,1.4,3.4),KM.white,x,40.5,z+0.6,g);
  const rot=new THREE.Group();rot.position.set(x,40.5,z-1.3);rot.userData.keep=true;g.add(rot);
  for(let i=0;i<3;i++){const b=put(geo("blade",()=>new THREE.BoxGeometry(1,15,0.25).translate(0,7.5,0)),CMP.blade,0,0,0,rot);b.rotation.z=i*Math.PI*2/3;}
  put(geo("hub",()=>new THREE.SphereGeometry(0.9,10,8)),KM.white,0,0,0,rot);turbines.push(rot);addObstacle({type:"circle",x,z,r:0.9,tall:true});}
function barnAt(x,z,g){walls(x-6,z-4,x+6,z+4,0,5,CMP.barn,g,3,5);gableRoof(x-6,z-4,x+6,z+4,5,3,KM.roofSlate,g);put(BX(3,3.6,0.05),KM.plank,x,1.8,z+4.03,g);addObstacle({type:"box",x,z,hx:6,hz:4,tall:true,bld:true});}
function siloAt(x,z,g){put(CY(2.2,2.2,12,16),CMP.silo,x,6,z,g);put(geo("siloTop",()=>new THREE.SphereGeometry(2.2,16,8,0,Math.PI*2,0,Math.PI/2)),CMP.silo,x,12,z,g);addObstacle({type:"circle",x,z,r:2.3,tall:true});}
function hayBale(x,z,g,ry){const o=put(geo("hay",()=>new THREE.CylinderGeometry(0.75,0.75,1.2,14).rotateZ(Math.PI/2)),CMP.hay,x,0.75,z,g,ry);addObstacle({type:"circle",x,z,r:0.75});}
function picnic(x,z,g){put(BX(2,0.06,0.8),OM.wood,x,0.75,z,g);for(const s of [-0.65,0.65])put(BX(2,0.05,0.3),OM.wood,x,0.45,z+s,g);for(const s of [-0.8,0.8])put(BX(0.08,0.72,1.6),OM.wood,x+s,0.36,z,g);addObstacle({type:"box",x,z,hx:1,hz:0.8});}
// ---------------------------------------------------------------- types de zone en campagne
function countryType(cx,cz){
  if(cx===5)return "autoroute";
  if((cx===6||cx===4)&&cz===-20)return cx===6?"aire":"relais";
  const r=hash(cx*3.11+cz*7.77+0.2);
  if(Math.abs(cx-5)===1)return r<0.6?"prairie":"champ";
  if(r<0.42)return "champ";if(r<0.62)return "foret";if(r<0.72)return "ferme";if(r<0.8)return "eolien";if(r<0.86)return "etang";return "prairie";
}
function buildCountry(ch,X,Z,r,base,mid,detail){
  const t=ch.type,cz=ch.cz,cx=ch.cx,x0=X-20,z0=Z-20,x1=X+20,z1=Z+20;
  if(t==="autoroute"){
    // 2 × 2 voies, terre-plein central, glissières, lampadaires, panneaux
    plane(17,40,WM.asphalt,HWY_X,0.004,Z,base,4,10);
    for(const lx of [-4,4])plane(0.18,40,HWY_LINE,HWY_X+lx,0.012,Z,base,1,10);
    for(const lx of [-7.8,7.8])plane(0.2,40,WM.line,HWY_X+lx,0.012,Z,base,1,1);
    box(HWY_X-0.4,z0,HWY_X+0.4,z1,0,0.8,KM.stone,base);addObstacle({type:"box",x:HWY_X,z:Z,hx:0.4,hz:20});
    for(const s of [-1,1]){box(HWY_X+s*8.8-0.06,z0,HWY_X+s*8.8+0.06,z1,0.45,0.75,CMP.guard,base);for(let z=z0;z<z1;z+=4)put(BX(0.12,0.7,0.12),CMP.guard,HWY_X+s*8.8,0.35,z,base);
      addObstacle({type:"box",x:HWY_X+s*8.8,z:Z,hx:0.08,hz:20});}
    for(let z=z0+6;z<z1;z+=20){put(CY(0.1,0.12,9,8),OM.metal,HWY_X,4.5,z,mid);put(BX(5,0.15,0.3),OM.metal,HWY_X,9,z,mid);for(const s of [-2.4,2.4])put(BX(0.8,0.15,0.4),KM.white,HWY_X+s,8.9,z,mid);}
    if(Math.abs(cz)%3===0){const sz=Z-4;for(const s of [-1,1])put(CY(0.12,0.12,6,8),OM.metal,HWY_X-10.5,3,sz+s*2.5,mid);put(BX(0.15,2.2,6.2),signMat(cz>-24?"Port-Soleil  "+Math.round((-1068-Z)/-1000*10)/10+" km":"Centre-ville  "+Math.round((Z+576)/-100)/10+" km","#1f6a3a","#fff",{w:768,h:200,border:"#fff"}),HWY_X-10.5,6,sz,mid,Math.PI/2);}
    // de temps en temps : une voiture en panne sur la bande d'arrêt d'urgence, ou un auto-stoppeur
    {const h=hash(cz*3.7+11.3);
      if(h<0.22&&cz<-16&&cz>-25){const pz=Z+r()*12-6;parkedCar(HWY_X-10.3,pz,0,mid,KM.red);put(geo("tri",()=>new THREE.ConeGeometry(0.35,0.5,3)),KM.red,HWY_X-10.3,0.25,pz-9,detail);
        const hz=new THREE.Mesh(geo("hazard",()=>new THREE.SphereGeometry(0.12,6,4)),new THREE.MeshBasicMaterial({color:0xffa000}));hz.position.set(HWY_X-9.5,0.75,pz-2.2);hz.userData.keep=true;hz.userData.blink=true;detail.add(hz);turbines.push(hz);
        addAmb("panne",HWY_X-12.2,pz+0.5,90);}
      else if(h>0.86&&cz<-16&&cz>-25)addAmb("autostop",HWY_X-10.6,Z+r()*10,180);}
    // côtés : herbe et arbres
    for(let k=0;k<5;k++){treeAt(HWY_X-14-r()*5,z0+r()*40,"conifer",0.9+r()*0.5,mid,0.4);treeAt(HWY_X+14+r()*5,z0+r()*40,"round",0.9+r()*0.4,mid,0.4);}
    if(Math.abs(cz)%4===2)billboard(HWY_X+13,Z,Math.PI/2*-1+Math.PI,cz,mid);
    return;
  }
  if(t==="champ"){const m=CMP.field[Math.floor(r()*CMP.field.length)];plane(36,36,m,X,0.006,Z,base,6,6,r()<0.5?0:Math.PI/2);
    fenceRun(x0+2,z0+2,x1-2,z0+2,"wood",mid,[[16,20]]);if(r()<0.5)for(let i=0;i<6;i++)hayBale(x0+6+r()*28,z0+6+r()*28,detail,r()*3);return;}
  if(t==="prairie"){
    for(let i=0;i<9;i++)treeAt(x0+3+r()*34,z0+3+r()*34,r()<0.4?"round":r()<0.7?"light":"conifer",0.8+r()*0.6,mid,0.3);
    for(let i=0;i<6;i++){const x=x0+2+r()*36,z=z0+2+r()*36,s=0.4+r()*0.9;put(geo("rock",()=>new THREE.DodecahedronGeometry(1,0)),KM.stone,x,s*0.4,z,mid,r()*3,s*1.3,s*0.7,s);if(s>0.8)addObstacle({type:"circle",x,z,r:s});}
    for(let i=0;i<10;i++)put(geo("bush",()=>new THREE.IcosahedronGeometry(0.7,1)),i%2?OM.leaf:KMP_BUSH,x0+2+r()*36,0.35,z0+2+r()*36,detail,0,1+r(),0.7+r()*0.5,1+r());
    if(r()<0.5){fenceRun(x0+3,z0+20,x1-3,z0+20,"wood",mid,[[15,19]]);}
    if(r()<0.35){const cx2=X+r()*10-5,cz2=Z+r()*10-5;for(let i=0;i<4;i++)hayBale(cx2+i*1.6,cz2,detail,0);}
    return;}
  if(t==="foret"){for(let i=0;i<26;i++)treeAt(x0+2+r()*36,z0+2+r()*36,r()<0.65?"conifer":"round",0.9+r()*0.8,i<14?base:mid,0.35);return;}
  if(t==="ferme"){barnAt(X-6,Z-4,base);siloAt(X+8,Z-6,base);plane(20,14,CMP.dirt,X,0.007,Z+8,base,4,3);
    walls(X+3,Z+6,X+11,Z+13,0,3,KM.houseWall[0],base,3,2.9);gableRoof(X+3,Z+6,X+11,Z+13,3,1.8,KM.roofTile,base);addObstacle({type:"box",x:X+7,z:Z+9.5,hx:4,hz:3.5,tall:true,bld:true});
    for(let i=0;i<4;i++)hayBale(X-14+i*2,Z+12,detail,0);parkedCar(X-2,Z+12,0,mid,CAR_PAINT[8],"van");
    fenceRun(x0+1,z0+1,x1-1,z0+1,"wood",mid,[[18,22]]);return;}
  if(t==="eolien"){plane(36,36,CMP.field[2],X,0.006,Z,base,6,6);windTurbine(X+r()*10-5,Z+r()*10-5,base);return;}
  if(t==="etang"){const m=new THREE.Mesh(geo("pond",()=>new THREE.CircleGeometry(12,32).rotateX(-Math.PI/2)),CMP.pond);m.position.set(X,0.03,Z);base.add(m);addObstacle({type:"circle",x:X,z:Z,r:11.5});
    for(let i=0;i<10;i++){const a=i/10*6.28,rr=13+r()*4;treeAt(X+Math.cos(a)*rr,Z+Math.sin(a)*rr,r()<0.5?"light":"round",0.9+r()*0.4,mid,0.3);}
    put(BX(1.4,0.12,5),KM.plank,X,0.25,Z-11,detail);picnic(X+15,Z+2,detail);return;}
  if(t==="aire"){ // aire de repos côté est
    plane(26,30,WM.asphalt,X+2,0.006,Z,base,6,8);for(let z=Z-12;z<Z+12;z+=3)if(r()<0.6)parkedCar(X+8,z,Math.PI/2,mid);
    walls(X-6,Z+8,X+1,Z+13,0,3,KM.houseWall[1],base,3,2.9);box(X-6.2,Z+7.8,X+1.2,Z+13.2,3,3.2,KM.roofSlate,base);put(BX(5,0.5,0.05),signMat("Toilettes · Café","#1f4fa0","#fff",{w:512,h:64}),X-2.5,2.6,Z+7.96,base);addObstacle({type:"box",x:X-2.5,z:Z+10.5,hx:3.5,hz:2.5,tall:true,bld:true});
    for(let i=0;i<4;i++)picnic(X-12,Z-12+i*5,detail);
    // camion à frites
    const ft=new THREE.Group();ft.position.set(X-4,0,Z-6);detail.add(ft);put(BX(2.4,2.6,5.5),KM.yellow,0,1.6,0,ft);put(BX(0.05,1.1,3),KM.glass,1.22,2,0,ft);put(BX(0.1,0.6,4),signMat("Frites & Co","#c8102e","#fff",{w:512,h:64}),1.3,3.1,0,ft);
    for(const s of [-1.8,1.8])put(geo("wheel",()=>new THREE.CylinderGeometry(0.33,0.33,0.22,12).rotateZ(Math.PI/2)),KM.tire,1.1,0.33,s,ft);addObstacle({type:"box",x:X-4,z:Z-6,hx:1.2,hz:2.8});
    for(let k=0;k<6;k++)treeAt(x0+2+r()*36,z1-2-r()*4,"round",1,mid,0.3);return;}
  if(t==="relais"){ // relais routier côté ouest
    plane(30,26,WM.asphalt,X,0.006,Z+2,base,7,7);walls(X-12,Z-14,X+2,Z-5,0,4,KM.houseWall[2],base,3,2.9);box(X-12.3,Z-14.3,X+2.3,Z-4.7,4,4.3,KM.white,base);
    put(BX(8,1.2,0.12),signMat("Le Relais des Routiers","#7a1f1f","#ffe9a8",{w:768,h:96,glow:true}),X-5,4.9,Z-4.6,base);put(BX(6,2.4,0.05),KM.shop,X-5,1.3,Z-4.97,base);addObstacle({type:"box",x:X-5,z:Z-9.5,hx:7,hz:4.5,tall:true,bld:true});
    for(let i=0;i<3;i++){const tr=new THREE.Group();tr.position.set(X+8,0,Z-6+i*7);mid.add(tr);put(BX(2.5,3.2,8),KM.white,0,2,0.5,tr);put(BX(2.4,2.4,2.2),[KM.red,KM.blue,KM.green][i],0,1.6,-4.6,tr);put(BX(2.3,1,0.05),KM.glass,0,2.3,-5.72,tr);for(const z of [-4.5,-1,2.5,3.6])for(const s of [-1.1,1.1])put(geo("wheel",()=>new THREE.CylinderGeometry(0.33,0.33,0.22,12).rotateZ(Math.PI/2)),KM.tire,s,0.45,z,tr);addObstacle({type:"box",x:X+8,z:Z-6+i*7,hx:1.3,hz:5.6});}
    for(let k=0;k<3;k++)terraceSet(X-10+k*3,Z-2,detail,STRIPES[k%STRIPES.length]);return;}
}
function updateCountry(dt){for(let i=turbines.length-1;i>=0;i--){const t=turbines[i];if(!t.parent||!t.parent.parent){turbines.splice(i,1);continue;}
  if(t.userData.blink){t.visible=Math.floor(clockT*2.4)%2===0;continue;}
  t.rotation[t.userData.ax||"z"]+=dt*(t.userData.spd||0.9);
  const cb=t.userData.cabins;if(cb){const R=t.userData.R;cb.forEach((c,k)=>{const a=t.rotation.z+k*Math.PI/6+Math.PI/2;c.position.set(Math.cos(a)*R,Math.sin(a)*R,0);});}}}
function townType(cx,cz){
  const sp={"5,-30":"marche","3,-31":"eglise","6,-28":"station","2,-28":"ecole"}[cx+","+cz];if(sp)return sp;
  const r=hash(cx*5.3+cz*9.1+1.7),main=cx===4||cx===5;
  if(main)return r<0.7?"commerces":r<0.85?"place":"parc";
  return r<0.45?"maisons":r<0.6?"commerces":r<0.72?"parc":r<0.8?"place":r<0.87?"terrain":r<0.93?"parking":"immeubles";
}
