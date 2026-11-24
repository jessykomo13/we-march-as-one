// ================================================================ banc d'essai locomotion (module 1)
const benchSteps=[];
function updateBench(){
  if(!benchOn)return;
  const pl=player,g=benchSteps.filter(x=>clockT-x.t<4);
  const L=g.filter(x=>x.s<0),R=g.filter(x=>x.s>0),avg=(a,k)=>a.length?a.reduce((s,x)=>s+x[k],0)/a.length:0;
  const cad=g.length>2?(g.length-1)/(g[g.length-1].t-g[0].t)*60:0;
  const sL=avg(L,"st"),sR=avg(R,"st"),dL=avg(L,"d"),dR=avg(R,"d");
  const sym=sL&&sR?100-Math.abs(sL-sR)/Math.max(sL,sR)*100:0;
  const gait=pl.speed<0.15?"à l'arrêt":pl.run?"sprint":pl.speed>1.6?"jogging":"marche";
  const ft=l=>l.stepping?"en l'air":(l.flatT>0?"talon":(l.pitch>1?"pointe":"à plat"));
  let minD=9,groups=0,convs=0,acts=0,sit=0;
  for(let i=0;i<walkers.length;i++){const a=walkers[i];if(a.brain.followers&&a.brain.followers.length)groups++;if(a.brain.conv&&a.brain.conv.members[0]===a)convs++;if(a.brain.act)acts++;if(a.sit.state==="seated")sit++;
    for(let j=i+1;j<walkers.length;j++){const b=walkers[j];if(a.ko||b.ko)continue;minD=Math.min(minD,hdist(a.root,b.root));}}
  crowdStats.minDist=Math.min(crowdStats.minDist,minD);
  benchEl.innerHTML=`<b>Banc d'essai — Module 1</b><br>Allure : ${gait} · ${pl.speed.toFixed(2)} m/s<br>Cadence : ${cad?Math.round(cad):"—"} pas/min<br>Foulée G / D : ${sL.toFixed(2)} / ${sR.toFixed(2)} m<br>Durée G / D : ${dL.toFixed(2)} / ${dR.toFixed(2)} s<br>Symétrie : ${sym?sym.toFixed(0)+" %":"—"}<br>Pied G : ${ft(pl.L)} · Pied D : ${ft(pl.R)}<br>Endurance : ${Math.round(pl.stamina??100)} %<br><br><b>Foule — Module 3</b><br>Passants : ${walkers.length-1} · groupes : ${groups}<br>Conversations : ${convs} · assis : ${sit} · téléphone/montre : ${acts}<br>Distance mini entre 2 personnes : ${minD.toFixed(2)} m<br>Recalculs d'itinéraire (bloqué) : ${crowdStats.stuck}<br><br><b>Dialogues — Module 5</b><br>Phrases dites : ${dlgStats.said} · voix FR du navigateur : ${frVoices.length}<br>Spectateurs : ${walkers.filter(w=>w.brain.watch).length} (dont ${walkers.filter(w=>w.brain.watch&&w.brain.watch.film).length} qui filment) · en train de parler : ${walkers.filter(w=>w.talkT>0).length}<br><br><b>Combat — Module 4</b><br>Enchaînement : ${pl.combo!==undefined&&clockT-(pl.lastAtkEnd||-9)<0.55?(pl.combo%3+1)+"/3":"—"} · garde : ${pl.guardHold?"oui":"non"}<br>Précision : ${combatStats.tries?Math.round(combatStats.hits/combatStats.tries*100):0} % (${combatStats.hits}/${combatStats.tries}) · dégâts reçus : ${combatStats.taken}<br>${combatLog.map(c=>`${KN[c.k]||c.k} · ${c.z==="raté"?"raté":ZN[c.z]+" · "+c.d+(c.b?" (bloqué)":"")}`).join("<br>")}`;
}

