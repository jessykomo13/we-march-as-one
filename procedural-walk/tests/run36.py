import asyncio, subprocess
from playwright.async_api import async_playwright
async def main():
    srv=subprocess.Popen(["python3","-m","http.server","8790"],cwd="/tmp/t",stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    await asyncio.sleep(1)
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
        pg=await b.new_page(viewport={"width":1000,"height":640}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)+str(e.stack)[:300]))
        await pg.goto("http://localhost:8790/index.html?npc=6&nosave"); await asyncio.sleep(12)
        r=await pg.evaluate("()=>{window.__setWP(150,-110);return window.__gps();}")
        print("route",r["route"],"len",round(r["len"]))
        # check intermediate points on road lines
        ok=all(((round(x)+16)%40==0) or ((round(z)+16)%40==0) for x,z in r["route"][1:-1])
        print("points intermédiaires sur les rues:",ok)
        await pg.evaluate("window.__pause=false"); await asyncio.sleep(1.5)
        await pg.screenshot(path="/tmp/gps_hud.png")
        # follow route with a bot
        r=await pg.evaluate("""()=>{window.__pause=true;const pl=window.__walkers[0];const B=pl.brain;let t=0,arrived=false;
          pl.brain={update(w){const R=window.__gps().route;if(!R){w.wish.set(0,0,0);return;}let k=1;const P=R.map(a=>({x:a[0],z:a[1]}));
            let tgt=P[1];const dx=tgt.x-w.root.x,dz=tgt.z-w.root.z,d=Math.hypot(dx,dz)||1;
            w.wish.set(dx/d,0,dz/d);w.run=true;w.speedMul=1;w.faceYaw=null;},bumped(){}};
          for(;t<60*160;t++){window.__sim(1,1/60);pl.stamina=100;pl.hp=100;if(!window.__gps().wp){arrived=true;break;}}
          pl.brain=B;return {arrived,secs:(t/60).toFixed(1),pos:[pl.root.x.toFixed(1),pl.root.z.toFixed(1)],msg:document.getElementById('msg').textContent};}""")
        print("suivi GPS",r)
        await pg.evaluate("window.__pause=false")
        await pg.keyboard.press("Tab"); await asyncio.sleep(0.6)
        await pg.mouse.click(700,200); await asyncio.sleep(0.4)
        print("après clic carte",await pg.evaluate("()=>{const g=window.__gps();return {map:g.map,wp:g.wp,len:Math.round(g.len)}}"))
        await pg.screenshot(path="/tmp/bigmap.png")
        await pg.keyboard.press("Tab"); await asyncio.sleep(0.3)
        print("ERR",errs[:4]); await b.close()
    srv.kill()
asyncio.run(main())
