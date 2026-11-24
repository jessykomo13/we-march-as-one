// ================================================================ boutiques : dépenser l'argent gagné
// Devant les commerces, food trucks et kiosques : E pour acheter (soin, endurance).
const SHOP_OFFER={
  food:{label:n=>n.startsWith("Café")?"un café et un croissant":n.startsWith("Glac")||n.startsWith("Glaces")?"une glace":n.startsWith("Boulangerie")?"un sandwich":"de quoi manger",price:9,hp:35,stam:20,msg:["Miam !","Ça fait du bien.","Délicieux."]},
  pharma:{label:()=>"une trousse de soins",price:30,hp:100,stam:0,msg:["Soigné !","Comme neuf."]},
  drink:{label:()=>"une boisson fraîche",price:4,hp:8,stam:100,msg:["Rafraîchissant !","Glou glou…"]},
  gym:{label:()=>"une séance express",price:25,hp:15,stam:100,endu:true,msg:["Tu te sens plus endurant."]}};
let shopNear=null,shopStats={bought:0,spent:0};
const shopPrompt=document.createElement("div");shopPrompt.id="shopPrompt";document.body.appendChild(shopPrompt);
function updateShops(dt){
  shopNear=null;
  if(player.ko||player.sit.state!=="none"||player.swim||(MIS&&MIS.canTalk)){shopPrompt.style.display="none";return;}
  let bd=1.9;for(const s of shopSpots){const d=Math.hypot(s.x-player.root.x,s.z-player.root.z);if(d<bd){bd=d;shopNear=s;}}
  if(!shopNear){shopPrompt.style.display="none";return;}
  const O=SHOP_OFFER[shopNear.kind];
  shopPrompt.style.display=isTouch()?"none":"block";
  shopPrompt.innerHTML=O.done&&O.done()?`${shopNear.name} : tu as tous les outils`:wanted.level>0&&shopNear.kind!=="bidouille"?`${shopNear.name} : <i>fermé pour toi (recherché)</i>`:`E : acheter ${O.label(shopNear.name)} · <b>${O.price} €</b>${money<O.price?" <i>(pas assez)</i>":""}`;
}
function tryBuy(){
  const s=shopNear;if(!s)return false;
  if(wanted.level>0&&s.kind!=="bidouille"){hudMsg("Le vendeur refuse de te servir",2);return true;}
  const O=SHOP_OFFER[s.kind];
  if(money<O.price){hudMsg(`Il te faut ${O.price} € — fais des missions pour Nino`,2.5);return true;}
  if(O.done&&O.done()){hudMsg("Tu as déjà tous les outils.",2);return true;}
  money-=O.price;moneyEl.textContent=money+" €";shopStats.bought++;shopStats.spent+=O.price;
  if(O.buy){hudMsg(O.buy(),3.5);playSound("slap",0.03);return true;}
  player.hp=Math.min(player.maxHp,player.hp+O.hp);player.stamina=Math.min(100,(player.stamina??100)+O.stam);
  if(O.endu)player.enduBoost=(player.enduBoost||0)+1;
  const div=document.createElement("div");div.className="dmg";div.textContent=O.hp>=20?`+${O.hp} PV`:"Endurance !";div.style.color="#7dffa1";document.getElementById("bubbles").appendChild(div);
  floats.push({w:player,div,t:0,base:wp(player.rig.b.Head).add(new V3(0,0.25,0))});
  hudMsg(`${s.name} : -${O.price} € · ${pick(O.msg)}`,2.2);playSound("slap",0.03);
  return true;
}
