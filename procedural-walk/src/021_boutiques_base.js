// boutiques : registre des points de vente (rempli à la construction des îlots)
const shopSpots=[];let shopSink=null;
const SHOP_KIND=[
  [/^(Boulangerie|Café|Pizzeria|Glacier|Taqueria|Sushi|Burger|Tacos|Épicerie|Crêpes|Bubble|Pizza|Barbe|Hot)/,"food"],
  [/^Pharmacie/,"pharma"],[/^(Supérette|Tabac|Glaces|Journaux)/,"drink"],[/^Salle de sport/,"gym"]];
function shopKind(name){for(const [re,k] of SHOP_KIND)if(re.test(name))return k;return null;}
function addShop(name,x,z){const kind=shopKind(name);if(!kind)return;const s={name,kind,x,z};shopSpots.push(s);if(shopSink)shopSink.push(s);}
function dropShops(list){for(const s of list){const i=shopSpots.indexOf(s);if(i>=0)shopSpots.splice(i,1);}}
// figurants fixes (automobiliste en panne, auto-stoppeur, pêcheurs…) : apparaissent quand on approche
const ambSpots=[];let ambSink=null;
function addAmb(role,x,z,yaw){const a={role,x,z,yaw,w:null};ambSpots.push(a);if(ambSink)ambSink.push(a);return a;}
function dropAmb(list){for(const a of list){const i=ambSpots.indexOf(a);if(i>=0)ambSpots.splice(i,1);if(a.w&&walkers.includes(a.w)&&!a.w.ko)removeWalker(a.w,true);else if(a.w)a.w.isMission=false;a.w=null;}}
