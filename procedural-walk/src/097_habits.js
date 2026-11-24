// ================================================================ prendre les habits d'une personne à terre
// Plus de bouton « Nouveau look » : pour changer de tenue, il faut mettre quelqu'un K.O. puis lui prendre
// ses vêtements (E, bouton « Prendre les habits » sur téléphone, croix ↑ à la manette). Le corps reste en sous-vêtements.
const BODY_KEYS=["sex","height","build","skin","eyes","hairColor","hair","beard","age","muscle","seed","glasses"];
const UNDERWEAR={top:"tank",topColor:"#ecebe6",jacket:null,bottom:"shorts",bottomColor:"#8d9096",cuffs:false,shoes:["#d9d6cf","#d9d6cf"],boots:false,hat:null,badge:false};
function clothesOf(look){const c={};for(const k of Object.keys(look))if(!BODY_KEYS.includes(k))c[k]=look[k];for(const k of ["jacket","hat","badge"])if(!(k in c))c[k]=null;return c;}
let loot=null; // action en cours
function lootCandidate(){
  if(player.ko||player.sit.state!=="none"||player.handsUp||loot)return null;
  let best=null,bd=1.7;
  for(const w of walkers){if(w===player||!w.ko||w.ko.carry||w.stripped||!w.look)continue;
    const d=hdist(w.pelvisPos||w.root,player.root);if(d<bd){bd=d;best=w;}}
  return best;
}
const promptEl=document.getElementById("prompt");
function updateLoot(dt){
  const cand=lootCandidate();
  promptEl.style.display=cand&&!document.body.classList.contains("touch")?"block":"none";
  if(cand)promptEl.textContent="E : prendre ses habits";
  const lb=document.getElementById("lootBtn");if(lb)lb.style.display=cand&&document.body.classList.contains("touch")?"block":"none";
  if(!loot)return;
  const L=loot,b=L.body;L.t+=dt;
  if(!walkers.includes(b)||!b.ko||b.ko.carry||player.ko){endLoot();return;}
  // accroupi au-dessus du corps, les mains qui tirent les vêtements
  player.wish.set(0,0,0);player.crouchK=Math.max(player.crouchK||0,sst(0,0.4,L.t)*(1-sst(1.7,2.1,L.t)));
  const tgt=b.pelvisPos.clone();const to=new V3().subVectors(tgt,player.root);player.faceYaw=Math.atan2(to.x,-to.z)/D2R;
  const pull=Math.sin(L.t*7)*0.08;
  for(const a of player.arms)a.rFn=(ww,sh,arm)=>({target:tgt.clone().add(new V3(arm.side*0.15,0.12+pull*arm.side,0)),w:sst(0.2,0.5,L.t)*(1-sst(1.6,1.9,L.t)),wrist:-30});
  if(!L.done&&L.t>1.3){
    L.done=true;
    const mine=clothesOf(playerLook),theirs=clothesOf(b.look);
    setPlayerLook({...playerLook,...theirs});
    b.look={...b.look,...UNDERWEAR};b.stripped=true;
    const ko=b.ko;b.setRig(buildRig(makeHuman(JSON.parse(JSON.stringify(b.look)))),false);b.ko=ko;
    player.crouchK=1;for(const a of player.arms)a.rFn=null;
    // la police a une description de tes anciens vêtements : elle ne vaut plus rien
    wanted.evidence.clothes=false;
    hudMsg(wanted.level>0?"Nouvelle tenue : la police ne reconnaît plus tes vêtements":"Tu as pris ses habits");
    playSound("whoosh",0.6);
    // se servir sur quelqu'un à terre devant témoins = délit
    let src=null;
    if(walkers.some(w=>w.isCop&&!w.ko&&canSee(w,player,25,260)))src="cop";
    else if(cams.some(c=>camSees(c,player.root)))src="cctv";
    else{const wit=walkers.find(w=>w!==player&&w!==b&&!w.isCop&&!w.ko&&!w.isMedic&&w.brain.witness&&hdist(w.root,player.root)<10&&canSee(w,player,10,170));
      if(wit){src="witness";bark(wit,["Il le déshabille ?!","Mais qu'est-ce qu'il fait ?","Au secours, il le dépouille !"],3);}}
    if(src)later(src==="cop"?0.1:rand(1.5,3),()=>reportCrime({pts:1,counted:0,sev:1,reported:false},"Vol de vêtements",src));
  }
  if(L.t>2.1)endLoot();
}
function endLoot(){if(!loot)return;for(const a of player.arms)a.rFn=null;player.faceYaw=null;loot=null;}
function tryLoot(){const c=lootCandidate();if(!c)return false;loot={body:c,t:0,done:false};if(player.handsUp)toggleHandsUp();return true;}
document.getElementById("lootBtn")?.addEventListener("pointerdown",e=>{e.stopPropagation();tryLoot();});
