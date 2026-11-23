import asyncio, subprocess, json
from playwright.async_api import async_playwright
async def main():
    srv=subprocess.Popen(["python3","-m","http.server","8790"],cwd="/tmp/t",stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    await asyncio.sleep(1)
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
        pg=await b.new_page(viewport={"width":1000,"height":620}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)+str(e.stack)[:500]))
        await pg.goto("http://localhost:8790/index.html?npc=12&nosave"); await asyncio.sleep(12)
        E=pg.evaluate
        await E("()=>{window.__pause=true;}")
        r=await E("()=>{window.__sim(60,1/60);const M=window.__MIS;return {c:!!M.contact,pos:M.contact&&[M.contact.root.x,M.contact.root.z]}}")
        print("contact",r)
        # aller à côté de Nino
        await E("()=>{const pl=window.__walkers[0];pl.root.set(-7.5,0.12,7.8);pl.setRig(pl.rig,true);window.__sim(30,1/60);}")
        r=await E("()=>({can:window.__MIS.canTalk,d:Math.hypot(window.__walkers[0].root.x-window.__MIS.contact.root.x,window.__walkers[0].root.z-window.__MIS.contact.root.z)})")
        print("canTalk",r)
        await E("()=>{window.__pause=false;window.__sitReq();}")
        await asyncio.sleep(0.4)
        await pg.screenshot(path="/tmp/mi_talk.png")
        await E("()=>{window.__pause=true;window.__sim(60*9,1/60);}")
        r=await E("()=>{const M=window.__MIS,A=M.active;return {talking:M.talking,cool:M.cool,can:M.canTalk,a:A&&{id:A.id,obj:A.obj,timer:A.timer,dest:A.dest}}}")
        print("m1",r)
        if not r['a']:
            r=await E("()=>{const ok=window.__missionTalk();window.__sim(60*16,1/60);const A=window.__MIS.active;return [ok,window.__MIS.talking,A&&A.id]}")
            print("direct",r)
        await E("()=>{window.__pause=false}"); await asyncio.sleep(1.2); await pg.screenshot(path="/tmp/mi_colis.png"); await E("()=>{window.__pause=true}")
        # téléporte à la destination
        await E("()=>{const A=window.__MIS.active,pl=window.__walkers[0];pl.root.set(A.dest.x+1,window.__groundAt(A.dest.x+1,A.dest.z),A.dest.z);pl.setRig(pl.rig,true);let n=0;while(window.__world().queue>0&&n<200){window.__sim(1,1/60);n++;}window.__sim(20,1/60);}")
        r=await E("()=>({act:!!window.__MIS.active,stage:window.__MIS.stage,money:window.__money()})")
        print("after colis",r)
        # mission 2
        await E("()=>{const pl=window.__walkers[0];pl.root.set(-7.5,0.12,7.8);pl.setRig(pl.rig,true);let n=0;while(window.__world().queue>0&&n<200){window.__sim(1,1/60);n++;}window.__sim(260,1/60);window.__missionTalk();window.__sim(60*16,1/60);}")
        r=await E("()=>{const A=window.__MIS.active;return A&&{id:A.id,t:A.timer,tp:[A.target.root.x,A.target.root.z]}}")
        print("m2",r)
        # suivre la cible à ~12 m pendant 90s (simulation : téléport derrière elle)
        log=[]
        for k in range(90):
            r=await E("""()=>{const A=window.__MIS.active;if(!A)return null;const T=A.target,pl=window.__walkers[0];
              const dx=pl.root.x-T.root.x,dz=pl.root.z-T.root.z,d=Math.hypot(dx,dz)||1;if(d>14||d<9){pl.root.x=T.root.x+dx/d*12;pl.root.z=T.root.z+dz/d*12;pl.root.y=window.__groundAt(pl.root.x,pl.root.z);pl.setRig(pl.rig,true);}
              window.__sim(60,1/60);return [Math.round(A.timer),Math.round(T.root.x),Math.round(T.root.z),T.brain.mode,+A.close.toFixed(2)]}""")
            if r is None: break
            if k%10==0: log.append(r)
        print("tail",log)
        r=await E("()=>({act:!!window.__MIS.active,stage:window.__MIS.stage,money:window.__money(),stats:window.__MIS.stats})")
        print("after tail",r)
        # mission 3
        await E("()=>{const pl=window.__walkers[0];pl.root.set(-7.5,0.12,7.8);pl.setRig(pl.rig,true);let n=0;while(window.__world().queue>0&&n<200){window.__sim(1,1/60);n++;}window.__sim(260,1/60);window.__missionTalk();window.__sim(60*16,1/60);}")
        r=await E("()=>{const A=window.__MIS.active;return A&&{id:A.id,bag:A.bag,g:window.__groundAt(A.bag.x,A.bag.z),gps:window.__gps().len}}")
        print("m3",r)
        await E("()=>{const A=window.__MIS.active,pl=window.__walkers[0];pl.root.set(A.bag.x+0.8,window.__groundAt(A.bag.x+0.8,A.bag.z),A.bag.z);pl.setRig(pl.rig,true);let n=0;while(window.__world().queue>0&&n<300){window.__sim(1,1/60);n++;}window.__sim(30,1/60);}")
        r=await E("()=>{const A=window.__MIS.active;return A&&{step:A.step,lvl:window.__wanted.level}}")
        print("bag",r)
        await E("()=>{window.__pause=false}"); await asyncio.sleep(1.5); await pg.screenshot(path="/tmp/mi_sac.png"); await E("()=>{window.__pause=true}")
        await E("()=>{const W=window.__wanted;W.level=0;W.heat=0;window.__sim(30,1/60);}")
        r=await E("()=>{const A=window.__MIS.active;return A&&{step:A.step,obj:A.obj}}")
        print("lost cops",r)
        await E("()=>{const pl=window.__walkers[0];pl.root.set(-7.5,0.12,7.8);pl.setRig(pl.rig,true);let n=0;while(window.__world().queue>0&&n<300){window.__sim(1,1/60);n++;}window.__sim(260,1/60);window.__missionTalk();window.__sim(60,1/60);}")
        r=await E("()=>({act:!!window.__MIS.active,stage:window.__MIS.stage,money:window.__money(),save:window.__saveData().missions})")
        print("end",r)
        print("ERR",errs[:4]); await b.close()
    srv.kill()
asyncio.run(main())
