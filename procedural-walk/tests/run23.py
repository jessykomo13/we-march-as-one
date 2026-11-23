import asyncio, subprocess, json
from playwright.async_api import async_playwright
async def main():
    srv=subprocess.Popen(["python3","-m","http.server","8790"],cwd="/tmp/t",stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    await asyncio.sleep(1)
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
        pg=await b.new_page(viewport={"width":900,"height":560})
        errs=[]; pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
        await pg.goto("http://localhost:8790/index.html?npc=14"); await asyncio.sleep(14)
        await pg.evaluate("window.__pause=true")
        r=await pg.evaluate("""()=>{const W=window.__walkers,pl=W[0];
          const n=W.find(w=>!w.isCop&&w!==pl&&!w.brain.leader&&!w.brain.followers);window.__n=n;
          pl.root.set(0,0,0);pl.setRig(pl.rig,true);n.root.set(0,0,-1.5);n.yaw=n.targetYaw=180;n.setRig(n.rig,true);
          n.brain.temper=0.5;n.brain.startFight(n,pl);
          const log=[];let hits=0;const hp0=pl.hp;
          for(let i=0;i<60*60;i++){window.__sim(1,1/60);pl.hp=Math.max(pl.hp,50);
            if(i%120==0){const cop=W.find(w=>w.isCop);log.push({t:i/60|0,sus:window.__suspects.length,cops:W.filter(w=>w.isCop).length,cars:window.__pcars.length,
              copd:cop?+Math.hypot(cop.root.x-n.root.x,cop.root.z-n.root.z).toFixed(1):null,fight:!!n.brain.fight,flee:!!n.brain.flee,sur:!!n.brain.surrender,cuff:!!n.brain.cuffed,alive:W.includes(n),wanted:window.__wanted.level,ko:!!n.ko});}
            if(!W.includes(n))break;}
          log.push({end:true,alive:W.includes(n),wanted:window.__wanted.level,msgs:[...document.querySelectorAll('.bubble')].map(b=>b.textContent).slice(-5)});
          return log;}""")
        for x in r: print(x)
        # KO + ambulance + medics
        r=await pg.evaluate("""()=>{const W=window.__walkers,pl=W[0];
          const n=W.find(w=>!w.isCop&&w!==pl&&!w.isMedic&&!w.ko);n.root.set(4,0,4);n.setRig(n.rig,true);
          for(const o of W)if(o!==pl&&!o.isCop&&o!==n&&!o.isMedic){o.root.set(4+Math.random()*6-3,0,4+Math.random()*6-3);o.setRig(o.rig,true);}
          n.hp=0;n.startKO(new THREE_V(0,0,1),pl,{});
          const log=[];
          for(let i=0;i<60*70;i++){window.__sim(1,1/60);
            if(i%180==0){const V=window.__vans[0];log.push({t:i/60|0,van:V?V.state:null,medics:W.filter(w=>w.isMedic).length,crouch:W.filter(w=>w.isMedic).map(m=>+(m.crouchK||0).toFixed(2)),watch:W.filter(w=>w.brain.watch&&w.brain.watch.body).length,alive:W.includes(n)});}
            if(!window.__vans.length&&i>600)break;}
          return log;}""".replace("new THREE_V(0,0,1)","pl.root.clone().set(0,0,1)"))
        for x in r: print(x)
        print("ERR",errs[:5])
        await b.close()
    srv.kill()
asyncio.run(main())
