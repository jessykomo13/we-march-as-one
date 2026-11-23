// ================================================================ SECRETS DE FLORALIA
// • Les Étoiles de Floralia : des étoiles dorées cachées partout (sommets, îles, Cayos, bayou, villes, bout du monde…).
//   Chacune rapporte de l'argent ; toutes ensemble débloquent une récompense secrète.
// • Des lieux secrets à découvrir (OVNI écrasé, village fantôme, monstre du lac, épave d'avion, trésor, tête de pierre…)
//   construits seulement quand on s'approche ; une fois découverts, ils apparaissent sur la carte.
const SECRET={stars:new Set(),found:new Set(),looted:new Set(),gold:false};
const STARS=[];
{
  const S=(x,z,hint)=>STARS.push({id:STARS.length,x,z,hint,m:null});
  for(const H of HILLS){let bx=H.x,bz=H.z,bh=-1;for(let a=0;a<14;a++)for(let d=0.1;d<0.7;d+=0.1){const x=H.x+Math.cos(a/14*6.28)*H.r*d,z=H.z+Math.sin(a/14*6.28)*H.r*d,h=hillAt(x,z);if(h>bh){bh=h;bx=x;bz=z;}}S(bx,bz,"le sommet "+H.name);}
  for(const L of LAKES)S(L.x,L.z-L.r*1.12,"la rive du "+L.name);
  for(const K of KEYS)S(K.x+K.r*0.35,K.z-K.r*0.25,K.name);
  for(const I of ISLANDS)S(I.x+I.r*0.15,I.z+I.r*0.55,I.name);
  S(590,-500,"le port");S(-1885,1066,"le bout de la piste");S(3750,2584,"le Pont des Cayos");S(-3600,1400,"le bayou");S(-4900,200,"le bayou profond");
  for(const T of TOWNS){const ci=Math.round((T.i0+T.i1)/2),cj=Math.round((T.j0+T.j1)/2);S(ci*40-16+1.5,cj*40-16+12,T.name);}
  S(-5900,-5900,"le pied de la Grande Barrière (nord-ouest)");S(-5900,5900,"le pied de la Grande Barrière (sud-ouest)");S(-5950,-200,"la frontière ouest");S(200,-5950,"le grand nord");
  S(8.5,17,"le belvédère de la place");
  for(const [x,z,h] of [[1800,-3700,"le Plateau Rouge"],[3600,-5650,"les Dunes de Sel"],[2400,4600,"la jungle"],[coastX(3200)-30,3200,"la mangrove"],[-3300,-1000,"la Vallée Mauve"],[-1000,-1200,"le ranch Los Toros"],[1800,-4650,"la pinède"],[-2000,5700,"la bambouseraie"],[-2600,-4300,"la prairie des chevaux"],[-300,2950,"le Rio Caïman"],[-1100,-2900,"la Rivière Azur"]])S(x,z,h);S(-800,3620,"la Tête de Pierre");S(525,-5635,"l'OVNI");S(-6300,-2380,"Cendrebourg");S(-4800,1520,"l'épave");S(-5480,-1500,"le cercle de pierres");
}
const starGeo=(()=>{const s=new THREE.Shape();for(let i=0;i<10;i++){const a=i/10*Math.PI*2-Math.PI/2,r=i%2?0.22:0.5;i?s.lineTo(Math.cos(a)*r,Math.sin(a)*r):s.moveTo(Math.cos(a)*r,Math.sin(a)*r);}const e=new THREE.ExtrudeGeometry(s,{depth:0.12,bevelEnabled:false});e.center();return e;})();
const starMat=new THREE.MeshStandardMaterial({color:0xffd24a,emissive:0xffb400,emissiveIntensity:0.9,metalness:0.6,roughness:0.25});
const starGlow=new THREE.MeshBasicMaterial({color:0xfff0a0,transparent:true,opacity:0.18,depthWrite:false});
function chime(){const c=actx;if(!c)return;try{const t=c.currentTime;[784,988,1319,1568].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.type="triangle";o.frequency.value=f;g.gain.setValueAtTime(0,t+i*0.07);g.gain.linearRampToValueAtTime(0.12,t+i*0.07+0.02);g.gain.exponentialRampToValueAtTime(0.001,t+i*0.07+0.5);o.connect(g);g.connect(sfxOut());o.start(t+i*0.07);o.stop(t+i*0.07+0.55);});}catch(e){}}
function giveMoney(n){money+=n;moneyEl.textContent=money+" €";}
// ---------------------------------------------------------------- lieux secrets
const LANDMARKS=[
  {id:"ovni",name:"L'OVNI écrasé",x:520,z:-5640,build(g,y,L){
    const c=new THREE.Mesh(new THREE.CircleGeometry(16,24).rotateX(-Math.PI/2),mat({color:0x2a2620,roughness:1}));c.position.set(L.x,y+0.05,L.z);g.add(c);
    const s=new THREE.Group();s.position.set(L.x,y+1.4,L.z);s.rotation.set(0.35,0.4,0.15);g.add(s);
    put(geo("ufo1",()=>new THREE.SphereGeometry(6,24,10).scale(1,0.22,1)),mat({color:0xaab3bd,metalness:0.9,roughness:0.25}),0,0,0,s);put(geo("ufo2",()=>new THREE.SphereGeometry(2.4,16,10,0,Math.PI*2,0,Math.PI/2)),mat({color:0x7fe0ff,emissive:0x1a8aa0,emissiveIntensity:0.6,transparent:true,opacity:0.75}),0,0.9,0,s);
    for(let i=0;i<8;i++){const l=new THREE.Mesh(geo("ufoL",()=>new THREE.SphereGeometry(0.3,8,6)),new THREE.MeshBasicMaterial({color:0x6aff8a}));l.position.set(Math.cos(i/8*6.28)*5.2,0,Math.sin(i/8*6.28)*5.2);s.add(l);l.userData.keep=true;L.lights=(L.lights||[]).concat(l);}
    s.userData.keep=true;for(let i=0;i<6;i++)deadTree(L.x+Math.cos(i)*13,L.z+Math.sin(i)*13,1,g);
    // petit visiteur gris, immobile près de l'épave
    const a=new THREE.Group();a.position.set(L.x+7,y,L.z+3);a.rotation.y=-1;g.add(a);const gm=mat({color:0x9aa39a,roughness:0.6});put(CY(0.15,0.2,0.7,8),gm,0,0.45,0,a);put(geo("alienH",()=>new THREE.SphereGeometry(0.32,12,10).scale(1,1.25,1)),gm,0,1.05,0,a);for(const sx of [-0.12,0.12])put(geo("alienE",()=>new THREE.SphereGeometry(0.09,8,6).scale(1.4,0.8,0.5)),KM.dark,sx,1.1,0.25,a);
    addObstacle({type:"circle",x:L.x,z:L.z,r:6.2,tall:true});addObstacle({type:"circle",x:L.x+7,z:L.z+3,r:0.3});
    L.chest={x:L.x+7,z:L.z+3,r:2.6,money:3000,msg:"Le visiteur te tend un objet brillant… +3 000 € (« Nous reviendrons »)"};}},
  {id:"cendre",name:"Cendrebourg, le village fantôme",x:-6300,z:-2400,build(g,y,L){
    const wm=mat({color:0x4a4440,map:KM.plank.map,roughness:1}),rm=mat({color:0x2a2624,roughness:1});
    for(let i=0;i<7;i++){const a=i/7*6.28,x=L.x+Math.cos(a)*24,z=L.z+Math.sin(a)*24,yy=groundAt(x,z);walls(x-4,z-3,x+4,z+3,yy,3.2,wm,g,3,3);gableRoof(x-4.3,z-3.3,x+4.3,z+3.3,yy+3.2,2.2,rm,g);addObstacle({type:"box",x,z,hx:4,hz:3,tall:true,bld:true});deadTree(x+6,z+2,1.1,g);}
    put(BX(5,1,0.15),signMat("Bienvenue à Cendrebourg","#2a2420","#c9b89a",{w:512,h:96}),L.x,y+2.4,L.z-14,g);put(CY(0.08,0.08,3,6),OM.wood,L.x-2.2,y+1.2,L.z-14,g);put(CY(0.08,0.08,3,6),OM.wood,L.x+2.2,y+1.2,L.z-14,g);
    L.orbs=[];for(let i=0;i<5;i++){const o=new THREE.Mesh(geo("orb",()=>new THREE.SphereGeometry(0.25,10,8)),new THREE.MeshBasicMaterial({color:0xbfe8ff,transparent:true,opacity:0.7}));o.userData.keep=true;g.add(o);L.orbs.push(o);}
    L.chest={x:L.x,z:L.z,r:2.4,money:2500,msg:"Dans le puits du village : une vieille boîte en fer… +2 500 €"};put(CY(1.2,1.3,1,12),KM.stone,L.x,y+0.5,L.z,g);addObstacle({type:"circle",x:L.x,z:L.z,r:1.3});}},
  {id:"epave",name:"L'épave du vol AZ-404",x:-4800,z:1500,build(g,y,L){
    const p=planeMesh(g,1);p.position.set(L.x,Math.max(y,WATER_Y)-1.6,L.z);p.rotation.set(0.12,0.7,0.35);const w=put(BX(14,0.35,5),WM2.plane,L.x+16,Math.max(y,WATER_Y)-0.3,L.z+9,g,0.4);w.rotation.z=0.25;
    addObstacle({type:"box",x:L.x,z:L.z,hx:6,hz:6,tall:true});L.chest={x:L.x+3,z:L.z-8,r:2.6,money:4000,msg:"Une valise dans la soute : +4 000 € (et un vieux plan de l'aéroport)"};}},
  {id:"tresor",name:"Le trésor de l'Île du Trésor",x:820,z:-412,build(g,y,L){
    const c=new THREE.Group();c.position.set(L.x,y,L.z);g.add(c);put(BX(1.2,0.7,0.8),OM.wood,0,0.35,0,c);put(geo("chestLid",()=>new THREE.CylinderGeometry(0.4,0.4,1.2,10,1,false,0,Math.PI).rotateZ(Math.PI/2)),OM.wood,0,0.7,0,c);put(BX(1.24,0.1,0.84),KM.yellow,0,0.5,0,c);
    for(let i=0;i<4;i++)put(geo("skull",()=>new THREE.SphereGeometry(0.16,8,6)),KM.white,Math.cos(i)*2,0.12,Math.sin(i)*2,g===null?c:c);addObstacle({type:"box",x:L.x,z:L.z,hx:0.7,hz:0.5});
    L.chest={x:L.x,z:L.z,r:2.2,money:7500,msg:"Le coffre du pirate Barbe-Corail ! +7 500 €"};}},
  {id:"tete",name:"La Tête de Pierre",x:-800,z:3600,build(g,y,L){
    const sm=mat({color:0x8d877c,roughness:1});put(BX(5,9,4),sm,L.x,y+4.5,L.z,g);put(BX(5.4,2,1.4),sm,L.x,y+5.8,L.z+2.3,g);put(BX(1.2,3.2,1.6),sm,L.x,y+4.2,L.z+2.6,g);put(BX(5.2,1,4.2),sm,L.x,y+9.3,L.z,g);
    for(const s of [-1.2,1.2])put(BX(1,0.5,0.2),KM.dark,L.x+s,y+6.6,L.z+2.05,g);addObstacle({type:"box",x:L.x,z:L.z,hx:2.6,hz:2.4,tall:true});
    for(let i=0;i<10;i++)grassTuft(L.x+Math.cos(i)*7,L.z+Math.sin(i)*7,g);}},
  {id:"cercle",name:"Le cercle de pierres",x:-5500,z:-1500,build(g,y,L){
    for(let i=0;i<12;i++){const a=i/12*6.28,x=L.x+Math.cos(a)*9,z=L.z+Math.sin(a)*9,yy=groundAt(x,z);put(BX(1.2,3.6,0.8),WM2.rock,x,yy+1.8,z,g,a);addObstacle({type:"circle",x,z,r:0.7,tall:true});}
    put(BX(3,0.5,1.2),WM2.rock,L.x,y+0.6,L.z,g);addObstacle({type:"box",x:L.x,z:L.z,hx:1.5,hz:0.6});}},
  {id:"monstre",name:"Le monstre du Lac Miroir",x:-1800,z:-3500,lake:true,build(g,y,L){
    L.humps=[];const m=mat({color:0x2a3a2a,roughness:0.5});for(let i=0;i<4;i++){const h=new THREE.Mesh(geo("hump",()=>new THREE.SphereGeometry(1.4,12,8,0,Math.PI*2,0,Math.PI/2)),m);h.userData.keep=true;g.add(h);L.humps.push(h);}
    const hd=new THREE.Group();hd.userData.keep=true;g.add(hd);put(CY(0.5,0.7,4,8),m,0,2,0,hd);put(BX(0.9,0.8,1.6),m,0,4.2,0.5,hd);for(const s of [-0.3,0.3])put(geo("mEye",()=>new THREE.SphereGeometry(0.1,6,4)),KM.yellow,s,4.4,1.2,hd);L.head=hd;}}
];
const LMK={g:new Map()};
function updateSecrets(dt){
  const px=player.root.x,pz=player.root.z;
  // étoiles : maillage seulement à moins de 70 m
  for(const S of STARS){if(SECRET.stars.has(S.id))continue;const d=Math.hypot(S.x-px,S.z-pz);
    if(d<70&&!S.m){const y=groundAt(S.x,S.z)+(waterDepth(S.x,S.z)>0?WATER_Y-groundAt(S.x,S.z):0);const g=new THREE.Group();g.position.set(S.x,y+1.3,S.z);g.add(new THREE.Mesh(starGeo,starMat));const gl=new THREE.Mesh(geo("starGlow",()=>new THREE.SphereGeometry(0.9,12,8)),starGlow);g.add(gl);scene.add(g);S.m=g;S.y=y;}
    else if(d>90&&S.m){scene.remove(S.m);S.m=null;}
    if(S.m){S.m.rotation.y+=dt*2;S.m.position.y=S.y+1.3+Math.sin(clockT*2+S.id)*0.15;
      if(d<1.9&&Math.abs(player.root.y-S.y)<2.6){SECRET.stars.add(S.id);scene.remove(S.m);S.m=null;giveMoney(250);chime();rumble(120,0.5);
        const n=SECRET.stars.size;misBanner("Étoile de Floralia "+n+" / "+STARS.length,n===STARS.length?"Toutes les étoiles ! Récompense : la Comète dorée t'attend":"+250 € · trouvée vers "+S.hint,"#ffd24a");
        if(n===STARS.length&&!SECRET.gold){SECRET.gold=true;giveMoney(25000);spawnGoldCar();}}}}
  // lieux secrets : construits à moins de 320 m, découverts à moins de 30 m
  for(const L of LANDMARKS){const d=Math.hypot(L.x-px,L.z-pz);
    const BR=L.lake?760:320;
    if(d<BR&&!LMK.g.has(L.id)){const g=new THREE.Group(),obs=[];obsSink=obs;L.chest=null;L.build(g,groundAt(L.x,L.z),L);obsSink=null;bake(g);scene.add(g);LMK.g.set(L.id,{g,obs});}
    else if(d>BR+140&&LMK.g.has(L.id)){const E=LMK.g.get(L.id);for(const o of E.obs)removeObstacle(o);E.g.traverse(o=>{if(o.isMesh&&!o.geometry.userData.shared)o.geometry.dispose();});scene.remove(E.g);LMK.g.delete(L.id);}
    if(!LMK.g.has(L.id))continue;
    if(d<30&&!SECRET.found.has(L.id)&&!L.lake){SECRET.found.add(L.id);giveMoney(500);chime();misBanner("Lieu secret découvert",L.name+" · +500 €","#b98aff");addSecretPOI(L);}
    if(L.lights)L.lights.forEach((l,i)=>l.visible=Math.floor(clockT*3+i)%2===0);
    if(L.orbs)L.orbs.forEach((o,i)=>{const a=clockT*0.4+i*1.3;o.position.set(L.x+Math.cos(a)*(10+i*3),groundAt(L.x,L.z)+1.5+Math.sin(clockT*1.3+i)*0.6,L.z+Math.sin(a*1.1)*(10+i*3));});
    if(L.humps){const k=Math.max(0,Math.sin(clockT*0.18)),cx=L.x+Math.cos(clockT*0.05)*180,cz=L.z+Math.sin(clockT*0.05)*140;
      L.humps.forEach((h,i)=>{const e=clockT*0.05+i*0.012;h.position.set(L.x+Math.cos(e)*180,WATER_Y-1.5+k*1.2*(1-i*0.12)+Math.sin(clockT*1.5+i)*0.15,L.z+Math.sin(e)*140);});
      const e=clockT*0.05-0.014;L.head.position.set(L.x+Math.cos(e)*180,WATER_Y-4.5+k*4.2,L.z+Math.sin(e)*140);L.head.rotation.y=-e;
      if(k>0.85&&!SECRET.found.has(L.id)&&Math.hypot(L.head.position.x-px,L.head.position.z-pz)<260){SECRET.found.add(L.id);giveMoney(1500);chime();misBanner("Tu l'as vu !","Le monstre du Lac Miroir existe… +1 500 €","#7fe0a0");addSecretPOI(L);}}
  }
}
// coffres / objets : E (ou le bouton) tout près
function trySecret(){
  for(const L of LANDMARKS){const C=L.chest;if(!C||SECRET.looted.has(L.id))continue;if(Math.hypot(C.x-player.root.x,C.z-player.root.z)<C.r){SECRET.looted.add(L.id);giveMoney(C.money);chime();misBanner("Trésor !",C.msg,"#ffd24a");return true;}}
  return false;
}
function secretNear(){for(const L of LANDMARKS){const C=L.chest;if(C&&!SECRET.looted.has(L.id)&&Math.hypot(C.x-player.root.x,C.z-player.root.z)<C.r)return true;}return false;}
function addSecretPOI(L){if(!POIS.some(P=>P.name===L.name))POIS.push({type:"secret",x:L.x,z:L.z,name:L.name});}
// la récompense finale : la Comète dorée (voiture)
const GOLD_PAINT=mat({color:0xffc83a,metalness:0.95,roughness:0.18});
function spawnGoldCar(){const f=fwdOf(player.yaw),x=player.root.x+f.x*5,z=player.root.z+f.z*5;const V=makeVehicle(x,z,player.yaw,GOLD_PAINT,"hyper");V.owned=true;V.gold=true;hudMsg("La Comète dorée est à toi !");}
function secretSave(){return {s:[...SECRET.stars],f:[...SECRET.found],l:[...SECRET.looted],g:SECRET.gold};}
function secretLoad(d){if(!d)return;(d.s||[]).forEach(i=>{if(i>=0&&i<STARS.length)SECRET.stars.add(i|0);});(d.f||[]).forEach(i=>{const L=LANDMARKS.find(L=>L.id===i);if(L){SECRET.found.add(i);addSecretPOI(L);}});(d.l||[]).forEach(i=>SECRET.looted.add(String(i)));SECRET.gold=!!d.g;}
