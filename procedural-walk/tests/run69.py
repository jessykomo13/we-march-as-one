import asyncio, subprocess
from playwright.async_api import async_playwright
async def main():
    srv=subprocess.Popen(["python3","-m","http.server","8790"],cwd="/tmp/t",stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    await asyncio.sleep(1)
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
        pg=await b.new_page(viewport={"width":1000,"height":620}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)+str(e.stack)[:400]))
        await pg.goto("http://localhost:8790/index.html?npc=20&nosave"); await asyncio.sleep(10)
        E=pg.evaluate
        await E("()=>{document.getElementById('hud').style.display='none'}")
        shots=[("rue",30,-16,200,4,6),("zenith",44,-14,180,2,10),("haut",0,0,30,35,40),("loin",-300,250,135,6,8),("plage",560,30,270,4,8)]
        for name,x,z,yaw,pitch,dist in shots:
            await E(f"()=>{{window.__pause=true;const pl=window.__walkers[0];pl.root.set({x},0.12,{z});pl.setRig(pl.rig,true);window.__sim(20,1/60);let n=0;while(window.__world().queue>0&&n<300){{window.__sim(1,1/60);n++;}}window.__sim(60,1/60);window.__cam.yaw={yaw};window.__cam.pitch={pitch};window.__cam.dist={dist};window.__sim(20,1/60);window.__pause=false;}}")
            await asyncio.sleep(3); await pg.screenshot(path=f"/tmp/z_{name}.png")
        r=await E("()=>({w:window.__world(),r:window.__render()})"); print(r)
        # essayer de traverser une tour
        r=await E("""()=>{window.__pause=true;const pl=window.__walkers[0];pl.root.set(44,0.12,-52);pl.setRig(pl.rig,true);window.__sim(20,1/60);
          for(let i=0;i<300;i++){window.__keys.add('KeyW');window.__sim(1,1/60);}window.__keys.delete('KeyW');return [pl.root.x,pl.root.z]}""")
        print("walk into zenith",r)
        print("ERR",errs[:4]); await b.close()
    srv.kill()
asyncio.run(main())
