// ================================================================ moteur de monde (module 9) : zones chargées autour du joueur
// Le monde fait 600 m × 600 m, découpé en zones de 40 m. Chaque zone a une rue sur deux de ses bords
// (ça forme un quadrillage) et un îlot de 32 m : place, parc ou immeubles. Une zone est générée à partir
// de ses coordonnées : elle est toujours identique quand on revient. On garde les zones à moins de 3 cases
// du joueur, on décharge au-delà de 4, et on n'en construit qu'une par image pour éviter les saccades.
// Niveaux de détail : les bâtiments restent visibles de loin, le mobilier (bancs, lampadaires…) seulement
// dans les zones voisines.
let LOAD_R=3,UNLOAD_R=4;const DETAIL_R=1,NCH=14; // zones de -14 à 14 (la colonne 14 est la plage)
const chunks=new Map(),buildQueue=[];
const ckey=(cx,cz)=>cx+","+cz;
const worldStats={built:0,unloaded:0,lastMs:0,maxMs:0,queue:0};
// ---------- relief (module 10) : trottoirs surélevés, terrasses, escaliers, rampes
const SIDEWALK=0.12,STEP_UP=0.4,FALL_DROP=0.45;
function blockOf(x,z){
  if(Math.abs(x)>WORLD||z>WORLD||z<-WORLD_N)return null;
  const i=Math.floor((x+12)/CHUNK),j=Math.floor((z+12)/CHUNK),lx=x+12-i*CHUNK,lz=z+12-j*CHUNK;
  return (lx<=32||(i===14&&lx<=40))&&lz<=32&&(inCity(i,j)||inTown(i,j))?{i,j,lx,lz}:null;
}
const reliefCache=new Map();
function reliefOf(cx,cz){
  const k=ckey(cx,cz);let R=reliefCache.get(k);if(R)return R;R=[];
  if(chunkType(cx,cz)==="place"&&(cx===0&&cz===0||hash(cx*3.7+cz*11.3+0.5)<0.25)){
    const X=cx*CHUNK,Z=cz*CHUNK,b0=X-12,c0=Z-12,mir=!(cx===0&&cz===0)&&hash(cx*5.1-cz*2.3)<0.5;
    const mx=(a,b)=>mir?[2*(X+4)-b,2*(X+4)-a]:[a,b],dx=d=>mir?-d:d;
    const box=(a,b,z0,z1,h)=>{const [x0,x1]=mx(b0+a,b0+b);R.push({kind:"box",x0,x1,z0:c0+z0,z1:c0+z1,h});};
    const run=(kind,a,b,z0,z1,h0,h1,axis,dir,n)=>{const [x0,x1]=mx(b0+a,b0+b);R.push({kind,x0,x1,z0:c0+z0,z1:c0+z1,h0,h1,axis,dir:axis==="x"?dx(dir):dir,n});};
    box(18,28,18,26,1.2);                                   // terrasse
    run("stairs",15.2,18,19,22,SIDEWALK,1.2,"x",1,6);       // escalier vers la terrasse
    run("ramp",25,27,10.8,18,SIDEWALK,1.2,"z",1,0);          // rampe d'accès
    box(18,23,27.2,31,3.0);                                 // belvédère
    run("stairs",18.6,20.6,23.6,27.2,1.2,3.0,"z",1,10);     // escalier terrasse -> belvédère
  }
  reliefCache.set(k,R);return R;
}
function featureH(f,x,z){
  if(x<f.x0||x>f.x1||z<f.z0||z>f.z1)return -1;
  if(f.kind==="box")return f.h;
  const t0=f.axis==="x"?(x-f.x0)/(f.x1-f.x0):(z-f.z0)/(f.z1-f.z0),t=clamp01(f.dir>0?t0:1-t0);
  if(f.kind==="ramp")return f.h0+(f.h1-f.h0)*t;
  return f.h0+(f.h1-f.h0)*(Math.min(f.n-1,Math.floor(t*f.n))+1)/f.n;
}
const reliefAt=(x,z)=>reliefOf(Math.round((x-4)/CHUNK),Math.round((z-4)/CHUNK));
// hauteur du sol à un endroit : 0 sur la route, 12 cm sur les trottoirs, plus sur les terrasses et escaliers
function groundAt(x,z){
  if(x>SEA_X)return Math.max(seaFloor(x,z),seaFeatureH(x,z));
  const b=blockOf(x,z);if(!b){if(x>578&&x<=588&&z>-WORLD&&z<WORLD){const f=seaFeatureH(x,z);if(f>0)return f;}return 0;}
  let h=SIDEWALK;if(x>578){const f=seaFeatureH(x,z);if(f>h)h=f;}
  for(const f of reliefAt(x,z)){const v=featureH(f,x,z);if(v>h)h=v;}
  return h;
}
// les passants ne vont pas dans les jardins, entrepôts, cours d'immeubles : seulement là où c'est public
function publicOK(x,z){const ch=chunks.get(ckey(Math.round((x-4)/CHUNK),Math.round((z-4)/CHUNK)));if(!ch||!ch.pub)return true;return ch.pub.some(([a,b,c,d])=>x>a+0.4&&x<c-0.4&&z>b+0.4&&z<d-0.4);}
function onRelief(x,z,m=1.2){if(!blockOf(x,z))return false;for(const f of reliefAt(x,z))if(x>f.x0-m&&x<f.x1+m&&z>f.z0-m&&z<f.z1+m)return true;return false;}
// ---------- passages piétons : les passants changent d'îlot en traversant aux passages
function crossings(b,di,dj){
  // points de départ / arrivée (0,8 m avant la bordure) pour aller de l'îlot b vers l'îlot voisin
  const X0=b.i*CHUNK-12,Z0=b.j*CHUNK-12,out=[];
  const C=(a,b,axis)=>{const m=a.clone().add(b).multiplyScalar(0.5);a.xing={ix:Math.round((m.x+16)/CHUNK),iz:Math.round((m.z+16)/CHUNK),axis};return [a,b];};
  if(di){const xa=di>0?X0+32-0.8:X0+0.8,xb=di>0?X0+40+0.8:X0-8-0.8;for(const z of [Z0+1.5,Z0+30.5])out.push(C(new V3(xa,0,z),new V3(xb,0,z),"x"));}
  else{const za=dj>0?Z0+32-0.8:Z0+0.8,zb=dj>0?Z0+40+0.8:Z0-8-0.8;for(const x of [X0+1.5,X0+30.5])out.push(C(new V3(x,0,za),new V3(x,0,zb),"z"));}
  return out;
}
function routeTo(from,to){
  const a=blockOf(from.x,from.z),b=blockOf(to.x,to.z);
  if(!a&&b){ // sur la chaussée : on remonte d'abord sur le trottoir le plus proche
    const i=Math.round((from.x-4)/CHUNK),j=Math.round((from.z-4)/CHUNK),sx=clamp(from.x,i*CHUNK-12+0.8,i*CHUNK+20-0.8),sz=clamp(from.z,j*CHUNK-12+0.8,j*CHUNK+20-0.8);
    const s=new V3(sx,0,sz);return blockOf(sx,sz)?[s,...routeTo(s,to)]:[to.clone()];
  }
  if(!a||!b||(a.i===b.i&&a.j===b.j))return [to.clone()];
  const path=[];let cur={i:a.i,j:a.j},pos=from.clone();
  for(let k=0;k<4&&(cur.i!==b.i||cur.j!==b.j);k++){
    const di=Math.sign(b.i-cur.i),dj=di?0:Math.sign(b.j-cur.j);
    let best=null,bs=1e9;for(const [p,q] of crossings(cur,di,dj)){const s=hdist(pos,p)+hdist(q,to);if(s<bs){bs=s;best=[p,q];}}
    best[0].wait=true;path.push(best[0],best[1]);pos=best[1];cur={i:cur.i+di,j:cur.j+dj};
  }
  path.push(to.clone());return path;
}
// ---------- matériaux
function canvasTex(w,h,draw,rep=true){
  const c=document.createElement("canvas");c.width=w;c.height=h;draw(c.getContext("2d"),w,h);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  if(rep)t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
function speckle(g,w,h,base,amp,seed){
  const img=g.createImageData(w,h),d=img.data;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const n=(noise(x*0.05,seed)+noise(y*0.05,seed+1))*0.3+Math.random()*0.5;const i=(y*w+x)*4;
    d[i]=base[0]+n*amp;d[i+1]=base[1]+n*amp;d[i+2]=base[2]+n*amp;d[i+3]=255;}
  g.putImageData(img,0,0);
}
const WM={
  asphalt:new THREE.MeshStandardMaterial({roughness:0.96,map:canvasTex(256,256,(g,w,h)=>speckle(g,w,h,[52,54,58],34,11))}),
  pave:new THREE.MeshStandardMaterial({roughness:0.92,map:canvasTex(256,256,(g,w,h)=>{speckle(g,w,h,[128,126,121],40,21);g.strokeStyle="rgba(70,70,68,.45)";g.lineWidth=2;g.strokeRect(1,1,w-2,h-2);g.beginPath();g.moveTo(w/2,0);g.lineTo(w/2,h);g.moveTo(0,h/2);g.lineTo(w,h/2);g.stroke();})}),
  grass:new THREE.MeshStandardMaterial({roughness:1,map:canvasTex(256,256,(g,w,h)=>{const img=g.createImageData(w,h),d=img.data;for(let i=0;i<w*h;i++){const n=Math.random();d[i*4]=62+n*30;d[i*4+1]=96+n*40;d[i*4+2]=46+n*18;d[i*4+3]=255;}g.putImageData(img,0,0);})}),
  line:new THREE.MeshStandardMaterial({roughness:0.8,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4,map:canvasTex(64,16,(g,w,h)=>{g.clearRect(0,0,w,h);g.fillStyle="#e9e6dc";g.fillRect(0,4,40,8);})}),
  zebra:new THREE.MeshStandardMaterial({roughness:0.8,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4,map:canvasTex(64,16,(g,w,h)=>{g.clearRect(0,0,w,h);g.fillStyle="#f1efe8";g.fillRect(0,0,34,h);})}),
  curb:new THREE.MeshStandardMaterial({color:0xb3afa6,roughness:0.9}),
  concrete:new THREE.MeshStandardMaterial({color:0xc9c4ba,roughness:0.9}),
  roof:new THREE.MeshStandardMaterial({color:0x6f6b66,roughness:0.95}),
  trunk:new THREE.MeshStandardMaterial({color:0x6b4a33,roughness:0.95}),
  palm:new THREE.MeshStandardMaterial({color:0x4e7a3a,roughness:0.85,side:THREE.DoubleSide})
};
for(const k of ["pave","grass"])Object.assign(WM[k],{polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
// façades : un étage de 3,2 m et deux fenêtres pour 4 m de large ; couleurs pastel façon front de mer
const FACADES=[["#efe3cf","#d9c6a8"],["#f4f1ea","#d8d4cc"],["#f2c9c2","#dba99f"],["#bfe0e4","#93c3c9"],["#d7d9dc","#aeb2b8"],["#f3e1a6","#d7c07a"]].map(([wall,trim],k)=>
  new THREE.MeshStandardMaterial({roughness:0.85,map:canvasTex(128,102,(g,w,h)=>{
    g.fillStyle=wall;g.fillRect(0,0,w,h);g.fillStyle=trim;g.fillRect(0,h-8,w,8);
    for(const x of [14,74]){g.fillStyle="#2c3a46";g.fillRect(x,22,40,52);g.fillStyle="rgba(170,200,225,.55)";g.fillRect(x+3,25,16,46);g.fillRect(x+21,25,16,46);
      g.fillStyle=trim;g.fillRect(x-3,74,46,5);if(k%2)g.fillRect(x-3,18,46,4);}
  })}));
function scaledUV(geo,su,sv){const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*su,uv.getY(i)*sv);return geo;}
function plane(w,d,mat,x,y,z,g,su=1,sv=1,ry=0){const m=new THREE.Mesh(scaledUV(new THREE.PlaneGeometry(w,d).rotateX(-Math.PI/2),su,sv),mat);m.position.set(x,y,z);m.rotation.y=ry;m.receiveShadow=true;g.add(m);return m;}
// fusionne tous les meshes d'un groupe par matériau : quelques appels de rendu par zone au lieu de centaines
function bake(group,cast=true){
  group.updateMatrixWorld(true);
  const byMat=new Map(),old=[];
  const walk=(o,fn)=>{if(o.userData.keep)return;fn(o);for(const c of o.children)walk(c,fn);};
  walk(group,o=>{if(!o.isMesh)return;old.push(o);
    let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
    for(const k of Object.keys(g.attributes))if(k!=="position"&&k!=="normal"&&k!=="uv")g.deleteAttribute(k);
    if(!g.attributes.uv)g.setAttribute("uv",new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
    g.applyMatrix4(o.matrixWorld);
    const L=byMat.get(o.material)||[];L.push(g);byMat.set(o.material,L);
    if(!o.geometry.userData.shared)o.geometry.dispose();
  });
  for(const o of old)o.removeFromParent();
  const prune=o=>{for(const c of [...o.children]){if(c.userData.keep)continue;prune(c);if(c.isGroup&&!c.children.length)o.remove(c);}};prune(group);
  for(const [mat,L] of byMat){const m=new THREE.Mesh(mergeGeometries(L),mat);L.forEach(x=>x.dispose());m.castShadow=cast&&mat!==WM.line&&mat!==WM.zebra;m.receiveShadow=true;group.add(m);}
}
function reliefMesh(F,g){
  const w=F.x1-F.x0,d=F.z1-F.z0;
  const blk=(x0,x1,z0,z1,h,top=true)=>{const m=new THREE.Mesh(geo("unitBox",()=>new THREE.BoxGeometry(1,1,1).translate(0,0.5,0)),WM.concrete);m.scale.set(x1-x0,h,z1-z0);m.position.set((x0+x1)/2,0,(z0+z1)/2);g.add(m);
    if(top)plane(x1-x0,z1-z0,WM.pave,(x0+x1)/2,h+0.004,(z0+z1)/2,g,(x1-x0)/2,(z1-z0)/2);};
  if(F.kind==="box"){blk(F.x0,F.x1,F.z0,F.z1,F.h);return;}
  if(F.kind==="stairs"){
    for(let k=0;k<F.n;k++){const h=F.h0+(F.h1-F.h0)*(k+1)/F.n,a=k/F.n,b=(k+1)/F.n;
      const lo=F.dir>0?a:1-b,hi=F.dir>0?b:1-a;
      if(F.axis==="x")blk(F.x0+w*lo,F.x0+w*hi,F.z0,F.z1,h,false);else blk(F.x0,F.x1,F.z0+d*lo,F.z0+d*hi,h,false);}
    return;
  }
  // rampe : un prisme en biseau
  const L=F.axis==="x"?w:d,W=F.axis==="x"?d:w;
  const sh=new THREE.Shape([new THREE.Vector2(0,0),new THREE.Vector2(L,0),new THREE.Vector2(L,F.h1),new THREE.Vector2(0,F.h0)]);
  const gm=new THREE.ExtrudeGeometry(sh,{depth:W,bevelEnabled:false});
  const rot=F.axis==="x"?(F.dir>0?0:Math.PI):(F.dir>0?-Math.PI/2:Math.PI/2);gm.rotateY(rot);gm.computeBoundingBox();
  gm.translate(F.x0-gm.boundingBox.min.x,0,F.z0-gm.boundingBox.min.z);
  g.add(new THREE.Mesh(gm,WM.pave));
}
// --- un bâtiment : 4 murs avec fenêtres + un toit plat, obstacle haut (bloque la vue)
function building(x0,z0,x1,z1,h,mat,g){
  const w=x1-x0,d=z1-z0,cx=(x0+x1)/2,cz=(z0+z1)/2;
  const wall=(len,ry,px,pz)=>{const m=new THREE.Mesh(scaledUV(new THREE.PlaneGeometry(len,h),len/4,h/3.2),mat);m.position.set(px,h/2,pz);m.rotation.y=ry;g.add(m);};
  wall(w,0,cx,z1);wall(w,Math.PI,cx,z0);wall(d,Math.PI/2,x1,cz);wall(d,-Math.PI/2,x0,cz);
  plane(w,d,WM.roof,cx,h,cz,g);
  const top=new THREE.Mesh(geo("parapet",()=>new THREE.BoxGeometry(1,0.5,1)),WM.curb);top.scale.set(w+0.2,1,d+0.2);top.position.set(cx,h+0.05,cz);g.add(top);
  addObstacle({type:"box",x:cx,z:cz,hx:w/2,hz:d/2,tall:true,bld:true});
}
function tree(x,z,s,g,palm){
  const tg=new THREE.Group();tg.position.y=groundAt(x,z);g.add(tg);g=tg;
  if(palm){
    const t=new THREE.Mesh(geo("palmT",()=>new THREE.CylinderGeometry(0.12,0.2,6,8)),WM.trunk);t.position.set(x,3*s,z);t.scale.setScalar(s);g.add(t);
    for(let i=0;i<7;i++){const f=new THREE.Mesh(geo("frond",()=>new THREE.PlaneGeometry(0.7,3.2).translate(0,1.6,0)),WM.palm);f.position.set(x,6*s,z);f.rotation.set(1.1,i/7*Math.PI*2,0,"YXZ");f.scale.setScalar(s);g.add(f);}
  }else{
    const t=new THREE.Mesh(geo("treeT",()=>new THREE.CylinderGeometry(0.14,0.22,2.6,9)),WM.trunk);t.position.set(x,1.3*s,z);t.scale.setScalar(s);g.add(t);
    for(const [ox,oy,oz,r,m] of [[0,3.2,0,1.5,OM.leaf],[0.7,2.8,0.3,1.0,OM.leaf2],[-0.6,3.6,-0.3,1.0,OM.leaf2]]){const l=new THREE.Mesh(geo("leafI"+r,()=>new THREE.IcosahedronGeometry(r,1)),m);l.position.set(x+ox*s,oy*s,z+oz*s);l.scale.setScalar(s);g.add(l);}
  }
  addObstacle({type:"circle",x,z,r:0.3*s,tall:true});
}
function buildChunk(cx,cz){
  const t0=performance.now();
  const X=cx*CHUNK,Z=cz*CHUNK,type=chunkType(cx,cz),r=mulberry((cx*73856093)^(cz*19349663)^0x5bd1e995);
  const base=new THREE.Group(),mid=new THREE.Group(),detail=new THREE.Group();
  const bx0=X-12,bz0=Z-12,bw=type==="plage"?40:32,bx1=bx0+bw,bz1=Z+20,bcx=bx0+bw/2,bcz=Z+4;
  const ch={cx,cz,type,base,mid,detail,obs:[],spots:[],cams:[],bx0,bz0,bs:32,bw,pub:publicRects(type,bx0,bz0),hoops:[],courts:[],balls:[],hoopers:[]};
  obsSink=ch.obs;spotSink=ch.spots;ch.amb=[];ambSink=ch.amb;
  if(isCountry(cx,cz)){ // campagne : pas d'îlots ni de rues
    buildCountry(ch,X,Z,r,base,mid,detail);obsSink=null;spotSink=null;ambSink=null;bake(base);bake(mid);bake(detail);scene.add(base,mid,detail);chunks.set(ckey(cx,cz),ch);
    worldStats.built++;worldStats.lastMs=performance.now()-t0;worldStats.maxMs=Math.max(worldStats.maxMs,worldStats.lastMs);return ch;}
  // îlot surélevé + bordures
  const ground=type==="parc"||type==="maisons"||type==="jardin"||type==="etang_urbain"?WM.grass:type==="plage"?sandMat:type==="terrain_vague"?CMP.dirt:WM.pave;
  plane(bw,32,ground,bcx,SIDEWALK,bcz,base,bw/(type==="plage"?3:2),16);
  if(type==="maisons"||type==="jardin"||type==="terrain_vague"){for(const [w,d,x,z] of [[32,2.6,bcx,bz0+1.3],[32,2.6,bcx,bz1-1.3],[2.6,26.8,bx0+1.3,bcz],[2.6,26.8,bx1-1.3,bcz]])plane(w,d,WM.pave,x,SIDEWALK+0.004,z,base,w/2,d/2);}
  if(type==="parc")for(const [w,d] of [[32,3.2],[3.2,32]])plane(w,d,WM.pave,bcx,SIDEWALK+0.008,bcz,base,w/2,d/2);
  for(const [w,d,x,z] of [[bw,0.3,bcx,bz0+0.15],[bw,0.3,bcx,bz1-0.15],[0.3,32,bx0+0.15,bcz],[0.3,32,bx1-0.15,bcz]]){if(type==="plage"&&x>bx0+1)continue;const c=new THREE.Mesh(geo("curb",()=>new THREE.BoxGeometry(1,1,1)),WM.curb);c.scale.set(w,SIDEWALK+0.01,d);c.position.set(x,(SIDEWALK+0.01)/2,z);base.add(c);}
  // rues : axe central entre carrefours, passages piétons, feux
  plane(24,0.16,WM.line,X+4,0.015,Z-16,base,6,1);plane(24,0.16,WM.line,X-16,0.015,Z+4,base,6,1,Math.PI/2);
  for(const s of [-1,1]){plane(8,3,WM.zebra,X-16,0.02,Z-16+s*5.5,base,8,1);plane(8,3,WM.zebra,X-16+s*5.5,0.02,Z-16,base,8,1,Math.PI/2);}
  buildLights(ch,X,Z,base);
  for(const F of reliefOf(cx,cz))reliefMesh(F,base);
  const sand=sandOf(cx,cz);if(type!=="plage")for(const S of sand)sandMesh(S,base);
  const onSand=(x,z,m=1.2)=>type!=="plage"&&sand.some(s=>x>s.x0-m&&x<s.x1+m&&z>s.z0-m&&z<s.z1+m);
  const placed=[];
  const prop=(kind,x,z,rot)=>{if(placed.some(q=>Math.hypot(q[0]-x,q[1]-z)<2.2)||onRelief(x,z,1.4)||onSand(x,z))return false;placed.push([x,z]);makeObstacle(kind,x,z,rot,detail,r);return true;};
  const camAt=(x,z,yaw)=>{const c=makeCam(x,z,yaw,detail);c.g.userData.keep=true;ch.cams.push(c);};
  ch.hoops=[];ch.courts=[];ch.balls=[];ch.hoopers=[];hoopSink=ch.hoops;courtSink=ch.courts;ch.shops=[];shopSink=ch.shops;
  buildBlock(ch,{type,cx,cz,X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop,camAt,onSand});
  // bord du monde : une forêt de pins ferme la ville
  if(Math.abs(cx)===14&&cx<0||Math.abs(cz)===14){
    const edgeX=cx===-14?[X-22,X-38]:null,edgeZ=cz===-14?[Z-22,Z-38]:cz===14?[Z+30,Z+38]:null;
    for(let k=0;k<10;k++){if(edgeX)treeAt(edgeX[0]-r()*16,Z-20+k*4+r()*2,"conifer",1+r()*0.6,base,0);const tx=X-20+k*4+r()*2;if(edgeZ&&cx<14&&Math.abs(tx-HWY_X)>14)treeAt(tx,edgeZ[0]+(cz>0?r()*8:-r()*16),"conifer",1+r()*0.6,base,0);}
  }
  obsSink=null;spotSink=null;hoopSink=null;courtSink=null;shopSink=null;ambSink=null;
  bake(base);bake(mid);bake(detail);
  scene.add(base,mid,detail);
  chunks.set(ckey(cx,cz),ch);
  worldStats.built++;worldStats.lastMs=performance.now()-t0;worldStats.maxMs=Math.max(worldStats.maxMs,worldStats.lastMs);
  return ch;
}
function unloadChunk(ch){
  for(const o of ch.obs)removeObstacle(o);
  for(const s of ch.spots){const i=benchSpots.indexOf(s);if(i>=0)benchSpots.splice(i,1);if(s.taken&&s.taken!==player)s.taken.standUp&&s.taken.standUp();}
  for(const c of ch.cams){const i=cams.indexOf(c);if(i>=0)cams.splice(i,1);}
  freeLights(ch);freeChunkBasket(ch);if(ch.shops)dropShops(ch.shops);if(ch.amb)dropAmb(ch.amb);
  for(const g of [ch.base,ch.mid,ch.detail]){g.traverse(o=>{if(o.isMesh&&!o.geometry.userData.shared)o.geometry.dispose();});scene.remove(g);}
  chunks.delete(ckey(ch.cx,ch.cz));worldStats.unloaded++;
}
const chunkOf=v=>Math.round(v/CHUNK);
function chunkLoadedAt(p){return chunks.has(ckey(chunkOf(p.x),chunkOf(p.z)));}
function streamWorld(sync){
  const pcx=chunkOf(player.root.x),pcz=chunkOf(player.root.z);
  for(const ch of [...chunks.values()]){const d=Math.max(Math.abs(ch.cx-pcx),Math.abs(ch.cz-pcz));if(d>UNLOAD_R)unloadChunk(ch);else{ch.detail.visible=d<=DETAIL_R;ch.mid.visible=d<=DETAIL_R+1;}}
  buildQueue.length=0;
  for(let i=-LOAD_R;i<=LOAD_R;i++)for(let j=-LOAD_R;j<=LOAD_R;j++){
    const cx=pcx+i,cz=pcz+j;if(!chunkExists(cx,cz)||chunks.has(ckey(cx,cz)))continue;buildQueue.push([cx,cz,Math.max(Math.abs(i),Math.abs(j))+Math.hypot(i,j)*0.01]);}
  buildQueue.sort((a,b)=>a[2]-b[2]);worldStats.queue=buildQueue.length;
  const n=sync?buildQueue.length:Math.min(1,buildQueue.length);
  for(let k=0;k<n;k++){const [cx,cz]=buildQueue[k];const ch=buildChunk(cx,cz),dd=Math.max(Math.abs(cx-pcx),Math.abs(cz-pcz));ch.detail.visible=dd<=DETAIL_R;ch.mid.visible=dd<=DETAIL_R+1;}
}
// sol : asphalte partout (les rues), et une bordure de terrain au-delà de la ville
{
  const a=new THREE.Mesh(scaledUV(new THREE.PlaneGeometry(WORLD*2,WORLD*2).rotateX(-Math.PI/2),WORLD/2,WORLD/2),WM.asphalt);a.receiveShadow=true;scene.add(a);
  const out=new THREE.Mesh(new THREE.PlaneGeometry(5000,5000).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({color:0x6f7a62,roughness:1}));out.position.y=-0.6;scene.add(out);
}
