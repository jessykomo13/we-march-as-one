// ================================================================ rig : pilotage d'un squelette Mixamo
function getBone(model,name){return model.getObjectByName("mixamorig"+name)||model.getObjectByName("mixamorig:"+name);}
const tmpQ=new Q();
const wq=o=>o.getWorldQuaternion(new Q()), wp=o=>o.getWorldPosition(new V3());
function setWorldQ(bone,q){
  bone.parent.getWorldQuaternion(tmpQ);
  bone.quaternion.copy(tmpQ.invert().multiply(q));
  bone.updateMatrixWorld(true);
}
function buildRig(gltf){
  const model=gltf.scene;
  // caché jusqu'à sa première pose (sinon une silhouette en T apparaît une image au point 0,0)
  model.visible=false;
  scene.add(model);
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
  const tclip=(gltf.animations||[]).find(a=>/t-?pose/i.test(a.name));
  if(tclip){const mixer=new THREE.AnimationMixer(model);const ac=mixer.clipAction(tclip);ac.play();mixer.update(0);ac.stop();}
  model.updateMatrixWorld(true);
  const names=["Hips","Spine","Spine1","Spine2","Neck","Head","LeftShoulder","LeftArm","LeftForeArm","LeftHand","RightShoulder","RightArm","RightForeArm","RightHand","LeftUpLeg","LeftLeg","LeftFoot","LeftToeBase","LeftToe_End","RightUpLeg","RightLeg","RightFoot","RightToeBase","RightToe_End"];
  const b={};for(const n of names){b[n]=getBone(model,n);if(!b[n]){scene.remove(model);throw new Error("os manquant "+n);}}
  const rest={};for(const n of names)rest[n]={q:wq(b[n]),p:wp(b[n])};
  const right=new V3().subVectors(rest.RightUpLeg.p,rest.LeftUpLeg.p);right.y=0;
  const fwd=new V3().crossVectors(UP,right).normalize();
  const restYaw=Math.atan2(fwd.x,-fwd.z)/D2R;
  const RestInv=frame(restYaw).invert(), restFwd=fwdOf(restYaw);
  const groundY=model.userData.groundY??Math.min(rest.LeftToe_End.p.y,rest.RightToe_End.p.y,rest.LeftFoot.p.y);
  const pr={};
  pr.thigh=rest.LeftUpLeg.p.distanceTo(rest.LeftLeg.p);
  pr.shin=rest.LeftLeg.p.distanceTo(rest.LeftFoot.p);
  pr.ankleHeight=rest.LeftFoot.p.y-groundY;
  pr.hipWidth=rest.LeftUpLeg.p.distanceTo(rest.RightUpLeg.p)/2;
  pr.stanceHalfWidth=pr.hipWidth*1.15;
  const toeAhead=hdist(rest.LeftFoot.p,rest.LeftToe_End.p);
  pr.footLen=toeAhead*1.4;pr.footFwd=toeAhead*0.4;pr.footW=pr.hipWidth*1.05;
  pr.footClear=pr.hipWidth*1.5;
  pr.ballDist=hdist(rest.LeftFoot.p,rest.LeftToeBase.p);pr.heelDist=toeAhead*0.32;
  const scale=(pr.thigh+pr.shin)/0.91;
  for(const k of ["walkThr","runThr","walkH","runH","idleH","latJitter","swayWalk","swayRun"])pr[k]=P0[k]*scale;
  pr.walkSpeed=P0.walkSpeed*Math.sqrt(scale);pr.runSpeed=P0.runSpeed*Math.sqrt(scale);pr.jogSpeed=P0.jogSpeed*Math.sqrt(scale);
  const hipMid=new V3().addVectors(rest.LeftUpLeg.p,rest.RightUpLeg.p).multiplyScalar(0.5);
  const hipsOffset=new V3().subVectors(rest.Hips.p,hipMid).sub(new V3(0,0,0));
  const limb=(bone,child)=>({bone,restQ:rest[bone].q,restBasis:basis(new V3().subVectors(rest[child].p,rest[bone].p),restFwd)});
  let mouth=null;
  if(model.userData.mouth){
    const M=model.userData.mouth,hb=b.Head;
    const m=new THREE.Mesh(new THREE.SphereGeometry(1,16,8),new THREE.MeshStandardMaterial({color:new THREE.Color(0.16,0.05,0.05),roughness:0.6}));
    hb.add(m);m.position.copy(hb.worldToLocal(M.pos.clone()));
    const ws=hb.getWorldScale(new V3()).x||1;m.scale.set(M.w/ws,0.0005/ws,0.006/ws);m.userData.base={w:M.w/ws,h:M.h/ws,d:0.006/ws};m.visible=false;
    mouth=m;
  }
  return {mouth,model,b,rest,RestInv,hipsOffset,pr,neckY:rest.Neck.p.y-groundY,
    legs:{"-1":{up:limb("LeftUpLeg","LeftLeg"),lo:limb("LeftLeg","LeftFoot"),foot:"LeftFoot",toe:"LeftToeBase"},
          "1":{up:limb("RightUpLeg","RightLeg"),lo:limb("RightLeg","RightFoot"),foot:"RightFoot",toe:"RightToeBase"}},
    arms:{"-1":{up:limb("LeftArm","LeftForeArm"),lo:limb("LeftForeArm","LeftHand"),hand:"LeftHand",sh:"LeftShoulder"},
          "1":{up:limb("RightArm","RightForeArm"),lo:limb("RightForeArm","RightHand"),hand:"RightHand",sh:"RightShoulder"}}};
}
function solveTwoBone(rootP,target,a,b,pole){
  const d=new V3().subVectors(target,rootP);let dist=d.length();
  const dir=dist>1e-5?d.divideScalar(dist):new V3(0,-1,0);
  dist=clamp(dist,Math.abs(a-b)+1e-3,a+b-1e-3);
  const x=(a*a-b*b+dist*dist)/(2*dist),h=Math.sqrt(Math.max(0,a*a-x*x));
  let bend=pole.clone().addScaledVector(dir,-pole.dot(dir));
  if(bend.lengthSq()<1e-6)bend=new V3(0,0,-1);
  bend.normalize();
  return {knee:rootP.clone().addScaledVector(dir,x).addScaledVector(bend,h),end:rootP.clone().addScaledVector(dir,dist)};
}

