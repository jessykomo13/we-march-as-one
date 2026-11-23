// ================================================================ quartiers : la ville fait 1,2 km × 1,2 km
//  centre (tours, bureaux, commerces) · quartier commerçant · résidentiel (maisons, jardins, portails)
//  zone industrielle à l'ouest (entrepôts, conteneurs) · plage et mer à l'est · lieux uniques (police, hôpital…)
const SPECIALS={"1,-1":"zenith","3,-1":"commissariat","-3,4":"hopital","7,4":"ecole","-6,-7":"station","-2,-6":"eglise","6,-6":"supermarche","2,3":"marche","9,-9":"terrain","-8,8":"ecole","10,6":"station","-12,-3":"station","4,10":"hopital","12,-11":"eglise","-5,11":"supermarche","5,2":"foire","-9,-5":"etang_urbain","8,-3":"etang_urbain"};
function district(cx,cz){
  if(cx>=14)return "plage";
  if(cx<=-10)return "industrie";
  const r=Math.max(Math.abs(cx),Math.abs(cz));
  if(r<=3)return "centre";
  if(r<=5)return "commerces";
  return "residentiel";
}
function chunkType(cx,cz){
  if(!cityAt(cx,cz)){const T=townAt(cx,cz);return T?townTypeFor(T,cx,cz):countryTypeAt(cx,cz);}
  if(cx===0&&cz===0)return "place";
  if(inPort(cx,cz))return portType(cx,cz);
  const sp=SPECIALS[cx+","+cz];if(sp)return sp;
  if(inPop(cx,cz))return popType(cx,cz);
  const d=district(cx,cz),r=hash(cx*12.9898+cz*78.233+3.1);
  if(d==="plage")return "plage";
  if(cx===13)return r<0.8?"hotels":"place";
  const pickT=(T)=>{let a=0;for(const [t,p] of T){a+=p;if(r<a)return t;}return T[T.length-1][0];};
  if(d==="centre")return pickT([["tours",0.56],["commerces",0.2],["place",0.1],["parc",0.07],["foodtrucks",0.07]]);
  if(d==="commerces")return pickT([["commerces",0.42],["immeubles",0.16],["place",0.1],["parc",0.1],["skatepark",0.05],["foodtrucks",0.07],["parking",0.05],["terrain_vague",0.05]]);
  if(d==="industrie")return pickT([["entrepots",0.5],["conteneurs",0.22],["parking",0.1],["terrain_vague",0.12],["parc",0.06]]);
  return pickT([["maisons",0.44],["parc",0.14],["terrain_vague",0.08],["jardin",0.07],["immeubles",0.07],["place",0.05],["commerces",0.06],["parking",0.03],["terrain",0.04],["skatepark",0.02]]);
}
const PRIVATE=new Set(["pop_rue","zenith","hotels","maisons","entrepots","conteneurs","commissariat","hopital","ecole","tours","commerces","supermarche"]);
// rectangles accessibles aux passants (sinon ils restent sur le trottoir périphérique)
function publicRects(type,bx0,bz0){const ring=[[bx0,bz0,bx0+32,bz0+2.6],[bx0,bz0+29.4,bx0+32,bz0+32],[bx0,bz0,bx0+2.6,bz0+32],[bx0+29.4,bz0,bx0+32,bz0+32]];
  return PRIVATE.has(type)?ring:null;}
// noms de rues : une avenue et une rue pour chaque ligne de la grille
const AV_N=["des Flamants","Corail","du Phare","des Palmiers","Lagune","Mangrove","Bellevue","Centrale","des Pélicans","Saint-Ange","Hibiscus","Marina","du Récif","Orangerie","des Dunes","des Embruns","Bougainvillée","du Levant","des Sables","Acacia","des Mouettes","Horizon","Victoria","des Tortues","Floralia","du Soleil","des Ibis","Neptune","des Cocotiers","Aurore","Océane"];
const RU_N=["de l'Écume","des Hérons","Soleil","du Marché","des Coquillages","Bonaventure","des Lilas","Principale","des Arcades","Ibis","du Port","Azur","des Goélands","Tropique","des Alizés","des Pêcheurs","de la Vigie","des Oliviers","Mistral","des Écoles","du Moulin","des Mimosas","Lamartine","des Voiles","du Fort","des Roses","Camélia","des Peintres","de la Gare","Bellerive","des Sirènes"];
// ---------------------------------------------------------------- constructeurs par type d'îlot
function buildBlock(ch,C){
  const {type,X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop,camAt}=C;
  const T=type;
  // stationnement le long des trottoirs (côtés de rue de cette zone), loin des carrefours
  if(!["plage","marche"].includes(T)){
    for(let z=Z-4;z<=Z+16;z+=6)if(r()<0.45)parkedCar(X-13.1,z,r()<0.5?0:Math.PI,mid);
    for(let x=X-4;x<=X+16;x+=6)if(r()<0.45)parkedCar(x,Z-13.1,r()<0.5?Math.PI/2:-Math.PI/2,mid);
  }
  for(let k=0;k<2;k++)manhole(X+r()*24-6,Z-16+(r()-0.5)*5,base);
  // plaques de rue au coin du carrefour, bouche d'incendie
  const ia=Math.round((X-16+16)/CHUNK),iz=Math.round((Z-16+16)/CHUNK);
  streetNameSign(bx0+0.6,bz0+0.6,false,"Avenue "+AV_N[(ia+14)%AV_N.length],detail);
  streetNameSign(bx0+1.3,bz0+0.6,true,"Rue "+RU_N[(iz+14)%RU_N.length],detail);
  if(T!=="plage")hydrant(bx0+5,bz0+0.7,detail);
  const B=BUILDERS[T]||BUILDERS.place;B(ch,C);
  if((T==="place"||T==="pop_place"||T==="marche")&&r()<0.7)addAnimals("pigeon",bcx,bcz,5+Math.floor(r()*5),7);
  if((T==="maisons"||T==="villas"||T==="pop_rue"||T==="cabanes")&&r()<0.3)addAnimals("chien",bcx,bz0+1.5,1,3);
  if(T==="parc"&&r()<0.4)addAnimals(r()<0.6?"ecureuil":"pigeon",bcx,bcz,3,8);
  if(T==="plage"&&r()<0.4)addAnimals(r()<0.6?"goeland":"pelican",bcx+8,bcz,3,9);
}
const BUILDERS={
  place(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,mid,detail,prop,camAt,cx,cz}=C;
    const rel=reliefOf(cx,cz).length>0;
    if(!rel)(r()<0.6?fountain:statue)(bcx,bcz,mid);
    else statue(bx0+6,bz0+6,mid);
    const kinds=["bench","bench","bench","lamp","lamp","planter","bin","bin","bollard"];
    for(let i=0;i<14;i++){const kind=kinds[i%kinds.length];for(let k=0;k<20;k++){const x=bx0+2+r()*28,z=bz0+2+r()*28;if(cx===0&&cz===0&&Math.hypot(x,z)<3.5)continue;if(Math.hypot(x-bcx,z-bcz)<4.5&&!rel)continue;if(prop(kind,x,z,r()<0.5?0:Math.PI/2))break;}}
    if(r()<0.7)kiosk(bx1-4,bz0+4,detail,r()<0.5?"Journaux":"Glaces");
    for(let i=0;i<3;i++)terraceSet(bx0+4+i*2.4,bz1-3,detail,STRIPES[(i+cx)&3]);
    billboard(bx1-1.2,bcz,Math.PI/2*-1+Math.PI,cx+cz,mid);
    bikeRack(bx0+9,bz0+1.3,true,detail);
    for(const [x,z] of [[bx0+1.5,bz0+1.5],[bx1-1.5,bz1-1.5]])if(!onRelief(x,z))treeAt(x,z,"palm",0.85,mid);
    camAt(bx0+0.9,bz1-0.9,Math.atan2(1,-1));camAt(bx1-0.9,bz0+0.9,Math.atan2(-1,1));
    edgeTrees(X,Z,mid,r,"round",(x,z)=>onRelief(x,z,1));
  },
  parc(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,mid,detail,prop,camAt,onSand}=C;
    for(let i=0;i<14;i++){const x=bx0+3+r()*26,z=bz0+3+r()*26;if(Math.abs(x-bcx)<2.6||Math.abs(z-bcz)<2.6||onSand(x,z,1.5))continue;if(obsAt(new V3(x,0,z)).some(o=>obstacleClosest(o,new V3(x,0,z)).d<2.5))continue;treeAt(x,z,["round","light","conifer","palm"][Math.floor(r()*4)],0.9+r()*0.4,mid);}
    prop("bench",bcx-6,bcz+2.4,Math.PI);prop("bench",bcx+6,bcz-2.4,0);prop("bench",bcx+2.4,bcz+7,-Math.PI/2);prop("bench",bcx-2.4,bcz-7,Math.PI/2);
    prop("lamp",bcx+2,bcz+2,0);prop("lamp",bcx-2,bcz-2,0);prop("lamp",bcx+12,bcz-2,0);prop("lamp",bcx-12,bcz+2,0);
    prop("bin",bcx+2.2,bcz-4,0);prop("bin",bcx-2.2,bcz+4,0);
    if(r()<0.5)fountain(bcx,bcz,mid);
    const S=sandOf(C.cx,C.cz)[0];if(S)playground((S.x0+S.x1)/2,(S.z0+S.z1)/2,detail);
    // haie autour du parc avec des entrées
    // haies seulement aux coins : le parc reste ouvert de tous les côtés
    for(const [a,b,c,d] of [[bx0+0.8,bz0+0.8,bx0+8,bz0+0.8],[bx1-8,bz0+0.8,bx1-0.8,bz0+0.8],[bx0+0.8,bz1-0.8,bx0+8,bz1-0.8],[bx1-8,bz1-0.8,bx1-0.8,bz1-0.8],
      [bx0+0.8,bz0+0.8,bx0+0.8,bz0+8],[bx0+0.8,bz1-8,bx0+0.8,bz1-0.8],[bx1-0.8,bz0+0.8,bx1-0.8,bz0+8],[bx1-0.8,bz1-8,bx1-0.8,bz1-0.8]])fenceRun(a,b,c,d,"hedge",mid,[]);
    camAt(bcx+2.2,bcz+2.2,r()*6.28);
  },
  immeubles(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop,camAt}=C;
    const m=3,lots=[[bx0,bz0,bcx,bcz],[bcx,bz0,bx1,bcz],[bx0,bcz,bcx,bz1],[bcx,bcz,bx1,bz1]];
    const empty=r()<0.35?Math.floor(r()*4):-1;
    lots.forEach(([a,b,c,d],i)=>{
      const x0=a===bx0?a+m:a,x1=c===bx1?c-m:c,z0=b===bz0?b+m:b,z1=d===bz1?d-m:d;
      if(i===empty){prop("bench",(x0+x1)/2,(z0+z1)/2,r()<0.5?0:Math.PI/2);prop("planter",x0+2,z0+2,0);prop("planter",x1-2,z1-2,0);bikeRack((x0+x1)/2,z1-1.2,true,detail);return;}
      const h=7+Math.floor(r()*r()*9)*3.2;building(x0,z0,x1,z1,h,FACADES[Math.floor(r()*FACADES.length)],base);
      // balcons sur les façades côté rue
      for(let y=3.4;y<h-1;y+=3.2)if(r()<0.6){if(a===bx0)put(BX(0.9,0.1,x1-x0>10?3:2),KM.white,x0-0.45,y,(z0+z1)/2,base);if(b===bz0)put(BX(3,0.1,0.9),KM.white,(x0+x1)/2,y,z0-0.45,base);}
      put(BX(1.4,2.2,0.05),KM.door,a===bx0?x0-0.03:(x0+x1)/2,1.22,a===bx0?(z0+z1)/2:z0-0.03,base,a===bx0?Math.PI/2:0);
    });
    for(let k=0;k<3;k++){const s=-12+5+k*11;prop("lamp",bx0+1.2,Z+s+4,0);prop("lamp",bx1-1.2,Z+s+4,0);prop("lamp",X+s+4,bz0+1.2,0);prop("lamp",X+s+4,bz1-1.2,0);}
    for(const [x,z] of [[bx0+1,bz0+1],[bx1-1,bz0+1],[bx0+1,bz1-1],[bx1-1,bz1-1]])prop("bollard",x,z,0);
    prop("bin",bx0+1.2,bcz+2,0);prop("bin",bcx-2,bz0+1.2,0);mailbox(bx0+1.3,bcz-3,detail);
    if(r()<0.35)busStop(bx0+1.6,bcz+6,-Math.PI/2+Math.PI,detail);
    if(r()<0.7)camAt(bx0+0.8,bz0+0.8,Math.atan2(1,1)+(r()<0.5?0:Math.PI/2));
    edgeTrees(X,Z,mid,r,"round");
  },
  tours(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop,camAt}=C;
    const two=r()<0.45;
    const towers=two?[[bx0+4,bz0+4,bx0+15,bz0+15],[bx0+18,bz0+17,bx1-4,bz1-4]]:[[bx0+6,bz0+6,bx1-6,bz1-6]];
    towers.forEach(([x0,z0,x1,z1],i)=>{const h=30+Math.floor(r()*r()*18)*4;
      walls(x0-0.6,z0-0.6,x1+0.6,z1+0.6,0,5,KM.shop,base,4,5);walls(x0,z0,x1,z1,5,h-5,KM.tower[Math.floor(r()*3)],base,4,4);
      put(BX(x1-x0,0.6,z1-z0),KM.dark,(x0+x1)/2,h+0.3,(z0+z1)/2,base);put(BX(2,3,2),KM.dark,(x0+x1)/2,h+1.5,(z0+z1)/2,base);
      addObstacle({type:"box",x:(x0+x1)/2,z:(z0+z1)/2,hx:(x1-x0)/2+0.6,hz:(z1-z0)/2+0.6,tall:true,bld:true});
      put(BX(5,0.7,0.1),signMat("Tour "+["Horizon","Azur","Neptune","Atlantis","Mirage","Zénith"][Math.abs(C.cx*3+C.cz+i)%6],"#1a1d22","#e9f0f6",{w:512,h:72}),(x0+x1)/2,4.3,z0-0.66,base);
    });
    for(let i=0;i<6;i++)prop(i%2?"planter":"bench",bx0+3+r()*26,two?bz0+16+r()*1.5:bz0+2.2+r()*1.5,0);
    prop("lamp",bx0+2,bz1-2,0);prop("lamp",bx1-2,bz0+2,0);statue(two?bx1-6:bx0+3,two?bz0+6:bz1-3,mid);
    camAt(bx0+0.8,bz0+0.8,Math.atan2(1,1));edgeTrees(X,Z,mid,r,"palm");
  },
  commerces(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop,camAt}=C;
    const m=3.6,D=9,h=7.2+Math.floor(r()*3)*3.2,fac=FACADES[Math.floor(r()*FACADES.length)];
    // quatre ailes autour d'une cour fermée, boutiques au rez-de-chaussée côté rue
    const wings=[[bx0+m,bz0+m,bx1-m,bz0+m+D,"n"],[bx0+m,bz1-m-D,bx1-m,bz1-m,"s"],[bx0+m,bz0+m+D,bx0+m+D,bz1-m-D,"w"],[bx1-m-D,bz0+m+D,bx1-m,bz1-m-D,"e"]];
    let k=Math.abs(C.cx*7+C.cz*13);
    for(const [x0,z0,x1,z1,side] of wings){
      walls(x0,z0,x1,z1,3.5,h-3.5,fac,base,4,3.2);box(x0,z0,x1,z1,h,h+0.4,KM.stone,base);
      put(BX(x1-x0,0.01,z1-z0),WM.roof,(x0+x1)/2,h+0.41,(z0+z1)/2,base);
      // rez-de-chaussée : vitrines sur la face côté rue
      const fx=side==="w"?x0:side==="e"?x1:(x0+x1)/2,fz=side==="n"?z0:side==="s"?z1:(z0+z1)/2,len=side==="n"||side==="s"?x1-x0:z1-z0,ry=side==="n"?Math.PI:side==="s"?0:side==="w"?-Math.PI/2:Math.PI/2;
      walls(x0,z0,x1,z1,0,3.5,KM.shop,base,4,3.5);
      const f=new V3(Math.sin(ry),0,Math.cos(ry)),rgt=new V3(f.z,0,-f.x),n=Math.max(1,Math.floor(len/8));
      for(let i=0;i<n;i++){const off=(i+0.5-n/2)*(len/n),[name,col,opt]=SHOPS[(k++)%SHOPS.length];
        const px=fx+rgt.x*off+f.x*0.05,pz=fz+rgt.z*off+f.z*0.05;addShop(name,px+f.x*0.9,pz+f.z*0.9);
        put(BX(Math.min(5.5,len/n-0.6),0.65,0.12),signMat(name,col,"#fff",{...(opt||{}),w:512,h:80,glow:true}),px,3.85,pz,base,ry);
        const aw=put(BX(Math.min(5.2,len/n-0.8),0.05,1.4),STRIPES[md(k,STRIPES.length)],px+f.x*0.7,3.1,pz+f.z*0.7,mid,ry);aw.rotation.x=ry===0||ry===Math.PI?(ry===0?0.25:-0.25):0;aw.rotation.z=ry===Math.PI/2?-0.25:ry===-Math.PI/2?0.25:0;
        if(name.startsWith("Café")||name.startsWith("Pizz")||name.startsWith("Glac")||name.startsWith("Sushi")||name.startsWith("Taq")){for(let t=0;t<2;t++){const tx=px+f.x*2.2+rgt.x*(t-0.5)*2.6,tz=pz+f.z*2.2+rgt.z*(t-0.5)*2.6;if(blockOf(tx,tz))terraceSet(tx,tz,detail,STRIPES[md((k+t),STRIPES.length)]);}}
        else if(r()<0.3){const tx=px+f.x*1.4+rgt.x*1.8,tz=pz+f.z*1.4+rgt.z*1.8;if(blockOf(tx,tz))prop("crate",tx,tz,0);}
      }
      addObstacle({type:"box",x:(x0+x1)/2,z:(z0+z1)/2,hx:(x1-x0)/2,hz:(z1-z0)/2,tall:true,bld:true});
    }
    for(let t=0;t<2;t++){prop("lamp",bx0+1.2,bz0+10+t*12,0);prop("lamp",bx1-1.2,bz0+10+t*12,0);}
    prop("bin",bx0+1.2,bz0+4,0);bikeRack(bcx,bz1-1.3,true,detail);mailbox(bx1-1.3,bz0+5,detail);
    if(r()<0.5)busStop(bcx,bz0+1.6,Math.PI,detail);billboard(bx1-0.8,bcz,Math.PI/2,C.cx-C.cz,mid);
    signPost(bx0+0.8,bz0+9,0,ROADSIGN.park(),detail);
    camAt(bx1-0.8,bz1-0.8,Math.atan2(-1,-1));edgeTrees(X,Z,mid,r,"round");
  },
  maisons(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop}=C;
    const sw=2.6,lots=[[bx0+sw,bz0+sw,bcx,bcz,"n","w"],[bcx,bz0+sw,bx1-sw,bcz,"n","e"],[bx0+sw,bcz,bcx,bz1-sw,"s","w"],[bcx,bcz,bx1-sw,bz1-sw,"s","e"]];
    lots.forEach(([x0,z0,x1,z1,ns,ew],i)=>{
      // jardin
      plane(x1-x0,z1-z0,WM.grass,(x0+x1)/2,SIDEWALK+0.006,(z0+z1)/2,base,(x1-x0)/4,(z1-z0)/4);
      const front=ns==="n"?z0:z1,fdir=ns==="n"?-1:1,cxl=(x0+x1)/2;
      // maison
      const hw=4.4+r()*1.2,hd=3.6+r()*0.8,hx=cxl+(ew==="w"?-0.8:0.8),hz=(z0+z1)/2+fdir*-0.6,storeys=r()<0.35?2:1,H=storeys*2.9;
      const wallM=KM.houseWall[Math.floor(r()*KM.houseWall.length)];
      walls(hx-hw,hz-hd,hx+hw,hz+hd,0,H+SIDEWALK,wallM,base,3,2.9);gableRoof(hx-hw,hz-hd,hx+hw,hz+hd,H+SIDEWALK,1.6+r()*0.8,r()<0.6?KM.roofTile:KM.roofSlate,base);
      put(BX(0.5,1.4,0.5),KM.stone,hx+hw*0.5,H+SIDEWALK+1.2,hz,base);
      put(BX(1.1,2.1,0.06),KM.door,hx-hw*0.3,SIDEWALK+1.05,hz+fdir*(hd+0.03),base);
      put(BX(1.6,0.1,1.2),KM.white,hx-hw*0.3,SIDEWALK+2.4,hz+fdir*(hd+0.6),base);
      addObstacle({type:"box",x:hx,z:hz,hx:hw,hz:hd,tall:true,bld:true});
      // garage + allée
      const gx=ew==="w"?hx+hw+1.6:hx-hw-1.6;
      if(r()<0.6&&Math.abs(gx-cxl)<7){box(gx-1.5,hz-2.6,gx+1.5,hz+2.6,0,2.7,wallM,base);put(BX(2.6,2.1,0.05),KM.garage,gx,1.17,hz+fdir*2.63,base);put(BX(3.2,0.15,5.4),KM.roofSlate,gx,2.75,hz,base);addObstacle({type:"box",x:gx,z:hz,hx:1.5,hz:2.6,tall:true,bld:true});}
      const dx=Math.abs(gx-cxl)<7?gx:cxl+(ew==="w"?4:-4);
      plane(2.8,Math.abs(front-(hz+fdir*hd)),WM.asphalt,dx,SIDEWALK+0.01,(front+hz+fdir*hd)/2,base,1,2);
      if(r()<0.65)parkedCar(dx,front-fdir*3.4,0,mid);
      // clôture côté rue avec portail et entrée piétonne
      const kind=["wood","rail","hedge","rail"][Math.floor(r()*4)];
      const gapP=(hx-hw*0.3)-x0,gapC=dx-x0;
      let gaps=[[gapP-0.6,gapP+0.6],[gapC-1.6,gapC+1.6]].sort((a,b)=>a[0]-b[0]);if(gaps[0][1]>=gaps[1][0])gaps=[[gaps[0][0],Math.max(gaps[0][1],gaps[1][1])]];
      fenceRun(x0,front,x1,front,kind,mid,gaps);
      gate(dx,front,true,3,mid,0.5+r()*0.6);mailbox(x0+gapP+1.0,front+fdir*0.5,detail);
      // séparations entre jardins
      if(ew==="w")fenceRun(x1,z0,x1,z1,"hedge",mid,[]);
      if(ns==="n")fenceRun(x0,z1,x1,z1,"wood",mid,[]);
      // piscine, arbres, mobilier de jardin
      const bz=ns==="n"?z1-3.2:z0+3.2;
      if(r()<0.3){plane(4,2.4,KM.pool,cxl,SIDEWALK+0.03,bz,detail);box(cxl-2.2,bz-1.4,cxl+2.2,bz+1.4,SIDEWALK,SIDEWALK+0.02,KM.white,detail);addObstacle({type:"box",x:cxl,z:bz,hx:2.1,hz:1.3});}
      else terraceSet(cxl+(r()-0.5)*3,bz,detail,STRIPES[md(i,STRIPES.length)]);
      treeAt(ew==="w"?x0+1.6:x1-1.6,bz,r()<0.4?"light":r()<0.6?"conifer":"round",0.75+r()*0.3,mid);
    });
    for(const [x,z] of [[bx0+1.1,bcz],[bx1-1.1,bcz]])prop("lamp",x,z,0);
    signPost(bx0+1,bz0+12,Math.PI/2*-1,ROADSIGN.slow(),detail,2.4,0.6,0.6,true);
    edgeTrees(X,Z,mid,r,"round");
  },
  parking(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop}=C;
    plane(28,26,WM.asphalt,bcx,SIDEWALK+0.008,bcz+1,base,7,7);
    for(const row of [bz0+6,bz0+20])for(let x=bx0+4;x<bx1-3;x+=2.6){plane(0.12,5,KM.park,x,SIDEWALK+0.014,row,base,1,1);
      if(x+1.3<bx1-3&&r()<0.62)parkedCar(x+1.3,row,r()<0.5?0:Math.PI,mid);}
    for(const x of [bx0+3,bx1-3])prop("lamp",x,bcz,0);
    signPost(bx0+1,bz0+1.6,Math.PI,ROADSIGN.park(),detail);put(BX(0.5,1.5,0.4),KM.blue,bcx,SIDEWALK+0.75,bz0+1.6,detail);addObstacle({type:"box",x:bcx,z:bz0+1.6,hx:0.3,hz:0.25});
    edgeTrees(X,Z,mid,r,"round");
  },
  terrain(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop}=C;
    plane(26,15,KM.court,bcx,SIDEWALK+0.01,bcz,base,1,1);registerCourt(bcx,bcz,26,15);basketHoop(bcx-13.5,bcz,Math.PI/2,detail);basketHoop(bcx+13.5,bcz,-Math.PI/2,detail);
    fenceRun(bx0+2,bcz-9,bx1-2,bcz-9,"chain",mid,[[12,16]]);fenceRun(bx0+2,bcz+9,bx1-2,bcz+9,"chain",mid,[]);fenceRun(bx0+2,bcz-9,bx0+2,bcz+9,"chain",mid,[]);fenceRun(bx1-2,bcz-9,bx1-2,bcz+9,"chain",mid,[]);
    for(let i=0;i<3;i++)put(BX(10,0.4,0.6),OM.wood,bcx,SIDEWALK+0.3+i*0.4,bcz+11+i*0.6,detail);addObstacle({type:"box",x:bcx,z:bcz+11.6,hx:5,hz:1});
    edgeTrees(X,Z,mid,r,"light");
  },
  entrepots(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop}=C;
    plane(32,32,WM.asphalt,bcx,SIDEWALK+0.006,bcz,base,8,8);
    const wm=mat({color:["#c9cdd1","#b7c3cc","#d1c6b4"][Math.abs(C.cx+C.cz)%3],map:KM.corrug.map});
    const x0=bx0+4,x1=bx1-4,z0=bz0+9,z1=bz1-4,h=8+r()*4;
    walls(x0,z0,x1,z1,0,h,wm,base,3,h);put(BX(x1-x0+0.6,0.4,z1-z0+0.6),KM.roofSlate,(x0+x1)/2,h+0.2,(z0+z1)/2,base);
    for(let i=0;i<3;i++){const x=x0+4+i*7;put(BX(4,4.2,0.05),KM.roller,x,2.1,z0-0.03,base);put(BX(4.4,1,1.6),KM.stone,x,0.5,z0-0.8,base);}
    put(BX(8,1.1,0.1),signMat(["LOGISTIQUE MARÉE","ENTREPÔTS DU SUD","FRIGOS AZUR","TRANSPORTS VIGIE"][Math.abs(C.cx*5+C.cz)%4],"#20262d","#ffd23a",{w:512,h:72}),(x0+x1)/2,h-1.2,z0-0.06,base);
    addObstacle({type:"box",x:(x0+x1)/2,z:(z0+z1)/2,hx:(x1-x0)/2,hz:(z1-z0)/2,tall:true,bld:true});
    for(let i=0;i<5;i++)prop("crate",x0+2+r()*20,bz0+4+r()*2,0);
    parkedCar(x1-2,bz0+4.5,Math.PI/2,mid,CAR_PAINT[2],"van");
    fenceRun(bx0+1,bz0+1,bx1-1,bz0+1,"chain",mid,[[13,19]]);gate(bcx+0.0,bz0+1,true,6,mid,0.9);
    for(const x of [bx0+3,bx1-3])prop("lamp",x,bz0+2.5,0);
  },
  conteneurs(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail}=C;
    plane(32,32,WM.asphalt,bcx,SIDEWALK+0.006,bcz,base,8,8);
    let k=Math.abs(C.cx*11+C.cz*3);
    for(let row=0;row<3;row++)for(let col=0;col<3;col++){const x=bx0+7+col*8.5,z=bz0+7+row*7.5;const n=1+Math.floor(r()*3);for(let l=0;l<n;l++)container(x,z,true,l,base,k++);}
    // portique de levage
    for(const x of [bx0+3,bx1-3])for(const z of [bz0+3,bz1-3])put(BX(0.6,12,0.6),KM.yellow,x,6,z,base);
    put(BX(27,1,0.8),KM.yellow,bcx,12,bz0+3,base);put(BX(27,1,0.8),KM.yellow,bcx,12,bz1-3,base);put(BX(2,1.5,26),KM.yellow,bcx+r()*8-4,11.5,bcz,base);
    for(const x of [bx0+3,bx1-3])for(const z of [bz0+3,bz1-3])addObstacle({type:"circle",x,z,r:0.4,tall:true});
    fenceRun(bx0+1,bz0+1,bx1-1,bz0+1,"chain",mid,[[13,19]]);
  },
  plage(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop}=C;
    // promenade en bois côté ville, puis le sable jusqu'à la mer
    plane(4,32,KM.plank,bx0+2,SIDEWALK+0.01,bcz,base,4,32);
    for(let z=bz0+3;z<bz1;z+=8){prop("lamp",bx0+0.8,z,0);if(r()<0.6)prop("bench",bx0+3.4,z+4,Math.PI/2*-1+Math.PI);}
    for(let i=0;i<6;i++)treeAt(bx0+5+r()*3,bz0+2+i*5.2+r()*2,"palm",0.9+r()*0.3,mid);
    for(let i=0;i<7;i++){const x=bx0+12+r()*22,z=bz0+2+r()*28;if(obsAt(new V3(x,0,z)).length&&obsAt(new V3(x,0,z)).some(o=>obstacleClosest(o,new V3(x,0,z)).d<2))continue;beachUmbrella(x,z,detail,i+C.cz);}
    if(Math.abs(C.cz)%3===0)lifeguard(bx0+28,bcz,mid);
    if(Math.abs(C.cz)%4===1){for(const z of [bcz-4.5,bcz+4.5])put(CY(0.05,0.05,2.4,6),KM.white,bx0+20,SIDEWALK+1.2,z,detail);{const n=new THREE.Mesh(scaledUV(new THREE.PlaneGeometry(9,1),45,5),KM.chain);n.position.set(bx0+20,SIDEWALK+1.9,bcz);n.rotation.y=Math.PI/2;detail.add(n);addObstacle({type:"box",x:bx0+20,z:bcz,hx:0.05,hz:4.6});}}
    if(Math.abs(C.cz)%5===2)kiosk(bx0+7,bcz,detail,"Glaces · Boissons");
  },
  hotels(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop,camAt}=C;
    // hôtels Art déco face à la plage : bandeaux blancs, tourelle ronde, enseigne au néon, terrasse
    const names=["Hôtel Flamingo","Le Corail Palace","Azur Beach","Hôtel Riviera","Le Pélican","Hôtel Tropicana","Sunset Lodge","Hôtel Miramar"];
    const pastel=[0xf4c2c2,0xbfe3e6,0xf3e6a6,0xd9c7f0,0xc9ecd0,0xf7d6b5];
    for(let k=0;k<2;k++){
      const z0=bz0+3+k*15,z1=z0+12,x0=bx0+10,x1=bx1-3.5,h=10.5+Math.floor(r()*3)*3.2,col=pastel[Math.floor(r()*pastel.length)];
      const wm=mat({color:col,map:FACADES[1].map});walls(x0,z0,x1,z1,0,h,wm,base,4,3.2);box(x0-0.2,z0-0.2,x1+0.2,z1+0.2,h,h+0.6,KM.white,base);
      for(let y=3.2;y<h;y+=3.2)box(x1,z0-0.2,x1+0.6,z1+0.2,y,y+0.18,KM.white,base);         // bandeaux « sourcils » côté plage
      put(CY(2.2,2.2,h+1.8,20),mat({color:col}),x1,(h+1.8)/2,z0+1,base);put(CY(2.4,2.4,0.4,20),KM.white,x1,h+1.9,z0+1,base);
      box(x1+0.1,(z0+z1)/2-0.4,x1+1.4,(z0+z1)/2+0.4,3,h+3.5,KM.white,base);                   // aileron vertical
      const nm=names[Math.abs(C.cz*2+k)%names.length];
      const sg=put(BX(0.15,1.1,6),signMat(nm,"#1b1b2a",["#ff5fa8","#5ff2ff","#ffd65f"][k%3],{w:512,h:96,glow:true}),x1+1.5,h+2.4,(z0+z1)/2,base);
      put(BX(0.1,2.6,3),KM.glass,x1+0.02,1.4,(z0+z1)/2,base);
      addObstacle({type:"box",x:(x0+x1)/2,z:(z0+z1)/2,hx:(x1-x0)/2,hz:(z1-z0)/2,tall:true,bld:true});addObstacle({type:"circle",x:x1,z:z0+1,r:2.2,tall:true});
      for(let t=0;t<3;t++)terraceSet(x1+2.4,z0+2.5+t*3.6,detail,STRIPES[md(t+k,STRIPES.length)]);
      // piscine derrière
      plane(6,7,KM.pool,bx0+5,SIDEWALK+0.03,(z0+z1)/2,detail);box(bx0+1.8,(z0+z1)/2-3.7,bx0+8.2,(z0+z1)/2+3.7,SIDEWALK,SIDEWALK+0.03,KM.white,detail);addObstacle({type:"box",x:bx0+5,z:(z0+z1)/2,hx:3,hz:3.5});
    }
    for(let z=bz0+3;z<bz1;z+=7)treeAt(bx1-1.1,z,"palm",0.9+r()*0.2,mid,0.25);
    prop("lamp",bx1-1.2,bcz+1.5,0);camAt(bx1-0.8,bz0+0.8,Math.atan2(-1,1));
  },
  terrain_vague(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop}=C;
    // un terrain laissé à l'abandon : terre, herbes folles, mur tagué, vieille voiture, déchets
    for(let i=0;i<22;i++)put(geo("weed",()=>new THREE.IcosahedronGeometry(0.5,0)),i%3?KMP_BUSH:OM.leaf2,bx0+2+r()*28,SIDEWALK+0.2,bz0+2+r()*28,detail,r()*3,1+r(),0.5+r()*0.6,1+r());
    for(let i=0;i<7;i++){const x=bx0+3+r()*26,z=bz0+3+r()*26,s=0.3+r()*0.5;put(geo("rock",()=>new THREE.DodecahedronGeometry(1,0)),KM.stone,x,SIDEWALK+s*0.3,z,detail,r()*3,s*1.4,s*0.6,s);}
    const wz=bz0+5;box(bx0+6,wz,bx1-6,wz+0.4,SIDEWALK,SIDEWALK+2.6,KM.stone,base);put(BX(bx1-bx0-12.2,2.4,0.02),graffitiMat(Math.abs(C.cx*3+C.cz)),bcx,SIDEWALK+1.3,wz+0.42,base);addObstacle({type:"box",x:bcx,z:wz+0.2,hx:(bx1-bx0-12)/2,hz:0.2,tall:true});
    parkedCar(bcx+5,bcz+6,0.4>r()?0:Math.PI/2,mid,mat({color:0x7a4a2a,roughness:0.9}));
    for(let i=0;i<5;i++)put(geo("bag",()=>new THREE.SphereGeometry(0.35,8,6)),KM.dark,bx0+4+r()*6,SIDEWALK+0.25,bz1-4-r()*3,detail,0,1,0.8,1);
    treeAt(bx1-4,bz1-4,"light",1.1,mid);treeAt(bx0+4,bcz+4,"round",0.9,mid);
    fenceRun(bx0+1,bz1-1,bx1-1,bz1-1,"chain",mid,[[10,14]]);edgeTrees(X,Z,mid,r,"round");
  },
  jardin(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop}=C;
    // jardins partagés : carrés de légumes, cabane, arrosoirs, bancs
    for(let ix=0;ix<4;ix++)for(let iz=0;iz<3;iz++){const x=bx0+6+ix*6.5,z=bz0+7+iz*7.5;box(x-2,z-1.4,x+2,z+1.4,SIDEWALK,SIDEWALK+0.35,KM.plank,detail);plane(3.8,2.6,CMP.dirt,x,SIDEWALK+0.36,z,detail,1,1);
      for(let k=0;k<6;k++)put(geo("veg",()=>new THREE.IcosahedronGeometry(0.22,0)),KM.fruit[(ix+iz+k)%4===0?3:3],x-1.5+(k%3)*1.5,SIDEWALK+0.55,z-0.6+Math.floor(k/3)*1.2,detail,0,1,0.8+((k*7)%3)*0.3,1);
      addObstacle({type:"box",x,z,hx:2,hz:1.4});}
    walls(bx1-7,bz1-7,bx1-3,bz1-3,SIDEWALK,2.4,KM.plank,base,2,2.4);gableRoof(bx1-7,bz1-7,bx1-3,bz1-3,SIDEWALK+2.4,1,KM.roofSlate,base);addObstacle({type:"box",x:bx1-5,z:bz1-5,hx:2,hz:2,tall:true,bld:true});
    prop("bench",bx0+4,bz1-3,0);prop("bench",bcx,bz1-3,0);put(BX(4,0.6,0.08),signMat("Jardins partagés","#2d6b3f","#fff",{w:512,h:72}),bx0+5,1.6,bz0+1.5,detail);
    fenceRun(bx0+1.5,bz0+1.5,bx1-1.5,bz0+1.5,"wood",mid,[[12,16]]);edgeTrees(X,Z,mid,r,"light");
  },
  skatepark(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop}=C;
    plane(30,30,WM.pave,bcx,SIDEWALK+0.006,bcz,base,8,8);
    const conc=KM.stone;
    for(const [x,z,ry] of [[bx0+4,bcz,Math.PI/2],[bx1-4,bcz,-Math.PI/2]]){const q=put(geo("qpipe",()=>{const s=new THREE.Shape();s.moveTo(0,0);s.lineTo(3,0);s.lineTo(3,2.2);s.quadraticCurveTo(0.6,2.0,0,0);const e=new THREE.ExtrudeGeometry(s,{depth:8,bevelEnabled:false});e.translate(-3,0,-4);return e;}),conc,x,SIDEWALK,z,base,ry);addObstacle({type:"box",x,z,hx:1.5,hz:4,tall:false});}
    box(bcx-3,bcz-1,bcx+3,bcz+1,SIDEWALK,SIDEWALK+0.6,conc,base);put(BX(5,0.05,0.05),KM.chrome,bcx,SIDEWALK+0.65,bcz+0.9,base);addObstacle({type:"box",x:bcx,z:bcz,hx:3,hz:1});
    put(BX(0.05,0.05,6),KM.chrome,bcx,SIDEWALK+0.5,bcz-6,base);for(const z of [bcz-8.8,bcz-3.2])put(BX(0.05,0.5,0.05),KM.chrome,bcx,SIDEWALK+0.25,z,base);
    box(bx0+5,bz1-4,bx1-5,bz1-3.6,SIDEWALK,SIDEWALK+2.2,KM.stone,base);put(BX(bx1-bx0-10.2,2,0.02),graffitiMat(Math.abs(C.cx+C.cz*7)),bcx,SIDEWALK+1.1,bz1-4.02,base);addObstacle({type:"box",x:bcx,z:bz1-3.8,hx:(bx1-bx0-10)/2,hz:0.2,tall:true});
    prop("bench",bx0+4,bz0+3,0);prop("bench",bx1-4,bz0+3,0);prop("bin",bcx,bz0+2,0);edgeTrees(X,Z,mid,r,"palm");
  },
  foodtrucks(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop}=C;
    const trucks=[["Tacos Sol","#c46a1e"],["Burger Phare","#c8102e"],["Crêpes Écume","#3a8ab0"],["Bubble Tea Lagune","#7a3a8a"],["Pizza Volcan","#a8321e"]];
    let k=Math.abs(C.cx*5+C.cz*3);
    for(let i=0;i<3;i++){const [nm,col]=trucks[(k+i)%trucks.length],x=bx0+7+i*9,z=bz0+6;
      const tr=new THREE.Group();tr.position.set(x,SIDEWALK,z);detail.add(tr);put(BX(2.4,2.6,5.4),mat({color:col}),0,1.6,0,tr);put(BX(0.05,1.1,3),KM.glass,1.22,2,0,tr);put(BX(0.08,0.55,4),signMat(nm,"#111","#fff",{w:512,h:64,glow:true}),1.28,3.1,0,tr);
      const aw=put(BX(1.2,0.04,3.6),STRIPES[(k+i)%STRIPES.length],1.8,2.7,0,tr);aw.rotation.z=-0.25;for(const s of [-1.8,1.8])put(geo("wheel",()=>new THREE.CylinderGeometry(0.33,0.33,0.22,12).rotateZ(Math.PI/2)),KM.tire,1.1,0.33,s,tr);
      tr.rotation.y=-Math.PI/2;addObstacle({type:"box",x,z,hx:2.8,hz:1.3});addShop(nm,x,z+2.3);}
    for(let i=0;i<6;i++)picnic(bx0+6+(i%3)*9,bz0+16+Math.floor(i/3)*7,detail);
    // guirlandes lumineuses
    for(const x of [bx0+3,bx1-3])for(const z of [bz0+13,bz1-4]){put(CY(0.06,0.06,4,6),OM.metal,x,SIDEWALK+2,z,mid);addObstacle({type:"circle",x,z,r:0.1});}
    for(let t=0;t<1;t+=0.04)for(const z of [bz0+13,bz1-4]){const x=lerp(bx0+3,bx1-3,t);put(geo("bulb",()=>new THREE.SphereGeometry(0.08,6,4)),new THREE.MeshBasicMaterial({color:0xffe7a0}),x,SIDEWALK+3.9-Math.sin(t*Math.PI)*0.6,z,mid);}
    prop("bin",bx0+2,bcz,0);prop("bin",bx1-2,bcz,0);edgeTrees(X,Z,mid,r,"palm");
  },
  foire(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop}=C;
    // grande roue
    const wx=bcx-4,wz=bz0+9,hub=SIDEWALK+11.5,R=9;
    for(const s of [-1,1])for(const d of [-1,1]){const leg=put(BX(0.35,12.6,0.35),KM.white,wx+d*2.4,SIDEWALK+5.8,wz+s*1.1,base);leg.rotation.z=d*0.2;}
    box(wx-4,wz-1.6,wx+4,wz+1.6,SIDEWALK,SIDEWALK+0.4,KM.stone,base);addObstacle({type:"box",x:wx,z:wz,hx:4,hz:1.6});
    const wheel=new THREE.Group();wheel.position.set(wx,hub,wz);wheel.userData.keep=true;base.add(wheel);
    for(const s of [-0.6,0.6]){const rim=put(geo("rim",()=>new THREE.TorusGeometry(R,0.12,6,48)),KM.red,0,0,s,wheel);}
    for(let i=0;i<12;i++){const sp=put(geo("spoke",()=>new THREE.BoxGeometry(0.1,R,0.1).translate(0,R/2,0)),KM.white,0,0,0,wheel);sp.rotation.z=i*Math.PI/6;}
    put(geo("whub",()=>new THREE.CylinderGeometry(0.6,0.6,1.6,12).rotateX(Math.PI/2)),KM.chrome,0,0,0,wheel);
    const cabG=new THREE.Group();cabG.position.set(wx,hub,wz);cabG.userData.keep=true;base.add(cabG);const cabs=[];
    for(let i=0;i<12;i++){const c=new THREE.Group();cabG.add(c);put(BX(1.3,1.1,1.1),[KM.red,KM.blue,KM.green,KM.white][i%4],0,-0.75,0,c);put(BX(1.4,0.08,1.2),KM.white,0,-0.15,0,c);cabs.push(c);}
    wheel.userData.spd=0.12;wheel.userData.cabins=cabs;wheel.userData.R=R;turbines.push(wheel);
    // manège
    const mx=bx1-8,mz=bz1-9;box(mx-4.6,mz-4.6,mx+4.6,mz+4.6,SIDEWALK,SIDEWALK+0.01,KM.stone,base);
    const car=new THREE.Group();car.position.set(mx,SIDEWALK,mz);car.userData.keep=true;car.userData.ax="y";car.userData.spd=0.7;mid.add(car);turbines.push(car);
    put(CY(4.2,4.2,0.4,24),KM.white,0,0.2,0,car);put(geo("carRoof",()=>new THREE.ConeGeometry(4.6,1.8,24)),STRIPES[2],0,4.6,0,car);put(CY(0.35,0.35,4.2,10),KM.chrome,0,2.3,0,car);
    for(let i=0;i<8;i++){const a=i*Math.PI/4,x=Math.cos(a)*3.1,z=Math.sin(a)*3.1;put(CY(0.04,0.04,3.4,6),KM.chrome,x,2.1,z,car);put(BX(0.35,0.7,1.2),[KM.white,KM.red,KM.blue][i%3],x,1.3+(i%2)*0.3,z,car,-a);}
    addObstacle({type:"circle",x:mx,z:mz,r:4.4,tall:true});
    // stands, guirlandes, bancs
    for(let i=0;i<3;i++)marketStall(bx0+5+i*5,bz1-4,Math.PI,detail,i+2);
    addShop("Barbe à papa & churros",bx0+10,bz1-6.6);
    for(let t=0;t<1;t+=0.05){const x=lerp(bx0+2,bx1-2,t);put(geo("bulb",()=>new THREE.SphereGeometry(0.08,6,4)),[KM.red,KM.white,KM.blue][Math.floor(t*20)%3],x,SIDEWALK+4.2-Math.sin(t*Math.PI)*0.9,bcz+1,mid);}
    prop("bench",bx1-3,bcz-6,Math.PI/2);prop("bench",bx0+3,bcz+2,-Math.PI/2);prop("bin",bcx,bcz+3,0);
    put(BX(5,0.9,0.12),signMat("FÊTE FORAINE","#7a1f6a","#ffe066",{w:512,h:96,glow:true}),bcx,4.2,bz0+1.2,mid);
    edgeTrees(X,Z,mid,r,"palm");
  },
  etang_urbain(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop}=C;
    const m=new THREE.Mesh(geo("upond",()=>new THREE.CircleGeometry(10,36).rotateX(-Math.PI/2)),CMP.pond);m.position.set(bcx,SIDEWALK+0.03,bcz);base.add(m);
    const rim=new THREE.Mesh(geo("upondRim",()=>new THREE.RingGeometry(10,10.8,36).rotateX(-Math.PI/2)),KM.stone);rim.position.set(bcx,SIDEWALK+0.04,bcz);base.add(rim);
    addObstacle({type:"circle",x:bcx,z:bcz,r:10.3});
    for(let i=0;i<6;i++){const a=i*Math.PI/3+0.3;prop("bench",bcx+Math.cos(a)*12.4,bcz+Math.sin(a)*12.4,-a+Math.PI/2);}
    for(let i=0;i<5;i++){const a=r()*6.28,d=r()*6;const duck=put(geo("duck",()=>new THREE.SphereGeometry(0.18,8,6)),KM.white,bcx+Math.cos(a)*d,SIDEWALK+0.12,bcz+Math.sin(a)*d,detail,0,1.4,0.8,1);}
    put(BX(2,0.06,4.5),KM.plank,bcx+9,SIDEWALK+0.25,bcz,base);
    for(let i=0;i<10;i++){const a=r()*6.28;treeAt(bcx+Math.cos(a)*14.2,bcz+Math.sin(a)*14.2,r()<0.5?"round":"light",0.9+r()*0.3,mid);}
    put(BX(3,0.5,0.06),signMat("Étang des Canards","#2d6b3f","#fff",{w:512,h:72}),bx0+4,1.6,bz0+1.5,detail);
    edgeTrees(X,Z,mid,r,"round");
  },
  // ---------------------------------------------------- lieux uniques
  commissariat(ch,C){const {bx0,bz0,bx1,bz1,bcx,bcz,base,mid,detail,prop,r,X,Z}=C;
    const x0=bx0+5,x1=bx1-5,z0=bz0+5,z1=bz0+18,h=10;walls(x0,z0,x1,z1,0,h,FACADES[4],base,4,3.2);box(x0,z0,x1,z1,h,h+0.5,KM.stone,base);
    put(BX(9,1.2,0.15),signMat("POLICE","#163a7a","#fff",{w:512,h:96,glow:true}),bcx,h-1.3,z0-0.1,base);put(BX(2.2,2.6,0.06),KM.glass,bcx,1.3,z0-0.04,base);
    addObstacle({type:"box",x:bcx,z:(z0+z1)/2,hx:(x1-x0)/2,hz:(z1-z0)/2,tall:true,bld:true});
    for(let i=0;i<3;i++)parkedCar(bx0+6+i*3,bz0+23,0,mid,KM.white,"police");
    put(CY(0.06,0.06,8,6),KM.chrome,bx0+3,4,bz0+3,mid);put(BX(1.6,1,0.02),KM.blue,bx0+3.85,7.4,bz0+3,mid);addObstacle({type:"circle",x:bx0+3,z:bz0+3,r:0.1});
    for(let x=bx0+6;x<bx1-5;x+=2.5)prop("bollard",x,bz0+2.4,0);
    fenceRun(bx0+1,bz0+20,bx1-1,bz0+20,"rail",mid,[[4,7]]);edgeTrees(X,Z,mid,r,"round");
  },
  hopital(ch,C){const {bx0,bz0,bx1,bz1,bcx,bcz,base,mid,detail,prop,r,X,Z}=C;
    const x0=bx0+4,x1=bx1-4,z0=bz0+8,z1=bz1-4,h=16;walls(x0,z0,x1,z1,0,h,FACADES[1],base,4,3.2);box(x0,z0,x1,z1,h,h+0.5,KM.stone,base);
    put(BX(12,1.6,0.15),signMat("HÔPITAL","#ffffff","#c8102e",{w:512,h:96,cross:"#c8102e",glow:true}),bcx,h-1.6,z0-0.1,base);
    box(bcx-4,z0-4,bcx+4,z0,3.6,3.9,KM.white,base);for(const x of [bcx-3.8,bcx+3.8])put(CY(0.12,0.12,3.6,8),KM.white,x,1.8,z0-3.8,base);
    addObstacle({type:"box",x:bcx,z:(z0+z1)/2,hx:(x1-x0)/2,hz:(z1-z0)/2,tall:true,bld:true});
    for(const x of [bcx-3.8,bcx+3.8])addObstacle({type:"circle",x,z:z0-3.8,r:0.15});
    parkedCar(bx0+4,bz0+4,Math.PI/2,mid,KM.white,"ambulance");parkedCar(bx1-4,bz0+4,Math.PI/2,mid,KM.white,"ambulance");
    prop("bench",bx0+3,bz1-2,0);prop("bench",bx1-3,bz1-2,0);edgeTrees(X,Z,mid,r,"light");
  },
  ecole(ch,C){const {bx0,bz0,bx1,bz1,bcx,bcz,base,mid,detail,prop,r,X,Z}=C;
    const x0=bx0+4,x1=bx1-4,z0=bz0+4,z1=bz0+13,h=7;walls(x0,z0,x1,z1,0,h,KM.houseWall[4],base,3,2.9);gableRoof(x0,z0,x1,z1,h,2,KM.roofTile,base);
    put(BX(14,1,0.12),signMat("Groupe scolaire des Mouettes","#f4efe6","#1b3f7a",{w:768,h:72}),bcx,h-0.9,z0-0.08,base);
    addObstacle({type:"box",x:bcx,z:(z0+z1)/2,hx:(x1-x0)/2,hz:(z1-z0)/2,tall:true,bld:true});
    plane(22,13,KM.court,bcx,SIDEWALK+0.01,bz0+22,base,1,1);registerCourt(bcx,bz0+22,22,13);basketHoop(bcx-11.5,bz0+22,Math.PI/2,detail);basketHoop(bcx+11.5,bz0+22,-Math.PI/2,detail);
    playground(bx0+5,bz1-4,detail);
    fenceRun(bx0+2,bz0+15,bx1-2,bz0+15,"rail",mid,[[13,17]]);gate(bcx,bz0+15,true,4,mid,0.3);
    signPost(bx0+0.9,bz0+9,0,ROADSIGN.school(),detail,2.4,0.7,0.7);edgeTrees(X,Z,mid,r,"round");
  },
  station(ch,C){const {bx0,bz0,bx1,bz1,bcx,bcz,base,mid,detail,prop,r,X,Z}=C;
    plane(32,32,WM.asphalt,bcx,SIDEWALK+0.006,bcz,base,8,8);
    for(const x of [bcx-6,bcx+6])for(const z of [bcz-4,bcz+4]){put(BX(0.35,5,0.35),KM.white,x,2.5,z,base);addObstacle({type:"circle",x,z,r:0.25});}
    put(BX(16,0.8,12),KM.white,bcx,5.4,bcz,base);put(BX(16.1,0.5,12.1),KM.green,bcx,5.0,bcz,base);
    put(BX(8,0.8,0.1),signMat("STATION AZUR","#1f6a4a","#fff",{w:512,h:72,glow:true}),bcx,5.4,bcz-6.06,base);
    for(const x of [bcx-3,bcx+3])for(const z of [bcz-1.5,bcz+1.5])pumps(x,z,detail);
    box(bx0+3,bz1-8,bx0+14,bz1-3,0,3.6,KM.houseWall[1],base);put(BX(6,2.4,0.05),KM.shop,bx0+8.5,1.3,bz1-8.03,base);put(BX(5,0.6,0.1),signMat("Boutique","#1f6a4a","#fff",{w:256,h:64}),bx0+8.5,3.1,bz1-8.1,base);
    addObstacle({type:"box",x:bx0+8.5,z:bz1-5.5,hx:5.5,hz:2.5,tall:true,bld:true});
    put(CY(0.15,0.15,6,6),KM.chrome,bx1-2,3,bz0+2,mid);put(BX(1.8,2.2,0.2),signMat("1,89 €","#1f6a4a","#ffd23a",{w:256,h:256}),bx1-2,6.6,bz0+2,mid);addObstacle({type:"circle",x:bx1-2,z:bz0+2,r:0.2});
    parkedCar(bcx-3,bcz-1.5+3.5*0,0,mid);
  },
  eglise(ch,C){const {bx0,bz0,bx1,bz1,bcx,bcz,base,mid,detail,prop,r,X,Z}=C;
    const x0=bcx-5,x1=bcx+5,z0=bz0+8,z1=bz1-3;walls(x0,z0,x1,z1,0,9,mat({color:0xe9e2d2,map:KM.houseWall[1].map}),base,3,9);gableRoof(x0,z0,x1,z1,9,4.5,KM.roofSlate,base);
    box(bcx-2.2,z0-4.4,bcx+2.2,z0,0,17,KM.stone,base);put(geo("spire",()=>new THREE.ConeGeometry(2.6,8,4).rotateY(Math.PI/4)),KM.roofSlate,bcx,21,z0-2.2,base);
    put(BX(0.15,1.6,0.15),KM.yellow,bcx,25.6,z0-2.2,base);put(BX(0.9,0.15,0.15),KM.yellow,bcx,25.9,z0-2.2,base);
    put(BX(2.2,3.6,0.06),KM.door,bcx,1.9,z0-4.43,base);put(geo("rose",()=>new THREE.CircleGeometry(1.1,20)),mat({color:0x6a7fb0,emissive:0x223355,metalness:0.4}),bcx,12,z0-4.42,base,Math.PI);
    addObstacle({type:"box",x:bcx,z:(z0+z1)/2,hx:5,hz:(z1-z0)/2,tall:true,bld:true});addObstacle({type:"box",x:bcx,z:z0-2.2,hx:2.2,hz:2.2,tall:true,bld:true});
    put(BX(8,0.7,0.1),signMat("Chapelle Saint-Ange","#3a2a1a","#f2e6b8",{w:512,h:64}),bcx,0.9,bz0+1.6,detail);
    for(const x of [bx0+4,bx1-4])prop("bench",x,bz0+5,0);for(const [x,z] of [[bx0+3,bz1-4],[bx1-3,bz1-4],[bx0+3,bcz],[bx1-3,bcz]])treeAt(x,z,"conifer",1,mid);
  },
  supermarche(ch,C){const {bx0,bz0,bx1,bz1,bcx,bcz,base,mid,detail,prop,r,X,Z}=C;
    const x0=bx0+3,x1=bx1-3,z0=bz0+16,z1=bz1-3,h=7;walls(x0,z0,x1,z1,0,h,mat({color:0xe7e2d8,map:KM.corrug.map}),base,3,h);put(BX(x1-x0,0.3,z1-z0),KM.roofSlate,bcx,h+0.15,(z0+z1)/2,base);
    put(BX(10,1.8,0.2),signMat("MARCHÉ AZUR","#c8102e","#fff",{w:512,h:96,glow:true}),bcx,h-0.4,z0-0.12,base);put(BX(6,2.8,0.05),KM.glass,bcx,1.4,z0-0.04,base);
    addObstacle({type:"box",x:bcx,z:(z0+z1)/2,hx:(x1-x0)/2,hz:(z1-z0)/2,tall:true,bld:true});
    plane(28,11,WM.asphalt,bcx,SIDEWALK+0.008,bz0+8.5,base,7,3);
    for(let x=bx0+4;x<bx1-3;x+=2.6){plane(0.12,5,KM.park,x,SIDEWALK+0.014,bz0+6,base,1,1);if(x+1.3<bx1-3&&r()<0.55)parkedCar(x+1.3,bz0+6,0,mid);}
    for(let i=0;i<4;i++)shoppingCart(bcx-6+i*0.7,z0-2,detail,0);
  },
  marche(ch,C){const {bx0,bz0,bx1,bz1,bcx,bcz,base,mid,detail,prop,r,X,Z}=C;
    fountain(bcx,bcz,mid);
    let k=0;for(const z of [bz0+5,bz1-5])for(let x=bx0+5;x<bx1-3;x+=4.2)marketStall(x,z,z<bcz?0:Math.PI,detail,k++);
    for(const x of [bx0+4,bx1-4])for(const z of [bcz-4,bcz+4])prop("bench",x,z,x<bcx?Math.PI/2:-Math.PI/2);
    put(BX(6,0.8,0.1),signMat("Marché du Port","#7a3a1a","#fff4d6",{w:512,h:72}),bcx,3,bz0+1.4,detail);put(CY(0.06,0.06,3,6),OM.metal,bcx-2.8,1.5,bz0+1.4,detail);put(CY(0.06,0.06,3,6),OM.metal,bcx+2.8,1.5,bz0+1.4,detail);
    edgeTrees(X,Z,mid,r,"palm");
  }
};
const QUARTIER_NOMS={pop_rue:"Barrio Coral",pop_marche:"Mercado Coral",pop_place:"Place des Dominos",zenith:"Quartier des affaires",foire:"Fête foraine",etang_urbain:"Étang",terrain_vague:"Terrain vague",jardin:"Jardins partagés",skatepark:"Skatepark",foodtrucks:"Food trucks",hotels:"Front de mer",place:"Place",parc:"Parc",immeubles:"Quartier résidentiel",tours:"Quartier des affaires",commerces:"Rue commerçante",maisons:"Quartier pavillonnaire",parking:"Parking",terrain:"Terrain de sport",entrepots:"Zone industrielle",conteneurs:"Dépôt de conteneurs",plage:"Plage",commissariat:"Commissariat",hopital:"Hôpital",ecole:"École",station:"Station-service",eglise:"Chapelle",supermarche:"Supermarché",marche:"Marché"};
const TYPE_COLOR={pop_rue:"#e8927c",pop_marche:"#e0b04a",pop_place:"#2a9d8f",zenith:"#2b3f57",foire:"#d86ab0",etang_urbain:"#4f8a9a",terrain_vague:"#8a7356",jardin:"#6f9a46",skatepark:"#a3a39d",foodtrucks:"#d8a04a",hotels:"#e8a6b8",place:"#a3a39d",parc:"#5c7d4c",immeubles:"#8f8d86",tours:"#7f8fa8",commerces:"#a89580",maisons:"#9aa58a",parking:"#5a5e66",terrain:"#b35a37",entrepots:"#7b7f86",conteneurs:"#6f6a5f",plage:"#d8c49a",commissariat:"#3a5a9a",hopital:"#d8d8d8",ecole:"#c9a650",station:"#2f7a52",eglise:"#b8ad98",supermarche:"#c06a5a",marche:"#c99a5a"};
// la mer à l'est (on ne peut pas encore y entrer : la nage arrive au module 16)
const seaMesh=new THREE.Mesh(new THREE.PlaneGeometry(1400,2600).rotateX(-Math.PI/2),KM.water);seaMesh.position.set(588+700,0.07,0);scene.add(seaMesh);
function updateSea(dt){KM.water.map.offset.x=(clockT*0.004)%1;KM.water.map.offset.y=Math.sin(clockT*0.2)*0.01;}
