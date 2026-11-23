// ================================================================ les passants aussi peuvent être arrêtés
const suspects=[];
function registerNpcCrime(att,victim){
  if(att.isCop||att.isSpar||att===player||att.isMedic)return;
  att.aggressorT=clockT;att.aggressorVs=victim;
  if(suspects.includes(att)||att._reportPending)return;
  let why="";
  for(const w of walkers)if(w.isCop&&!w.ko&&canSee(w,att,30,260)){why="La police a vu l'agression";break;}
  if(!why)for(const cm of cams)if(camSees(cm,att.root)){cm.alert=2;why="Une caméra a filmé l'agression";break;}
  if(!why)for(const w of walkers){if(w===player||w===att||w===victim||w.isCop||w.ko||w.isMedic)continue;if(hdist(w.root,att.root)<12&&canSee(w,att,12,170)){why="Un témoin a appelé la police";bark(w,["Appelez la police, il frappe les gens !","Hé ! Arrêtez-le !","Au secours, il le frappe !"],5);break;}}
  if(!why&&victim===player&&Math.random()<0.6)why="Tu as appelé la police";
  if(!why)return;
  att._reportPending=true;
  later(why.startsWith("La police")?0.2:rand(2,4),()=>{
    att._reportPending=false;
    if(!walkers.includes(att)||suspects.includes(att))return;
    suspects.push(att);hudMsg(why+" : la police vient chercher l'agresseur");dispatchForSuspect(att);
  });
}
function dispatchForSuspect(s){
  const free=walkers.find(w=>w.isCop&&!w.ko&&!w.brain.suspect&&w.brain.state!=="return");
  if(free){free.brain.suspect=s;return;}
  spawnPoliceCar(s.root.clone(),s);
}
function dropSuspect(s){const i=suspects.indexOf(s);if(i>=0)suspects.splice(i,1);}

