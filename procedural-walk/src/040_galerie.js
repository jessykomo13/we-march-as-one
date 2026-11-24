// ================================================================ galerie (module 2) : inspecter les personnages de près
let galleryOn=false,gallery=[],galFocus=-1;
const GAL_C=new V3(0,0,-2000);
const galEl=document.getElementById("gallery");
class StillBrain{update(w){w.wish.set(0,0,0);w.run=false;w.speedMul=1;w.faceYaw=null;}}
let galFloor=null;
function buildGallery(){
  if(!galFloor){galFloor=new THREE.Mesh(new THREE.CircleGeometry(14,48).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({color:0x9a9894,roughness:0.95}));galFloor.position.copy(GAL_C);galFloor.receiveShadow=true;scene.add(galFloor);}
  for(const w of gallery){scene.remove(w.rig.model);w.legs.forEach(l=>scene.remove(l.dbg));}
  gallery=[];
  const n=8;
  for(let i=0;i<n;i++){
    const look=randomPerson(rng);
    const w=new Walker(buildRig(makeHuman(look)),new StillBrain(),GAL_C.clone().add(new V3((i-(n-1)/2)*1.15,0,0)),180);
    w.look=look;w.noClamp=true;if(look.age==="senior"){w.gait.slouch+=6;w.gait.lean+=3;}
    gallery.push(w);
  }
  galLabel();
}
const AGE={young:"jeune",adult:"adulte",senior:"senior"};
const HAIR={short:"courts",quiff:"en banane",buzz:"rasés",bald:"chauve",afro:"afro",curly:"bouclés",long:"longs",ponytail:"queue de cheval",bun:"chignon",bob:"carré"};
function galLabel(){
  const w=gallery[galFocus];
  if(!w){galEl.querySelector("span").textContent="Vue d'ensemble · ← → pour inspecter une personne";return;}
  const l=w.look;
  galEl.querySelector("span").textContent=`${galFocus+1}/8 · ${l.sex==="f"?"Femme":"Homme"} ${AGE[l.age]} · ${l.height.toFixed(2)} m · cheveux ${HAIR[l.hair]}${l.beard?" · barbe":""}${l.glasses?" · lunettes":""}${l.muscle>0.5?" · musclé":""}`;
}
function toggleGallery(){
  galleryOn=!galleryOn;galEl.style.display=galleryOn?"flex":"none";
  if(galleryOn){if(!gallery.length)buildGallery();galFocus=-1;galLabel();cam.yaw=0;cam.pitch=6;cam.dist=9;}
  else{cam.dist=3.6;cam.pitch=10;}
  for(const w of gallery)w.rig.model.visible=galleryOn;
}
function galStep(d){galFocus=clamp(galFocus+d,-1,gallery.length-1);if(galFocus>=0){cam.dist=1.6;cam.pitch=4;}else{cam.dist=9;cam.pitch=6;}galLabel();}


