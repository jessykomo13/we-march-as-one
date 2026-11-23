// ================================================================ navigation locale (A* sur une grille de 0,5 m)
// Utilisée quand un passant est coincé : contourne haies, murets, coins de parc et reliefs trop hauts.
const NAV={calls:0,ok:0,fail:0,ms:0};
function navBlocked(x,z,rad){
  const p={x,z};for(const o of obsAt(p)){if(obstacleClosest(o,p).d<rad)return true;}
  // les obstacles débordent parfois sur la cellule voisine de la grille
  for(const [dx,dz] of [[rad+0.5,0],[-rad-0.5,0],[0,rad+0.5],[0,-rad-0.5]]){const q={x:x+dx,z:z+dz};for(const o of obsAt(q))if(obstacleClosest(o,p).d<rad)return true;}
  if(x>SEA_X&&waterDepth(x,z)>1.1)return true;
  return false;
}
function localPath(from,to,opt={}){
  const t0=performance.now();NAV.calls++;
  const S=opt.cell||0.5,rad=opt.rad||0.38,margin=opt.margin||7;
  const x0=Math.min(from.x,to.x)-margin,z0=Math.min(from.z,to.z)-margin,x1=Math.max(from.x,to.x)+margin,z1=Math.max(from.z,to.z)+margin;
  const W=Math.ceil((x1-x0)/S)+1,H=Math.ceil((z1-z0)/S)+1;
  if(W*H>14000){NAV.fail++;return null;}
  const idx=(i,j)=>j*W+i,cx=x=>Math.round((x-x0)/S),cz=z=>Math.round((z-z0)/S);
  const blocked=new Int8Array(W*H).fill(-1),gh=new Float32Array(W*H).fill(NaN);
  const isB=(i,j)=>{const k=idx(i,j);if(blocked[k]<0)blocked[k]=navBlocked(x0+i*S,z0+j*S,rad)?1:0;return blocked[k]===1;};
  const hAt=(i,j)=>{const k=idx(i,j);if(gh[k]!==gh[k])gh[k]=groundAt(x0+i*S,z0+j*S);return gh[k];};
  const si=cx(from.x),sj=cz(from.z),ti=cx(to.x),tj=cz(to.z);
  const g=new Float32Array(W*H).fill(1e9),par=new Int32Array(W*H).fill(-1),closed=new Uint8Array(W*H);
  const heap=[];const push=(k,f)=>{heap.push([f,k]);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p][0]<=heap[i][0])break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p;}};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===i)break;[heap[m],heap[i]]=[heap[i],heap[m]];i=m;}}return top;};
  const hh=(i,j)=>Math.hypot(i-ti,j-tj);
  g[idx(si,sj)]=0;push(idx(si,sj),hh(si,sj));
  let found=-1,best=idx(si,sj),bestH=hh(si,sj),n=0;
  const D=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[1,-1,1.414],[-1,1,1.414],[-1,-1,1.414]];
  while(heap.length&&n<9000){
    const [,k]=pop();if(closed[k])continue;closed[k]=1;n++;
    const i=k%W,j=(k/W)|0;
    if(i===ti&&j===tj){found=k;break;}
    const hk=hh(i,j);if(hk<bestH){bestH=hk;best=k;}
    for(const [di,dj,c] of D){
      const a=i+di,b=j+dj;if(a<0||b<0||a>=W||b>=H)continue;const kk=idx(a,b);if(closed[kk])continue;
      if(isB(a,b)&&!(a===ti&&b===tj))continue;
      if(di&&dj&&(isB(i+di,j)||isB(i,j+dj)))continue;          // pas de coupe en diagonale contre un coin
      if(hAt(a,b)-hAt(i,j)>STEP_UP*0.9)continue;                  // marche trop haute
      const ng=g[k]+c;if(ng<g[kk]){g[kk]=ng;par[kk]=k;push(kk,ng+hh(a,b));}
    }
  }
  NAV.ms+=performance.now()-t0;NAV.dbg={n,W,H,found,si,sj,ti,tj,best,startB:navBlocked(from.x,from.z,rad)};
  const end=found>=0?found:(opt.partial?best:-1);
  if(end<0||end===idx(si,sj)){NAV.fail++;return null;}
  // remonter puis simplifier (garder les points où la direction change)
  const pts=[];for(let k=end;k>=0;k=par[k])pts.push(k);pts.reverse();
  const out=[];let pdx=0,pdz=0;
  for(let q=1;q<pts.length;q++){const a=pts[q-1],b=pts[q],dx=(b%W)-(a%W),dz=((b/W)|0)-((a/W)|0);if(q>1&&(dx!==pdx||dz!==pdz))out.push(new V3(x0+(a%W)*S,0,z0+((a/W)|0)*S));pdx=dx;pdz=dz;}
  const last=pts[pts.length-1];out.push(found>=0?new V3(to.x,0,to.z):new V3(x0+(last%W)*S,0,z0+((last/W)|0)*S));
  NAV.ok++;return out;
}
