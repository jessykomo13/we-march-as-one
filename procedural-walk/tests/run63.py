import asyncio, subprocess
from playwright.async_api import async_playwright
async def main():
    srv=subprocess.Popen(["python3","-m","http.server","8790"],cwd="/tmp/t",stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    await asyncio.sleep(1)
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
        pg=await b.new_page(viewport={"width":800,"height":500}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)+str(e.stack)[:300]))
        await pg.goto("http://localhost:8790/index.html?npc=24&nosave"); await asyncio.sleep(10)
        E=pg.evaluate
        for name,x,z in [("centre",0,0),("resid",-250,260),("industrie",-460,-100),("plage",560,60),("port-soleil",180,-1160),("foire",204,86)]:
            r=await E(f"""()=>{{window.__pause=true;const pl=window.__walkers[0];pl.root.set({x},0.12,{z});pl.setRig(pl.rig,true);let n=0;while(window.__world().queue>0&&n<300){{window.__sim(1,1/60);n++;}}
              const c0=JSON.parse(JSON.stringify(window.__crowd));const still=new Map();let maxStill=0,stuckList=[];
              for(let s=0;s<60;s++){{window.__sim(60,1/60);for(const w of window.__walkers){{if(w===pl||w.isCop)continue;const B=w.brain;const walking=B.mode==='walk'&&!B.redWait&&!B.waitT&&B.goDelay==null&&!B.conv&&w.sit.state==='none'&&!B.leader;
                const k=still.get(w)||{{p:w.root.clone(),t:0}};if(walking&&Math.hypot(w.root.x-k.p.x,w.root.z-k.p.z)<0.3)k.t+=1;else{{k.t=0;k.p.copy(w.root);}}still.set(w,k);if(k.t>maxStill)maxStill=k.t;if(k.t===12)stuckList.push([+w.root.x.toFixed(1),+w.root.z.toFixed(1)]);}}}}
              const c1=window.__crowd;return {{npc:window.__walkers.length,stuck:(c1.stuck||0)-(c0.stuck||0),nav:(c1.nav||0)-(c0.nav||0),maxStill,stuckList:stuckList.slice(0,6),navS:window.__NAV}}}}""")
            print(name,r)
        print("ERR",errs[:4]); await b.close()
    srv.kill()
asyncio.run(main())
