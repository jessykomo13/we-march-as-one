import asyncio, subprocess
from playwright.async_api import async_playwright
async def main():
    srv=subprocess.Popen(["python3","-m","http.server","8790"],cwd="/tmp/t",stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    await asyncio.sleep(1)
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--autoplay-policy=no-user-gesture-required"])
        pg=await b.new_page(viewport={"width":1000,"height":620}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)+str(e.stack)[:400]))
        await pg.goto("http://localhost:8790/index.html?npc=20&nosave"); await asyncio.sleep(10)
        E=pg.evaluate
        await E("()=>{document.getElementById('hud').style.display='none'}")
        print(await E("()=>{const o={};for(let i=-9;i<=-4;i++)for(let j=4;j<=10;j++){const t=window.__chunkType(i,j);o[t]=(o[t]||0)+1;}return o}"))
        for name,x,z,yaw,pitch,dist in [("rue",-6*40-14,6*40+2,200,10,9),("rue2",-8*40+4,5*40-14,180,14,14),("marche",-7*40+4,7*40-13,0,22,16),("place",-5*40+4,5*40+4,30,25,20),("haut",-6*40,6*40,45,40,60)]:
            await E(f"()=>{{window.__pause=true;const pl=window.__walkers[0];pl.root.set({x},0.12,{z});pl.setRig(pl.rig,true);window.__sim(20,1/60);let n=0;while(window.__world().queue>0&&n<300){{window.__sim(1,1/60);n++;}}window.__sim(150,1/60);window.__cam.yaw={yaw};window.__cam.pitch={pitch};window.__cam.dist={dist};window.__sim(20,1/60);window.__pause=false;}}")
            await asyncio.sleep(3); await pg.screenshot(path=f"/tmp/p_{name}.png")
        r=await E("()=>({w:window.__world(),r:window.__render(),shops:window.__shops.filter(s=>s.x<-150&&s.z>140).length,radios:window.__amb.filter(a=>a.role==='radio').length})"); print(r)
        print("ERR",errs[:4]); await b.close()
    srv.kill()
asyncio.run(main())
