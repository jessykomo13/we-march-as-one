// ================================================================ module 14 : carrefours, feux tricolores, feux piétons
// Chaque carrefour (en X-16, Z-16 de sa zone) a 4 poteaux. Cycle de 33 s :
//   avenues (nord-sud) vert 12 s, orange 3 s, tout rouge 1,5 s, puis rues (est-ouest) pareil.
// Un piéton qui traverse une avenue (il marche est-ouest) passe quand les avenues sont au rouge, et inversement.
// Les décalages entre carrefours donnent une « onde verte ».
const G=10,A=3,AR=1,CYCLE=2*G+2*A+2*AR;   // 28 s : attente piéton max ≈ 19 s
function sigPhase(ix,iz){const off=((ix*3+iz*5)%CYCLE+CYCLE)%CYCLE;return (clockT+off)%CYCLE;}
function signal(ix,iz){
  const t=sigPhase(ix,iz);
  const ns=t<G?"g":t<G+A?"a":"r",ew=(t>=G+A+AR&&t<2*G+A+AR)?"g":(t>=2*G+A+AR&&t<2*G+2*A+AR)?"a":"r";
  // feux piétons : marcher le long de x = traverser une avenue -> vert quand les rues ont le vert
  const walkX=ew==="g"?(t<2*G+A+AR-1.5?"go":"end"):"stop",walkZ=ns==="g"?(t<G-1.5?"go":"end"):"stop";
  const left=ew==="g"?2*G+A+AR-t:ns==="g"?G-t:0;
  return {ns,ew,walkX,walkZ,left};
}
// un passage piéton -> son carrefour et son axe
function crossSignal(c){const s=signal(c.ix,c.iz);return c.axis==="x"?s.walkX:s.walkZ;}
// --- lampes : deux InstancedMesh pour toute la ville (une couleur par instance, mise à jour en direct)
const LAMP_MAX=2400,PED_MAX=800;
const lampIM=new THREE.InstancedMesh(new THREE.SphereGeometry(0.085,10,8),new THREE.MeshBasicMaterial({toneMapped:false}),LAMP_MAX);
const pedIM=new THREE.InstancedMesh(new THREE.BoxGeometry(0.2,0.2,0.04),new THREE.MeshBasicMaterial({toneMapped:false}),PED_MAX);
for(const im of [lampIM,pedIM]){im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);im.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(im.count*3),3);im.frustumCulled=false;scene.add(im);}
const lampFree=[...Array(LAMP_MAX).keys()].reverse(),pedFree=[...Array(PED_MAX).keys()].reverse();
const ZERO=new THREE.Matrix4().makeScale(0,0,0);
for(let i=0;i<LAMP_MAX;i++)lampIM.setMatrixAt(i,ZERO);for(let i=0;i<PED_MAX;i++)pedIM.setMatrixAt(i,ZERO);
const lights=new Map(); // clé de zone -> liste de lampes
const COL={r:new THREE.Color(1,0.12,0.08),a:new THREE.Color(1,0.62,0.05),g:new THREE.Color(0.15,1,0.45),off:new THREE.Color(0.08,0.08,0.08),walk:new THREE.Color(0.85,1,0.95),stop:new THREE.Color(1,0.25,0.1)};
WM.stop=new THREE.MeshStandardMaterial({color:0xeeebe2,roughness:0.8,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4});
const lightMat={pole:new THREE.MeshStandardMaterial({color:0x2c3036,roughness:0.6,metalness:0.4}),box:new THREE.MeshStandardMaterial({color:0x1b1d21,roughness:0.7})};
function buildLights(ch,X,Z,g){
  const ix=ch.cx,iz=ch.cz;   // carrefour de cette zone
  const Ix=X-16,Iz=Z-16,L=[];
  const m4=new THREE.Matrix4(),q=new Q(),s=new V3(1,1,1);
  // 4 coins de trottoir autour du carrefour
  for(const [sx,sz] of [[1,1],[-1,1],[1,-1],[-1,-1]]){
    const px=Ix+sx*4.3,pz=Iz+sz*4.3;
    if(!blockOf(px,pz))continue;
    const gy=groundAt(px,pz);
    const pole=new THREE.Mesh(geo("tlPole",()=>new THREE.CylinderGeometry(0.06,0.075,3.3,10)),lightMat.pole);pole.position.set(px,gy+1.65,pz);g.add(pole);
    addObstacle({type:"circle",x:px,z:pz,r:0.12});
    // feu voitures pour chaque axe : tourné vers les voitures qui arrivent
    for(const axis of ["ns","ew"]){
      const fwd=axis==="ns"?new V3(0,0,sz):new V3(sx,0,0),fy=Math.atan2(fwd.x,fwd.z);   // tourné vers les voitures qui arrivent de ce côté
      const head=new THREE.Mesh(geo("tlHead",()=>new THREE.BoxGeometry(0.28,0.82,0.2)),lightMat.box);
      const hx=px,hy=gy+(axis==="ns"?2.85:2.0);head.position.set(hx,hy,pz);head.rotation.y=fy;g.add(head);
      ["r","a","g"].forEach((c,k)=>{const i=lampFree.pop();if(i===undefined)return;
        const p=new V3(hx,hy+0.26-k*0.26,pz).addScaledVector(fwd,0.11);m4.compose(p,q,s);lampIM.setMatrixAt(i,m4);L.push({i,kind:"car",axis,c});});
    }
    // feux piétons : un pour chaque passage qui part de ce coin
    for(const axis of ["x","z"]){
      const fwd=axis==="x"?new V3(-sx,0,0):new V3(0,0,-sz),fy=Math.atan2(fwd.x,fwd.z);   // tourné vers l'autre côté du passage
      const bx=new THREE.Mesh(geo("pedHead",()=>new THREE.BoxGeometry(0.3,0.55,0.18)),lightMat.box);
      const hy=gy+1.25+(axis==="x"?0:0.62);bx.position.set(px,hy,pz).addScaledVector(fwd,0.12);bx.rotation.y=fy;g.add(bx);
      for(const [k,c] of [[0,"stop"],[1,"walk"]]){const i=pedFree.pop();if(i===undefined)continue;
        q.setFromAxisAngle(UP,fy);const p=new V3(px,hy+0.12-k*0.24,pz).addScaledVector(fwd,0.215);m4.compose(p,q,s);pedIM.setMatrixAt(i,m4);q.identity();L.push({i,kind:"ped",axis,c});}
    }
  }
  // marquages : lignes d'arrêt avant les passages, axe central sans traverser le carrefour
  for(const [w,d,x,z] of [[4,0.35,Ix-2,Iz-7.6],[4,0.35,Ix+2,Iz+7.6],[0.35,4,Ix+7.6,Iz-2],[0.35,4,Ix-7.6,Iz+2]])plane(w,d,WM.stop,x,0.018,z,g);
  lights.set(ckey(ch.cx,ch.cz),{ix,iz,L});
  lampIM.instanceMatrix.needsUpdate=true;pedIM.instanceMatrix.needsUpdate=true;
}
function freeLights(ch){
  const E=lights.get(ckey(ch.cx,ch.cz));if(!E)return;
  for(const l of E.L){if(l.kind==="car"){lampIM.setMatrixAt(l.i,ZERO);lampFree.push(l.i);}else{pedIM.setMatrixAt(l.i,ZERO);pedFree.push(l.i);}}
  lights.delete(ckey(ch.cx,ch.cz));lampIM.instanceMatrix.needsUpdate=true;pedIM.instanceMatrix.needsUpdate=true;
}
let lightT=0;
function updateLights(dt){
  lightT-=dt;if(lightT>0)return;lightT=0.1;
  const blink=Math.floor(clockT*2.5)%2===0;
  for(const E of lights.values()){
    const S=signal(E.ix,E.iz);
    for(const l of E.L){
      if(l.kind==="car"){const st=S[l.axis];lampIM.setColorAt(l.i,st===l.c?COL[l.c]:COL.off);}
      else{const st=l.axis==="x"?S.walkX:S.walkZ;const on=l.c==="walk"?st==="go":(st==="stop"||(st==="end"&&blink));pedIM.setColorAt(l.i,on?COL[l.c]:COL.off);}
    }
  }
  lampIM.instanceColor.needsUpdate=true;pedIM.instanceColor.needsUpdate=true;
}
