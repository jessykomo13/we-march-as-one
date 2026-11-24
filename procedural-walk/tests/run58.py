import asyncio, subprocess, json
from playwright.async_api import async_playwright
async def main():
    srv=subprocess.Popen(["python3","-m","http.server","8790"],cwd="/tmp/t",stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    await asyncio.sleep(1)
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
        pg=await b.new_page(viewport={"width":800,"height":500}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)+str(e.stack)[:500]))
        await pg.goto("http://localhost:8790/index.html?npc=20&nosave"); await asyncio.sleep(10)
        E=pg.evaluate
        await E("()=>{window.__pause=true;window.__sim(120,1/60);}")
        res=[]
        for trial in range(5):
            await E(f"()=>{{const pl=window.__walkers[0];const a={trial}*1.3;pl.root.set(Math.cos(a)*60+4,0.12,Math.sin(a)*60+4);pl.setRig(pl.rig,true);let n=0;while(window.__world().queue>0&&n<200){{window.__sim(1,1/60);n++;}}window.__sim(60,1/60);}}")
            ok=await E("()=>window.__startCourse()")
            if not ok: res.append("nostart");continue
            await E("()=>{const C=window.__EV.cur;const R=C.racer,pl=window.__walkers[0];pl.root.set(R.root.x+1.5,pl.root.y,R.root.z);pl.setRig(pl.rig,true);window.__sim(10,1/60);window.__acceptEvent();pl.root.set(R.root.x-(C.goal.x-R.root.x)/Math.hypot(C.goal.x-R.root.x,C.goal.z-R.root.z)*8,pl.root.y,R.root.z-(C.goal.z-R.root.z)/Math.hypot(C.goal.x-R.root.x,C.goal.z-R.root.z)*8);pl.setRig(pl.rig,true);}")
            stuck=0;last=None;out=None
            for k in range(60):
                r=await E("""()=>{const C=window.__EV.cur;if(!C)return null;const R=C.racer;window.__sim(60*2,1/60);return [Math.round(C.t),+R.root.x.toFixed(1),+R.root.z.toFixed(1),Math.round(Math.hypot(R.root.x-C.goal.x,R.root.z-C.goal.z))]}""")
                if r is None: out=await E("()=>window.__EV.stats"); break
                if last and abs(r[1]-last[1])+abs(r[2]-last[2])<1:
                    stuck+=1
                    if stuck in (3,10): print(await E("()=>{const C=window.__EV.cur,R=C.racer,B=R.brain,p=R.root;return {pos:[p.x,p.z],blk:!!window.__blockOf(p.x,p.z),path:B.path.map(q=>[+q.x.toFixed(1),+q.z.toFixed(1),!!q.xing]),wish:[R.wish.x,R.wish.z],fy:R.faceYaw,run:R.run,ko:R.ko,br:[!!B.fight,!!B.flee,!!B.react],obs:window.__obs.filter(o=>Math.abs(o.x-p.x)<4&&Math.abs(o.z-p.z)<4).map(o=>[o.type,+o.x.toFixed(1),+o.z.toFixed(1),o.hx||o.r,o.hz])}}"))
                last=r
            res.append((trial,last,stuck,out))
        for x in res: print(x)
        print("ERR",errs[:4]); await b.close()
    srv.kill()
asyncio.run(main())
