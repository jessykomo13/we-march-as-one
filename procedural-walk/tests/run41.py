import asyncio, subprocess
from playwright.async_api import async_playwright
async def main():
    srv=subprocess.Popen(["python3","-m","http.server","8790"],cwd="/tmp/t",stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    await asyncio.sleep(1)
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
        pg=await b.new_page(viewport={"width":1000,"height":620}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)+str(e.stack)[:300]))
        await pg.goto("http://localhost:8790/index.html?npc=36&nosave"); await asyncio.sleep(16)
        r=await pg.evaluate("""()=>{window.__pause=true;const W=window.__walkers,pl=W[0];
          const prev=new Map();let maxWait2=0,entries=0,onRed=0,onEnd=0,waits=new Set(),maxWait=0,offZebra=0,road=0,samples=0;
          const onZebra=(x,z)=>{const ix=Math.round((x+16)/40),iz=Math.round((z+16)/40),X=ix*40-16,Z=iz*40-16;const dx=x-X,dz=z-Z;return (Math.abs(dx)<4.6&&Math.abs(Math.abs(dz)-5.5)<1.9)||(Math.abs(dz)<4.6&&Math.abs(Math.abs(dx)-5.5)<1.9);};
          for(let i=0;i<60*180;i++){window.__sim(1,1/60);
            if(i%6)continue;
            for(const w of W){if(w===pl||w.isCop||w.isMedic||!w.brain.pick)continue;const B=w.brain;if(B.fight||B.flee)continue;
              const on=!window.__blockOf(w.root.x,w.root.z);const was=prev.get(w);prev.set(w,on);samples++;
              if(on){road++;if(!onZebra(w.root.x,w.root.z))offZebra++;}
              if(on&&was===false&&B.crossing){entries++;const s=window.__crossSignal(B.crossing);if(s==="stop")onRed++;if(s==="end")onEnd++;}
              {const g=B.path&&B.path[0];if(g&&g.xing&&Math.hypot(g.x-w.root.x,g.z-w.root.z)<1.2){w._wt=(w._wt||0)+0.1;}else w._wt=0;if(w._wt>maxWait2)maxWait2=w._wt;}if(B.redWait>0){waits.add(w);maxWait=Math.max(maxWait,B.redWait);if(B.redWait>40&&!window.__dbgX){const g=B.path[0];window.__dbgX=[B.mode,B.path.length,JSON.stringify(g.xing),window.__crossSignal(g.xing),Math.hypot(g.x-w.root.x,g.z-w.root.z).toFixed(2),B.conv?'conv':'',B.leader?'F':'',B.followers?'L'+B.followers.length:'',w.sit.state,B.watch?'watch':'',g.x.toFixed(1),g.z.toFixed(1)].join(' ');}}}}
          return {traversees:entries,surRouge:onRed,surClignotant:onEnd,ontAttenduAuRouge:waits.size,attenteMax:maxWait.toFixed(1),horsPassage:(100*offZebra/samples).toFixed(2)+'%',vertStats:window.__crossStats.green,dbg:window.__dbgX,attenteReelleMax:maxWait2.toFixed(1)};}""")
        print(r)
        # screenshot intersection near origin with lights
        await pg.evaluate("()=>{const pl=window.__walkers[0];pl.root.set(-9,0.12,-9);pl.setRig(pl.rig,true);window.__cam.yaw=225;window.__cam.pitch=14;window.__cam.dist=7;document.getElementById('hud').style.display='none';}")
        await pg.evaluate("window.__pause=false"); await asyncio.sleep(2)
        await pg.screenshot(path="/tmp/feux.png")
        print("ERR",errs[:4]); await b.close()
    srv.kill()
asyncio.run(main())
