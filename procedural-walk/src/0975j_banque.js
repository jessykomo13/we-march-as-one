// ================================================================ MODULE 32 (2/2) : économie — Banque Azur
// Compte en banque (l'argent déposé est à l'abri : une arrestation ne prend que les espèces), carte « Azur Pay »
// obtenue au guichet, intérêts chaque jour (1 %, 500 € max), distributeurs dans les rues et sur les agences.
// Côté crime : casser un distributeur (les billets tombent), attaquer le fourgon blindé « Azur Transfert » garé
// devant chaque agence, braquer la banque arme à la main (caisse, puis coffre et casiers ; 4 étoiles).
const BANK={acc:0,card:false,day:0,lastT:null,robbed:{},atmBroken:{},vanRobbed:{},stats:{dep:0,wd:0,heists:0,atm:0,vans:0},init:false,ck:0,ui:null};
const ATMS=[];
let HEIST=null;
// ---------------------------------------------------------------- interface
{const st=document.createElement("style");st.textContent=`
#bankui{position:fixed;left:50%;bottom:150px;transform:translateX(-50%);width:min(390px,92vw);display:none;background:rgba(12,22,34,.93);color:#fff;border-radius:14px;padding:10px 12px;font:600 14px system-ui;z-index:30;border:1px solid rgba(120,190,255,.25)}
.touch #bankui{bottom:auto;top:56px}
#bankui h3{margin:0 0 4px;font:800 15px system-ui}#bankui .sub{font:500 12.5px system-ui;opacity:.85;margin-bottom:8px}#bankui .sub b{color:#7dffa1}
#bankui .row{display:flex;gap:6px;margin:5px 0;align-items:center;flex-wrap:wrap}#bankui .row span{width:58px;font:700 12px system-ui;opacity:.8}
#bankui button{all:unset;cursor:pointer;background:#22405c;border-radius:9px;padding:7px 10px;font:700 13px system-ui;color:#fff;border:1px solid rgba(255,255,255,.18);touch-action:manipulation}
#bankui button.off{opacity:.4}#bankui button.big{display:block;width:calc(100% - 22px);margin:6px 0;text-align:center}#bankui button.red{background:#7a1e1e}#bankui button.ok{background:#1f6a4a}
#bankBal{position:fixed;left:50%;top:0;color:#8fd0ff;font:800 13px system-ui;text-shadow:0 2px 4px #000;pointer-events:none;display:none}
.touch #bankBal{font-size:11.5px}
#heist{position:fixed;left:50%;top:70px;transform:translateX(-50%);display:none;background:rgba(90,10,10,.85);color:#fff;font:800 13px system-ui;padding:6px 12px;border-radius:10px;z-index:25;pointer-events:none;text-align:center;min-width:220px}
#heist i{display:block;height:5px;margin-top:5px;background:rgba(255,255,255,.2);border-radius:3px;overflow:hidden}#heist i b{display:block;height:100%;background:#ffd23a;width:0}
.touch #heist{top:96px;font-size:12px;min-width:180px}`;document.head.appendChild(st);}
const bankEl=document.createElement("div");bankEl.id="bankui";document.body.appendChild(bankEl);
const bankBalEl=document.createElement("div");bankBalEl.id="bankBal";document.body.appendChild(bankBalEl);
const heistEl=document.createElement("div");heistEl.id="heist";heistEl.innerHTML="<span></span><i><b></b></i>";document.body.appendChild(heistEl);
function fmtE(n){return Math.round(n).toLocaleString("fr-FR").replace(/ | /g," ")+" €";}
function setCash(n){money=Math.max(0,Math.round(n));moneyEl.textContent=money+" €";}
function bankHud(){bankBalEl.style.display=BANK.card?"block":"none";bankBalEl.textContent="🏦 "+fmtE(BANK.acc);
  if(BANK.card){const r=moneyEl.getBoundingClientRect();bankBalEl.style.left=Math.round(r.right+10)+"px";bankBalEl.style.top=Math.round(r.top+(r.height-bankBalEl.offsetHeight)/2)+"px";}}
function bankBtn(par,html,fn,cls){const b=document.createElement("button");b.innerHTML=html;if(cls)b.className=cls;b.onclick=e=>{e.stopPropagation();fn();};par.appendChild(b);return b;}
function bankOpenUI(mode,ref){BANK.ui={mode,ref};bankRender();}
function bankCloseUI(){BANK.ui=null;bankEl.style.display="none";}
function bankRender(){const U=BANK.ui;if(!U){bankEl.style.display="none";return;}bankEl.style.display="block";
  const atm=U.mode==="atm",B=U.ref&&U.ref.bank;
  bankEl.innerHTML=`<h3>${atm?"🏧 Distributeur Banque Azur":"🏦 Banque Azur — "+(B?B.name:"Agence")}</h3><div class="sub">Espèces : <b>${fmtE(money)}</b> · Compte : <b>${BANK.card?fmtE(BANK.acc):"aucun"}</b></div><div class="body"></div>`;
  const body=bankEl.querySelector(".body");
  if(!BANK.card){
    if(atm){const d=document.createElement("div");d.className="sub";d.textContent="Il te faut une carte Azur Pay : ouvre un compte au guichet d'une agence Banque Azur (🏦 sur la carte).";body.appendChild(d);}
    else bankBtn(body,"💳 Ouvrir un compte (gratuit) et recevoir la carte Azur Pay",()=>{BANK.card=true;playCoin();hudMsg("Compte ouvert ! Carte Azur Pay reçue : dépose ton argent pour le mettre à l'abri",3.5);bankRender();bankHud();},"big ok");
  }else{
    const row=(lab,fn,can)=>{const r=document.createElement("div");r.className="row";r.innerHTML=`<span>${lab}</span>`;for(const v of [50,200,1000,"Tout"]){const n=v==="Tout"?can():v;bankBtn(r,v==="Tout"?"Tout":v+" €",()=>fn(v==="Tout"?can():v),n<=0||n>can()?"off":"");}body.appendChild(r);};
    row("Retirer",v=>bankMove(-v),()=>Math.floor(BANK.acc));row("Déposer",v=>bankMove(v),()=>money);
    const d=document.createElement("div");d.className="sub";d.style.margin="6px 0 0";d.textContent="💳 Azur Pay · intérêts : 1 % par jour (500 € max). L'argent du compte est à l'abri si tu es arrêté.";body.appendChild(d);}
  if(!atm&&B&&U.ref.inside){const ok=!BANK.robbed[B.id]||BANK.robbed[B.id]<BANK.day;
    if(HEIST&&HEIST.B===B)null;else if(pwArmed()&&ok)bankBtn(body,"🔫 Braquer la banque",()=>{bankCloseUI();startHeist(B);},"big red");
    else if(pwArmed())bankBtn(body,"Le coffre a déjà été vidé aujourd'hui",()=>{},"big off");}
  bankBtn(body,"Fermer",bankCloseUI,"big");}
function bankMove(v){v=Math.round(v);if(!v)return;if(v>0){v=Math.min(v,money);if(v<=0)return;setCash(money-v);BANK.acc+=v;BANK.stats.dep+=v;hudMsg(`Dépôt : ${fmtE(v)} sur ton compte`,1.8);}
  else{v=Math.min(-v,Math.floor(BANK.acc));if(v<=0)return;BANK.acc-=v;setCash(money+v);BANK.stats.wd+=v;hudMsg(`Retrait : ${fmtE(v)}`,1.8);const A=BANK.ui&&BANK.ui.ref;if(A&&A.g)atmCashAnim(A);}
  playCoin();bankRender();bankHud();}
// ---------------------------------------------------------------- distributeurs
function atmKey(x,z){return Math.round(x)+"|"+Math.round(z);}
function bankInit(){
  for(const B of bankList()){try{POIS.push({type:"banque",x:B.x,z:B.z0-2,name:"Banque Azur — "+B.name});}catch(e){}
    for(const s of [-1,1])ATMS.push({x:B.x+s*3.3,z:B.z0-0.2,nx:0,nz:-1,key:"b"+B.id+(s<0?"g":"d"),bank:B,s,facade:true,g:null,hp:6});}
  // dans les rues : îlots commerçants d'Azuria, stations, centres des villes
  const want=new Set(["commerces","tours","place","foodtrucks","marche","station","supermarche","pop_marche","pop_place"]);
  for(let cx=-14;cx<=14;cx++)for(let cz=-14;cz<=14;cz++){const t=chunkType(cx,cz);if(!want.has(t))continue;if(t!=="station"&&hash(cx*3.71+cz*11.3+7)>0.42)continue;
    ATMS.push({x:cx*40-2,z:cz*40-12+1.45,nx:0,nz:-1,key:"s"+cx+","+cz,g:null,o:null,hp:6});}
  try{for(const T of TOWNS){const ci=Math.round((T.i0+T.i1)/2),cj=Math.round((T.j0+T.j1)/2);ATMS.push({x:ci*40-4,z:cj*40-12+1.45,nx:0,nz:-1,key:"t"+T.id,g:null,o:null,hp:6});}}catch(e){}
  for(const A of ATMS)if(!A.facade)try{POIS.push({type:"atm",x:A.x,z:A.z,name:"Distributeur Banque Azur"});}catch(e){}
  try{POI_ICON.banque=["🏦","#5fb0e0"];POI_ICON.atm=["🏧","#8fd0ff"];}catch(e){}
}
function atmFree(x,z){for(const o of obsAt(new V3(x,0,z))){const c=obstacleClosest(o,new V3(x,0,z));if(c.d<0.75)return false;}return true;}
function atmStream(){const p=player.root;
  for(const A of ATMS){if(A.facade){const R=A.bank.refs;A.g=R?R.atms[A.s<0?0:1]||null:null;if(A.g&&!A._applied){A._applied=true;if(BANK.atmBroken[A.key]>=BANK.day)atmBreakLook(A);}if(!R)A._applied=false;continue;}
    const d=Math.hypot(p.x-A.x,p.z-A.z);
    if(!A.g&&d<120){if(!chunks.has(ckey(Math.round((A.x-4)/40),Math.round((A.z-4)/40))))continue;
      let x=A.x;for(let k=0;k<4&&!atmFree(x,A.z);k++)x+=2.6;if(!atmFree(x,A.z))continue;A.bx=x;
      const g=model_distributeur({variant:"borne"});g.position.set(x,groundAt(x,A.z),A.z);g.rotation.y=Math.PI;scene.add(g);A.g=g;A.o=addObstacle({type:"box",x,z:A.z,hx:0.45,hz:0.3,atm:true});A.hp=6;if(BANK.atmBroken[A.key]>=BANK.day)atmBreakLook(A);}
    else if(A.g&&d>200){scene.remove(A.g);A.g=null;if(A.o){removeObstacle(A.o);A.o=null;}}}}
function atmPos(A){return {x:A.facade?A.x:(A.bx??A.x),z:A.z};}
function atmBroken(A){return (BANK.atmBroken[A.key]||-1)>=BANK.day;}
function nearATM(){if(drive||player.ko)return null;const p=player.root;let best=null,bd=1.7;
  for(const A of ATMS){if(!A.g)continue;const q=atmPos(A),fx=q.x+A.nx*0.7,fz=q.z+A.nz*0.7,d=Math.hypot(p.x-fx,p.z-fz);if(d<bd){bd=d;best=A;}}return best;}
function atmBreakLook(A){if(!A.g)return;A.g.traverse(o=>{if(o.name==="dalle")o.material=BKM.glowOff;if(o.name==="billets")o.visible=true;});}
function atmCashAnim(A){const b=A.g&&A.g.getObjectByName("billets");if(!b)return;b.visible=true;setTimeout(()=>{if(!atmBroken(A))b.visible=false;},1400);}
// billets / sacs qui tombent (ramassés en passant dessus, comme les porte-monnaie)
function dropLoot(x,y,z,amount,kind){const m=kind==="sac"?model_sac_argent():model_liasse();m.position.set(x,y,z);scene.add(m);
  const k=kind==="sac"?0.5:1.6;wallets.push({bank:true,m,v:new V3(rand(-k,k),rand(1.4,2.6),rand(-k,k)),spin:new V3(rand(-6,6),rand(-6,6),rand(-6,6)),amount:Math.round(amount),rest:false,t:0});}
function bankAlarmSound(d){const c=actx;if(!c)return;try{const v=clamp01(1-d/80)*0.16;if(v<0.01)return;const t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type="square";o.frequency.setValueAtTime(880,t);o.frequency.setValueAtTime(660,t+0.25);
  g.gain.setValueAtTime(v,t);g.gain.setValueAtTime(0.0001,t+0.5);o.connect(g).connect(sfxOut());o.start(t);o.stop(t+0.52);}catch(e){}}
function bankCrime(pos,R,why,key,pts,sev,direct){if(CREA.on&&CREA.noCops)return;noisyCrime(pos,R,why,key);const v=TH_VICT.get(key);const c=v&&v._crime;if(c){c.pts=Math.max(c.pts,pts);c.sev=Math.max(c.sev,sev);if(direct){reportCrime(c,why,"cctv");wanted.lastSeenPos.copy(player.root);}else if(c.reported)reportCrime(c,null,"update");}}
function hitATM(A,dmg){if(atmBroken(A))return;const q=atmPos(A),pos=new V3(q.x,0,q.z);A.hp-=dmg;playSound("thud",0.5);puff(q.x,groundAt(q.x,q.z)+1.2,q.z,0,0.25);
  if(!A._hitT||clockT-A._hitT>20){A._hitT=clockT;bankCrime(pos,12,"Il casse un distributeur !","atm"+A.key,2,1);}
  if(A.hp>0){floatText(player,`Distributeur ${Math.round((1-A.hp/6)*100)} %`,"#ffd08a");return;}
  BANK.atmBroken[A.key]=BANK.day;BANK.stats.atm++;atmBreakLook(A);const y=groundAt(q.x,q.z)+0.5;
  const n=4+Math.floor(Math.random()*3);for(let i=0;i<n;i++)dropLoot(q.x+A.nx*0.5,y,q.z+A.nz*0.5,rand(40,140),"liasse");
  hudMsg("Le distributeur crache ses billets ! Ramasse-les vite",2.6);floatText(player,"CRAC !","#ffb07a");A.alarmT=10;
  bankCrime(pos,30,"Alarme du distributeur ! La police est prévenue","atm"+A.key,4,2,true);}
// ---------------------------------------------------------------- fourgon blindé
function vanOf(B){return B.refs&&B.refs.van?B.refs:null;}
function hitVan(B,dmg){const R=vanOf(B);if(!R||BANK.vanRobbed[B.id]>=BANK.day)return;R.hp=(R.hp??16)-dmg;playSound("thud",0.6);puff(R.fx-2.7,0.9,R.fz,0,0.3);
  if(!R._hitT||clockT-R._hitT>20){R._hitT=clockT;bankCrime(new V3(R.fx,0,R.fz),20,"Il attaque le fourgon blindé !","van"+B.id,3,2);}
  if(R.hp>0){floatText(player,`Portes du fourgon ${Math.round((1-R.hp/16)*100)} %`,"#ffd08a");return;}
  BANK.vanRobbed[B.id]=BANK.day;BANK.stats.vans++;R.vanOpen=0.001;R.alarmT=14;
  for(let i=0;i<2;i++)dropLoot(R.fx-3.1,1.1,R.fz+(i-0.5)*0.6,rand(1500,3000),"sac");
  hudMsg("Les portes du fourgon cèdent : deux sacs d'argent !",2.8);floatText(player,"BOUM !","#ffb07a");
  bankCrime(new V3(R.fx,0,R.fz),40,"Attaque du fourgon blindé Azur Transfert ! La police arrive","van"+B.id,6,3,true);}
// ---------------------------------------------------------------- cibles (coups et balles)
function bankTargets(){const L=[];
  for(const A of ATMS)if(A.g&&!atmBroken(A)){const q=atmPos(A);L.push({x:q.x,z:q.z,y0:groundAt(q.x,q.z),y1:groundAt(q.x,q.z)+1.9,r:0.5,hit:d=>hitATM(A,d/12)});}
  for(const B of BANK_LIST||[]){const R=vanOf(B);if(R&&!(BANK.vanRobbed[B.id]>=BANK.day)&&Math.hypot(player.root.x-R.fx,player.root.z-R.fz)<80)for(const dx of [-1.8,0,1.8])L.push({x:R.fx+dx,z:R.fz,y0:SIDEWALK,y1:SIDEWALK+2.6,r:1.15,hit:d=>hitVan(B,d/14)});}
  return L;}
function rayTargets(o,d,bd){let best=null;for(const T of bankTargets()){const h2=d.x*d.x+d.z*d.z;if(h2<1e-6)continue;const t=((T.x-o.x)*d.x+(T.z-o.z)*d.z)/h2;if(t<0||t>bd)continue;
  const px=o.x+d.x*t,py=o.y+d.y*t,pz=o.z+d.z*t;if(Math.hypot(px-T.x,pz-T.z)<T.r&&py>T.y0&&py<T.y1){bd=t;best={tgt:T,t,p:new V3(px,py,pz)};}}return best;}
function bankMelee(){const a=player.atk;if(!a||a._bank||a.t<a.impactT)return;a._bank=true;const p=player.root,f=fwdOf(player.yaw),dmg=a.type==="kick"?1.6:1;
  for(const A of ATMS){if(!A.g||atmBroken(A))continue;const q=atmPos(A),dx=q.x-p.x,dz=q.z-p.z,L=Math.hypot(dx,dz);if(L<1.35&&(dx*f.x+dz*f.z)/L>0.3){hitATM(A,dmg);return;}}
  for(const B of BANK_LIST||[]){const R=vanOf(B);if(!R)continue;const rx=R.fx-2.8,dx=rx-p.x,dz=R.fz-p.z,L=Math.hypot(dx,dz);if(L<1.7&&(dx*f.x+dz*f.z)/L>0.2){hitVan(B,dmg);return;}}}
// ---------------------------------------------------------------- intérieur de l'agence (appelé par l'intérieur générique)
function bankOfObstacle(o){return (BANK_LIST||bankList()).find(B=>Math.abs(B.x-o.x)<1&&Math.abs((B.z0+B.z1)/2-o.z)<1)||null;}
function bankFurnish(I,g,r,O,B,plant,sofa){
  const {x0,x1,z0,z1,fy}=I,cx=(x0+x1)/2,cz=(z0+z1)/2,zc=cz-0.3,zV=z1-4,H=3.3;
  put(geo("imarble",()=>new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2)),IM.marble,cx,fy+0.045,(z0+zc)/2,g,0,x1-x0,1,zc-z0);
  // guichet (côté clients vers la porte) + cloisons basses, passage à l'est
  const gu=model_guichet();gu.position.set(cx,fy,zc);gu.rotation.y=Math.PI;g.add(gu);O(cx,zc-0.18,2.05,0.42);
  B(cx-2.05-x0,1.1,0.12,IM.wood,(x0+cx-2.05)/2,0.55,zc-0.18);O((x0+cx-2.05)/2,zc-0.18,(cx-2.05-x0)/2,0.08);
  const e0=cx+2.05,e1=x1-1.3;B(e1-e0,1.1,0.12,IM.wood,(e0+e1)/2,0.55,zc-0.18);O((e0+e1)/2,zc-0.18,(e1-e0)/2,0.08);
  put(BX(3.2,0.5,0.06),signMat("Banque Azur","#114865","#ffffff",{w:512,h:80}),cx,fy+2.75,zV-0.16,g);
  // mur du coffre avec la porte ronde
  for(const [a,b] of [[x0,cx-1.3],[cx+1.3,x1]]){put(BX(b-a,H,0.24),IM.wallH[3],(a+b)/2,fy+H/2,zV,g);I.obs.push(addObstacle({type:"box",x:(a+b)/2,z:zV,hx:(b-a)/2,hz:0.12,inner:true,bld:true,tall:true}));}
  put(BX(2.6,H-2.45,0.24),IM.wallH[3],cx,fy+2.45+(H-2.45)/2,zV,g);
  const cf=model_coffre();cf.position.set(cx,fy,zV-0.16);cf.rotation.y=Math.PI;g.add(cf);const porte=cf.getObjectByName("porte");porte.userData.keep=true;
  const vo=addObstacle({type:"box",x:cx,z:zV,hx:1.3,hz:0.2,inner:true,bld:true,tall:true});I.obs.push(vo);
  I.vault={porte,vol:porte.getObjectByName("volant"),o:vo,open:0,spin:0,state:"ferme",zV,cx};
  // casiers au fond du coffre
  I.lockers=[];for(const dx of [-5,0,5]){const ca=model_casiers();ca.position.set(cx+dx,fy,z1-0.3);ca.rotation.y=Math.PI;g.add(ca);O(cx+dx,z1-0.3,1.5,0.27);
    for(let k=0;k<3;k++){const p=ca.getObjectByName("casier"+k);p.userData.keep=true;ca.updateMatrixWorld(true);const w=new V3();p.getWorldPosition(w);I.lockers.push({p,x:w.x-0.24,z:z1-0.9,y:w.y,id:I.key+"|L"+dx+k,open:0,done:false});}}
  // file d'attente, salon, plantes, caméras
  const q=model_file_attente();q.position.set(cx-4.6,fy,zc-2.4);g.add(q);for(const [a,b] of [[-1.46,-0.46],[1.46,-0.46],[1.46,0.46],[-1.46,0.46]])I.obs.push(addObstacle({type:"circle",x:cx-4.6+a,z:zc-2.4+b,r:0.12,inner:true}));
  sofa(x1-1.3,z0+3.4,-Math.PI/2);plant(x0+0.6,z0+0.6);plant(x1-0.6,z0+0.6);plant(x0+0.6,zc-0.8);
  I.camHeads=[];for(const [x,z] of [[x0+0.35,z0+0.35],[x1-0.35,z0+0.35],[x0+0.35,zV-0.35]]){const c=model_camera_securite();c.position.set(x,fy+2.65,z);c.rotation.y=Math.atan2(cx-x,cz-z);g.add(c);const t=c.getObjectByName("tete");t.userData.keep=true;I.camHeads.push(t);}
  I.counter={x:cx,z:zc-1.1};I.teller={x:cx,z:zc+0.85};
}
// caissier immobile derrière le guichet ; il lève les mains pendant un braquage
class TellerBrain extends NpcBrain{
  constructor(I){super();this.I=I;}
  update(w,dt,time){if(this.fight||this.flee||this.react||this.cuffed){super.update(w,dt,time);return;}
    const S=this.I.teller,d=new V3(S.x-w.root.x,0,S.z-w.root.z);if(d.length()>0.35){w.wish.copy(d.normalize()).multiplyScalar(0.5);w.run=false;}else w.wish.set(0,0,0);
    const hs=HEIST&&HEIST.I===this.I&&HEIST.phase!=="fini";w.faceYaw=hs?Math.atan2(player.root.x-w.root.x,-(player.root.z-w.root.z))/D2R:0;
    if(hs&&!w._hands){w._hands=true;for(const a of w.arms)a.rFn=(ww,sh,arm)=>({target:sh.clone().add(local(ww.chestRot,arm.side*0.25,0.35,0.05)),w:1,wrist:-30});}
    else if(!hs&&w._hands){w._hands=false;for(const a of w.arms)a.rFn=null;}}
}
// clients : restent dans le hall
class BankClientBrain extends ResidentBrain{
  pick(w){const I=this.I;this.target.set(I.x0+1.2+Math.random()*(I.x1-I.x0-2.4),0,I.z0+1.4+Math.random()*Math.max(0.5,I.counter.z-I.z0-2.2));this.path=[this.target.clone()];}
}
function bankInterior(I){I.bank=bankOfObstacle(I.o);
  const T=spawnSpecial(randomPerson(rng),new TellerBrain(I),new V3(I.teller.x,0,I.teller.z),0);T.isMission=true;T.resident=I;T.teller=true;I.residents.push(T);
  const n=1+Math.floor(Math.random()*3);for(let k=0;k<n;k++){const p=new V3(I.x0+2+Math.random()*(I.x1-I.x0-4),0,I.z0+3+Math.random()*1.5);
    const w=spawnSpecial(randomPerson(rng),new BankClientBrain(I),p,Math.random()*360);w.isMission=true;w.resident=I;I.residents.push(w);}}
function bankInside(){const I=INT.cur;return I&&I.kind==="banque"&&inRoom(I,player.root)?I:null;}
// ---------------------------------------------------------------- braquage
function startHeist(B){const I=bankInside();if(!I||HEIST)return;if(!pwArmed()){hudMsg("Il te faut une arme en main pour braquer la banque",2.2);return;}
  HEIST={B,I,phase:"caisse",t:0,prog:0,loot:0,alarmK:0};BANK.robbed[B.id]=BANK.day;BANK.stats.heists++;
  const T=I.residents.find(w=>w.teller);if(T&&!T.ko)say(T,pick(["Ne tirez pas ! Je vous donne tout !","D'accord, d'accord… je remplis le sac !","Pitié, j'ai des enfants !"]));
  for(const w of I.residents)if(!w.teller&&w.brain.alarm){w.brain.alarm(w,true);w.brain.state="peur";try{showPhone(w,false);}catch(e){}}
  H0=HEIST;HEIST.copT=12;
  hudMsg("Braquage ! Reste près du guichet : la police arrive dans 12 s",3);}
let H0=null;
function heistAlert(){if(CREA.on&&CREA.noCops)return;const c={t0:clockT,pts:9,counted:0,reported:false,sev:4};reportCrime(c,"L'alarme de la Banque Azur a prévenu la police !","cctv");wanted.lastSeenPos.copy(player.root);}
function heistUpdate(dt){const H=HEIST;if(!H)return;const I=H.I;H.alarmK-=dt;if(H.copT>0){H.copT-=dt;if(H.copT<=0)heistAlert();}
  if(H.alarmK<=0&&H.t<60){H.alarmK=0.55;bankAlarmSound(Math.hypot(player.root.x-I.counter.x,player.root.z-I.counter.z));}H.t+=dt;
  const inside=INT.list.includes(I)&&inRoom(I,player.root,0.4);
  if(H.phase==="caisse"){const d=Math.hypot(player.root.x-I.counter.x,player.root.z-I.counter.z);if(d<6&&!player.ko)H.prog=Math.min(1,H.prog+dt/10);
    heistShow(`Le caissier remplit le sac… ${Math.round(H.prog*100)} %${H.copT>0?" · police dans "+Math.ceil(H.copT)+" s":""}`,H.prog);
    if(H.prog>=1||!inside){const amt=Math.round(H.prog*rand(1800,3200));if(amt>0)dropLoot(I.counter.x,I.fy+1.1,I.counter.z+0.2,amt,"sac");
      if(!inside){H.phase="fini";hudMsg("Tu as quitté la banque",2);}else{H.phase="coffre";H.t2=0;I.vault.state="ouvre";hudMsg("Le sac est sur le comptoir ! Le coffre s'ouvre…",2.6);}}}
  else if(H.phase==="coffre"){H.t2+=dt;heistShow(I.vault.open>=1?"Le coffre est ouvert : prends les sacs et force les casiers (E)":"Le coffre s'ouvre…",Math.min(1,H.t2/4));
    if(I.vault.open>=1&&!H.bags){H.bags=true;for(let k=0;k<3;k++)dropLoot(I.vault.cx-2+k*2,I.fy+0.6,I.vault.zV+1.6,rand(2500,4500),"sac");}
    if(!inside){H.phase="fini";}}
  if(H.phase==="fini"){heistEl.style.display="none";if(H.copT>0){H.copT=0;heistAlert();}if(!inside||H.t>240){HEIST=null;}}
}
function heistShow(txt,k){heistEl.style.display="block";heistEl.querySelector("span").textContent=txt;heistEl.querySelector("b").style.width=Math.round(clamp01(k)*100)+"%";}
function vaultUpdate(I,dt){const V=I.vault;if(!V)return;
  if(V.state==="ouvre"){if(V.spin<1){V.spin=Math.min(1,V.spin+dt/2.2);if(V.vol)V.vol.rotation.z=V.spin*Math.PI*4;if(V.spin>=1)playSound("thud",0.7);}
    else{V.open=Math.min(1,V.open+dt/2);V.porte.rotation.y=-V.open*1.85;if(V.open>=1){V.state="ouvert";removeObstacle(V.o);const i=I.obs.indexOf(V.o);if(i>=0)I.obs.splice(i,1);}}}
  for(const L of I.lockers||[])if(L.open>0&&L.open<1){L.open=Math.min(1,L.open+dt*2.5);L.p.rotation.y=-L.open*1.6;}
  for(const t of I.camHeads||[])t.rotation.y=Math.sin(clockT*0.4+t.id)*0.6;}
function nearLocker(){const I=bankInside();if(!I||!I.vault||I.vault.state!=="ouvert")return null;for(const L of I.lockers)if(!L.done&&Math.hypot(player.root.x-L.x,player.root.z-L.z)<1.3)return L;return null;}
function openLocker(L){L.done=true;L.open=0.01;playSound("thud",0.7);const m=Math.round(rand(400,1200));giveMoney(m);floatText(player,`+${m} € (casier)`,"#7dffa1");playCoin();}
// ---------------------------------------------------------------- entrée automatique (portes vitrées)
function bankDoors(dt){for(const B of BANK_LIST||[]){const R=B.refs;if(!R)continue;const p=player.root,dd=Math.hypot(p.x-B.doorX,p.z-B.doorZ);if(dd>40)continue;
    const open=bldInfoOpen(B),want=open&&dd<3.2&&!drive?1:0;R.open+=(want-R.open)*Math.min(1,dt*5);
    R.doors.forEach((d,i)=>{d.rotation.y=(i===0?1:-1)*1.35*R.open;});R.back.visible=R.open<0.08;
    if(open&&!drive&&dd<2.4&&p.z<B.z0+0.1&&!(INT.cur&&INT.cur.bank===B&&INT.cur.active)){const o=obsAt(new V3(B.x,0,(B.z0+B.z1)/2)).find(q=>q.bankDoor);if(o){const I=openInterior(o,{...o.bankDoor});activateInterior(I);}}
    if(R.vanOpen>0&&R.vanOpen<1){R.vanOpen=Math.min(1,R.vanOpen+dt*1.5);const g1=R.van.getObjectByName("porteArrG"),g2=R.van.getObjectByName("porteArrD");if(g1)g1.rotation.y=R.vanOpen*1.9;if(g2)g2.rotation.y=-R.vanOpen*1.9;}
    if(R.alarmT>0){R.alarmT-=dt;R._k=(R._k||0)-dt;if(R._k<=0){R._k=0.55;bankAlarmSound(dd);const gy=R.van.getObjectByName("gyro");if(gy)gy.visible=!gy.visible;}}else{const gy=R.van.getObjectByName("gyro");if(gy)gy.visible=true;}
    if(!R._applied){R._applied=true;if(BANK.vanRobbed[B.id]>=BANK.day){R.vanOpen=0.999;R.hp=0;}}}}
function bldInfoOpen(B){const h=DAY.t;return h>=8&&h<21;}
// ---------------------------------------------------------------- aide à l'écran + action (E)
function bankHint(){if(drive||player.ko)return null;
  const L=nearLocker();if(L)return ["E : forcer le casier","Casier"];
  const I=bankInside();if(I&&I.counter&&Math.hypot(player.root.x-I.counter.x,player.root.z-I.counter.z)<1.9)return [`E : guichet Banque Azur${pwArmed()&&!HEIST?" (ou braquer)":""}`,"Guichet"];
  const A=nearATM();if(A)return atmBroken(A)?["Distributeur hors service",""]:["E : distributeur Banque Azur (retirer, déposer)","Distributeur"];
  return null;}
function tryBank(){if(drive||player.ko)return false;
  const L=nearLocker();if(L){openLocker(L);return true;}
  const I=bankInside();if(I&&I.counter&&Math.hypot(player.root.x-I.counter.x,player.root.z-I.counter.z)<1.9){if(BANK.ui)bankCloseUI();else bankOpenUI("guichet",{bank:I.bank,inside:true});return true;}
  const A=nearATM();if(A){if(atmBroken(A)){hudMsg("Distributeur hors service",1.5);return true;}if(BANK.ui)bankCloseUI();else bankOpenUI("atm",A);return true;}
  return false;}
// ---------------------------------------------------------------- boucle
function updateBank(dt){
  if(!BANK.init){BANK.init=true;bankInit();bankHud();}
  if(BANK.lastT!==null&&DAY.t<BANK.lastT-12){BANK.day++;const gain=Math.min(500,Math.floor(BANK.acc*0.01));if(BANK.card&&gain>0){BANK.acc+=gain;hudMsg(`Banque Azur : +${fmtE(gain)} d'intérêts`,2.5);}bankHud();}
  BANK.lastT=DAY.t;
  BANK.ck-=dt;if(BANK.ck<=0){BANK.ck=0.8;atmStream();}BANK.hk=(BANK.hk||0)-dt;if(BANK.hk<=0){BANK.hk=0.25;bankHud();}
  bankMelee();bankDoors(dt);heistUpdate(dt);
  for(const I of INT.list)if(I.kind==="banque"&&I.active)vaultUpdate(I,dt);
  for(const A of ATMS)if(A.alarmT>0&&A.g){A.alarmT-=dt;A._k=(A._k||0)-dt;if(A._k<=0){A._k=0.6;const q=atmPos(A);bankAlarmSound(Math.hypot(player.root.x-q.x,player.root.z-q.z));}}
  if(BANK.ui){const U=BANK.ui;const far=U.mode==="atm"?nearATM()!==U.ref:!bankInside()||Math.hypot(player.root.x-bankInside().counter.x,player.root.z-bankInside().counter.z)>2.6;if(far)bankCloseUI();}
}
function bankSave(){return {acc:Math.round(BANK.acc),card:BANK.card,day:BANK.day,robbed:{...BANK.robbed},atm:{...BANK.atmBroken},van:{...BANK.vanRobbed}};}
function bankLoad(d){if(!d)return;BANK.acc=clamp(Math.round(+d.acc||0),0,1e9);BANK.card=!!d.card;BANK.day=Math.max(0,Math.round(+d.day||0));
  const num=o=>{const r={};if(o&&typeof o==="object")for(const k of Object.keys(o).slice(0,400))r[k]=Math.round(+o[k]||0);return r;};BANK.robbed=num(d.robbed);BANK.atmBroken=num(d.atm);BANK.vanRobbed=num(d.van);bankHud();}
