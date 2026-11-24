// ================================================================ ANIMAUX : vivants, animés, solides
// Troupeaux posés par les zones (addAnimals) et créés quand on s'approche. Quadrupèdes (pattes qui marchent,
// tête qui broute), oiseaux (marchent, picorent, s'envolent, tournent dans le ciel), nageurs (canards, cygnes),
// échassiers (hérons, flamants dans l'eau peu profonde), dauphins qui sautent, papillons et abeilles.
// Ils fuient si on court vers eux, si on les frappe ou si une voiture arrive ; on ne peut pas les traverser ;
// une voiture peut les renverser (ils se relèvent). Chaque animal = 1 corps fusionné + pattes/ailes animées.
const ANI_MAT=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.85});
// [type, longueur, hauteur au dos, largeur, couleurs {b corps, h tête, l pattes, s taches}, vitesse marche, vitesse fuite, son]
const SPEC={
  vache:{t:"quad",L:1.9,H:1.35,W:0.75,c:{b:"#f2efe8",h:"#f2efe8",l:"#2a2622",s:"#2a2622",n:"#e8a0a0"},walk:0.9,run:4.2,snd:"meuh",flee:5,spots:true,horn:"#e8e0c8"},
  cheval:{t:"quad",L:2.0,H:1.55,W:0.6,c:{b:"#7a4a2a",h:"#7a4a2a",l:"#3a2414",m:"#2a1a10"},walk:1.3,run:7.5,snd:"hennir",flee:7,neck:true},
  mouton:{t:"quad",L:1.1,H:0.8,W:0.7,c:{b:"#f4f1e6",h:"#2a2622",l:"#2a2622"},walk:0.7,run:3.6,snd:"bee",flee:7,fluffy:true},
  chevre:{t:"quad",L:1.0,H:0.8,W:0.45,c:{b:"#e8e2d0",h:"#e8e2d0",l:"#4a4036"},walk:0.8,run:4.5,snd:"bee",flee:8,horn:"#4a4036"},
  cochon:{t:"quad",L:1.2,H:0.75,W:0.6,c:{b:"#f2b4a8",h:"#f2b4a8",l:"#e89a8a",n:"#e88a7a"},walk:0.7,run:3.2,snd:"groin",flee:5},
  cerf:{t:"quad",L:1.5,H:1.25,W:0.5,c:{b:"#9a6a3a",h:"#9a6a3a",l:"#5a3a1e"},walk:1.1,run:8,snd:null,flee:16,antler:true,neck:true},
  renard:{t:"quad",L:0.8,H:0.45,W:0.28,c:{b:"#d0661e",h:"#d0661e",l:"#2a1a10",tail:"#f2efe8"},walk:1.2,run:6.5,snd:null,flee:14,tailLong:true},
  coyote:{t:"quad",L:0.95,H:0.6,W:0.3,c:{b:"#a8875a",h:"#a8875a",l:"#5a4632"},walk:1.2,run:6.5,snd:"hurle",flee:14,tailLong:true},
  lapin:{t:"quad",L:0.4,H:0.28,W:0.22,c:{b:"#b8a48a",h:"#b8a48a",l:"#b8a48a",tail:"#ffffff"},walk:0.8,run:6,snd:null,flee:9,ears:true,hop:true},
  ecureuil:{t:"quad",L:0.3,H:0.2,W:0.14,c:{b:"#a8501e",h:"#a8501e",l:"#a8501e",tail:"#c8702e"},walk:1.2,run:5,snd:null,flee:7,tailLong:true,hop:true},
  chien:{t:"quad",L:0.9,H:0.6,W:0.32,c:{b:"#c8a070",h:"#c8a070",l:"#8a6a40"},walk:1.3,run:6,snd:"wouf",flee:0,friend:true,tailLong:true},
  singe:{t:"quad",L:0.6,H:0.5,W:0.3,c:{b:"#5a3a22",h:"#d0a880",l:"#5a3a22"},walk:1.1,run:5,snd:"singe",flee:8,tailLong:true,hop:true},
  panda_roux:{t:"quad",L:0.7,H:0.4,W:0.3,c:{b:"#c8501e",h:"#f2efe8",l:"#2a1a10",tail:"#a8401a"},walk:0.6,run:3,snd:null,flee:6,tailLong:true},
  tortue:{t:"quad",L:0.6,H:0.3,W:0.5,c:{b:"#4a6a32",h:"#7a8a4a",l:"#7a8a4a"},walk:0.15,run:0.25,snd:null,flee:0,shell:true,swimOk:true},
  crabe:{t:"quad",L:0.35,H:0.16,W:0.5,c:{b:"#d0401e",h:"#d0401e",l:"#d0401e"},walk:0.6,run:2.4,snd:null,flee:4,crab:true},
  poule:{t:"bird",L:0.4,H:0.45,c:{b:"#f2efe8",h:"#c8281e",l:"#e8a020",w:"#e8e2d0"},walk:0.6,run:3,snd:"cot",flee:4,ground:true},
  canard:{t:"bird",L:0.45,H:0.35,c:{b:"#8a6a4a",h:"#2a6a3a",l:"#e8a020",w:"#7a5a3a"},walk:0.5,run:2.5,snd:"coin",flee:6,swim:true},
  cygne:{t:"bird",L:0.8,H:0.6,c:{b:"#f4f4f0",h:"#f4f4f0",l:"#2a2a2a",w:"#f4f4f0",beak:"#e86a1a"},walk:0.4,run:1.6,snd:null,flee:5,swim:true,longNeck:true},
  heron:{t:"bird",L:0.7,H:1.1,c:{b:"#aab2ba",h:"#e8e8e8",l:"#c8a050",w:"#8a929a"},walk:0.4,run:2,snd:null,flee:12,wader:true,longNeck:true},
  flamant:{t:"bird",L:0.6,H:1.2,c:{b:"#f28aa0",h:"#f28aa0",l:"#e86a8a",w:"#e8607a",beak:"#2a2a2a"},walk:0.4,run:2,snd:null,flee:12,wader:true,longNeck:true},
  pelican:{t:"bird",L:0.9,H:0.8,c:{b:"#e8e4dc",h:"#e8e4dc",l:"#7a7a7a",w:"#c8c4bc",beak:"#e8a040"},walk:0.4,run:2,snd:null,flee:8,ground:true},
  goeland:{t:"bird",L:0.45,H:0.35,c:{b:"#f4f4f0",h:"#f4f4f0",l:"#e8c060",w:"#9aa3ad"},walk:0.6,run:3,snd:"mouette",flee:7,ground:true},
  corbeau:{t:"bird",L:0.4,H:0.3,c:{b:"#1a1a1e",h:"#1a1a1e",l:"#2a2a2a",w:"#1a1a1e"},walk:0.6,run:3,snd:"croa",flee:9,ground:true},
  pigeon:{t:"bird",L:0.3,H:0.25,c:{b:"#8a929e",h:"#5a6a7a",l:"#c84a3a",w:"#7a828e"},walk:0.6,run:3,snd:null,flee:5,ground:true},
  perroquet:{t:"bird",L:0.4,H:0.3,c:{b:"#e8281e",h:"#f2d23a",l:"#2a2a2a",w:"#1f6ac8"},walk:0.5,run:3,snd:"perroquet",flee:0,flyer:true},
  vautour:{t:"bird",L:0.8,H:0.5,c:{b:"#2a2622",h:"#c8a08a",l:"#2a2622",w:"#2a2622"},walk:0.5,run:2,snd:null,flee:0,circler:true,wingspan:2.4},
  aigle:{t:"bird",L:0.8,H:0.5,c:{b:"#5a3a22",h:"#f4f4f0",l:"#e8c020",w:"#5a3a22"},walk:0.5,run:2,snd:"aigle",flee:0,circler:true,wingspan:2.2},
  dauphin:{t:"fish",L:2.2,H:0.5,c:{b:"#7a8a9a",h:"#7a8a9a",l:"#7a8a9a"},walk:4,run:6,snd:null,flee:0},
  papillon:{t:"swarm",c:{b:"#f2a020"},n:5},abeilles:{t:"swarm",c:{b:"#f2d23a"},n:8}
};
// ---------------------------------------------------------------- fabrication (boîtes colorées fusionnées)
const _ac=new THREE.Color();
function aBox(parts,w,h,d,x,y,z,col,rx=0,ry=0,rz=0){const g=new THREE.BoxGeometry(w,h,d).toNonIndexed();if(rx||ry||rz)g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx,ry,rz)));g.translate(x,y,z);
  const n=g.attributes.position.count,a=new Float32Array(n*3);_ac.set(col);_ac.convertSRGBToLinear();for(let i=0;i<n;i++){a[i*3]=_ac.r;a[i*3+1]=_ac.g;a[i*3+2]=_ac.b;}g.setAttribute("color",new THREE.BufferAttribute(a,3));g.deleteAttribute("uv");parts.push(g);}
function aMesh(parts){const m=new THREE.Mesh(mergeGeometries(parts),ANI_MAT);parts.forEach(p=>p.dispose());m.castShadow=true;return m;}
function buildAnimal(kind){
  const S=SPEC[kind],c=S.c,root=new THREE.Group(),A={root,legs:[],wings:[],head:null,S,kind};
  if(S.t==="quad"){
    const L=S.L,H=S.H,W=S.W,legH=H*0.5,bodyH=H*0.5,P=[];
    if(S.shell){aBox(P,W,H*0.55,L*0.85,0,H*0.45,0,c.b);aBox(P,W*0.8,H*0.15,L*0.7,0,H*0.78,0,"#6a8a4a");}
    else if(S.crab){aBox(P,W,H,L,0,H*0.55,0,c.b);for(const s of [-1,1])aBox(P,0.12,0.1,0.18,s*W*0.6,H*0.9,L*0.45,c.b);}
    else{aBox(P,W,bodyH,L,0,legH+bodyH/2,0,c.b);if(S.fluffy)aBox(P,W*1.15,bodyH*1.15,L*1.05,0,legH+bodyH/2,0,c.b);
      if(S.spots){aBox(P,W+0.02,bodyH*0.5,L*0.3,0,legH+bodyH*0.6,-L*0.15,c.s);aBox(P,W+0.02,bodyH*0.4,L*0.2,0,legH+bodyH*0.4,L*0.25,c.s);}
      aBox(P,W*0.4,W*0.35,L*0.12,0,legH+bodyH*0.75,-L/2-L*0.05,c.tail||c.b);if(S.tailLong)aBox(P,W*0.35,W*0.35,L*0.5,0,legH+bodyH*0.6,-L/2-L*0.25,c.tail||c.b,0.5);
      if(S.hop)aBox(P,W,bodyH*0.5,L*0.3,0,legH+bodyH*0.9,-L*0.3,c.b);
      if(S.spots){aBox(P,W*0.45,bodyH*0.25,L*0.22,0,legH-bodyH*0.05,-L*0.12,"#f0a8a8");}
      if(S.neck||S.spots)aBox(P,0.06,H*0.35,0.06,0,legH+bodyH*0.3,-L/2-0.04,c.m||c.b,0.25);}
    const body=aMesh(P);root.add(body);
    // tête (pivot au cou)
    const head=new THREE.Group();head.position.set(0,S.shell||S.crab?H*0.4:legH+bodyH*(S.neck?1.1:0.85),L/2*(S.crab?0.6:0.95));root.add(head);const HP=[],hs=Math.max(0.12,W*0.55);
    if(S.neck)aBox(HP,W*0.4,H*0.55,W*0.45,0,H*0.18,0.05,c.b,-0.5);
    if(!S.crab){aBox(HP,hs*0.9,hs*0.8,hs*1.3,0,S.neck?H*0.42:0,S.neck?0.28:hs*0.5,c.h);if(c.n)aBox(HP,hs*0.7,hs*0.45,hs*0.25,0,(S.neck?H*0.42:0)-hs*0.1,(S.neck?0.28:hs*0.5)+hs*0.72,c.n);
      for(const s of [-1,1])aBox(HP,hs*0.18,hs*0.18,hs*0.04,s*hs*0.3,(S.neck?H*0.42:0)+hs*0.15,(S.neck?0.28:hs*0.5)+hs*0.65,"#111111");
      if(S.ears)for(const s of [-1,1])aBox(HP,0.05,0.25,0.08,s*0.06,0.2,0.05,c.h);
      if(S.horn)for(const s of [-1,1])aBox(HP,0.05,0.18,0.05,s*hs*0.35,(S.neck?H*0.42:0)+hs*0.5,(S.neck?0.28:hs*0.5),S.horn,0,0,s*-0.5);
      if(S.antler)for(const s of [-1,1]){aBox(HP,0.05,0.5,0.05,s*0.12,H*0.42+0.35,0.25,"#8a6a4a",0,0,s*-0.4);aBox(HP,0.04,0.25,0.04,s*0.25,H*0.42+0.5,0.25,"#8a6a4a",0,0,s*0.6);}
      if(c.m)aBox(HP,0.08,H*0.4,0.2,0,H*0.35,-0.05,c.m,-0.5);}
    if(HP.length){head.add(aMesh(HP));}A.head=head;
    // pattes (pivot à la hanche)
    const lw=Math.max(0.05,W*0.18);
    const legPos=S.crab?[[-W*0.6,0.2],[W*0.6,0.2],[-W*0.6,-0.1],[W*0.6,-0.1]]:[[-W*0.32,L*0.38],[W*0.32,L*0.38],[-W*0.32,-L*0.38],[W*0.32,-L*0.38]];
    for(const [lx,lz] of legPos){const g=new THREE.Group();g.position.set(lx,S.shell||S.crab?H*0.4:legH+0.02,lz);root.add(g);const LP=[];const lh=S.shell||S.crab?H*0.4:legH;aBox(LP,lw,lh,lw,0,-lh/2,0,c.l);g.add(aMesh(LP));A.legs.push(g);}
  }else if(S.t==="bird"){
    const L=S.L,H=S.H,P=[],lh=S.wader?H*0.55:S.swim?0.0:H*0.3;
    aBox(P,L*0.45,L*0.4,L,0,lh+L*0.2,0,c.b);aBox(P,L*0.3,L*0.15,L*0.35,0,lh+L*0.25,-L*0.6,c.w);
    if(S.longNeck)aBox(P,L*0.12,H*0.45,L*0.12,0,lh+L*0.2+H*0.22,L*0.4,c.h,-0.2);
    const hy=lh+L*0.2+(S.longNeck?H*0.45:L*0.3),hz=L*(S.longNeck?0.5:0.48);
    aBox(P,L*0.26,L*0.26,L*0.3,0,hy,hz,c.h);aBox(P,L*0.08,L*0.08,L*(S.kind==="pelican"?0.55:0.25),0,hy-0.02,hz+L*0.25,c.beak||"#e8a020");
    if(S.wader||S.ground)for(const s of [-1,1])aBox(P,0.03,lh,0.03,s*L*0.1,lh/2,0,c.l);
    root.add(aMesh(P));
    for(const s of [-1,1]){const g=new THREE.Group();g.position.set(s*L*0.22,lh+L*0.3,0);root.add(g);const WP=[];const span=S.wingspan?S.wingspan/2:L*0.7;aBox(WP,span,0.03,L*0.5,s*span/2,0,0,c.w);g.add(aMesh(WP));A.wings.push(g);}
  }else if(S.t==="fish"){const P=[];aBox(P,0.5,0.45,S.L,0,0,0,c.b);aBox(P,0.08,0.45,0.35,0,0.35,0,c.b,0.4);aBox(P,0.8,0.06,0.35,0,0,-S.L/2,c.b);aBox(P,0.45,0.3,0.4,0,-0.08,S.L/2+0.1,"#9aa8b8");root.add(aMesh(P));}
  else if(S.t==="swarm"){const P=[];for(let i=0;i<(S.n||5);i++)aBox(P,0.12,0.02,0.08,0,0,0,c.b);const m=aMesh(P);root.add(m);A.swarm=m;}
  return A;
}
// ---------------------------------------------------------------- troupeaux et animaux
const HERDS=[],ANIMALS=[];let ANI_KEY=null;
function addAnimals(kind,x,z,n,rad){if(!SPEC[kind])return;HERDS.push({kind,x,z,n:Math.max(1,n|0),rad:rad||12,key:ANI_KEY,list:null});}
function aniOk(S,x,z){const d=waterDepth(x,z);if(S.swim)return d>0.25;if(S.wader)return d<0.7;if(S.t==="fish")return d>1.5;if(S.swimOk)return d<1.2;return d<0.05&&!onAnyRoad(x,z,0.5);}
function spawnHerd(H){
  H.list=[];const S=SPEC[H.kind];const cap=isTouch()?26:44;
  for(let i=0;i<H.n&&ANIMALS.length<cap;i++){let x=H.x,z=H.z,ok=false;for(let k=0;k<14;k++){x=H.x+(Math.random()-0.5)*H.rad*2;z=H.z+(Math.random()-0.5)*H.rad*2;if(aniOk(S,x,z)&&(S.t!=="quad"||freeSpot(new V3(x,0,z),0.8))){ok=true;break;}}
    if(!ok&&!S.circler&&S.t!=="swarm")continue;
    const A=buildAnimal(H.kind);A.x=x;A.z=z;A.yaw=Math.random()*6.28;A.state="idle";A.t=rand(0,4);A.ph=Math.random()*6.28;A.tx=x;A.tz=z;A.v=0;A.herd=H;A.snd=rand(4,20);A.hits=0;A.y=groundAt(x,z);
    if(S.circler){A.y=groundAt(x,z)+rand(25,45);A.circle={cx:x,cz:z,r:rand(15,35),w:rand(0.15,0.3)*(Math.random()<0.5?-1:1)};A.state="circle";}
    if(S.flyer){A.y=groundAt(x,z)+rand(6,14);A.state="fly";}
    if(S.t==="swarm"){A.y=groundAt(x,z)+0.8;A.state="swarm";}
    if(S.t==="fish"){A.state="swim";A.y=WATER_Y-1;}
    A.root.position.set(A.x,A.y,A.z);scene.add(A.root);ANIMALS.push(A);H.list.push(A);}
}
function despawnHerd(H){for(const A of H.list||[]){scene.remove(A.root);A.root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});const i=ANIMALS.indexOf(A);if(i>=0)ANIMALS.splice(i,1);}H.list=null;}
// cris (WebAudio)
function aniSound(kind,vol){const c=actx;if(!c||c.state!=="running"||vol<0.02)return;try{const t=c.currentTime,o=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter();f.type="lowpass";f.frequency.value=1800;o.connect(f);f.connect(g);g.connect(sfxOut());
  const env=(a,d,v)=>{g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v*vol,t+a);g.gain.linearRampToValueAtTime(0,t+d);};
  if(kind==="meuh"){o.type="sawtooth";o.frequency.setValueAtTime(130,t);o.frequency.linearRampToValueAtTime(95,t+1.1);f.frequency.value=600;env(0.15,1.2,0.25);o.start(t);o.stop(t+1.25);}
  else if(kind==="bee"){o.type="sawtooth";o.frequency.setValueAtTime(320,t);for(let k=0;k<6;k++)o.frequency.setValueAtTime(k%2?300:340,t+k*0.07);f.frequency.value=1400;env(0.05,0.5,0.18);o.start(t);o.stop(t+0.55);}
  else if(kind==="groin"){o.type="square";o.frequency.setValueAtTime(140,t);o.frequency.linearRampToValueAtTime(90,t+0.25);f.frequency.value=700;env(0.02,0.3,0.2);o.start(t);o.stop(t+0.32);}
  else if(kind==="hennir"){o.type="sawtooth";o.frequency.setValueAtTime(700,t);for(let k=0;k<10;k++)o.frequency.setValueAtTime(600-k*30+(k%2)*80,t+k*0.08);f.frequency.value=2200;env(0.05,0.9,0.14);o.start(t);o.stop(t+0.95);}
  else if(kind==="cot"){o.type="square";o.frequency.setValueAtTime(900,t);o.frequency.exponentialRampToValueAtTime(500,t+0.12);f.frequency.value=2500;env(0.01,0.14,0.08);o.start(t);o.stop(t+0.16);}
  else if(kind==="coin"){o.type="sawtooth";o.frequency.setValueAtTime(420,t);o.frequency.linearRampToValueAtTime(360,t+0.18);f.frequency.value=1500;env(0.01,0.2,0.12);o.start(t);o.stop(t+0.22);}
  else if(kind==="wouf"){o.type="sawtooth";o.frequency.setValueAtTime(260,t);o.frequency.exponentialRampToValueAtTime(140,t+0.16);f.frequency.value=900;env(0.01,0.18,0.25);o.start(t);o.stop(t+0.2);}
  else if(kind==="croa"){o.type="sawtooth";o.frequency.setValueAtTime(520,t);o.frequency.linearRampToValueAtTime(380,t+0.3);f.frequency.value=1600;env(0.02,0.32,0.12);o.start(t);o.stop(t+0.34);}
  else if(kind==="hurle"){o.type="sine";o.frequency.setValueAtTime(500,t);o.frequency.linearRampToValueAtTime(900,t+0.8);o.frequency.linearRampToValueAtTime(600,t+1.6);env(0.3,1.7,0.1);o.start(t);o.stop(t+1.75);}
  else if(kind==="mouette"){o.type="triangle";o.frequency.setValueAtTime(1700,t);o.frequency.exponentialRampToValueAtTime(1000,t+0.3);env(0.02,0.32,0.08);o.start(t);o.stop(t+0.34);}
  else if(kind==="perroquet"){o.type="square";for(let k=0;k<5;k++)o.frequency.setValueAtTime(1200+((k*37)%5)*260,t+k*0.06);f.frequency.value=3000;env(0.01,0.32,0.06);o.start(t);o.stop(t+0.34);}
  else if(kind==="singe"){o.type="sawtooth";for(let k=0;k<6;k++)o.frequency.setValueAtTime(k%2?700:1100,t+k*0.09);env(0.02,0.55,0.08);o.start(t);o.stop(t+0.6);}
  else if(kind==="aigle"){o.type="triangle";o.frequency.setValueAtTime(2200,t);o.frequency.exponentialRampToValueAtTime(1400,t+0.6);env(0.02,0.62,0.06);o.start(t);o.stop(t+0.64);}
  else{o.start(t);o.stop(t+0.01);}}catch(e){}}
// ---------------------------------------------------------------- comportement
let aniCk=0;
function updateAnimals(dt){
  const px=player.root.x,pz=player.root.z;
  aniCk-=dt;if(aniCk<=0){aniCk=0.5;
    for(let i=HERDS.length-1;i>=0;i--){const H=HERDS[i];if(H.key&&!chunks.has(H.key)){if(H.list)despawnHerd(H);HERDS.splice(i,1);continue;}
      const d=Math.hypot(H.x-px,H.z-pz);if(!H.list&&d<115)spawnHerd(H);else if(H.list&&d>160)despawnHerd(H);}}
  const pRun=player.speed>3.2,veh=drive,atk=player.atk&&!player.atk._ani&&player.atk.t>=player.atk.impactT?player.atk:null;if(atk)atk._ani=true;
  const pf=fwdOf(player.yaw);
  for(const A of ANIMALS){
    const S=A.S,dx=A.x-px,dz=A.z-pz,d=Math.hypot(dx,dz);
    A.root.visible=d<95;if(d>130)continue;
    A.t-=dt;A.ph+=dt;
    // coups de poing / de pied
    if(atk&&d<1.9&&(dx*pf.x+dz*pf.z)>0&&S.t!=="swarm"&&!S.circler){A.hits++;A.fleeT=6;A.state=S.t==="bird"&&!S.swim?"fly":"flee";aniSound(S.snd,1);if(A.hits>=3&&S.t==="quad"){A.state="ko";A.t=6;}floatText(player,pick(["Pauvre bête !","Aïe !","Laisse-le tranquille !"]),"#ffd0a0");}
    // voiture
    if(veh&&S.t!=="swarm"&&!S.circler){const vd=Math.hypot(A.x-veh.x,A.z-veh.z);if(vd<2.6&&Math.abs(veh.v)>4&&A.state!=="ko"){A.state=S.t==="quad"?"ko":"fly";A.t=6;aniSound(S.snd,1);const k=Math.abs(veh.v)*0.25;A.x+=(A.x-veh.x)/(vd||1)*k;A.z+=(A.z-veh.z)/(vd||1)*k;veh.vel.multiplyScalar(0.85);}
      else if(vd<14&&Math.abs(veh.v)>6&&A.state!=="ko"&&S.flee){A.fleeT=4;A.state=S.t==="bird"&&!S.swim&&!S.wader?"fly":"flee";}}
    // peur du joueur qui court vers eux
    if(S.flee&&d<S.flee&&(pRun||d<S.flee*0.35)&&A.state!=="ko"&&A.state!=="fly"&&A.state!=="flee"&&!S.friend){A.fleeT=rand(3,6);A.state=S.t==="bird"&&!S.swim&&!S.wader?"fly":"flee";if(Math.random()<0.5)aniSound(S.snd,clamp01(1-d/30));}
    // cri de temps en temps
    A.snd-=dt;if(A.snd<=0){A.snd=rand(8,25);if(S.snd&&d<30)aniSound(S.snd,clamp01(1-d/30)*0.8);}
    let speed=0;
    switch(A.state){
      case "idle":case "walk":{
        if(A.t<=0){if(A.state==="idle"&&Math.random()<0.55){A.state="walk";A.t=rand(3,8);for(let k=0;k<6;k++){const tx=A.herd.x+(Math.random()-0.5)*A.herd.rad*2,tz=A.herd.z+(Math.random()-0.5)*A.herd.rad*2;if(aniOk(S,tx,tz)){A.tx=tx;A.tz=tz;break;}}}else{A.state="idle";A.t=rand(3,9);}}
        if(S.friend&&d<14&&d>2.2){A.tx=px;A.tz=pz;A.state="walk";A.t=1;}
        if(A.state==="walk"){const tx=A.tx-A.x,tz=A.tz-A.z,td=Math.hypot(tx,tz);if(td<0.6){A.state="idle";A.t=rand(3,8);}else{A.yaw=lerpAngleRad(A.yaw,Math.atan2(tx,tz),dt*2.5);speed=S.walk*(S.friend&&d>6?3:1);}}
        break;}
      case "flee":{A.fleeT-=dt;if(A.fleeT<=0){A.state="idle";A.t=rand(2,5);break;}const away=Math.atan2(dx||0.01,dz||0.01);A.yaw=lerpAngleRad(A.yaw,away,dt*5);speed=S.run;break;}
      case "ko":{if(A.t<=0){A.state="flee";A.fleeT=4;A.hits=0;}break;}
      case "fly":{ // décolle, s'éloigne, se repose plus loin
        A.fleeT=(A.fleeT||5)-dt;const g=groundAt(A.x,A.z);A.y=lerp(A.y,g+(A.fleeT>1?7+Math.sin(A.ph)*1.5:0.05),dt*(A.fleeT>1?1.5:2.5));const away=Math.atan2(dx||0.01,dz||0.01);A.yaw=lerpAngleRad(A.yaw,S.flyer?A.yaw+Math.sin(A.ph*0.5)*0.8:away,dt*2);speed=S.flyer?5:S.run*2;
        if(!S.flyer&&A.fleeT<=0&&A.y<g+0.3){A.state="idle";A.t=rand(2,6);A.herd.x=A.x;A.herd.z=A.z;}
        if(S.flyer){const hx=A.x-A.herd.x,hz=A.z-A.herd.z;if(Math.hypot(hx,hz)>25)A.yaw=lerpAngleRad(A.yaw,Math.atan2(-hx,-hz),dt*1.5);}break;}
      case "circle":{const C=A.circle;C.a=(C.a||Math.random()*6.28)+C.w*dt;A.x=C.cx+Math.cos(C.a)*C.r;A.z=C.cz+Math.sin(C.a)*C.r;A.yaw=Math.atan2(-Math.sin(C.a)*Math.sign(C.w),Math.cos(C.a)*Math.sign(C.w));A.y=groundAt(C.cx,C.cz)+30+Math.sin(A.ph*0.3)*4;break;}
      case "swarm":{A.root.position.set(A.herd.x+Math.sin(A.ph*0.7)*3,groundAt(A.herd.x,A.herd.z)+0.8+Math.sin(A.ph*1.3)*0.3,A.herd.z+Math.cos(A.ph*0.5)*3);const P=A.swarm.geometry.attributes.position;
        if(!A.base){A.base=Float32Array.from(P.array);}const n=P.count/36|0;for(let i=0;i<n;i++){const ox=Math.sin(A.ph*2+i*1.7)*0.9,oy=Math.sin(A.ph*3+i)*0.3+(i%2?Math.sin(A.ph*25+i)*0.03:0),oz=Math.cos(A.ph*1.7+i*2.3)*0.9;for(let v=i*36;v<i*36+36;v++)P.setXYZ(v,A.base[v*3]+ox,A.base[v*3+1]+oy,A.base[v*3+2]+oz);}P.needsUpdate=true;continue;}
      case "swim":{ // dauphins : sauts en arc
        A.t-=dt;const T=3.2,k=(A.ph%T)/T;A.yaw+=dt*0.25;speed=S.walk;const jump=k<0.35?Math.sin(k/0.35*Math.PI):0;A.y=WATER_Y-0.9+jump*2.2;A.root.rotation.x=k<0.35?-Math.cos(k/0.35*Math.PI)*0.9:0;if(waterDepth(A.x+Math.sin(A.yaw)*6,A.z+Math.cos(A.yaw)*6)<1.5)A.yaw+=Math.PI*0.6;break;}
    }
    // déplacement + obstacles + eau
    if(speed>0&&A.state!=="circle"){const nx=A.x+Math.sin(A.yaw)*speed*dt,nz=A.z+Math.cos(A.yaw)*speed*dt;
      if(A.state==="fly"||S.t==="fish"||aniOk(S,nx,nz)){A.x=nx;A.z=nz;}else{A.yaw+=Math.PI*0.5+Math.random();if(A.state==="walk"){A.state="idle";A.t=rand(1,3);}}
      if(S.t==="quad"&&A.state!=="fly"){const p=new V3(A.x,0,A.z);pushOutOfObstacles(p,S.W*0.6+0.2);A.x=p.x;A.z=p.z;}}
    // solide : on ne traverse pas les animaux (et ils ne traversent pas les gens)
    if(S.t==="quad"&&A.state!=="fly"){const rr=Math.max(0.35,Math.min(S.L*0.5,0.95));
      for(const w of walkers){const wx=w.root.x-A.x,wz=w.root.z-A.z,wd=Math.hypot(wx,wz),mn=rr+0.3;if(wd<mn&&wd>1e-3){const push=mn-wd;w.root.x+=wx/wd*push*0.6;w.root.z+=wz/wd*push*0.6;A.x-=wx/wd*push*0.4;A.z-=wz/wd*push*0.4;}}
      // le long du corps (animaux longs) : un 2e point
      if(S.L>1.2){const f2x=Math.sin(A.yaw)*S.L*0.32,f2z=Math.cos(A.yaw)*S.L*0.32;for(const sgn of [-1,1]){const cx=A.x+f2x*sgn,cz=A.z+f2z*sgn;const wx=player.root.x-cx,wz=player.root.z-cz,wd=Math.hypot(wx,wz),mn=S.W*0.6+0.3;if(wd<mn&&wd>1e-3&&!drive){player.root.x+=wx/wd*(mn-wd);player.root.z+=wz/wd*(mn-wd);}}}}
    // posture et animation
    const g=groundAt(A.x,A.z);
    if(S.swim){A.y=WATER_Y-0.02+Math.sin(A.ph*1.5)*0.02;}else if(S.t==="quad"||(S.t==="bird"&&A.state!=="fly"&&!S.flyer&&A.state!=="circle")){A.y=S.wader?Math.max(g,WATER_Y-0.6):g;}
    A.root.position.set(A.x,A.y,A.z);
    if(S.t!=="fish")A.root.rotation.set(0,A.yaw,A.state==="ko"?Math.PI/2*0.95:0);else A.root.rotation.y=A.yaw;
    const moving=speed>0.05;
    if(S.t==="quad"){const f=moving?(S.hop?12:speed*3.2+2):0,amp=moving?Math.min(0.7,0.25+speed*0.08):0;
      A.legs.forEach((L,i)=>{L.rotation.x=Math.sin(A.ph*f+((i===0||i===3)?0:Math.PI))*amp*(S.hop?0.5:1);});
      if(A.head){A.head.rotation.x=A.state==="idle"&&!S.crab?lerp(A.head.rotation.x,0.55+Math.sin(A.ph*1.3)*0.08,dt*2):lerp(A.head.rotation.x,0,dt*4);}
      if(S.hop&&moving)A.root.position.y+=Math.abs(Math.sin(A.ph*12))*0.12;}
    else if(S.t==="bird"){const flying=A.state==="fly"||A.state==="circle"||S.flyer;
      A.wings.forEach((W,i)=>{W.rotation.z=(i?-1:1)*(flying?(S.circler?0.15+Math.sin(A.ph*1.5)*0.12:Math.sin(A.ph*16)*0.9):0.05);});
      if(!flying&&A.state==="idle"&&S.ground)A.root.rotation.x=Math.max(0,Math.sin(A.ph*3))*0.5;}
  }
}
function lerpAngleRad(a,b,t){let d=((b-a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;return a+d*Math.min(1,t);}
