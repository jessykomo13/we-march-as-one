// ================================================================ traces de pas (sable seulement)
// Une vraie empreinte de semelle (talon, voûte, avant-pied, rainures), gauche et droite en miroir,
// plus profonde en courant. Elles n'apparaissent que sur le sable : bacs à sable, plages (module 16).
const sandMat=new THREE.MeshStandardMaterial({roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
  map:canvasTex(256,256,(g,w,h)=>{const img=g.createImageData(w,h),d=img.data;for(let i=0;i<w*h;i++){const n=Math.random()*0.5+noise((i%w)*0.08,7)*0.5;d[i*4]=208+n*26;d[i*4+1]=184+n*24;d[i*4+2]=134+n*20;d[i*4+3]=255;}g.putImageData(img,0,0);})});
const sandCache=new Map();
function sandOf(cx,cz){
  const k=ckey(cx,cz);let S=sandCache.get(k);if(S)return S;S=[];
  const X=cx*CHUNK,Z=cz*CHUNK,b0=X-12,c0=Z-12,t=chunkType(cx,cz);
  if(t==="plage")S.push({x0:b0,x1:b0+40,z0:c0,z1:c0+32});
  else if(cx===0&&cz===0)S.push({x0:b0+3,x1:b0+10,z0:c0+22,z1:c0+29});           // bac à sable près du départ
  else if(t==="parc"){const q=hash(cx*7.7+cz*1.3)<0.5;S.push(q?{x0:b0+3,x1:b0+10,z0:c0+3,z1:c0+10}:{x0:b0+22,x1:b0+29,z0:c0+22,z1:c0+29});}
  sandCache.set(k,S);return S;
}
function surfaceAt(x,z){
  if(!blockOf(x,z))return "route";
  for(const s of sandOf(Math.round((x-4)/CHUNK),Math.round((z-4)/CHUNK)))if(x>s.x0&&x<s.x1&&z>s.z0&&z<s.z1)return "sable";
  return chunks.get(ckey(Math.round((x-4)/CHUNK),Math.round((z-4)/CHUNK)))?.type==="parc"?"herbe":"dur";
}
function sandMesh(S,g){
  const w=S.x1-S.x0,d=S.z1-S.z0,cx=(S.x0+S.x1)/2,cz=(S.z0+S.z1)/2;
  plane(w,d,sandMat,cx,SIDEWALK+0.006,cz,g,w/3,d/3);
  for(const [bw,bd,x,z] of [[w+0.3,0.15,cx,S.z0],[w+0.3,0.15,cx,S.z1],[0.15,d,S.x0,cz],[0.15,d,S.x1,cz]]){const b=new THREE.Mesh(geo("unitBox",()=>new THREE.BoxGeometry(1,1,1).translate(0,0.5,0)),WM.trunk);b.scale.set(bw,0.16,bd);b.position.set(x,SIDEWALK,z);g.add(b);}
}
// texture de l'empreinte : creux sombre, bourrelet clair autour, rainures de la semelle
const printTex=canvasTex(64,160,(g,w,h)=>{
  g.clearRect(0,0,w,h);
  const sole=(pad)=>{g.beginPath();
    g.ellipse(w/2,h*0.27,w*0.34+pad,h*0.2+pad,0,0,Math.PI*2);   // avant-pied
    g.ellipse(w*0.47,h*0.78,w*0.27+pad,h*0.15+pad,0,0,Math.PI*2); // talon
    g.moveTo(w*0.22-pad,h*0.35);g.lineTo(w*0.3-pad,h*0.72);g.lineTo(w*0.62+pad,h*0.72);g.lineTo(w*0.8+pad,h*0.35);g.closePath();};
  g.fillStyle="rgba(255,244,215,0.55)";sole(4);g.fill();                // sable repoussé sur les bords
  g.fillStyle="rgba(92,70,40,0.75)";sole(0);g.fill();                    // creux
  g.globalCompositeOperation="source-atop";g.fillStyle="rgba(60,44,22,0.55)";
  for(let y=h*0.1;y<h*0.95;y+=7)g.fillRect(0,y,w,2.5);                    // rainures
  g.globalCompositeOperation="source-over";
},false);
const printMat2=new THREE.MeshStandardMaterial({map:printTex,transparent:true,depthWrite:false,roughness:1,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
const PRINT_MAX=320,PRINT_LIFE=45;
const printIM=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),printMat2,PRINT_MAX);
printIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);printIM.count=0;printIM.frustumCulled=false;printIM.receiveShadow=true;
printIM.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(PRINT_MAX*3).fill(1),3);
scene.add(printIM);
const printBorn=new Float32Array(PRINT_MAX).fill(-1e9);let printNext=0;
const _pm=new THREE.Matrix4(),_pq=new Q(),_ps=new V3(),_pp=new V3();
function addFootprint(w,leg,running){
  if(!showPrints||surfaceAt(leg.planted.x,leg.planted.z)!=="sable")return;
  if(camera.position.distanceToSquared(leg.planted)>45*45)return;
  const P=w.P,len=P.footLen*1.08,wid=P.footW*1.25;
  _pq.copy(frame(leg.plantedYaw));
  _pp.copy(leg.planted).add(local(_pq,0,0,P.footFwd*0.7));_pp.y=groundAt(_pp.x,_pp.z)+0.008;
  _ps.set(wid*(leg.side<0?-1:1),1,len*(running?1.12:1));                   // gauche = miroir
  _pm.compose(_pp,_pq,_ps);
  const i=printNext;printNext=(printNext+1)%PRINT_MAX;printIM.count=Math.min(PRINT_MAX,printIM.count+1);
  printIM.setMatrixAt(i,_pm);printBorn[i]=clockT;const dk=running?0.82:1;printIM.setColorAt(i,new THREE.Color(dk,dk,dk));
  printIM.instanceMatrix.needsUpdate=true;printIM.instanceColor.needsUpdate=true;
}
let printFadeT=0;
function updateFootprints(dt){
  printFadeT-=dt;if(printFadeT>0)return;printFadeT=0.5;
  let ch=false;const c=new THREE.Color();
  for(let i=0;i<printIM.count;i++){const age=clockT-printBorn[i];
    if(age>PRINT_LIFE-8){const k=clamp01((age-(PRINT_LIFE-8))/8);c.setScalar(lerp(1,1.45,k));printIM.setColorAt(i,c);ch=true;  // s'efface dans le sable
      if(k>=1){_pm.makeScale(0,0,0);printIM.setMatrixAt(i,_pm);printBorn[i]=1e9;printIM.instanceMatrix.needsUpdate=true;}}}
  if(ch)printIM.instanceColor.needsUpdate=true;
}
