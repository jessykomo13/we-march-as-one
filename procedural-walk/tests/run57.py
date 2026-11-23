import asyncio, subprocess, json
from playwright.async_api import async_playwright
async def main():
    srv=subprocess.Popen(["python3","-m","http.server","8790"],cwd="/tmp/t",stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    await asyncio.sleep(1)
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
        pg=await b.new_page(viewport={"width":1000,"height":620}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)+str(e.stack)[:500]))
        await pg.goto("http://localhost:8790/index.html?npc=20&nosave"); await asyncio.sleep(10)
        E=pg.evaluate
        await E("()=>{window.__pause=true;window.__sim(120,1/60);}")
        r=await E("()=>window.__startVoleur()"); print("voleur",r)
        for k in range(8):
            r=await E("""()=>{const C=window.__EV.cur;if(!C)return 'fin';const T=C.thief,pl=window.__walkers[0];window.__sim(60,1/60);return [+C.t.toFixed(1),+T.root.x.toFixed(1),+T.root.z.toFixed(1),+T.speed.toFixed(2),!!T.brain.flee,Math.round(Math.hypot(T.root.x-pl.root.x,T.root.z-pl.root.z))]}""")
            print(r)
        await E("()=>{window.__pause=false}"); await asyncio.sleep(1); await pg.screenshot(path="/tmp/ev_voleur.png"); await E("()=>{window.__pause=true}")
        # mettre KO le voleur directement
        r=await E("()=>{const C=window.__EV.cur;if(!C)return 'none';const T=C.thief;const pl=window.__walkers[0];T.hp=0;T.startKO(new window.__V3(0,0,1),pl,{});window.__sim(30,1/60);return {m:window.__money(),cur:!!window.__EV.cur,st:window.__EV.stats,lvl:window.__wanted.level}}")
        print("ko",r)
        r=await E("()=>{window.__sim(60*3,1/60);return window.__startCourse()}"); print("course",r)
        r=await E("()=>{const C=window.__EV.cur;const R=C.racer,pl=window.__walkers[0];pl.root.set(R.root.x+1.5,pl.root.y,R.root.z);pl.setRig(pl.rig,true);window.__sim(10,1/60);return [window.__EV.canAccept,C.goal,window.__acceptEvent()]}")
        print("accept",r)
        await E("()=>{window.__pause=false}"); await asyncio.sleep(1); await pg.screenshot(path="/tmp/ev_course.png"); await E("()=>{window.__pause=true}")
        for k in range(14):
            r=await E("""()=>{const C=window.__EV.cur;if(!C)return ['fin',window.__EV.stats];const R=C.racer;window.__sim(60*5,1/60);return [C.step,Math.round(C.t),+R.root.x.toFixed(1),+R.root.z.toFixed(1),+R.speed.toFixed(2),R.brain.path&&R.brain.path.length,Math.round(Math.hypot(R.root.x-C.goal.x,R.root.z-C.goal.z))]}""")
            print(r)
            if r[0]=='fin': break
        print("ERR",errs[:4]); await b.close()
    srv.kill()
asyncio.run(main())
