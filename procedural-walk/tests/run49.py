import asyncio, subprocess, json
from playwright.async_api import async_playwright
async def main():
    srv=subprocess.Popen(["python3","-m","http.server","8790"],cwd="/tmp/t",stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    await asyncio.sleep(1)
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
        pg=await b.new_page(viewport={"width":1000,"height":620}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)+str(e.stack)[:400]))
        await pg.goto("http://localhost:8790/index.html?npc=4&nosave"); await asyncio.sleep(14)
        print("E0",errs[:2])
        r=await pg.evaluate("""()=>{window.__pause=true;const pl=window.__walkers[0];const B=pl.brain;const log=[];
          const go=(x,z,dir,secs,tag,run)=>{pl.root.set(x,window.__groundAt(x,z),z);pl.gy=pl.root.y;pl.air=null;pl.swim=null;pl.yaw=pl.targetYaw=Math.atan2(dir[0],-dir[1])*180/Math.PI;pl.setRig(pl.rig,true);pl.vel.set(0,0,0);
            pl.brain={update(w){w.wish.set(dir[0],0,dir[1]);w.run=!!run;w.speedMul=1;w.faceYaw=null;},bumped(){}};
            const L=[];for(let i=0;i<secs*60;i++){window.__sim(1,1/60);if(i%30==0)L.push([+pl.root.x.toFixed(1),+pl.root.z.toFixed(1),+pl.root.y.toFixed(2),pl.swim?'nage':pl.air?'air':'pied']);}
            log.push({tag,fin:L[L.length-1],log:L.filter((_,i)=>i%2==0).slice(0,12)});};
          go(575,40,[1,0],14,"entre dans la mer depuis la plage");
          go(630,300,[1,0],10,"court sur le ponton puis plonge",true);
          go(647.6,308,[0,-1],5,"nage vers l'échelle");
          go(620,-140,[1,0],30,"nage jusqu'à l'île aux Pélicans",true);
          go(584,-150,[1,0],25,"traverse le pont");
          pl.brain=B;return log;}""")
        for x in r: print(x["tag"],"| fin",x["fin"]); print("   ",x["log"])
        await pg.evaluate("()=>{const pl=window.__walkers[0];pl.root.set(612,0,40);pl.gy=-1.13;pl.root.y=-1.13;pl.swim={t:0,dive:0};pl.setRig(pl.rig,true);pl.brain={update(w){w.wish.set(1,0,0);w.run=false;w.speedMul=1;w.faceYaw=null;},bumped(){}};window.__cam.yaw=230;window.__cam.pitch=18;window.__cam.dist=4.5;document.getElementById('hud').style.display='none';window.__sim(120,1/60);}")
        await pg.evaluate("window.__pause=false"); await asyncio.sleep(2)
        await pg.screenshot(path="/tmp/swim.png")
        await pg.evaluate("()=>{const pl=window.__walkers[0];pl.brain={update(w){w.wish.set(0,0,0);},bumped(){}};pl.root.set(560,0.12,-160);pl.swim=null;pl.gy=0.12;pl.setRig(pl.rig,true);window.__cam.yaw=90;window.__cam.pitch=10;window.__cam.dist=10;}")
        await asyncio.sleep(3); await pg.screenshot(path="/tmp/pont.png")
        await pg.evaluate("()=>{const pl=window.__walkers[0];pl.root.set(500,0.12,-80);pl.setRig(pl.rig,true);window.__cam.yaw=250;window.__cam.pitch=12;window.__cam.dist=12;}")
        await asyncio.sleep(3); await pg.screenshot(path="/tmp/hotels.png")
        print("ERR",errs[:4]); await b.close()
    srv.kill()
asyncio.run(main())
