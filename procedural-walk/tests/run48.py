import asyncio, subprocess
from playwright.async_api import async_playwright
async def main():
    srv=subprocess.Popen(["python3","-m","http.server","8790"],cwd="/tmp/t",stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    await asyncio.sleep(1)
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
        pg=await b.new_page(viewport={"width":1000,"height":620}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)+str(e.stack)[:400]))
        await pg.goto("http://localhost:8790/index.html?npc=4&nosave"); await asyncio.sleep(12)
        r=await pg.evaluate("""()=>{let c=null;for(let cx=-6;cx<=12&&!c;cx++)for(let cz=-12;cz<=12&&!c;cz++)if(window.__chunkType(cx,cz)==="terrain")c=[cx,cz];
          window.__pause=true;const pl=window.__walkers[0];const X=c[0]*40,Z=c[1]*40;pl.root.set(X+4,0.12,Z+4);pl.gy=0.12;pl.setRig(pl.rig,true);
          let n=0;while(window.__world().queue>0&&n<120){window.__sim(1,1/60);n++;}window.__sim(30,1/60);
          return {c,balls:window.__balls.length,hoops:window.__hoops.length,hoopers:window.__walkers.filter(w=>w.isHooper).length};}""")
        print("terrain",r)
        r=await pg.evaluate("""()=>{const pl=window.__walkers[0];const res=[];
          const H=window.__hoops.filter(h=>Math.hypot(h.rim.x-pl.root.x,h.rim.z-pl.root.z)<20)[0];
          const ball=window.__balls.find(b=>Math.hypot(b.pos.x-pl.root.x,b.pos.z-pl.root.z)<30);
          for(const d of [2,4,6,8]){let made=0;const B0=window.__bstats.made;
            for(let k=0;k<8;k++){
              if(ball.holder&&ball.holder!==pl){ball.holder.ball=null;ball.holder.shooting=null;ball.holder=null;}
              const p=H.rim.clone().addScaledVector(H.f,d);pl.root.set(p.x,0.12,p.z);pl.gy=0.12;pl.vel.set(0,0,0);pl.setRig(pl.rig,true);
              ball.pos.copy(pl.root).add({x:0.3,y:0.3,z:0.3});ball.vel.set(0,0,0);ball.cd=0;ball.holder=null;pl.ball=null;
              window.__sim(20,1/60);
              if(pl.ball!==ball){ball.holder=pl;pl.ball=ball;}
              window.__shoot(pl);window.__sim(180,1/60);}
            res.push({distance:d,paniers:window.__bstats.made-B0,sur:8});}
          return {res,stats:window.__bstats};}""")
        print(r)
        # watch hooper play
        r=await pg.evaluate("""()=>{const pl=window.__walkers[0];pl.root.x+=30;pl.setRig(pl.rig,true);let shots=0,ev=[];const hp=window.__walkers.find(w=>w.isHooper);
          for(let i=0;i<60*40;i++){window.__sim(1,1/60);if(hp&&hp.shooting&&!hp._s){hp._s=1;shots++;}if(hp&&!hp.shooting)hp._s=0;}
          return {hooper:!!hp,shots};}""")
        print("PNJ",r)
        await pg.evaluate("()=>{const pl=window.__walkers[0];const H=window.__hoops[0];const p=H.rim.clone().addScaledVector(H.f,5);pl.root.set(p.x,0.12,p.z);pl.setRig(pl.rig,true);window.__cam.yaw=Math.atan2(-H.f.x,H.f.z)*180/Math.PI;window.__cam.pitch=8;window.__cam.dist=5;document.getElementById('hud').style.display='none';const b=window.__balls[0];if(b.holder){b.holder.ball=null;b.holder.shooting=null;}b.holder=pl;pl.ball=b;window.__sim(30,1/60);window.__shoot(pl);window.__sim(28,1/60);}")
        await pg.evaluate("window.__pause=false"); await asyncio.sleep(0.25); await pg.evaluate("window.__pause=true")
        await pg.screenshot(path="/tmp/basket.png")
        print("ERR",errs[:4]); await b.close()
    srv.kill()
asyncio.run(main())
