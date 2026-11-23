// ================================================================ MODULE 39 (début) : la radio de la voiture
// Trois stations inventées, entièrement générées (WebAudio) : Azur FM (pop solaire), Coral Latino (dembow),
// Vigie Rock (guitares saturées). T (ou toucher le compteur) : station suivante.
const RADIO={st:0,next:0,step:0,g:null,shaper:null,banT:0};
const STATIONS=[{name:"Radio coupée"},{name:"Azur FM",sub:"les tubes du soleil",bpm:112},{name:"Coral Latino",sub:"el ritmo del barrio",bpm:94},{name:"Vigie Rock",sub:"ça décoiffe sur la côte",bpm:128}];
function radioNodes(){const c=audio();if(!c)return null;if(!RADIO.g){RADIO.g=c.createGain();RADIO.g.gain.value=0;RADIO.g.connect(sfxOut());
  const ws=c.createWaveShaper(),k=new Float32Array(256);for(let i=0;i<256;i++){const x=i/128-1;k[i]=Math.tanh(x*4);}ws.curve=k;ws.connect(RADIO.g);RADIO.shaper=ws;}return c;}
function rNote(c,t,f,type,dur,vol,dest,att=0.005){const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+att);g.gain.exponentialRampToValueAtTime(0.0008,t+dur);o.connect(g);g.connect(dest||RADIO.g);o.start(t);o.stop(t+dur+0.02);}
function rKick(c,t,v=0.5){const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(42,t+0.12);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.25);o.connect(g);g.connect(RADIO.g);o.start(t);o.stop(t+0.3);}
function rNoise(c,t,dur,v,hp){const n=c.createBufferSource(),b=c.createBuffer(1,Math.max(1,c.sampleRate*dur|0),c.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*(1-i/a.length);n.buffer=b;const f=c.createBiquadFilter();f.type="highpass";f.frequency.value=hp;const g=c.createGain();g.gain.value=v;n.connect(f).connect(g).connect(RADIO.g);n.start(t);}
const MF=n=>440*Math.pow(2,(n-69)/12);
function radioNext(){RADIO.st=(RADIO.st+1)%STATIONS.length;RADIO.step=0;const S=STATIONS[RADIO.st];misBanner("📻 "+S.name,S.sub||"",RADIO.st?"#7fd8ff":"#9aa3ad");}
addEventListener("keydown",e=>{if(e.code==="KeyT"&&drive&&!menuOpen){e.preventDefault();e.stopImmediatePropagation();radioNext();}},true);
speedoEl.addEventListener("pointerdown",e=>{if(drive){e.stopPropagation();radioNext();}});
{const st=document.createElement("style");st.textContent=".touch #speedo{pointer-events:auto}.touch #speedo small::after{content:' · 📻'}";document.head.appendChild(st);}
function updateRadio(dt){
  const on=drive&&RADIO.st>0&&!menuOpen;
  if(!on){if(RADIO.g)RADIO.g.gain.setTargetAtTime(0,actx.currentTime,0.15);return;}
  const c=radioNodes();if(!c||c.state!=="running")return;RADIO.g.gain.setTargetAtTime((SET.music??1)*0.14,c.currentTime,0.2);
  const S=STATIONS[RADIO.st],six=60/S.bpm/4;if(RADIO.next<c.currentTime)RADIO.next=c.currentTime+0.05;
  while(RADIO.next<c.currentTime+0.3){const t=RADIO.next,s=RADIO.step%16,bar=Math.floor(RADIO.step/16)%4;
    if(RADIO.st===1){const prog=[[60,64,67],[67,71,74],[69,72,76],[65,69,72]][bar];
      if(s%4===0)rKick(c,t,0.45);if(s%4===2)rNoise(c,t,0.05,0.12,7000);if(s===4||s===12)rNoise(c,t,0.18,0.25,1800);
      if(s%2===0)rNote(c,t,MF(prog[0]-24+(s%8===6?7:0)),"triangle",six*1.8,0.22);
      if(s===0||s===8)for(const n of prog)rNote(c,t,MF(n),"square",six*7,0.035,null,0.04);
      if([0,3,6,10,12].includes(s)&&RADIO.step%64<48)rNote(c,t,MF(prog[(s/3|0)%3]+12),"sine",six*1.5,0.08);}
    else if(RADIO.st===2){const root=[57,53,55,52][bar];
      if(s===0||s===8)rKick(c,t,0.5);if([3,6,11,14].includes(s))rNoise(c,t,0.09,0.3,2500);if(s%2===1)rNoise(c,t,0.03,0.06,8000);
      if(s===0||s===6||s===8||s===14)rNote(c,t,MF(root-24),"sine",six*2.2,0.35);
      const pent=[0,3,5,7,10];if(s%2===0&&Math.sin(RADIO.step*1.7)>-0.2)rNote(c,t,MF(root+12+pent[(RADIO.step*7+s)%5]),"triangle",six*1.2,0.09);}
    else if(RADIO.st===3){const root=[52,52,55,50][bar];
      if(s===0||s===8||s===10)rKick(c,t,0.5);if(s===4||s===12)rNoise(c,t,0.16,0.35,1500);if(s%2===0)rNoise(c,t,0.04,0.07,9000);
      if(s%2===0){for(const iv of [0,7,12])rNote(c,t,MF(root-12+iv),"sawtooth",six*1.9,0.05,RADIO.shaper);}
      if(s===0)rNote(c,t,MF(root-24),"sawtooth",six*6,0.12,RADIO.shaper);}
    RADIO.next+=six;RADIO.step++;}
}
