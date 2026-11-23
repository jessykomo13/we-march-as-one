// ================================================================ LE MONDE ÉTENDU : campagne en relief, eau, autoroutes, ponts, biomes, aéroport
// Chaque zone de campagne (40 m) construit : son sol en relief (maillage 4 m, couleurs du biome), son eau (mer, lac, bayou),
// les morceaux d'autoroute qui la traversent (ponts au-dessus de l'eau), puis le décor de son biome.
const TERR_MAT=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1,
  map:cTex("terrDet",128,128,(g,w,h)=>{g.fillStyle="#d8d8d8";g.fillRect(0,0,w,h);for(let i=0;i<2600;i++){const v=170+Math.random()*85|0;g.fillStyle=`rgb(${v},${v},${v})`;g.fillRect(Math.random()*w,Math.random()*h,2,2);}})});
TERR_MAT.map.repeat.set(1,1);
const CH_WATER=KM.water.clone();CH_WATER.map=KM.water.map.clone();CH_WATER.map.repeat.set(1,1);CH_WATER.map.needsUpdate=true;CH_WATER.opacity=0.82;
const BAYOU_WATER=new THREE.MeshStandardMaterial({color:0x40523a,roughness:0.12,metalness:0.15,transparent:true,opacity:0.86});
const ROAD_M=WM.asphalt.clone();Object.assign(ROAD_M,{polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
const LINE_W=new THREE.MeshStandardMaterial({color:0xefece3,roughness:0.8,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4});
const LINE_Y=new THREE.MeshStandardMaterial({color:0xf2c43a,roughness:0.8,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4});
const DASH_M=HWY_LINE.clone();DASH_M.map=HWY_LINE.map.clone();DASH_M.map.wrapS=DASH_M.map.wrapT=THREE.RepeatWrapping;DASH_M.map.needsUpdate=true;
const WM2={
  concrete:mat({color:0xb9b4aa,roughness:0.9}),rail:mat({color:0xb8bcc2,metalness:0.7,roughness:0.35}),
  cypress:mat({color:0x5b4a36,roughness:0.95}),moss:new THREE.MeshStandardMaterial({color:0x5f6b48,roughness:1,side:THREE.DoubleSide}),
  cypLeaf:mat({color:0x4b5f2e,roughness:0.95}),dead:mat({color:0x6e6458,roughness:1}),lily:mat({color:0x4f8a3a,roughness:0.8}),
  orangeLeaf:mat({color:0x3f6e2a,roughness:0.9}),orange:mat({color:0xf28a1a,roughness:0.6}),vine:mat({color:0x557a2e,roughness:0.95}),
  straw:mat({color:0xc9b25a,roughness:1}),saw:mat({color:0xb3a35a,roughness:1}),cow:mat({color:0xf2efe8,roughness:0.9}),cowSpot:mat({color:0x2a2622,roughness:0.9}),
  gator:mat({color:0x3f4a2a,roughness:0.7}),gatorBelly:mat({color:0x9a9a6a,roughness:0.8}),rock:mat({color:0x8d877c,roughness:1}),snow:mat({color:0xe8ecef,roughness:0.9}),
  shack:mat({color:0x7d6a52,map:KM.plank.map,roughness:0.95}),tin:mat({color:0x8a8f94,map:KM.corrug.map,metalness:0.4,roughness:0.5}),
  runway:mat({color:0x3b3d42,roughness:0.95,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),
  taxi:mat({color:0x4a4c52,roughness:0.95,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),
  glass:mat({color:0x2b4a62,roughness:0.08,metalness:0.7}),hangar:mat({color:0xd6d9dc,map:KM.corrug.map,metalness:0.3,roughness:0.5}),
  plane:mat({color:0xf4f4f2,roughness:0.35,metalness:0.2}),planeBlue:mat({color:0x1f5fa8,roughness:0.4}),
  neon:new THREE.MeshBasicMaterial({color:0xff4fa0}),motel:mat({color:0xf2d6a2,roughness:0.9})
};
// ---------------------------------------------------------------- couleurs du sol
const BIO_COL={champ:[0.56,0.61,0.30],prairie:[0.40,0.58,0.26],foret:[0.30,0.43,0.21],lande:[0.48,0.50,0.31],montagne:[0.50,0.49,0.42],savane:[0.60,0.62,0.36],
  orangeraie:[0.40,0.54,0.24],vigne:[0.47,0.53,0.27],ferme:[0.44,0.58,0.28],eolien:[0.50,0.60,0.30],bayou:[0.33,0.41,0.21],plage:[0.85,0.77,0.58],cayo:[0.86,0.79,0.60],
  mer:[0.78,0.72,0.55],lac:[0.42,0.40,0.28],aeroport:[0.44,0.58,0.29]};
const _tc=new THREE.Color();
function terrColor(x,z,y,bio){
  let c=BIO_COL[bio]||BIO_COL.prairie;
  if(y<WATER_Y+0.035){ // rivage, fond de l'eau
    const k=clamp01((WATER_Y+0.035-y)/3.5);
    if(bio==="bayou"||bio==="lac")c=[0.36-k*0.15,0.33-k*0.12,0.22-k*0.08];else c=[0.84-k*0.42,0.76-k*0.32,0.56-k*0.18];}
  else if(y>26){const k=clamp01((y-26)/16);c=[lerp(c[0],0.47,k),lerp(c[1],0.46,k),lerp(c[2],0.44,k)];if(y>52){const s=clamp01((y-52)/8);c=[lerp(c[0],0.93,s),lerp(c[1],0.95,s),lerp(c[2],0.98,s)];}}
  const n=(vnoise(x/23,z/23,2)-0.5)*0.16+(vnoise(x/7,z/7,4)-0.5)*0.06;
  _tc.setRGB(clamp01(c[0]+n),clamp01(c[1]+n*1.1),clamp01(c[2]+n*0.6),THREE.SRGBColorSpace);return _tc;
}
// ---------------------------------------------------------------- sol en relief d'une zone (maillage 4 m)
function countryGroundMesh(X,Z,g){
  const N=10,gm=new THREE.PlaneGeometry(40,40,N,N).rotateX(-Math.PI/2);gm.translate(X,0,Z);
  const P=gm.attributes.position,col=new Float32Array(P.count*3),uv=gm.attributes.uv;let water=false,wetBayou=false,minY=99;
  for(let i=0;i<P.count;i++){const x=Math.round(P.getX(i)),z=Math.round(P.getZ(i));let y;
    if(inGridArea(x,z))y=-0.04;else y=nodeH(Math.round(x/TGRID),Math.round(z/TGRID));
    P.setY(i,y);if(y<WATER_Y-0.004){water=true;if(bayouK(x,z)>0.05)wetBayou=true;}minY=Math.min(minY,y);
    const c=terrColor(x,z,y,biomeAt(x,z));col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;uv.setXY(i,x/9,z/9);}
  gm.setAttribute("color",new THREE.BufferAttribute(col,3));gm.computeVertexNormals();
  const m=new THREE.Mesh(gm,TERR_MAT);m.receiveShadow=true;g.add(m);
  if(water){const w=new THREE.Mesh(geo("wplane40",()=>new THREE.PlaneGeometry(40,40).rotateX(-Math.PI/2)),wetBayou?BAYOU_WATER:CH_WATER);w.position.set(X,WATER_Y,Z);w.receiveShadow=true;g.add(w);}
  return {water,minY};
}
// ---------------------------------------------------------------- autoroutes, routes et ponts
function hwyAt(H,s,o){const L=hwyLine(H);return H.ax==="ns"?[L+o,s]:[s,L+o];}
// ruban le long de l'axe : hauteur = sol (ou tablier du pont) tous les 4 m
function ribbon(H,s0,s1,o0,o1,dy,m,g,uvScale){
  const n=Math.max(1,Math.round((s1-s0)/4)),pos=[],uv=[],idx=[];
  for(let k=0;k<=n;k++){const s=s0+(s1-s0)*k/n,[cx,cz]=hwyAt(H,s,(o0+o1)/2),y=groundAt(cx,cz)+dy;
    for(const o of [o0,o1]){const [x,z]=hwyAt(H,s,o);pos.push(x,y,z);uv.push((o-o0)/(uvScale?uvScale[0]:1),s/(uvScale?uvScale[1]:4));}}
  for(let k=0;k<n;k++){const a=k*2;if(H.ax==="ns")idx.push(a,a+2,a+1,a+1,a+2,a+3);else idx.push(a,a+1,a+2,a+1,a+3,a+2);}
  const gm=new THREE.BufferGeometry();gm.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));gm.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));gm.setIndex(idx);gm.computeVertexNormals();
  const me=new THREE.Mesh(gm,m);me.receiveShadow=true;g.add(me);return me;
}
function junctionNear(H,s){
  for(const K of HWYS){if(K===H||K.ax===H.ax)continue;const Lk=hwyLine(K),[a,b]=hwyRange(K),L=hwyLine(H);if(Math.abs(Lk-s)<26&&L>=a-12&&L<=b+12)return true;}
  const [x,z]=hwyAt(H,s,0);return gridDist(x,z)<34;
}
function townAhead(H,s,dir){let best=null,bd=1e9;const L=hwyLine(H);
  for(const T of TOWNS){const cx=(T.i0+T.i1)/2*40,cz=(T.j0+T.j1)/2*40,ts=H.ax==="ns"?cz:cx,tl=H.ax==="ns"?cx:cz;if((ts-s)*dir<200||Math.abs(tl-L)>900)continue;const d=Math.abs(ts-s);if(d<bd){bd=d;best=T;}}
  if(!best){const ts=0;if((ts-s)*dir>200&&Math.abs(L)<2000)return ["Azuria",Math.abs(s)];}
  return best?[best.name,bd]:null;}
function buildHighways(ch,X,Z,r,base,mid,detail){
  for(const H of HWYS){
    const L=hwyLine(H),[a,b]=hwyRange(H),ax0=H.ax==="ns"?X-20:Z-20,ax1=ax0+40,lx0=H.ax==="ns"?Z-20:X-20,lx1=lx0+40;
    if(L<ax0||L>=ax1)continue;const s0=Math.max(lx0,a-4),s1=Math.min(lx1,b+4);if(s1<=s0)continue;
    const hw=hwyHalf(H),P=bridgeProfile(H);
    ribbon(H,s0,s1,-hw,hw,0.03,ROAD_M,base,[4,4]);
    if(!H.small){ribbon(H,s0,s1,-4.1,-3.9,0.045,DASH_M,base,[1,4]);ribbon(H,s0,s1,3.9,4.1,0.045,DASH_M,base,[1,4]);
      ribbon(H,s0,s1,-0.75,-0.6,0.045,LINE_Y,base);ribbon(H,s0,s1,0.6,0.75,0.045,LINE_Y,base);}
    else ribbon(H,s0,s1,-0.08,0.08,0.045,DASH_M,base,[1,4]);
    ribbon(H,s0,s1,-hw+0.4,-hw+0.55,0.045,LINE_W,base);ribbon(H,s0,s1,hw-0.55,hw-0.4,0.045,LINE_W,base);
    // tablier, piles et parapets là où la route passe au-dessus de l'eau
    for(let s=Math.ceil(s0/4)*4;s<s1;s+=4){const k=Math.round((s-a)/4);if(k<0||k>=P.n||!P.wet[k])continue;const h=P.deck[k];if(h<LAND_Y+0.15)continue;
      const [cx,cz]=hwyAt(H,s+2,0);box(H.ax==="ns"?cx-hw:cx-2,H.ax==="ns"?cz-2:cz-hw,H.ax==="ns"?cx+hw:cx+2,H.ax==="ns"?cz+2:cz+hw,h-0.9,h+0.02,WM2.concrete,base);
      for(const sd of [-1,1]){const [px,pz]=hwyAt(H,s+2,sd*(hw-0.15));put(BX(H.ax==="ns"?0.3:4.05,0.9,H.ax==="ns"?4.05:0.3),WM2.concrete,px,h+0.45,pz,base);}
      if(k%4===0)for(const sd of [-0.55,0.55]){const [px,pz]=hwyAt(H,s,sd*hw),fl=countryFloor(px,pz);put(CY(0.7,0.8,h-0.9-fl+0.2,8),WM2.concrete,px,(h-0.9+fl)/2,pz,base);}
    }
    // obstacles : parapets (pont) ou glissières, terre-plein central ; ouverts aux carrefours
    const mid0=(s0+s1)/2,wet=P.wet[clamp(Math.round((mid0-a)/4),0,P.n-1)]&&P.deck[clamp(Math.round((mid0-a)/4),0,P.n-1)]>LAND_Y+0.4;
    if(!junctionNear(H,mid0)){
      for(const sd of [-1,1]){const [ox,oz]=hwyAt(H,mid0,sd*(hw+(wet?-0.15:0.25)));addObstacle({type:"box",x:ox,z:oz,hx:H.ax==="ns"?0.15:(s1-s0)/2,hz:H.ax==="ns"?(s1-s0)/2:0.15});
        if(!wet){const len=s1-s0;for(let s=s0;s<s1;s+=4){const [px,pz]=hwyAt(H,s,sd*(hw+0.25));put(BX(0.12,0.7,0.12),WM2.rail,px,groundAt(px,pz)+0.35,pz,mid);}
          const [gx,gz]=hwyAt(H,mid0,sd*(hw+0.25));put(BX(H.ax==="ns"?0.08:len,0.3,H.ax==="ns"?len:0.08),WM2.rail,gx,groundAt(gx,gz)+0.6,gz,mid);}}
      if(!H.small){const [mx,mz]=hwyAt(H,mid0,0),gy=groundAt(mx,mz);put(BX(H.ax==="ns"?0.6:s1-s0,0.8,H.ax==="ns"?s1-s0:0.6),WM2.concrete,mx,gy+0.4,mz,base);
        addObstacle({type:"box",x:mx,z:mz,hx:H.ax==="ns"?0.3:(s1-s0)/2,hz:H.ax==="ns"?(s1-s0)/2:0.3});}
    }
    // lampadaires, panneaux, panneaux publicitaires
    if(!H.small&&Math.abs(Math.round(mid0/40))%2===0){const [mx,mz]=hwyAt(H,mid0,0),y=groundAt(mx,mz);put(CY(0.1,0.12,9,8),OM.metal,mx,y+4.5,mz,mid);put(BX(H.ax==="ns"?5:0.3,0.15,H.ax==="ns"?0.3:5),OM.metal,mx,y+9,mz,mid);
      for(const sd of [-2.4,2.4]){const [lx,lz]=hwyAt(H,mid0,sd);put(BX(0.8,0.15,0.8),OM.lamp,lx,y+8.9,lz,mid);}}
    const seg=Math.round(mid0/40);
    if(!wet&&Math.abs(seg)%5===2){for(const dir of [1,-1]){const t=townAhead(H,mid0,dir);if(!t)continue;const sd=dir>0?1:-1,[px,pz]=hwyAt(H,mid0,sd*(hw+2.2)),y=groundAt(px,pz);
      put(CY(0.12,0.12,6,8),OM.metal,px+(H.ax==="ns"?0:-2.5),y+3,pz+(H.ax==="ns"?-2.5:0),mid);put(CY(0.12,0.12,6,8),OM.metal,px+(H.ax==="ns"?0:2.5),y+3,pz+(H.ax==="ns"?2.5:0),mid);
      const txt=t[0]+"  "+(t[1]/1000).toFixed(1)+" km",sm=signMat(txt,"#1f6a3a","#fff",{w:768,h:200,border:"#fff"});
      put(BX(H.ax==="ns"?6.2:0.15,2.2,H.ax==="ns"?0.15:6.2),sm,px,y+6,pz,mid,0);}}
    if(!wet&&Math.abs(seg)%7===3&&!H.small){const [px,pz]=hwyAt(H,mid0,hw+6);billboard(px,pz,H.ax==="ns"?Math.PI/2:0,seg,mid);}
    // panne ou auto-stoppeur au bord de la route
    const hh=hash(seg*3.7+L*0.013);
    if(!wet&&!H.small&&hh<0.05){const [px,pz]=hwyAt(H,mid0,-(hw+2.4));parkedCar(px,pz,H.ax==="ns"?0:Math.PI/2,mid,KM.red);const [ax2,az2]=hwyAt(H,mid0+0.5,-(hw+4.4));addAmb("panne",ax2,az2,H.ax==="ns"?90:180);}
    else if(!wet&&hh>0.965){const [ax2,az2]=hwyAt(H,mid0,-(hw+1.4));addAmb("autostop",ax2,az2,H.ax==="ns"?180:270);}
  }
}
// la route occupe-t-elle ce point (avec une marge) ?
function onAnyRoad(x,z,m){for(const H of HWYS){if(hwyDist(x,z,H)<hwyHalf(H)+m)return true;}return false;}
// ---------------------------------------------------------------- décor : éléments réutilisables
function lifted(g,x,z){const o=new THREE.Group();o.position.y=groundAt(x,z);g.add(o);return o;}
function rockAt(x,z,s,g){const y=groundAt(x,z);put(geo("rock",()=>new THREE.DodecahedronGeometry(1,0)),WM2.rock,x,y+s*0.35,z,g,(x*7.3+z)%6,s*1.3,s*0.75,s);if(s>0.7)addObstacle({type:"circle",x,z,r:s*0.9,tall:s>1.4});}
function cypressAt(x,z,s,g,r){const y=Math.max(groundAt(x,z),WATER_Y-0.4);put(CY(0.18*s,0.55*s,1.2*s,7),WM2.cypress,x,y+0.6*s,z,g);put(CY(0.12*s,0.2*s,7*s,7),WM2.cypress,x,y+4.3*s,z,g);
  put(geo("cypTop",()=>new THREE.CylinderGeometry(2.2,1.6,1.2,8)),WM2.cypLeaf,x,y+7.8*s,z,g,0,s,s,s);put(geo("cypTop2",()=>new THREE.CylinderGeometry(1.4,1.9,0.8,8)),WM2.cypLeaf,x+0.6*s,y+8.6*s,z,g,0,s,s,s);
  for(let k=0;k<3;k++){const a=r()*6.28,m=put(geo("moss",()=>new THREE.ConeGeometry(0.35,2.2,4).rotateX(Math.PI)),WM2.moss,x+Math.cos(a)*1.4*s,y+6.2*s,z+Math.sin(a)*1.4*s,g,a);if(0)put(geo("moss0",()=>new THREE.PlaneGeometry(0.7,2.2)),WM2.moss,x+Math.cos(a)*1.4*s,y+6.4*s,z+Math.sin(a)*1.4*s,g,a);m.scale.setScalar(s);}
  addObstacle({type:"circle",x,z,r:0.4*s,tall:true});}
function deadTree(x,z,s,g){const y=groundAt(x,z);put(CY(0.12*s,0.25*s,6*s,6),WM2.dead,x,y+3*s,z,g);for(let k=0;k<3;k++){const b=put(CY(0.05*s,0.09*s,2.4*s,5),WM2.dead,x,y+(3.5+k)*s,z,g,k*2.1);b.rotation.z=0.9;}addObstacle({type:"circle",x,z,r:0.3*s,tall:true});}
function orangeTree(x,z,g){const y=groundAt(x,z);put(CY(0.1,0.14,1.2,6),WM.trunk,x,y+0.6,z,g);put(geo("oTop",()=>new THREE.IcosahedronGeometry(1.5,1)),WM2.orangeLeaf,x,y+2.1,z,g,0,1,0.85,1);
  for(const [dx,dy,dz] of [[0.9,2.2,0.8],[-0.8,1.9,-0.6]])put(geo("orng",()=>new THREE.SphereGeometry(0.13,6,4)),WM2.orange,x+dx,y+dy,z+dz,g);addObstacle({type:"circle",x,z,r:0.35,tall:true});}
function cowAt(x,z,ry,g,k){const o=lifted(g,x,z);const c=new THREE.Group();c.position.set(x,0,z);c.rotation.y=ry;o.add(c);
  put(BX(0.75,0.75,1.7),k%2?WM2.cow:KM.terracotta,0,1.0,0,c);put(BX(0.5,0.48,0.6),k%2?WM2.cow:KM.terracotta,0,1.2,1.05,c);put(BX(0.36,0.3,0.25),WM2.cowSpot,0,1.1,1.42,c);
  if(k%2)put(BX(0.77,0.4,0.5),WM2.cowSpot,0,1.15,-0.2,c);for(const [a,b] of [[-0.25,-0.6],[0.25,-0.6],[-0.25,0.6],[0.25,0.6]])put(BX(0.16,0.62,0.16),WM2.cowSpot,a,0.31,b,c);
  addObstacle({type:"circle",x,z,r:0.95});}
function grassTuft(x,z,g,m){put(geo("tuft",()=>new THREE.ConeGeometry(0.35,1.2,5)),m||WM2.saw,x,groundAt(x,z)+0.55,z,g);}
function stiltShack(x,z,g,r,k){const y=Math.max(groundAt(x,z),WATER_Y)+1.4,o=new THREE.Group();g.add(o);
  for(const [dx,dz] of [[-2.8,-2.3],[2.8,-2.3],[-2.8,2.3],[2.8,2.3]])put(CY(0.12,0.12,3,6),OM.wood,x+dx,y-1.4,z+dz,o);
  box(x-3.2,z-2.7,x+3.2,z+2.7,y-0.15,y,KM.plank,o);walls(x-2.6,z-2.1,x+2.6,z+2.1,y,2.4,WM2.shack,o,3,2.4);box(x-3,z-2.6,x+3,z+2.6,y+2.4,y+2.55,WM2.tin,o);
  put(BX(1,1.9,0.06),KM.door,x,y+0.95,z+2.13,o);put(BX(5,0.1,1.6),KM.plank,x,y-0.05,z+3.5,o);
  put(BX(2.6,0.5,0.1),signMat(["Appâts & Bière","Chez Mamie Lou","Écorchage d'écrevisses","Cabane à Boudin"][k%4],"#3a2a1a","#f2e2b0",{w:512,h:96}),x,y+2.0,z+2.17,o);
  addObstacle({type:"box",x,z,hx:3.1,hz:2.6,tall:true,bld:true});}
function boatSmall(x,z,ry,g,col){const b=new THREE.Group();b.position.set(x,WATER_Y,z);b.rotation.y=ry;b.userData.keep=true;g.add(b);
  put(BX(1.8,0.6,4.5),col||KM.white,0,0.1,0,b);put(BX(1.5,0.08,4.2),OM.wood,0,0.42,0,b);put(BX(0.6,0.5,0.6),KM.dark,0,0.7,-1.6,b);worldMovers.push({o:b,kind:"bob",ph:x*0.1});return b;}
function airboat(x,z,ry,g){const b=new THREE.Group();b.position.set(x,WATER_Y,z);b.rotation.y=ry;b.userData.keep=true;g.add(b);put(BX(2.2,0.4,4.6),KM.white,0,0.15,0,b);put(BX(1,1.2,0.8),KM.dark,0,0.9,0.4,b);
  put(geo("fanCage",()=>new THREE.TorusGeometry(1.1,0.06,6,16)),KM.chrome,0,1.5,-1.8,b);put(CY(0.15,0.15,0.6,8),KM.dark,0,1.5,-1.6,b).rotation.x=Math.PI/2;worldMovers.push({o:b,kind:"bob",ph:z*0.1});}
// alligators : nagent lentement, attaquent si on s'approche trop
const worldMovers=[];
function gatorAt(x,z,g,r){const G=new THREE.Group();G.position.set(x,WATER_Y-0.05,z);G.userData.keep=true;g.add(G);
  put(BX(0.7,0.32,2.4),WM2.gator,0,0,0,G);put(BX(0.5,0.22,0.9),WM2.gator,0,0.02,1.55,G);put(BX(0.4,0.12,0.6),WM2.gatorBelly,0,-0.06,1.7,G);
  const tail=put(BX(0.36,0.22,1.8),WM2.gator,0,0,-1.9,G);for(const s of [-0.18,0.18])put(geo("geye",()=>new THREE.SphereGeometry(0.07,6,4)),KM.yellow,s,0.17,1.2,G);
  for(let i=0;i<6;i++)put(BX(0.1,0.12,0.12),WM2.gatorBelly,0,0.19,0.8-i*0.4,G);
  worldMovers.push({o:G,kind:"gator",tail,home:new V3(x,0,z),ph:r()*6.28,rad:3+r()*5,bite:0});}
// ---------------------------------------------------------------- aéroport international d'Azuria
const AIR={runZ:1066,runX0:-1890,runX1:-1230,runW:46,taxiZ:1004,apronZ0:860,apronZ1:975,termX0:-1700,termX1:-1420,termZ0:800,termZ1:860};
const AIR_RECTS=[
  {x0:AIR.runX0,x1:AIR.runX1,z0:AIR.runZ-AIR.runW/2,z1:AIR.runZ+AIR.runW/2,m:"runway"},
  {x0:AIR.runX0+20,x1:AIR.runX1-20,z0:AIR.taxiZ-11,z1:AIR.taxiZ+11,m:"taxi"},
  {x0:-1880,x1:-1260,z0:AIR.apronZ0,z1:AIR.apronZ1,m:"taxi"},
  {x0:-1300,x1:-1270,z0:AIR.taxiZ,z1:AIR.runZ,m:"taxi"},{x0:-1850,x1:-1820,z0:AIR.taxiZ,z1:AIR.runZ,m:"taxi"},
  {x0:-1400,x1:-1200,z0:790,z1:850,m:"parking"},{x0:-1210,x1:-1170,z0:930,z1:958,m:"parking"}
];
const AIR_BLD=[
  {x0:AIR.termX0,x1:AIR.termX1,z0:AIR.termZ0,z1:AIR.termZ1,h:16,m:"terminal"},
  {x0:-1880,x1:-1820,z0:880,z1:950,h:14,m:"hangar"},{x0:-1810,x1:-1750,z0:880,z1:950,h:14,m:"hangar"},
  {x0:-1352,x1:-1340,z0:870,z1:882,h:34,m:"tower"},{x0:-1460,x1:-1410,z0:880,z1:900,h:5,m:"cargo"}
];
function rectClip(R,X,Z){const x0=Math.max(R.x0,X-20),x1=Math.min(R.x1,X+20),z0=Math.max(R.z0,Z-20),z1=Math.min(R.z1,Z+20);return x1>x0&&z1>z0?{x0,x1,z0,z1}:null;}
function buildAirport(ch,X,Z,r,base,mid,detail){
  const y=LAND_Y;
  for(const R of AIR_RECTS){const c=rectClip(R,X,Z);if(!c)continue;const w=c.x1-c.x0,d=c.z1-c.z0;plane(w,d,R.m==="runway"?WM2.runway:R.m==="parking"?ROAD_M:WM2.taxi,(c.x0+c.x1)/2,y+0.03,(c.z0+c.z1)/2,base,w/4,d/4);}
  // marquages de la piste : axe, seuils, numéros, feux
  const rc=rectClip(AIR_RECTS[0],X,Z);
  if(rc){for(let x=Math.ceil(rc.x0/30)*30;x<rc.x1;x+=30)plane(16,0.9,LINE_W,x,y+0.045,AIR.runZ,detail);
    for(const ex of [AIR.runX0+8,AIR.runX1-8])if(ex>=rc.x0&&ex<rc.x1)for(let k=-8;k<=8;k++)if(Math.abs(k)>1)plane(14,1.4,LINE_W,ex,y+0.045,AIR.runZ+k*2.4,detail);
    for(const [ex,txt,ry] of [[AIR.runX0+34,"09",Math.PI/2],[AIR.runX1-34,"27",-Math.PI/2]])if(ex>=rc.x0&&ex<rc.x1){const p=new THREE.Mesh(new THREE.PlaneGeometry(16,9).rotateX(-Math.PI/2),signMat(txt,"#ffffff00","#efece3",{w:256,h:144}));p.position.set(ex,y+0.05,AIR.runZ);p.rotation.y=ry;detail.add(p);}
    for(let x=Math.ceil(rc.x0/20)*20;x<rc.x1;x+=20)for(const sd of [-1,1]){const L=new THREE.Mesh(geo("rwl",()=>new THREE.SphereGeometry(0.18,6,4)),OM.lamp);L.position.set(x,y+0.15,AIR.runZ+sd*(AIR.runW/2+1));detail.add(L);}}
  const tc=rectClip(AIR_RECTS[1],X,Z);if(tc){plane(tc.x1-tc.x0,0.3,LINE_Y,(tc.x0+tc.x1)/2,y+0.045,AIR.taxiZ,detail);}
  // bâtiments (chaque zone construit sa part : un grand terminal traverse plusieurs zones)
  for(const B of AIR_BLD){const c=rectClip(B,X,Z);if(!c)continue;const w=c.x1-c.x0,d=c.z1-c.z0,cx=(c.x0+c.x1)/2,cz=(c.z0+c.z1)/2;
    if(B.m==="terminal"){box(c.x0,c.z0,c.x1,c.z1,y,y+B.h,WM2.glass,base);box(c.x0,c.z0,c.x1,c.z1,y+B.h,y+B.h+1.2,KM.white,base);for(let k=1;k<4;k++)box(c.x0,c.z0,c.x1,c.z1,y+k*4-0.25,y+k*4+0.25,KM.white,base);
      if(c.z0<=B.z0+0.1&&cx>-1590&&cx<-1530)put(BX(30,3,0.2),signMat("AÉROPORT INTERNATIONAL D'AZURIA","#123a6b","#ffffff",{w:1024,h:96}),-1560,y+B.h-2.5,B.z0-0.15,base);
      if(c.z1>=B.z1-0.1)for(let x=Math.ceil(c.x0/45)*45+10;x<c.x1-6;x+=45){box(x-2,B.z1,x+2,B.z1+22,y+4,y+7,KM.white,mid);box(x-3,B.z1+20,x+3,B.z1+26,y+3,y+7.5,KM.white,mid);}}
    else if(B.m==="hangar"){walls(c.x0,c.z0,c.x1,c.z1,y,B.h,WM2.hangar,base,4,B.h);put(geo("hgRoof",()=>new THREE.CylinderGeometry(1,1,1,16,1,false,0,Math.PI).rotateZ(Math.PI/2)),WM2.hangar,cx,y+B.h,cz,base,0,w/2,6,d);
      if(c.z1>=B.z1-0.1)put(BX(w-4,B.h-2,0.1),KM.dark,cx,y+(B.h-2)/2,B.z1+0.06,base);}
    else if(B.m==="tower"){put(CY(4,5,B.h,12),KM.white,cx,y+B.h/2,cz,base);put(CY(7,6,5,12),WM2.glass,cx,y+B.h+2.5,cz,base);put(CY(7.5,7.5,0.8,12),KM.white,cx,y+B.h+5.4,cz,base);put(CY(0.15,0.15,8,6),OM.metal,cx,y+B.h+9.5,cz,base);
      const L=new THREE.Mesh(geo("twrL",()=>new THREE.SphereGeometry(0.4,8,6)),WM2.neon);L.position.set(cx,y+B.h+13.6,cz);L.userData.keep=true;L.userData.blink=true;base.add(L);turbines.push(L);}
    else{box(c.x0,c.z0,c.x1,c.z1,y,y+B.h,WM2.hangar,base);}
    addObstacle({type:"box",x:cx,z:cz,hx:w/2,hz:d/2,tall:true,bld:B.m!=="cargo"});}
  // avions garés aux portes (statiques), chariots à bagages
  for(let x=-1690;x<-1430;x+=45){const px=x+10,pz=AIR.termZ1+38;if(px>=X-20&&px<X+20&&pz>=Z-20&&pz<Z+20){const p=planeMesh(base,1);p.position.set(px,y,pz);p.rotation.y=Math.PI;addObstacle({type:"box",x:px,z:pz,hx:3,hz:18,tall:true});addObstacle({type:"box",x:px,z:pz+2,hx:16,hz:2.5});}}
  if(X>-1900&&X<-1220&&Z>800&&Z<1100){for(let i=0;i<2;i++)if(r()<0.6){const x=X+r()*30-15,z=Z+r()*30-15;if(AIR_RECTS.slice(2,3).some(R=>x>R.x0&&x<R.x1&&z>R.z0&&z<R.z1)){put(BX(1.4,0.9,2.6),KM.yellow,x,y+0.6,z,detail);addObstacle({type:"box",x,z,hx:0.8,hz:1.4});}}}
  // clôture du périmètre et parking
  if(Z-20<AIRPORT.j0*40-20+4)fenceRun(X-20,AIRPORT.j0*40-16,X+20,AIRPORT.j0*40-16,"chain",mid,X-20<-1215&&X+20>-1215?[[0,40]]:[]);
  if(Z+20>AIRPORT.j1*40+16)fenceRun(X-20,AIRPORT.j1*40+16,X+20,AIRPORT.j1*40+16,"chain",mid,[]);
  const pk=rectClip(AIR_RECTS[5],X,Z);if(pk)for(let x=Math.ceil(pk.x0/4)*4;x<pk.x1-3;x+=4)if(r()<0.55)parkedCar(x+2,pk.z0+8+(r()<0.5?0:22),0,mid);
  for(let i=0;i<3;i++){const x=X+r()*36-18,z=Z+r()*36-18;if(!AIR_RECTS.some(R=>x>R.x0-6&&x<R.x1+6&&z>R.z0-6&&z<R.z1+6)&&!AIR_BLD.some(R=>x>R.x0-6&&x<R.x1+6&&z>R.z0-6&&z<R.z1+6))treeAt(x,z,"round",0.9+r()*0.3,mid);}
}
// avion de ligne (compagnie inventée « AzurAir »)
function planeMesh(g,scale=1){const P=new THREE.Group();g.add(P);
  put(geo("fus",()=>new THREE.CylinderGeometry(2,2,34,12).rotateX(Math.PI/2)),WM2.plane,0,3.6,0,P);put(geo("nose",()=>new THREE.SphereGeometry(2,12,8,0,Math.PI*2,0,Math.PI/2).rotateX(Math.PI/2)),WM2.plane,0,3.6,17,P);
  put(geo("tailc",()=>new THREE.ConeGeometry(2,7,12).rotateX(-Math.PI/2)),WM2.plane,0,3.9,-20.4,P);put(BX(32,0.35,6),WM2.plane,0,3,1,P);put(BX(11,0.25,3),WM2.plane,0,4.5,-20,P);
  put(BX(0.4,7,5),WM2.planeBlue,0,7.5,-20,P);put(BX(4.04,0.5,30),WM2.planeBlue,0,3.0,0,P);put(BX(4.06,0.8,18),PM_WIN(),0,4.6,0,P);
  for(const s of [-1,1]){put(CY(0.9,0.9,4,10).clone().rotateX(Math.PI/2),KM.chrome,s*7,2.2,2.5,P);put(BX(0.4,1.6,0.4),KM.dark,s*1.2,0.8,-2,P);}put(BX(0.4,1.8,0.4),KM.dark,0,0.9,13,P);
  P.scale.setScalar(scale);return P;}
let _pmw=null;function PM_WIN(){return _pmw||(_pmw=mat({map:cTex("pwin",64,8,(g,w,h)=>{g.fillStyle="#f4f4f2";g.fillRect(0,0,w,h);g.fillStyle="#22303c";for(let x=2;x<w;x+=4)g.fillRect(x,2,2,4);})}));}
// avions en mouvement : un cycle décollage → vol → atterrissage (visibles quand on est près de l'aéroport)
const AIRFLY=[];
{for(let k=0;k<2;k++){const g=new THREE.Group();scene.add(g);const p=planeMesh(g,1);g.visible=false;AIRFLY.push({g,ph:k*55});}}
function updateAirplanes(dt){
  const near=Math.hypot(player.root.x+1560,player.root.z-1000)<2600;
  for(const A of AIRFLY){A.g.visible=near;if(!near)continue;const T=110,t=(clockT+A.ph)%T,y0=LAND_Y,x0=AIR.runX1-30,x1=AIR.runX0+20;let x,y,z=AIR.runZ,pitch=0,yaw=-Math.PI/2;
    if(t<25){const k=t/25;x=lerp(x0,x1,k*k);y=y0;if(k>0.75){y=y0+(k-0.75)*4*18;pitch=0.12;}}
    else if(t<55){const k=(t-25)/30;x=x1-k*1600;y=y0+18+k*240;pitch=0.12;}
    else if(t<80){const k=(t-55)/25;x=x1+2400-k*2400;y=y0+260-k*258;z=AIR.runZ;yaw=Math.PI/2;pitch=-0.05;if(k>0.92)pitch=0;x=lerp(x1-1600+4000,x1+30,k);}
    else{const k=(t-80)/30;x=lerp(x1+30,x0,Math.min(1,k*1.6));y=y0;yaw=Math.PI/2;}
    A.g.position.set(x,y,z);A.g.rotation.set(0,yaw,0);A.g.children[0].rotation.x=-pitch;}
}
// ---------------------------------------------------------------- lieux de bord de route (module 22) : stations, motels, diners
const ROADSIDE=new Map();
{const used=[];for(const H of HWYS){if(H.small)continue;for(let k=H.a+3;k<H.b-3;k++){const h=hash(k*13.1+H.k*7.7+H.id.length);if(h>0.09)continue;
  const side=h<0.045?1:-1,cx=H.ax==="ns"?H.k+(side>0?0:-1):k,cz=H.ax==="ns"?k:H.k+(side>0?0:-1);
  if(gridAt(cx,cz)||inAirport(cx,cz)||used.some(([a,b])=>Math.abs(a-cx)+Math.abs(b-cz)<10))continue;
  const X=cx*40,Z=cz*40;if(rawLand(X,Z)<LAND_Y-0.01||hillAt(X,Z)>0.5||bayouK(X,Z)>0.3)continue;
  const kind=["station_route","motel","diner","station_route","relais","camping"][Math.floor(hash(k*3.3+H.k)*6)];
  ROADSIDE.set(cx+","+cz,{kind,H,side});used.push([cx,cz]);}}
 ROADSIDE.set("6,-20",{kind:"aire"});ROADSIDE.set("4,-20",{kind:"relais"});}
function countryTypeAt(cx,cz){
  if(inAirport(cx,cz))return "aeroport";
  const R=ROADSIDE.get(cx+","+cz);if(R)return R.kind;
  const LI=lieuAt(cx,cz);if(LI)return "lieu_"+LI;
  return biomeAt(cx*40,cz*40);
}
const ROADSIDE_NAMES={station_route:["Station Azur","Station du Soleil","Station Coralis","Station Phare"],motel:["Motel Flamingo","Motel Palmeraie","Motel Lune Rose","Motel Horizon"],diner:["Diner Rétro 59","Chez Dolly","Le Comet Diner","Sunny Diner"],relais:["Le Relais des Routiers"],camping:["Camping des Pins","Camping Bel-Air"],aire:["Aire de repos de la Garrigue"]};
function roadsideName(kind,cx,cz){const L=ROADSIDE_NAMES[kind]||["?"];return L[Math.abs(cx*7+cz*13)%L.length];}
// une zone de bord de route : on recule les bâtiments du côté opposé à l'autoroute
function buildRoadside(ch,X,Z,r,base,mid,detail){
  const R=ROADSIDE.get(ch.cx+","+ch.cz)||{},kind=ch.type,name=roadsideName(kind,ch.cx,ch.cz),y=LAND_Y;
  if(kind==="aire"||kind==="relais"){const o=lifted(base,X,Z),o2=lifted(mid,X,Z),o3=lifted(detail,X,Z);buildCountryLegacy({type:kind,cx:ch.cx,cz:ch.cz},X,Z,r,o,o2,o3);return;}
  // orientation : la façade regarde l'autoroute
  const H=R.H,ns=H?H.ax==="ns":true,face=H?(ns?(hwyLine(H)<X?-1:1):(hwyLine(H)<Z?-1:1)):1;
  const fx=ns?face:0,fz=ns?0:face,away=(d)=>[X-fx*d,Z-fz*d];
  plane(36,36,ROAD_M,X,y+0.025,Z,base,9,9);
  const B=(w,d,h,dist,m)=>{const [cx,cz]=away(dist),hx=ns?d/2:w/2,hz=ns?w/2:d/2;box(cx-hx,cz-hz,cx+hx,cz+hz,y,y+h,m,base);addObstacle({type:"box",x:cx,z:cz,hx,hz,tall:true,bld:true});return [cx,cz,hx,hz];};
  const sign=(txt,bg,fg,dist,h)=>{const [sx,sz]=away(dist);put(CY(0.15,0.15,h,8),OM.metal,sx,y+h/2,sz,mid);put(BX(ns?0.2:6,2.2,ns?6:0.2),signMat(txt,bg,fg,{w:768,h:240,glow:true,border:"#fff"}),sx,y+h,sz,mid);};
  if(kind==="station_route"){
    const [cx,cz,hx,hz]=B(14,9,4,-12,KM.houseWall[1]);put(BX(ns?0.1:10,1,ns?10:0.1),signMat("SUPÉRETTE · CAFÉ","#2f7a52","#fff",{w:512,h:64}),cx+fx*(hx+0.06),y+3.2,cz+fz*(hz+0.06),base);
    addShop("Supérette de la station",cx+fx*(hx+1.2),cz+fz*(hz+1.2));
    const [px,pz]=away(4);box(px-(ns?5:9),pz-(ns?9:5),px+(ns?5:9),pz+(ns?9:5),y+5,y+5.6,KM.white,base);put(BX(ns?10.2:18.2,0.6,ns?18.2:10.2),KM.green,px,y+5.3,pz,base);
    for(const s of [-5,0,5]){const qx=px+(ns?0:s),qz=pz+(ns?s:0);put(CY(0.25,0.25,5,8),KM.white,qx+(ns?3.5:0),y+2.5,qz+(ns?0:3.5),base);pumps(qx,qz,mid);}
    sign(name+" · Carburant","#1f4fa0","#ffd23a",-1,7);for(let i=0;i<2;i++)if(r()<0.7){const [qx,qz]=away(4);parkedCar(qx+(ns?(i?-2.5:2.5):(i?-6:6)),qz+(ns?(i?-6:6):(i?-2.5:2.5)),ns?0:Math.PI/2,mid);}
    addAmb("vendeur",cx+fx*(hx+1.6),cz+fz*(hz+1.6)+1,ns?(face>0?90:270):(face>0?180:0));
  }else if(kind==="motel"){
    const [cx,cz,hx,hz]=B(30,7,3.4,-11,WM2.motel);
    for(let k=0;k<6;k++){const off=-12.5+k*5,dx=cx+fx*(hx+0.05)+(ns?0:off),dz=cz+fz*(hz+0.05)+(ns?off:0);put(BX(ns?0.06:1.1,2.1,ns?1.1:0.06),KM.door,dx,y+1.05,dz,base);
      put(BX(ns?0.08:0.6,0.3,ns?0.6:0.08),signMat(String(101+k),"#123a6b","#fff",{w:96,h:48}),dx+fx*0.04,y+2.4,dz+fz*0.04,base);if(r()<0.5){const [qx,qz]=[dx+fx*4.5,dz+fz*4.5];parkedCar(qx,qz,ns?Math.PI/2:0,mid);}}
    box(cx-(ns?hx+1.5:hx),cz-(ns?hz:hz+1.5),cx+(ns?hx+1.5:hx),cz+(ns?hz:hz+1.5),y+3.4,y+3.6,KM.red,base);
    sign(name+" · Chambres libres","#c8306a","#fff",4,6.5);const [nx,nz]=away(-4);const n=new THREE.Mesh(geo("neonBar",()=>new THREE.BoxGeometry(0.3,0.3,4)),WM2.neon);n.position.set(nx,y+8.2,nz);n.rotation.y=ns?0:Math.PI/2;n.userData.keep=true;n.userData.blink=true;mid.add(n);turbines.push(n);
    const [pl,plz]=away(10);plane(ns?7:12,ns?12:7,KM.pool,pl,y+0.06,plz,detail);
  }else if(kind==="diner"){
    const [cx,cz,hx,hz]=B(16,9,4,-8,mat({color:0xd8dde2,metalness:0.7,roughness:0.25}));box(cx-hx-0.1,cz-hz-0.1,cx+hx+0.1,cz+hz+0.1,y+1.2,y+1.7,KM.red,base);
    put(BX(ns?0.1:12,1.2,ns?12:0.1),KM.shop,cx+fx*(hx+0.06),y+2.2,cz+fz*(hz+0.06),base);put(BX(ns?0.15:9,1.4,ns?9:0.15),signMat(name,"#c8102e","#fff6c0",{w:640,h:96,glow:true}),cx+fx*(hx+0.1),y+4.6,cz+fz*(hz+0.1),base);
    addShop("Burger "+name,cx+fx*(hx+1.2),cz+fz*(hz+1.2));for(let k=0;k<3;k++)terraceSet(cx+fx*(hx+4)+(ns?0:k*3-3),cz+fz*(hz+4)+(ns?k*3-3:0),detail,STRIPES[k%STRIPES.length]);
    for(let i=0;i<3;i++)if(r()<0.7){const [qx,qz]=away(8);parkedCar(qx+(ns?0:i*5-5),qz+(ns?i*5-5:0),ns?Math.PI/2:0,mid);}
  }else if(kind==="camping"){
    plane(36,36,WM.grass,X,y+0.02,Z,base,9,9);for(let k=0;k<6;k++){const x=X+r()*28-14,z=Z+r()*28-14;if(onAnyRoad(x,z,3))continue;const t=put(geo("tent",()=>new THREE.ConeGeometry(1.8,2.2,4)),[KM.orange,KM.blue,KM.green,KM.red][k%4],x,groundAt(x,z)+1.1,z,mid,Math.PI/4);addObstacle({type:"circle",x,z,r:1.4});}
    const [fx2,fz2]=away(0);put(CY(0.6,0.6,0.25,8),KM.stone,fx2,y+0.12,fz2,detail);put(geo("fire",()=>new THREE.ConeGeometry(0.35,0.8,6)),KM.orange,fx2,y+0.6,fz2,detail);
    for(let k=0;k<8;k++)treeAt(X+r()*36-18,Z+r()*36-18,"conifer",0.9+r()*0.5,mid);sign(name,"#2d6b3f","#fff",-14,4);
  }
}
// ---------------------------------------------------------------- la campagne : une zone
function buildCountry(ch,X,Z,r,base,mid,detail){
  const G=countryGroundMesh(X,Z,base);
  buildHighways(ch,X,Z,r,base,mid,detail);
  const t=ch.type;
  if(t==="aeroport"){buildAirport(ch,X,Z,r,base,mid,detail);return;}
  if(ROADSIDE.has(ch.cx+","+ch.cz)){buildRoadside(ch,X,Z,r,base,mid,detail);return;}
  if(t.startsWith("lieu_")){lieuBuild(ch,X,Z,r,base,mid,detail);return;}
  const ok=(x,z,m=1.5,wet=false)=>{if(inGridArea(x,z)||onAnyRoad(x,z,m+1)||rectDist(AIR_RECT,x,z)<4)return false;const d=waterDepth(x,z);return wet?d>0.15:d<0.02;};
  const P=(n,f)=>{for(let i=0;i<n;i++){const x=X-19+r()*38,z=Z-19+r()*38;f(x,z,i);}};
  let hmin=1e9,hmax=-1e9;for(let a=-20;a<=20;a+=10)for(let b=-20;b<=20;b+=10){const h=nodeH(Math.round((X+a)/4),Math.round((Z+b)/4));hmin=Math.min(hmin,h);hmax=Math.max(hmax,h);}
  const flat=hmax-hmin<1.6&&hmin>WATER_Y+0.05&&!G.water;
  const cell=(ch.cx*31+ch.cz*17)>>>0;
  switch(t){
    case "champ":
      if(flat&&!onAnyRoad(X,Z,24)){const m=CMP.field[cell%CMP.field.length];fieldPlane(X,Z,m,base,cell%2);
        fenceRun(X-18,Z-18,X+18,Z-18,"wood",mid,[[16,20]]);if(r()<0.5)P(6,(x,z)=>{if(ok(x,z))hayBale2(x,z,detail,r()*3);});
        if(r()<0.15){const o=lifted(mid,X,Z);tractor(X+r()*20-10,Z+r()*20-10,r()*6,o);}
        if(r()<0.2){const x=X+r()*20-10,z=Z+r()*20-10;scarecrow(x,z,detail);}}
      else P(5,(x,z)=>{if(ok(x,z))treeAt(x,z,"round",0.9+r()*0.4,mid);});
      break;
    case "orangeraie":
      if(flat&&!onAnyRoad(X,Z,24)){fieldPlane(X,Z,CMP.dirt,base);for(let a=-15;a<=15;a+=6)for(let b=-15;b<=15;b+=7.5){const x=X+a,z=Z+b;if(ok(x,z,1))orangeTree(x,z,mid);}
        if(r()<0.3){const x=X+r()*10,z=Z-19;put(BX(2.4,1.2,1.4),OM.crate,x,LAND_Y+0.6,z,detail);addObstacle({type:"box",x,z,hx:1.2,hz:0.7});}}
      else P(6,(x,z)=>{if(ok(x,z))orangeTree(x,z,mid);});
      break;
    case "vigne":
      if(flat&&!onAnyRoad(X,Z,24)){fieldPlane(X,Z,CMP.dirt,base);for(let a=-15;a<=15;a+=3.2){rowAlong(X+a,Z-17,Z+17,0.5,1.0,WM2.vine,mid,true);
        for(let b=-16;b<=16;b+=4)put(BX(0.07,1.3,0.07),OM.wood,X+a,groundAt(X+a,Z+b)+0.65,Z+b,detail);}}
      break;
    case "prairie":
      P(7,(x,z)=>{if(ok(x,z))treeAt(x,z,r()<0.4?"round":r()<0.7?"light":"conifer",0.8+r()*0.6,mid);});
      P(6,(x,z)=>{if(ok(x,z))rockAt(x,z,0.4+r()*0.8,mid);});
      P(10,(x,z)=>{if(ok(x,z))put(geo("bush",()=>new THREE.IcosahedronGeometry(0.7,1)),OM.leaf,x,groundAt(x,z)+0.35,z,detail,0,1+r(),0.7+r()*0.5,1+r());});
      if(r()<0.35&&!G.water)addAnimals(r()<0.6?"vache":"cheval",X,Z,2+Math.floor(r()*3),14);
      break;
    case "foret":
      if(r()<0.06){const x=X+r()*20-10,z=Z+r()*20-10;if(ok(x,z,2)){const a=addAmb("randonneur",x,z,r()*360);a.b={x:X+r()*30-15,z:Z+r()*30-15};if(!ok(a.b.x,a.b.z,2))a.b=null;}}
      P(24,(x,z,i)=>{if(ok(x,z,0.8))treeAt(x,z,r()<0.6?"conifer":r()<0.5?"round":"light",0.9+r()*0.9,i<14?base:mid,0.35);});
      P(3,(x,z)=>{if(ok(x,z)){const y=groundAt(x,z),l=put(CY(0.25,0.3,4,7),WM.trunk,x,y+0.25,z,detail,r()*3);l.rotation.z=Math.PI/2;}});
      break;
    case "lande":
      P(8,(x,z)=>{if(ok(x,z))rockAt(x,z,0.5+r()*1.4,mid);});P(5,(x,z)=>{if(ok(x,z))treeAt(x,z,"conifer",0.7+r()*0.6,mid);});
      P(14,(x,z)=>{if(ok(x,z))put(geo("bush",()=>new THREE.IcosahedronGeometry(0.7,1)),KMP_BUSH,x,groundAt(x,z)+0.25,z,detail,0,0.8+r(),0.5,0.8+r());});
      break;
    case "montagne":
      if(r()<0.12){const x=X+r()*20-10,z=Z+r()*20-10;if(ok(x,z,2)){const a=addAmb("randonneur",x,z,r()*360);a.b={x:x+r()*30-15,z:z+r()*30-15};if(!ok(a.b.x,a.b.z,2))a.b=null;}}
      P(10,(x,z)=>{if(ok(x,z))rockAt(x,z,0.8+r()*2.4,base);});P(4,(x,z)=>{if(ok(x,z)&&groundAt(x,z)<40)treeAt(x,z,"conifer",0.8+r()*0.5,mid);});
      if(r()<0.06){const x=X,z=Z;if(ok(x,z)){const y=groundAt(x,z);for(let k=0;k<4;k++)put(geo("rock",()=>new THREE.DodecahedronGeometry(1,0)),WM2.rock,x,y+0.3+k*0.45,z,mid,k,0.5-k*0.08,0.3,0.5-k*0.08);addObstacle({type:"circle",x,z,r:0.6});}}
      break;
    case "savane":
      P(26,(x,z)=>{if(ok(x,z,0.5))grassTuft(x,z,detail);});P(4,(x,z)=>{if(ok(x,z))treeAt(x,z,"palm",0.6+r()*0.4,mid);});
      if(r()<0.3)P(5,(x,z)=>{if(ok(x,z))cypressAt(x,z,0.6+r()*0.3,mid,r);});
      if(r()<0.2)addAnimals("vache",X,Z,3,14);
      break;
    case "bayou":
      P(12,(x,z)=>{if(!inGridArea(x,z)&&!onAnyRoad(x,z,2)&&waterDepth(x,z)<0.9)cypressAt(x,z,0.8+r()*0.6,base,r);});
      P(3,(x,z)=>{if(ok(x,z))deadTree(x,z,0.8+r()*0.5,mid);});
      if(G.water){P(10,(x,z)=>{if(ok(x,z,1,true))put(geo("lily",()=>new THREE.CircleGeometry(0.45,8).rotateX(-Math.PI/2)),WM2.lily,x,WATER_Y+0.012,z,detail);});
        P(10,(x,z)=>{if(ok(x,z,0.5,true)&&waterDepth(x,z)<0.7)grassTuft(x,z,detail,KMP_BUSH);});
        if(r()<0.45){const x=X+r()*30-15,z=Z+r()*30-15;if(ok(x,z,2,true))gatorAt(x,z,detail,r);}
        if(r()<0.1){const x=X+r()*20-10,z=Z+r()*20-10;if(ok(x,z,3,true)&&waterDepth(x,z)>0.4)addBoatSpot(x,z,r()*360,"airboat");}}
      if(r()<0.07){const x=X+r()*16-8,z=Z+r()*16-8;if(!onAnyRoad(x,z,6)&&!inGridArea(x,z)){stiltShack(x,z,mid,r,cell);if(waterDepth(x,z+5)<0.3)addAmb("bayou",x,z+5.5,180);}}
      break;
    case "plage": case "cayo":
      P(6,(x,z)=>{if(ok(x,z))treeAt(x,z,"palm",0.8+r()*0.5,mid);});
      P(3,(x,z)=>{if(ok(x,z)){const y=groundAt(x,z),l=put(CY(0.15,0.2,3,6),WM2.dead,x,y+0.15,z,detail,r()*3);l.rotation.z=Math.PI/2;}});
      P(8,(x,z)=>{if(ok(x,z,0.5))grassTuft(x,z,detail,WM2.straw);});
      if(r()<0.25){const x=X+r()*24-12,z=Z+r()*24-12;if(ok(x,z))beachUmbrella(x,z,detail,cell);}
      if(r()<0.12){const x=X+r()*24-12,z=Z+r()*24-12;if(ok(x,z))addAmb("surfeur",x,z,90);}
      break;
    case "mer":
      if(r()<0.025){const x=X+r()*30-15,z=Z+r()*30-15;if(waterDepth(x,z)>1.5&&!onAnyRoad(x,z,8))boatSmall(x,z,r()*6,mid,[KM.white,KM.blue,KM.red][cell%3]);}
      break;
    case "lac":
      if(r()<0.05){const x=X+r()*30-15,z=Z+r()*30-15;if(waterDepth(x,z)>1.2)boatSmall(x,z,r()*6,mid,OM.wood);}
      P(6,(x,z)=>{if(waterDepth(x,z)>0.05&&waterDepth(x,z)<0.6)grassTuft(x,z,detail,KMP_BUSH);});
      if(r()<0.3){for(let k=0;k<12;k++){const x=X+r()*36-18,z=Z+r()*36-18;if(ok(x,z,1)){let best=null;for(let a=0;a<8;a++){const qx=x+Math.cos(a*0.785)*3,qz=z+Math.sin(a*0.785)*3;if(waterDepth(qx,qz)>0.3){best=Math.atan2(qx-x,-(qz-z))/D2R;break;}}if(best!==null){addAmb("pecheur",x,z,best);break;}}}}
      P(3,(x,z)=>{if(ok(x,z))treeAt(x,z,r()<0.5?"light":"round",0.9+r()*0.4,mid);});
      break;
    case "ferme":{
      if(flat&&!onAnyRoad(X,Z,26)){addAmb("fermier",X-2,Z+6,r()*360);const o=lifted(base,X,Z),o2=lifted(mid,X,Z),o3=lifted(detail,X,Z);buildCountryLegacy({type:"ferme",cx:ch.cx,cz:ch.cz},X,Z,r,o,o2,o3);addAnimals("vache",X+12,Z-12,3,6);}
      else P(5,(x,z)=>{if(ok(x,z))treeAt(x,z,"round",0.9,mid);});break;}
    case "eolien":
      if(!onAnyRoad(X,Z,24)&&!G.water){const o=lifted(base,X,Z);windTurbine(X+r()*10-5,Z+r()*10-5,o);}
      break;
  }
  {const ctx={ch,X,Z,r,base,mid,detail,ok,P,flat,G,cell,scarecrow:(x,z)=>scarecrow(x,z,detail)};if(BIOME2[t])BIOME2[t](ctx);
   const F=BIOME_FAUNA[t];if(F)for(const [k2,p,n] of F)if(r()<p){const x=X+r()*16-8,z=Z+r()*16-8;addAnimals(k2,x,z,Math.max(1,Math.round(n*(0.6+r()*0.8))),14);}}
}
function fieldPlane(X,Z,m,g,rot){const gm=new THREE.PlaneGeometry(36,36,9,9).rotateX(-Math.PI/2);if(rot)gm.rotateY(Math.PI/2);gm.translate(X,0,Z);const P=gm.attributes.position;for(let i=0;i<P.count;i++)P.setY(i,groundAt(P.getX(i),P.getZ(i))+0.025);gm.computeVertexNormals();scaledUV(gm,6,6);const me=new THREE.Mesh(gm,m);me.receiveShadow=true;g.add(me);return me;}
// rangée (vigne, lavande, maïs) découpée en tronçons qui suivent le sol
function rowAlong(x,z0,z1,w,h,m,g,obs,seg=6){for(let z=z0;z<z1-0.5;z+=seg){const L=Math.min(seg,z1-z),zc=z+L/2,y=groundAt(x,zc);put(BX(w,h,L),m,x,y+h/2,zc,g);if(obs)addObstacle({type:"box",x,z:zc,hx:w/2+0.05,hz:L/2});}}
function hayBale2(x,z,g,ry){put(geo("hay",()=>new THREE.CylinderGeometry(0.75,0.75,1.2,14).rotateZ(Math.PI/2)),CMP.hay,x,groundAt(x,z)+0.75,z,g,ry);addObstacle({type:"circle",x,z,r:0.75});}
function tractor(x,z,ry,g){const T=new THREE.Group();T.position.set(x,0,z);T.rotation.y=ry;g.add(T);put(BX(1.4,1,2.6),KM.green,0,1.1,0,T);put(BX(1.3,1.3,1.2),KM.glass,0,2.2,-0.5,T);
  for(const s of [-0.9,0.9]){const w=put(CY(0.8,0.8,0.45,12),KM.tire,s,0.8,-0.7,T);w.rotation.z=Math.PI/2;const w2=put(CY(0.45,0.45,0.35,10),KM.tire,s,0.45,1,T);w2.rotation.z=Math.PI/2;}addObstacle({type:"circle",x,z,r:1.6});}
function scarecrow(x,z,g){const y=groundAt(x,z);put(CY(0.05,0.05,2.4,5),OM.wood,x,y+1.2,z,g);put(BX(1.6,0.08,0.08),OM.wood,x,y+1.8,z,g);put(BX(0.7,0.8,0.3),KM.red,x,y+1.65,z,g);put(geo("scHead",()=>new THREE.SphereGeometry(0.22,8,6)),CMP.hay,x,y+2.3,z,g);put(geo("scHat",()=>new THREE.ConeGeometry(0.35,0.4,8)),OM.wood,x,y+2.55,z,g);}
// ---------------------------------------------------------------- styles des bourgs
const TSPEC=new Map();
for(const T of TOWNS){if(T.id==="ps")continue;const ci=Math.round((T.i0+T.i1)/2),cj=Math.round((T.j0+T.j1)/2),S=(i,j,t)=>{if(i>=T.i0&&i<=T.i1&&j>=T.j0&&j<=T.j1&&!TSPEC.has(i+","+j))TSPEC.set(i+","+j,t);};
  S(ci,cj,"place");S(ci+1,cj,"eglise");S(T.i0+1,T.j0,"station");S(ci-1,cj+1,"marche");S(ci,cj-2,"supermarche");
  if(T.i1-T.i0>9){S(ci+3,cj-3,"ecole");S(ci-4,cj+3,"commissariat");S(ci+4,cj+3,"hopital");S(ci-3,cj-4,"terrain");S(ci+5,cj+5,"foire");}
  if(T.style==="marina"){for(let j=T.j0+1;j<=T.j1-1;j+=2)S(T.i1,j,"marina_bassin");}
  if(T.style==="balneaire"){for(let j=T.j0;j<=T.j1;j++)S(T.i1,j,"plage");}
}
function townTypeFor(T,cx,cz){
  if(T.id==="ps")return townType(cx,cz);
  const sp=TSPEC.get(cx+","+cz);if(sp)return sp;
  const r=hash(cx*5.3+cz*9.1+T.i0*0.37+T.j0*0.11),ci=Math.round((T.i0+T.i1)/2),main=cx===ci||cz===Math.round((T.j0+T.j1)/2);
  const pk=(L)=>{let a=0;for(const [t,p] of L){a+=p;if(r<a)return t;}return L[L.length-1][0];};
  switch(T.style){
    case "banlieue":return main?pk([["commerces",0.55],["place",0.15],["parc",0.15],["foodtrucks",0.15]]):pk([["villas",0.5],["maisons",0.24],["jardin",0.06],["parc",0.07],["terrain",0.04],["skatepark",0.03],["immeubles",0.06]]);
    case "marina":return main?pk([["commerces",0.6],["place",0.2],["foodtrucks",0.2]]):pk([["hotels",0.22],["villas",0.3],["immeubles",0.2],["commerces",0.12],["parc",0.1],["terrain",0.06]]);
    case "balneaire":return main?pk([["commerces",0.5],["foodtrucks",0.2],["place",0.15],["parc",0.15]]):pk([["hotels",0.3],["maisons",0.2],["villas",0.15],["commerces",0.12],["skatepark",0.06],["parc",0.1],["terrain",0.07]]);
    case "bayou":return main?pk([["commerces",0.5],["place",0.3],["foodtrucks",0.2]]):pk([["cabanes",0.55],["maisons",0.2],["jardin",0.1],["terrain_vague",0.15]]);
    case "montagne":return main?pk([["commerces",0.6],["place",0.2],["parc",0.2]]):pk([["chalets",0.6],["parc",0.25],["maisons",0.15]]);
    case "pecheurs":return main?pk([["commerces",0.6],["place",0.25],["marche",0.15]]):pk([["maisons",0.45],["entrepots",0.2],["conteneurs",0.1],["parc",0.1],["terrain_vague",0.15]]);
    case "resort":return main?pk([["commerces",0.6],["place",0.2],["foodtrucks",0.2]]):pk([["hotels",0.45],["villas",0.3],["parc",0.15],["terrain",0.1]]);
    default:return main?pk([["commerces",0.7],["place",0.15],["parc",0.15]]):pk([["maisons",0.5],["commerces",0.15],["parc",0.12],["place",0.08],["terrain",0.07],["parking",0.08]]);
  }
}
// villas avec piscine (banlieue, marina) : 2 grands terrains, haies, portail, allée, piscine
BUILDERS.villas=function(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop}=C;
  const sw=2.6;[[bz0+sw,bcz,"n"],[bcz,bz1-sw,"s"]].forEach(([z0,z1,ns],i)=>{const x0=bx0+sw,x1=bx1-sw,front=ns==="n"?z0:z1,fd=ns==="n"?-1:1;
    plane(x1-x0,z1-z0,WM.grass,(x0+x1)/2,SIDEWALK+0.006,(z0+z1)/2,base,(x1-x0)/4,(z1-z0)/4);
    const hx=bcx+(r()-0.5)*4,hz=(z0+z1)/2-fd*0.5,w=7+r()*3,d=3.8+r()*0.8,H=r()<0.5?6.2:3.4,wm=[KM.white,KM.houseWall[3],KM.houseWall[4],KM.houseWall[1]][Math.floor(r()*4)];
    box(hx-w,hz-d,hx+w,hz+d,SIDEWALK,SIDEWALK+H,wm,base);box(hx-w-0.4,hz-d-0.4,hx+w+0.4,hz+d+0.4,SIDEWALK+H,SIDEWALK+H+0.3,KM.white,base);
    put(BX(w*1.2,H*0.55,0.08),WM2.glass,hx,SIDEWALK+H*0.45,hz+fd*(d+0.02),base);if(H>5)box(hx-w*0.6,hz-d,hx+w*0.6,hz+d,SIDEWALK+H+0.3,SIDEWALK+H+2.8,wm,base);
    addObstacle({type:"box",x:hx,z:hz,hx:w,hz:d,tall:true,bld:true});
    const pz=ns==="n"?z1-2.6:z0+2.6;plane(9,3.4,KM.pool,hx,SIDEWALK+0.04,pz,detail);box(hx-5,pz-2.1,hx+5,pz+2.1,SIDEWALK,SIDEWALK+0.03,KM.white,detail);addObstacle({type:"box",x:hx,z:pz,hx:4.6,hz:1.8});
    for(let k=0;k<2;k++)put(BX(0.7,0.35,1.9),KM.white,hx+6+k*1.2,SIDEWALK+0.3,pz,detail);treeAt(x0+1.5,pz,"palm",0.8+r()*0.3,mid);treeAt(x1-1.5,hz,"palm",0.9,mid);
    const dx=hx+w-1.5;plane(3,Math.abs(front-(hz+fd*d)),WM.asphalt,dx,SIDEWALK+0.012,(front+hz+fd*d)/2,base,1,2);if(r()<0.75)parkedCar(dx,front-fd*3.6,0,mid,CAR_PAINT[Math.floor(r()*CAR_PAINT.length)]);
    const gp=dx-x0,gpp=hx-x0;let gaps=[[gpp-0.7,gpp+0.7],[gp-1.7,gp+1.7]].sort((a,b)=>a[0]-b[0]);if(gaps[0][1]>=gaps[1][0])gaps=[[gaps[0][0],Math.max(gaps[0][1],gaps[1][1])]];
    fenceRun(x0,front,x1,front,i?"hedge":"rail",mid,gaps);gate(dx,front,true,3.2,mid,0.4);
    fenceRun(x0,z0,x0,z1,"hedge",mid,[]);fenceRun(x1,z0,x1,z1,"hedge",mid,[]);if(ns==="n")fenceRun(x0,z1,x1,z1,"rail",mid,[]);
    mailbox(x0+gpp+1.2,front+fd*0.5,detail);});
  for(const [x,z] of [[bx0+1.1,bcz],[bx1-1.1,bcz]])prop("lamp",x,z,0);
};
// bassin de la marina : eau, pontons, yachts
BUILDERS.marina_bassin=function(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop}=C;
  const x0=bx0+4,x1=bx1-3,z0=bz0+4,z1=bz1-4;box(x0-0.6,z0-0.6,x1+0.6,z1+0.6,-2.5,SIDEWALK,WM2.concrete,base);
  const w=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0,z1-z0).rotateX(-Math.PI/2),KM.water);w.position.set((x0+x1)/2,WATER_Y+0.05,(z0+z1)/2);base.add(w);
  box(x0,z0,x1,z1,-2.6,-2.5,KM.dark,base);
  for(const [a,b,c,d] of [[x0,z0,x1,z0+0.4],[x0,z1-0.4,x1,z1],[x0,z0,x0+0.4,z1],[x1-0.4,z0,x1,z1]])addObstacle({type:"box",x:(a+c)/2,z:(b+d)/2,hx:(c-a)/2+0.25,hz:(d-b)/2+0.25});
  addObstacle({type:"box",x:(x0+x1)/2,z:(z0+z1)/2,hx:(x1-x0)/2-0.5,hz:(z1-z0)/2-0.5});
  box(bcx-0.9,z0,bcx+0.9,z1,SIDEWALK-0.1,SIDEWALK+0.02,KM.plank,base);
  for(let k=0;k<4;k++){const z=z0+3+k*6,s=k%2?1:-1;const yt=new THREE.Group();yt.position.set(bcx+s*6.5,WATER_Y,z);yt.rotation.y=Math.PI/2;yt.userData.keep=true;mid.add(yt);
    put(BX(3.4,1.2,10),KM.white,0,0.3,0,yt);put(BX(2.8,1.1,5),KM.white,0,1.4,-0.8,yt);put(BX(2.9,0.5,5.1),WM2.glass,0,1.5,-0.8,yt);put(geo("ybow",()=>new THREE.ConeGeometry(1.7,3,4).rotateX(Math.PI/2).rotateY(Math.PI/4)),KM.white,0,0.3,6.4,yt);
    if(k%2)put(CY(0.06,0.06,9,6),KM.chrome,0,5.4,0.8,yt);worldMovers.push({o:yt,kind:"bob",ph:k+z*0.1});}
  for(const x of [bx0+2,bx1-1.5])prop("lamp",x,bcz,0);prop("bench",bx0+2.2,bz0+2.2,0);
  put(BX(6,0.9,0.1),signMat("MARINA DEL SOL","#0e6b7a","#fff",{w:512,h:72}),bcx,2,bz0+2.4,detail);
};
// cabanes du bayou (Marais-Gris)
BUILDERS.cabanes=function(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop}=C;
  plane(26.8,26.8,CMP.dirt,bcx,SIDEWALK+0.008,bcz,base,6,6);
  for(const [x,z,k] of [[bx0+9,bz0+9,0],[bx1-9,bz0+9,1],[bx0+9,bz1-9,2],[bx1-9,bz1-9,3]]){if(r()<0.85)stiltShack(x,z,mid,r,ch.cx*3+ch.cz+k);else cypressAt(x,z,0.9,mid,r);}
  cypressAt(bcx,bcz,1.1,base,r);for(let k=0;k<3;k++)prop("crate",bx0+4+r()*24,bcz+r()*4-2,r());
};
// chalets (Les Pins)
BUILDERS.chalets=function(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop}=C;
  plane(26.8,26.8,WM.grass,bcx,SIDEWALK+0.006,bcz,base,6,6);
  for(const [x,z] of [[bx0+9,bz0+9],[bx1-9,bz0+9],[bx0+9,bz1-9],[bx1-9,bz1-9]]){const w=4+r(),d=3.5+r()*0.5;walls(x-w,z-d,x+w,z+d,SIDEWALK,3,WM2.shack,base,3,3);gableRoof(x-w-0.4,z-d-0.4,x+w+0.4,z+d+0.4,3+SIDEWALK,2.6,KM.roofSlate,base);
    put(BX(1,2,0.06),KM.door,x,SIDEWALK+1,z-d-0.03,base);put(BX(0.6,1.6,0.6),KM.stone,x+w*0.6,SIDEWALK+4.6,z,base);addObstacle({type:"box",x,z,hx:w,hz:d,tall:true,bld:true});
    for(let k=0;k<3;k++)put(BX(0.5,0.4,1.6),WM.trunk,x-w-0.7,SIDEWALK+0.2+k*0.42,z,detail);}
  for(let k=0;k<5;k++)treeAt(bx0+3+r()*26,bz0+3+r()*26,"conifer",1+r()*0.6,mid);
};
// ---------------------------------------------------------------- paysage lointain : tout le monde jusqu'à l'horizon (maillage grossier)
const FAR={N:96,S:50,mesh:null,cx:1e9,cz:1e9,base:null,pending:null,pcx:1e9,pcz:1e9};
{
  const N=FAR.N,gm=new THREE.PlaneGeometry(N*FAR.S,N*FAR.S,N,N).rotateX(-Math.PI/2);gm.setAttribute("color",new THREE.BufferAttribute(new Float32Array(gm.attributes.position.count*3),3));
  FAR.mesh=new THREE.Mesh(gm,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));FAR.mesh.frustumCulled=false;FAR.mesh.visible=false;scene.add(FAR.mesh);
  FAR.base=new Float32Array(gm.attributes.position.count);
}
function farSample(x,z,c){
  if(x<W_MIN||x>W_MAX||z<W_MIN||z>W_MAX){const cz=clamp(z,W_MIN,W_MAX);if(x>coastX(cz)+300){_tc.setRGB(0.24,0.42,0.52,THREE.SRGBColorSpace);c.copy(_tc);FAR.lastBio=null;return WATER_Y-0.4;}
    const out=Math.max(W_MIN-x,x-W_MAX,W_MIN-z,z-W_MAX,0),y=150+out*0.12+vnoise(x/300,z/300,61)*60;const s=clamp01((y-150)/60);_tc.setRGB(lerp(0.5,0.92,s),lerp(0.48,0.94,s),lerp(0.45,0.97,s),THREE.SRGBColorSpace);c.copy(_tc);FAR.lastBio=null;return y;}
  FAR.lastBio=null;
  if(inGridArea(x,z)){const v=0.55+vnoise(x/60,z/60,3)*0.15;_tc.setRGB(v,v*0.98,v*0.95,THREE.SRGBColorSpace);c.copy(_tc);return -0.1;}
  let y=inOldSea(x,z)?seaFloor(x,z):rawLand(x,z);
  if(y<WATER_Y){const b=bayouK(x,z)>0.05&&!inOldSea(x,z);_tc.setRGB(b?0.25:0.17,b?0.32:0.42,b?0.22:0.52,THREE.SRGBColorSpace);c.copy(_tc);return WATER_Y-0.02;}
  if(rectDist(AIR_RECT,x,z)<1){_tc.setRGB(0.45,0.5,0.4,THREE.SRGBColorSpace);c.copy(_tc);return y;}
  const bio=biomeAt(x,z);FAR.lastBio=bio;c.copy(terrColor(x,z,y,bio));if(bio==="foret"||bio==="bayou"||bio==="jungle"||bio==="pinede")c.multiplyScalar(0.8);else if(bio==="orangeraie")c.multiplyScalar(0.9);return y;
}
const FARTREE_N=11000,FT_DENS={foret:5,pinede:5,jungle:5,bambou:3,orangeraie:1.4,verger:1.4,palmeraie:1.6,bayou:2,montagne:0.6,lande:0.7,prairie:0.7,fleurs:0.5,savane:0.5,mangrove:1.6,riviere:0.8,ferme:0.5,ranch:0.25,vigne:0.3,champ:0.2,mais:0.1,lavande:0.15,tournesol:0.15,mesa:0.35,dunes:0.15,cayo:1,ilot:1};
const FT_KIND={pinede:1,montagne:1,lande:1,foret:2,mesa:3,palmeraie:4,savane:4,cayo:4,ilot:4,dunes:4,mangrove:2,jungle:2};
function ftGeo(k){const parts=[],col=(g,c)=>{g=g.toNonIndexed();const n=g.attributes.position.count,a=new Float32Array(n*3);_tc.set(c);_tc.convertSRGBToLinear();for(let i=0;i<n;i++){a[i*3]=_tc.r;a[i*3+1]=_tc.g;a[i*3+2]=_tc.b;}g.setAttribute("color",new THREE.BufferAttribute(a,3));g.deleteAttribute("uv");parts.push(g);};
  if(k===0){col(new THREE.CylinderGeometry(0.3,0.45,4,5).translate(0,2,0),"#5b4030");col(new THREE.ConeGeometry(2.6,8,6).translate(0,7,0),"#2f5532");}
  else if(k===1){col(new THREE.CylinderGeometry(0.3,0.45,4,5).translate(0,2,0),"#5b4030");col(new THREE.IcosahedronGeometry(3.2,0).scale(1,1.1,1).translate(0,6.4,0),"#4f6e34");}
  else if(k===2){col(new THREE.CylinderGeometry(0.45,0.55,4.5,6).translate(0,2.25,0),"#4f7a3a");}
  else{col(new THREE.CylinderGeometry(0.2,0.3,7,5).translate(0,3.5,0),"#6b4a33");col(new THREE.ConeGeometry(2.6,1.6,6).translate(0,7.4,0),"#4e7a3a");}
  const g=mergeGeometries(parts);parts.forEach(q=>q.dispose());return g;}
const farTrees=[0,1,2,3].map(k=>{const m=new THREE.InstancedMesh(ftGeo(k),new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}),k<2?6000:2500);m.count=0;m.frustumCulled=false;m.castShadow=false;scene.add(m);return m;});
FAR.trees=[];
function farRebuild(){ // construit en plusieurs images (pas de saccade)
  const P=FAR.pending;if(!P)return;const N=FAR.N,pos=FAR.mesh.geometry.attributes.position,col=FAR.mesh.geometry.attributes.color,c=new THREE.Color(),half=N*FAR.S/2;
  if(!P.trees)P.trees=[];
  for(let k=0;k<6&&P.row<=N;k++,P.row++){for(let i=0;i<=N;i++){const x=P.x0+i*FAR.S,z=P.z0+P.row*FAR.S;const y=farSample(x,z,c);P.h[P.row*(N+1)+i]=y;P.c.set([c.r,c.g,c.b],(P.row*(N+1)+i)*3);
    const bio=FAR.lastBio,dn=bio&&y>WATER_Y?FT_DENS[bio]||0:0;let n=Math.floor(dn)+(hash(x*0.13+z*0.71)<dn%1?1:0);const cap=FARTREE_N*clamp(+(SET.farView??1),0.3,1.2);while(n-->0&&P.trees.length<cap){const tx=x+(hash(x*1.7+z*0.3+n)-0.5)*FAR.S,tz=z+(hash(x*0.9+z*2.3+n)-0.5)*FAR.S;P.trees.push([tx,y,tz,(FT_KIND[bio]||2)-1,0.8+hash(tx+tz)*0.6]);}}}
  if(P.row>N){FAR.base.set(P.h);FAR.trees=P.trees;col.array.set(P.c);col.needsUpdate=true;FAR.mesh.position.set(P.x0+half,0,P.z0+half);FAR.cx=P.cx;FAR.cz=P.cz;FAR.pending=null;FAR.pcx=1e9;farSink();FAR.mesh.visible=true;}
}
// sous les zones chargées, le paysage lointain s'enfonce (les vraies zones sont dessinées par-dessus)
function farSink(){const N=FAR.N,pos=FAR.mesh.geometry.attributes.position,pcx=chunkOf(player.root.x),pcz=chunkOf(player.root.z);if(pcx===FAR.pcx&&pcz===FAR.pcz)return;FAR.pcx=pcx;FAR.pcz=pcz;
  const R=(LOAD_R+0.5)*CHUNK-6,ox=FAR.mesh.position.x-N*FAR.S/2,oz=FAR.mesh.position.z-N*FAR.S/2;
  for(let j=0;j<=N;j++)for(let i=0;i<=N;i++){const k=j*(N+1)+i,x=ox+i*FAR.S,z=oz+j*FAR.S;const inside=Math.abs(x-pcx*CHUNK)<R&&Math.abs(z-pcz*CHUNK)<R;pos.setY(k,inside?FAR.base[k]-25:FAR.base[k]-0.45);}
  pos.needsUpdate=true;FAR.mesh.geometry.computeVertexNormals();
  // arbres lointains : seulement hors des zones chargées
  const mm=new THREE.Matrix4(),cnt=[0,0,0,0];for(const [x,y,z,k,s] of FAR.trees){if(Math.abs(x-pcx*CHUNK)<R+20&&Math.abs(z-pcz*CHUNK)<R+20)continue;const M=farTrees[k];if(cnt[k]>=M.instanceMatrix.count)continue;mm.makeScale(s,s,s).setPosition(x,y-0.3,z);M.setMatrixAt(cnt[k]++,mm);}
  farTrees.forEach((M,k)=>{M.count=cnt[k];M.instanceMatrix.needsUpdate=true;});}
function updateFar(dt){
  const snap=400,cx=Math.round(player.root.x/snap)*snap,cz=Math.round(player.root.z/snap)*snap;
  if(!FAR.pending&&(cx!==FAR.cx||cz!==FAR.cz)){const N=FAR.N,half=N*FAR.S/2;FAR.pending={cx,cz,x0:cx-half,z0:cz-half,row:0,h:new Float32Array((N+1)*(N+1)),c:new Float32Array((N+1)*(N+1)*3)};}
  farRebuild();if(!FAR.pending)farSink();
  // brouillard : court en ville (beaucoup d'immeubles), long à la campagne (on voit loin)
  const inside=inGridArea(player.root.x,player.root.z)?1:0,gd=gridDist(player.root.x,player.root.z);
  const city=(LOAD_R*CHUNK+15),country=Math.max(city,(SET.farView??1)*620);const want=inside?city:lerp(city,country,sstep01((gd-20)/160));
  WORLDV.fog=lerp(WORLDV.fog,want,1-Math.exp(-1.5*dt));scene.fog.far=WORLDV.fog;scene.fog.near=Math.min(scene.fog.far*0.35,80);camera.far=WORLDV.fog+60;camera.updateProjectionMatrix();
  for(const m of worldMovers.slice()){if(!m.o.parent||!m.o.parent.parent){worldMovers.splice(worldMovers.indexOf(m),1);continue;}
    if(m.kind==="bob"){m.o.position.y=WATER_Y+Math.sin(clockT*1.1+m.ph)*0.07;m.o.rotation.z=Math.sin(clockT*0.9+m.ph)*0.04;}
    else if(m.kind==="gator")updateGator(m,dt);
    else if(m.kind==="screen"){const k=(clockT*0.07+m.ph)%1;m.o.material.color.setHSL(k,0.35,0.45+0.15*Math.sin(clockT*3));}
    else if(m.kind==="pump")m.o.rotation.x=Math.sin(clockT*1.6+m.ph)*0.32;
    else if(m.kind==="tumble"){const k=((clockT*2.2+m.ph*10)%46)-23,x=m.x0+k,z=m.z0+Math.sin(clockT*0.7+m.ph)*3;m.o.position.set(x,groundAt(x,z)+0.45+Math.abs(Math.sin(clockT*3+m.ph))*0.35,z);m.o.rotation.z-=dt*5;}}
  updateAirplanes(dt);if(!WMAP.done&&!mapOpen)worldMapStep(1.5);CH_WATER.map.offset.x=(clockT*0.03)%1;
}
const WORLDV={fog:135};
function updateGator(m,dt){
  const G=m.o,d=hdist(player.root,G.position);
  if(d<4.5&&waterDepth(player.root.x,player.root.z)>0.05&&!player.ko&&!(CREA&&CREA.on)){ // il fonce sur toi
    const to=new V3(player.root.x-G.position.x,0,player.root.z-G.position.z).normalize();G.position.addScaledVector(to,dt*4.5);G.rotation.y=Math.atan2(to.x,to.z);
    m.bite-=dt;if(d<1.6&&m.bite<=0){m.bite=2.2;const dmg=12+Math.round(Math.random()*8);player.hp=Math.max(0,player.hp-dmg);player.lastHurt=clockT;floatText(player,"Alligator ! -"+dmg,"#ff8a6b");playSound("thud",1);rumble(300,1);
      player.vel.addScaledVector(to,4);if(player.hp<=0&&!player.ko)player.startKO(to,player,{fast:true});}
  }else{m.ph+=dt*0.12;const tx=m.home.x+Math.cos(m.ph)*m.rad,tz=m.home.z+Math.sin(m.ph)*m.rad;if(waterDepth(tx,tz)>0.15){const dx=tx-G.position.x,dz=tz-G.position.z;G.position.x+=dx*dt*0.5;G.position.z+=dz*dt*0.5;if(Math.abs(dx)+Math.abs(dz)>0.01)G.rotation.y=Math.atan2(dx,dz);}}
  m.tail.rotation.y=Math.sin(clockT*3+m.ph)*0.35;
}
