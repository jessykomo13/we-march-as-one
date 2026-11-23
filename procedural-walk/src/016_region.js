// ================================================================ LE MONDE ENTIER : l'État (inventé) de Floralia
// 13,6 km × 13,6 km (≈ 185 km², plus de deux fois la carte d'un grand GTA). Tout est déterministe :
// la même position donne toujours le même terrain. Ce fichier ne contient que des données et des fonctions
// pures (pas de Three.js) : il est évalué très tôt, tout le reste peut s'en servir.
//   • Azuria, la grande ville (le quadrillage d'origine, ±600 m), la mer et ses îles à l'est
//   • des villes et bourgs avec leur propre quadrillage (banlieue, marina, station balnéaire, bayou, montagne…)
//   • la campagne entre les deux, par biomes : champs, orangeraies, forêts, prairies, savane, collines, bayou
//   • des lacs, une côte découpée, l'archipel des Cayos relié par un long pont, un aéroport
//   • dix autoroutes alignées sur la grille des rues (elles prolongent les avenues de la ville)
const W_MIN=-6800,W_MAX=6800,C_MIN=-170,C_MAX=170,LAND_Y=0.15;
// --- villes et bourgs : rectangles de zones (i = x, j = z), chacun a son style d'îlots
const TOWNS=[
  {id:"ps",name:"Port-Soleil",i0:1,i1:8,j0:-33,j1:-27,style:"village"},
  {id:"jardins",name:"Les Jardins",i0:-40,i1:-15,j0:-14,j1:14,style:"banlieue"},
  {id:"marina",name:"Marina del Sol",i0:6,i1:13,j0:15,j1:24,style:"marina"},
  {id:"playa",name:"Playa Dorada",i0:3,i1:14,j0:30,j1:40,style:"balneaire"},
  {id:"bellef",name:"Bellefontaine",i0:-64,i1:-53,j0:-66,j1:-55,style:"village"},
  {id:"pins",name:"Les Pins",i0:28,i1:35,j0:-123,j1:-115,style:"montagne"},
  {id:"marais",name:"Marais-Gris",i0:-131,i1:-124,j0:-5,j1:3,style:"bayou"},
  {id:"capnord",name:"Cap-Nord",i0:37,i1:43,j0:-154,j1:-147,style:"pecheurs"},
  {id:"brisa",name:"Santa Brisa",i0:-31,i1:-21,j0:50,j1:59,style:"village"},
  {id:"punta",name:"Punta Esperanza",i0:128,i1:136,j0:61,j1:68,style:"resort"},
  {id:"ambre",name:"Ambre-sur-Colline",i0:-12,i1:-5,j0:-97,j1:-90,style:"village"}
];
// --- autoroutes : ax "ns" = nord-sud sur la ligne x = k*40-16 ; "ew" = est-ouest sur la ligne z = k*40-16
const HWYS=[
  {id:"A1",ax:"ns",k:5,a:-165,b:-14,name:"Autoroute A1"},
  {id:"A2",ax:"ew",k:0,a:-165,b:-14,name:"Autoroute A2"},
  {id:"A3",ax:"ns",k:10,a:15,b:65,name:"Autoroute A3"},
  {id:"A3C",ax:"ew",k:65,a:10,b:136,name:"Route des Cayos"},
  {id:"A4",ax:"ew",k:-60,a:-150,b:18,name:"Autoroute A4"},
  {id:"A5",ax:"ns",k:-60,a:-150,b:60,name:"Autoroute A5"},
  {id:"A6",ax:"ew",k:40,a:-60,b:10,name:"Autoroute A6"},
  {id:"A7",ax:"ns",k:-110,a:-140,b:120,name:"Autoroute A7"},
  {id:"A8",ax:"ew",k:-118,a:5,b:30,name:"Route des Pins"},
  {id:"A9",ax:"ew",k:-150,a:5,b:40,name:"Route du Cap"},
  {id:"A10",ax:"ns",k:-26,a:0,b:58,name:"Autoroute A10"},
  {id:"D1",ax:"ew",k:24,a:-30,b:-26,name:"Route de l'Aéroport"},
  {id:"D2",ax:"ns",k:-8,a:-90,b:-60,name:"Route d'Ambre",small:true}
];
const AIRPORT={i0:-48,i1:-30,j0:20,j1:29,name:"Aéroport International d'Azuria"};
const LAKES=[{x:-1800,z:-3500,r:520,name:"Lac Miroir"},{x:1500,z:-5300,r:300,name:"Lac des Hérons"},{x:-4300,z:3900,r:380,name:"Lac Caïman"},{x:2600,z:-2200,r:180,name:"Étang Bleu"}];
const HILLS=[{x:-4700,z:-4900,r:2300,h:58,name:"Monts Bleus"},{x:900,z:-3900,r:1300,h:26,name:"Collines d'Ambre"},{x:-2600,z:4700,r:1200,h:16,name:"Coteaux de Santa Brisa"},{x:3200,z:-5600,r:900,h:30,name:"Massif du Nord"}];
const BAYOU={x:-4300,z:700,r:2100,name:"Bayou des Alligators"};
const KEYS=[{x:1750,z:2560,r:150,name:"Cayo Brisa"},{x:2500,z:2620,r:190,name:"Cayo Lumière"},{x:3300,z:2540,r:130,name:"Cayo Tortuga"},{x:4200,z:2610,r:230,name:"Cayo Coral"},{x:5250,z:2580,r:440,name:"Punta Esperanza"}];
const REGIONS=[{x:-4700,z:-4900,r:1800,name:"Monts Bleus"},{x:BAYOU.x,z:BAYOU.z,r:2000,name:BAYOU.name},{x:-1800,z:-3500,r:900,name:"Lac Miroir"},
  {x:900,z:-3900,r:1200,name:"Collines d'Ambre"},{x:-600,z:3600,r:1800,name:"Savane du Sud"},{x:-2600,z:-1500,r:1500,name:"Plaine des Vergers"},{x:2200,z:-1600,r:1300,name:"Côte Nord"},
  {x:3200,z:-5600,r:1100,name:"Massif du Nord"},{x:-5500,z:-1500,r:1300,name:"Forêt de Gaïa"},{x:-5200,z:5200,r:1600,name:"Marécages du Sud-Ouest"},{x:2400,z:4300,r:1500,name:"Mer des Cayos"}];
// ---------------------------------------------------------------- petits outils (bruit 2D déterministe)
function vnoise(x,z,s){const i=Math.floor(x),j=Math.floor(z),fx=x-i,fz=z-j,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);
  const h=(a,b)=>{const q=Math.sin(a*127.1+b*311.7+s*74.7)*43758.5453;return q-Math.floor(q);};
  return (h(i,j)*(1-u)+h(i+1,j)*u)*(1-v)+(h(i,j+1)*(1-u)+h(i+1,j+1)*u)*v;}
function fbm(x,z,s){return vnoise(x,z,s)*0.55+vnoise(x*2.07,z*2.07,s+3)*0.28+vnoise(x*4.3,z*4.3,s+7)*0.17;}
const sstep01=t=>{t=t<0?0:t>1?1:t;return t*t*(3-2*t);};
// ---------------------------------------------------------------- zones à quadrillage (ville + bourgs)
function townAt(i,j){for(const T of TOWNS)if(i>=T.i0&&i<=T.i1&&j>=T.j0&&j<=T.j1)return T;return null;}
function cityAt(i,j){return i>=-14&&i<=14&&j>=-14&&j<=14;}
function gridAt(i,j){return cityAt(i,j)||!!townAt(i,j);}
function inAirport(i,j){return i>=-48&&i<=-30&&j>=20&&j<=29;}
// rectangles (avec leurs rues de bord) pour les distances
const GRID_RECTS=[{x0:-580,x1:588,z0:-580,z1:588},...TOWNS.map(T=>({x0:T.i0*40-20,x1:T.i1*40+28,z0:T.j0*40-20,z1:T.j1*40+28,T}))];
const AIR_RECT={x0:-48*40-20,x1:-30*40+20,z0:20*40-20,z1:29*40+20};
function rectDist(R,x,z){const dx=Math.max(R.x0-x,0,x-R.x1),dz=Math.max(R.z0-z,0,z-R.z1);return Math.hypot(dx,dz);}
function gridDist(x,z){let d=1e9;for(const R of GRID_RECTS){const v=rectDist(R,x,z);if(v<d)d=v;}return d;}
// le point est-il dans une ville ou un bourg (îlots + rues) ?
function inGridArea(x,z){for(const R of GRID_RECTS)if(x>=R.x0&&x<=R.x1&&z>=R.z0&&z<=R.z1)return true;return false;}
// ---------------------------------------------------------------- autoroutes : distance, position sur la chaussée
function hwyLine(H){return H.k*40-16;}
function hwyRange(H){return [H.a*40-16,H.b*40-16];}
function hwyDist(x,z,H){const L=hwyLine(H),[a,b]=hwyRange(H);
  if(H.ax==="ns"){const dz=Math.max(a-z,0,z-b);return Math.hypot(x-L,dz);}const dx=Math.max(a-x,0,x-b);return Math.hypot(z-L,dx);}
function nearestHwy(x,z){let best=null,bd=1e9;for(const H of HWYS){const d=hwyDist(x,z,H);if(d<bd){bd=d;best=H;}}return [best,bd];}
function hwyHalf(H){return H.small?5:8.6;}
// ---------------------------------------------------------------- mer, côte, lacs, bayou
// la côte est : droite le long d'Azuria (x = 588), puis elle s'écarte vers l'est au nord et au sud
function coastX(z){if(z>=-1300&&z<=1300)return 588;const t=z<0?-z-1300:z-1300,k=z<0?0.28:0.32,w=Math.min(1,t/300);return 588+t*k+w*(55*Math.sin(z/430)+28*Math.sin(z/141+1.3));}
// l'ancienne mer (module 16) garde son fond et ses îles ; pas de zones construites dessus
function inOldSea(x,z){return x>588&&x<1988&&z>-1300&&z<1300;}
function oldSeaChunk(cx,cz){return cx>=15&&cx<=49&&cz>=-32&&cz<=32;}
function keyAt(x,z){for(const K of KEYS){const d=Math.hypot(x-K.x,z-K.z);if(d<K.r*1.4)return K;}return null;}
// fond de l'eau (ou null si terre ferme) — sans les ponts
function newSeaFloor(x,z){const c=coastX(z);if(x<=c)return null;const d=x-c;let h=LAND_Y-Math.min(3.8,d*0.16+Math.max(0,d-8)*0.05);
  for(const K of KEYS){const e=Math.hypot(x-K.x,z-K.z);if(e<K.r*1.35){const t=1-e/(K.r*1.35);h=Math.max(h,-3.8+(0.75+3.8)*sstep01(t*1.7));}}
  return h;}
function lakeFloor(x,z){for(const L of LAKES){const dx=x-L.x,dz=z-L.z,d=Math.hypot(dx,dz);if(d>L.r*1.3)continue;const a=Math.atan2(dz,dx),R=L.r*(1+0.13*Math.sin(3*a+L.x*0.001)+0.08*Math.sin(5*a+1+L.z*0.001));
  if(d<R)return LAND_Y-Math.min(3.2,(R-d)*0.05);}return null;}
function bayouK(x,z){const d=Math.hypot(x-BAYOU.x,z-BAYOU.z)*(0.8+vnoise(x/900,z/900,13)*0.4);if(d>BAYOU.r*1.25)return 0;return sstep01((1-d/BAYOU.r)*2.2+(vnoise(x/600,z/600,9)-0.5)*1.2);}
function bayouFloor(x,z){const k=bayouK(x,z);if(k<=0.05)return null;const n=fbm(x/95,z/95,21);
  // chenaux plus profonds (on y nage), mares peu profondes (on y patauge), îlots de terre
  const ch=Math.abs(vnoise(x/420,z/420,33)-0.5);if(ch<0.025*k)return LAND_Y-1.6;
  if(n>0.62-0.22*k)return LAND_Y-0.5-(n-0.5)*0.6;return null;}
// ---------------------------------------------------------------- relief (collines, montagnes)
function hillRaw(x,z){let h=0;for(const H of HILLS){const d=Math.hypot(x-H.x,z-H.z)*(0.75+vnoise(x/700,z/700,H.h+1)*0.5);if(d>H.r)continue;const m=sstep01((1-d/H.r)*1.6);
  const n=fbm(x/340,z/340,H.h)*0.75+(1-Math.abs(vnoise(x/180,z/180,H.r)*2-1))*0.25;h+=H.h*m*Math.max(0,n-0.22)*1.4;}return h;}
// le relief s'aplatit près des routes, des villes, de l'aéroport, des lacs et de la mer
const HCACHE=new Map();
function hillAt(x,z){
  let h=hillRaw(x,z);if(h<=0.01)return 0;
  const [,dh]=nearestHwy(x,z);h*=sstep01((dh-12)/45);if(h<=0.01)return 0;
  h*=sstep01((gridDist(x,z)-20)/90);h*=sstep01((rectDist(AIR_RECT,x,z)-20)/90);if(h<=0.01)return 0;
  for(const L of LAKES){const d=Math.hypot(x-L.x,z-L.z)-L.r*1.25;if(d<150)h*=sstep01(d/150);}
  const cd=coastX(z)-x;if(cd<200)h*=sstep01(cd/200);
  return Math.max(0,h);
}
// hauteur aux nœuds d'une grille de 4 m (le maillage du sol utilise exactement les mêmes points)
const TGRID=4;
function nodeH(gi,gj){const k=gi*100003+gj;let h=HCACHE.get(k);if(h!==undefined)return h;if(HCACHE.size>120000)HCACHE.clear();h=rawLand(gi*TGRID,gj*TGRID);HCACHE.set(k,h);return h;}
// hauteur « brute » d'un point de campagne : eau (fond), terre (base + relief)
function rawLand(x,z){
  if(x>=AIR_RECT.x0-6&&x<=AIR_RECT.x1+6&&z>=AIR_RECT.z0-6&&z<=AIR_RECT.z1+6)return LAND_Y;
  const s=newSeaFloor(x,z);if(s!==null)return s;
  const l=lakeFloor(x,z);if(l!==null)return l;
  const b=bayouFloor(x,z);if(b!==null)return b;
  const g=gridDist(x,z);const base=g<10?LAND_Y*sstep01(g/10):LAND_Y;
  return base+hillAt(x,z);
}
function countryFloor(x,z){const fx=x/TGRID,fz=z/TGRID,i=Math.floor(fx),j=Math.floor(fz),u=fx-i,v=fz-j;
  const a=nodeH(i,j),b=nodeH(i+1,j),c=nodeH(i,j+1),d=nodeH(i+1,j+1);
  // même découpage en triangles que PlaneGeometry (diagonale de (i+1,j) à (i,j+1))
  return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);}
// ---------------------------------------------------------------- ponts : chaussée surélevée au-dessus de l'eau
const BRIDGES=new Map();   // id d'autoroute -> profil (pas de 4 m) de la hauteur du tablier
function bridgeProfile(H){let P=BRIDGES.get(H.id);if(P)return P;
  const [a,b]=hwyRange(H),L=hwyLine(H),n=Math.ceil((b-a)/4)+1,wet=new Uint8Array(n),dist=new Float32Array(n);
  for(let k=0;k<n;k++){const s=a+k*4,x=H.ax==="ns"?L:s,z=H.ax==="ns"?s:L;let f=null;if(!inGridArea(x,z)){f=newSeaFloor(x,z);if(f===null)f=lakeFloor(x,z);if(f===null&&bayouFloor(x,z)!==null)f=0;}wet[k]=f!==null&&f<LAND_Y+0.02?1:0;}
  let d=1e9;for(let k=0;k<n;k++){d=wet[k]?d+4:0;dist[k]=d;}d=1e9;for(let k=n-1;k>=0;k--){d=wet[k]?d+4:0;dist[k]=Math.min(dist[k],d);}
  const deck=new Float32Array(n);for(let k=0;k<n;k++)deck[k]=wet[k]?Math.min(2.2,LAND_Y+dist[k]*0.09):0;
  P={a,n,deck,wet};BRIDGES.set(H.id,P);return P;}
function bridgeAt(x,z){for(const H of HWYS){const L=hwyLine(H),off=H.ax==="ns"?x-L:z-L;if(Math.abs(off)>hwyHalf(H)+0.6)continue;const s=H.ax==="ns"?z:x,[a,b]=hwyRange(H);if(s<a-2||s>b+2)continue;
  const P=bridgeProfile(H),k=Math.round((s-a)/4);if(k<0||k>=P.n||!P.wet[k])continue;return {H,h:P.deck[k],off};}return null;}
// ---------------------------------------------------------------- hauteur de la campagne (chaussée, pont, terrain)
function countryGround(x,z){const B=bridgeAt(x,z);if(B)return B.h;return countryFloor(x,z);}
// profondeur d'eau (sans les ponts) : sert à la nage et à éviter l'eau pour les PNJ
function waterAtCountry(x,z){const f=countryFloor(x,z);return f<WATER_Y_C?WATER_Y_C-f:0;}
const WATER_Y_C=0.07;
// ---------------------------------------------------------------- biomes (pour le décor)
function biomeAt(x,z){
  if(x>coastX(z)-2&&newSeaFloor(x,z)!==null){const K=keyAt(x,z);if(K&&newSeaFloor(x,z)>WATER_Y_C)return "cayo";return "mer";}
  if(lakeFloor(x,z)!==null)return "lac";
  const bk=bayouK(x,z);if(bk>0.35)return "bayou";
  const cd=coastX(z)-x;if(cd<70&&Math.abs(z)>1300)return "plage";
  const h=hillAt(x,z);if(h>22)return "montagne";
  const n=fbm(x/700,z/700,5),m=vnoise(x/260,z/260,11);
  if(h>6)return n>0.45?"foret":"lande";
  if(z>1600&&x<1200&&x>-3600)return n<0.42?"savane":m<0.5?"orangeraie":"prairie";      // le sud : savane et orangeraies
  if(x<-4800)return n>0.4?"foret":"prairie";                                            // l'extrême ouest : forêt de Gaïa
  if(n<0.34)return "foret";if(n<0.44)return "prairie";if(m<0.18)return "ferme";if(m>0.86)return "eolien";if(m<0.3&&z<0)return "vigne";
  return z<0&&m<0.55?"champ":m<0.5?"orangeraie":"champ";
}
function regionName(x,z){let best=null,bd=1e9;for(const R of REGIONS){const d=Math.hypot(x-R.x,z-R.z)/R.r;if(d<1&&d<bd){bd=d;best=R;}}return best?best.name:null;}
