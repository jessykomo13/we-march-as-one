import asyncio, subprocess
from playwright.async_api import async_playwright
async def main():
    srv=subprocess.Popen(["python3","-m","http.server","8790"],cwd="/tmp/t",stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    await asyncio.sleep(1)
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
        pg=await b.new_page(viewport={"width":1000,"height":620}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)+str(e.stack)[:400]))
        await pg.goto("http://localhost:8790/index.html?npc=12&nosave"); await asyncio.sleep(10)
        E=pg.evaluate
        await pg.keyboard.press("KeyG"); await asyncio.sleep(0.3)
        print("on",await E("()=>window.__CREA.on"))
        await pg.keyboard.press("Space"); await asyncio.sleep(0.1); await pg.keyboard.press("Space"); await asyncio.sleep(0.2)
        if not await E("()=>!!window.__walkers[0].fly"): await E("()=>window.__toggleFly()")
        print("fly",await E("()=>!!window.__walkers[0].fly"))
        P="()=>{const p=window.__walkers[0];return [+p.root.x.toFixed(1),+p.root.y.toFixed(1),+p.root.z.toFixed(1),+p.speed.toFixed(1),+(p.swimK||0).toFixed(2)]}"
        await E("()=>{window.__pause=true;window.__keys.add('Space');window.__sim(120,1/60);window.__keys.delete('Space');}")
        print("monté",await E(P))
        await E("()=>{window.__keys.add('KeyW');window.__keys.add('ShiftLeft');window.__sim(240,1/60);}")
        print("file",await E(P))
        await E("()=>{window.__keys.delete('ShiftLeft');window.__sim(30,1/60);window.__cam.pitch=20;window.__cam.dist=6;window.__pause=false}")
        await asyncio.sleep(2.5); await pg.screenshot(path="/tmp/cr_fly.png")
        await E("()=>{window.__keys.delete('KeyW');window.__pause=true;window.__teleportTo(705,-150,'Île');window.__sim(30,1/60);window.__pause=false}")
        print("tp",await E(P))
        await asyncio.sleep(2.5); await pg.screenshot(path="/tmp/cr_tp.png")
        r=await E("()=>{window.__pause=true;window.__toggleFly();window.__sim(200,1/60);const p=window.__walkers[0];const w=window.__wanted;w.level=3;window.__sim(5,1/60);const lv=w.level;p.takeHit(p,'chest',50,false,false);return [!!p.fly,+p.root.y.toFixed(2),lv,p.hp,p.ko]}")
        print("land/cops/god",r)
        print("ERR",errs[:4]); await b.close()
    srv.kill()
asyncio.run(main())
