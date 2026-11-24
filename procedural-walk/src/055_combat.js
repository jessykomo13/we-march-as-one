// ================================================================ combat : utilitaires
let clockT=0,frameN=0;
const sst2=null;
let actx=null;
function audio(){if(!actx){try{actx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){}}if(actx&&actx.state==="suspended")actx.resume();return actx;}
addEventListener("keydown",()=>audio(),{once:true});addEventListener("pointerdown",()=>audio(),{once:true});
function playSound(kind,vol=1){
  const c=actx;if(!c)return;
  try{
    const dur=kind==="whoosh"?0.18:0.12,buf=c.createBuffer(1,Math.floor(c.sampleRate*dur),c.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++){const t=i/d.length;d[i]=(Math.random()*2-1)*Math.pow(1-t,kind==="whoosh"?1.5:3.5);}
    const src=c.createBufferSource();src.buffer=buf;
    const flt=c.createBiquadFilter();flt.type=kind==="slap"?"bandpass":"lowpass";flt.frequency.value=kind==="slap"?1800:kind==="whoosh"?900:420;flt.Q.value=kind==="slap"?0.8:0.7;
    const g=c.createGain();g.gain.value=(kind==="whoosh"?0.25:0.9)*vol;
    src.connect(flt).connect(g).connect(sfxOut());src.start();
    if(kind!=="whoosh"){const o=c.createOscillator(),og=c.createGain();o.frequency.setValueAtTime(kind==="slap"?220:110,c.currentTime);o.frequency.exponentialRampToValueAtTime(45,c.currentTime+0.12);og.gain.setValueAtTime(0.5*vol,c.currentTime);og.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.15);o.connect(og).connect(sfxOut());o.start();o.stop(c.currentTime+0.16);}
  }catch(e){}
}
const floats=[];
function floatText(w,text,color){
  const div=document.createElement("div");div.className="dmg";div.textContent=text;div.style.color=color;
  document.getElementById("bubbles").appendChild(div);
  floats.push({w,div,t:0,base:wp(w.rig.b.Head).add(new V3(rand(-0.15,0.15),0.25,0))});
}
let hurtFlash=0;
function flashHurt(dmg){hurtFlash=Math.min(0.6,hurtFlash+dmg/45);}
function updateFloats(dt){
  for(let i=floats.length-1;i>=0;i--){
    const f=floats[i];f.t+=dt;
    if(f.t>1.3){f.div.remove();floats.splice(i,1);continue;}
    const p=f.base.clone().add(new V3(0,f.t*0.5,0)).project(camera);
    const vis=p.z<1&&p.z>-1;f.div.style.display=vis?"block":"none";
    if(vis){f.div.style.left=((p.x*0.5+0.5)*innerWidth)+"px";f.div.style.top=((-p.y*0.5+0.5)*innerHeight)+"px";f.div.style.opacity=Math.min(1,(1.3-f.t)*3);}
  }
  hurtFlash=Math.max(0,hurtFlash-dt*1.2);
  flashEl.style.opacity=hurtFlash;
  hpFill.style.width=(player.hp/player.maxHp*100)+"%";
  hpFill.style.background=player.hp>50?"#4cd964":player.hp>25?"#ffcc00":"#ff3b30";
  hpTxt.textContent=Math.ceil(player.hp)+" PV";
  for(const w of walkers){
    if(w===player)continue;
    const show=!w.ko&&(w.hp<w.maxHp-0.5)&&(clockT-w.lastHurt<6||w.brain.fight);
    if(show&&!w.hpDiv){w.hpDiv=document.createElement("div");w.hpDiv.className="npchp";w.hpDiv.innerHTML="<i></i>";document.getElementById("bubbles").appendChild(w.hpDiv);}
    if(w.hpDiv){
      if(!show){w.hpDiv.style.display="none";continue;}
      const p=wp(w.rig.b.Head).add(new V3(0,0.22,0)).project(camera),vis=p.z<1&&p.z>-1;
      w.hpDiv.style.display=vis?"block":"none";
      if(vis){w.hpDiv.style.left=((p.x*0.5+0.5)*innerWidth)+"px";w.hpDiv.style.top=((-p.y*0.5+0.5)*innerHeight)+"px";w.hpDiv.firstChild.style.width=(w.hp/w.maxHp*100)+"%";}
    }
  }
}
const FLINES={hit:["Aïe !","Ouch !","Hé !","Arrête !","Aïe, ça fait mal !"],fight:["Tu vas voir !","Viens là !","Tu l'auras voulu !","Ok, tu cherches ?"],flee:["Au secours !","Laisse-moi !","T'es malade !","Arrête, arrête !"],win:["Ça t'apprendra !","Reste par terre.","T'as compris ?","La prochaine fois, réfléchis."],up:["Ok ok, j'arrête…","Aïe… ma tête…","T'es fou, toi !"]};
function isGuarding(w){return !w.ko&&w.guardT>0&&!w.atk;}
// L : le coup qui fait le plus de dégâts selon la garde de l'adversaire
function bestAttack(w,t){
  const gd=t&&isGuarding(t);
  const opts=[["kick","head",32*(gd?0.3:1)],["kick","chest",17.5*(gd?0.65:1)],["kick","belly",15.5],["punch","head",20*(gd?0.3:1)],["punch","belly",9],["kick","legs",8]];
  if(t&&hdist(t.root,w.root)<0.75)opts.forEach(o=>{if(o[0]==="kick")o[2]*=0.8;}); // trop près pour un bon coup de pied
  opts.sort((a,b)=>b[2]-a[2]);return opts[0];
}
function findTarget(w,range=1.8,cone=70){
  let best=null,bd=range;
  for(const o of walkers){if(o===w||o.ko)continue;const to=new V3().subVectors(o.root,w.root);to.y=0;const d=to.length();if(d>bd)continue;
    const ang=Math.abs(deltaAngle(w.yaw,Math.atan2(to.x,-to.z)/D2R));if(ang<cone){bd=d;best=o;}}
  return best;
}



