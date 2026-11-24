import asyncio, subprocess, json
from playwright.async_api import async_playwright
async def main():
    srv=subprocess.Popen(["python3","-m","http.server","8790"],cwd="/tmp/t",stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    await asyncio.sleep(1)
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
        pg=await b.new_page(viewport={"width":1000,"height":620}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)+str(e.stack)[:400]))
        await pg.goto("http://localhost:8790/index.html?npc=8&nosave"); await asyncio.sleep(14)
        print("E0",errs[:2])
        r=await pg.evaluate("""()=>{window.__pause=true;const pl=window.__walkers[0];pl.root.set(198,0,-800);pl.gy=0;pl.root.y=0;pl.setRig(pl.rig,true);
          let n=0;while(window.__world().queue>0&&n<100){window.__sim(1,1/60);n++;}
          const out=[];for(let i=0;i<60*10;i++){window.__sim(1,1/60);if(i%120==0)out.push([window.__cars.length,window.__cars.map(c=>Math.round(c.v)).join(',')]);}
          // le joueur marche sur l'autoroute
          pl.root.set(181.6,0,-800);pl.setRig(pl.rig,true);const hp0=pl.hp;let hit=false,honks=0;
          for(let i=0;i<60*20;i++){window.__sim(1,1/60);if(pl.ko&&!hit){hit=true;}}
          return {cars:out,hit,hpLost:hp0-pl.hp,world:window.__world()};}""")
        print(r)
        await pg.evaluate("()=>{const pl=window.__walkers[0];if(pl.ko)pl.endKO();pl.hp=100;pl.root.set(194,0,-830);pl.setRig(pl.rig,true);window.__cam.yaw=180;window.__cam.pitch=10;window.__cam.dist=9;document.getElementById('hud').style.display='none';}")
        await pg.evaluate("window.__pause=false"); await asyncio.sleep(3)
        await pg.screenshot(path="/tmp/autoroute.png")
        await pg.evaluate("()=>{const pl=window.__walkers[0];pl.root.set(-120,0,-760);pl.setRig(pl.rig,true);window.__cam.yaw=40;window.__cam.pitch=14;window.__cam.dist=14;}")
        await asyncio.sleep(4); await pg.screenshot(path="/tmp/campagne.png")
        await pg.evaluate("()=>{const pl=window.__walkers[0];pl.root.set(178,0.12,-1180);pl.setRig(pl.rig,true);window.__cam.yaw=200;window.__cam.pitch=14;window.__cam.dist=12;}")
        await asyncio.sleep(5); await pg.screenshot(path="/tmp/portsoleil.png")
        r=await pg.evaluate("()=>{const pl=window.__walkers[0];pl.root.set(0,0.12,0);pl.setRig(pl.rig,true);window.__setWP(250,-1200);const g=window.__gps();return {len:Math.round(g.len),pts:g.route.length,mid:g.route.slice(0,8)}}")
        print("GPS ville -> Port-Soleil",r)
        await pg.keyboard.press("Tab"); await asyncio.sleep(0.4)
        await pg.evaluate("()=>{}"); 
        await pg.mouse.wheel(0,400); await asyncio.sleep(0.4)
        await pg.screenshot(path="/tmp/carte2.png")
        print("ERR",errs[:4]); await b.close()
    srv.kill()
asyncio.run(main())
