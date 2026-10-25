import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { attack, createFight, Fight, moveFighter, stepFight, Stats } from './combat';

function buildFighter(color: number) {
  const root = new THREE.Group();
  const armor = new THREE.MeshStandardMaterial({ color, metalness: .65, roughness: .32 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x151c29, metalness: .4, roughness: .6 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd2a58b, roughness: .65 });
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent = root) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x,y,z); m.castShadow = true; parent.add(m); return m;
  };
  add(new THREE.BoxGeometry(.85, .95, .5), armor, 0, 1.65, 0);
  add(new THREE.BoxGeometry(.7, .22, .56), dark, 0, 1.12, 0);
  add(new THREE.SphereGeometry(.29, 16, 12), skin, 0, 2.39, 0);
  add(new THREE.BoxGeometry(.55, .16, .47), dark, 0, 2.61, -.02);
  add(new THREE.BoxGeometry(.44, .07, .08), new THREE.MeshBasicMaterial({color: 0xffffff}), 0, 2.42, .27);
  const arms = [-1,1].map(side => {
    const pivot = new THREE.Group(); pivot.position.set(side * .54, 2.03, 0); root.add(pivot);
    add(new THREE.CapsuleGeometry(.14, .42, 4, 8), armor, 0, -.28, 0, pivot);
    add(new THREE.SphereGeometry(.19, 12, 8), dark, 0, -.61, .12, pivot);
    pivot.rotation.x = -.65; return pivot;
  });
  const legs = [-1,1].map(side => {
    const pivot = new THREE.Group(); pivot.position.set(side * .25, 1.08, 0); root.add(pivot);
    add(new THREE.CapsuleGeometry(.18, .55, 4, 8), dark, 0, -.41, 0, pivot);
    add(new THREE.BoxGeometry(.32,.21,.57), armor, 0, -.93, .13, pivot); return pivot;
  });
  return { root, arms, legs };
}
export function FighterViewport({ training, pace, onComplete, preview = false }: { training: boolean; pace: number; onComplete: (stats: Stats, result: string) => void; preview?: boolean }) {
  const mount = useRef<HTMLDivElement>(null);
  const keys = useRef(new Set<string>());
  const fight = useRef<Fight>(createFight(training ? 20 : 60));
  const [hud, setHud] = useState({ hp: [100,100], time: training ? 20 : 60, event: 'FIGHT', hits: 0, combo: 0 });
  const [error, setError] = useState('');
  const complete = useRef(onComplete); complete.current = onComplete;
  useEffect(() => {
    const host = mount.current!;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#080d18'); scene.fog = new THREE.Fog('#080d18', 18, 48);
    const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); } catch { setError('WebGL is unavailable. Enable hardware acceleration and reload to play.'); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace; host.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0x99cfff, 0x171529, 2));
    const light = new THREE.DirectionalLight(0xffdec0, 3); light.position.set(3,12,6); light.castShadow = true; light.shadow.mapSize.set(2048,2048); light.shadow.camera.left=-12; light.shadow.camera.right=12; light.shadow.camera.top=12; light.shadow.camera.bottom=-12; scene.add(light);
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(9.4,10, .65, 8), new THREE.MeshStandardMaterial({color: 0x273446, metalness:.7, roughness:.38})); floor.position.y=-.37; floor.receiveShadow=true; scene.add(floor);
    const grid = new THREE.GridHelper(16,16,0x36556b,0x263c50); grid.position.y=.01; scene.add(grid);
    for (let i=0;i<3;i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(8.5 + i*.18,.025,6,8),new THREE.MeshBasicMaterial({color: i===1 ? 0xff704b : 0x66f5df})); ring.rotation.x=Math.PI/2; ring.rotation.z=Math.PI/8; ring.position.y=.02; scene.add(ring);
    }
    // Original procedural skyline; no external assets or network requests.
    for (let i=0;i<40;i++) {
      const angle=i/40*Math.PI*2, radius=19+(i%3)*3, h=3+(i*7%13);
      const tower=new THREE.Mesh(new THREE.BoxGeometry(1.8,h,2),new THREE.MeshStandardMaterial({color:0x111c30})); tower.position.set(Math.cos(angle)*radius,h/2-2,Math.sin(angle)*radius); scene.add(tower);
      const strip=new THREE.Mesh(new THREE.BoxGeometry(.06,h*.8,2.02),new THREE.MeshBasicMaterial({color:i%2?0x267f99:0xa3464c})); tower.add(strip);
    }
    const fighters=[buildFighter(0x52e4d1),buildFighter(0xff715b)]; fighters.forEach(p=>scene.add(p.root));
    const flash = new THREE.Mesh(new THREE.IcosahedronGeometry(.42,0),new THREE.MeshBasicMaterial({color:0xffe2a0,wireframe:true})); scene.add(flash);
    fight.current=createFight(training?20:60); const f=fight.current;
    let frame=0, previous=performance.now(), aiClock=0, emit=0, finished=false;
    const clear=()=>keys.current.clear();
    const down=(e:KeyboardEvent)=>{
      const key=e.key.toLowerCase();
      if (['w','a','s','d','j','k','l',' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key)) {
        e.preventDefault(); if (!keys.current.has(key) && ['w','s','arrowup','arrowdown'].includes(key)) f.stats.sidesteps++;
        keys.current.add(key);
      }
    };
    const up=(e:KeyboardEvent)=>keys.current.delete(e.key.toLowerCase());
    if (!preview) { window.addEventListener('keydown',down); window.addEventListener('keyup',up); window.addEventListener('blur',clear); }
    const resize=()=>{ const w=host.clientWidth,h=host.clientHeight; renderer.setSize(w,h); camera.aspect=w/h; camera.updateProjectionMatrix(); };
    const observer=new ResizeObserver(resize); observer.observe(host); resize();
    const animate=(now:number)=>{
      const dt=Math.min((now-previous)/1000,.04); previous=now;
      const [p,cpu]=f.fighters; const held=(...names:string[])=>names.some(k=>keys.current.has(k));
      if (!preview && !document.hidden) {
        p.guard=held(' ') && !p.move;
        moveFighter(f,0,Number(held('d','arrowright'))-Number(held('a','arrowleft')),Number(held('s','arrowdown'))-Number(held('w','arrowup')),dt);
        if (held('j')) attack(f,0,'jab'); else if (held('k')) attack(f,0,'kick'); else if (held('l')) attack(f,0,'launcher');
        aiClock+=dt;
        cpu.guard=aiClock%3 > 2.35 && !cpu.move;
        const distance=Math.hypot(p.x-cpu.x,p.z-cpu.z);
        if (distance>2.1) moveFighter(f,1,(p.x-cpu.x)/distance,(p.z-cpu.z)/distance,dt*.65);
        if (aiClock>pace) { if (!training || Math.floor(f.elapsed)%3===0) attack(f,1,Math.floor(f.elapsed)%2 ? 'kick':'jab'); if (aiClock>3) aiClock=0; }
        stepFight(f,dt,training);
        if (f.result && !finished) { finished=true; complete.current({...f.stats},f.result); }
      }
      fighters.forEach((visual,i)=>{
        const state=f.fighters[i], enemy=f.fighters[1-i];
        visual.root.position.set(state.x,Math.sin(state.air/.65*Math.PI)*1.6,state.z);
        visual.root.rotation.y=Math.atan2(enemy.x-state.x,enemy.z-state.z);
        const pulse=state.move?Math.sin(Math.min(1,state.age / .5)*Math.PI):0;
        visual.arms[0].rotation.x=state.guard?-1.8:-.65;
        visual.arms[1].rotation.x=state.move==='jab'||state.move==='launcher'?-1-pulse*1.5:state.guard?-1.8:-.8;
        visual.legs[1].rotation.x=state.move==='kick'?-pulse*1.7:0;
        visual.root.rotation.z=state.stun>0?.1:0;
        visual.root.position.y+=Math.sin(now*.004+i)*.025;
      });
      flash.visible=f.fighters.some(p=>p.stun>.12); flash.position.set((p.x+cpu.x)/2,1.7,(p.z+cpu.z)/2); flash.rotation.z=now*.02;
      const center=new THREE.Vector3((p.x+cpu.x)/2,1.2,(p.z+cpu.z)/2);
      camera.position.set(center.x+1.5,6.2,center.z+15.5+Math.abs(p.x-cpu.x)*.25); camera.lookAt(center);
      renderer.render(scene,camera);
      if(now-emit>90){emit=now;setHud({hp:[p.hp,cpu.hp],time:Math.ceil(f.time),event:f.event,hits:f.stats.hits,combo:f.stats.bestCombo});}
      frame=requestAnimationFrame(animate);
    };
    frame=requestAnimationFrame(animate);
    return ()=>{cancelAnimationFrame(frame);observer.disconnect();clear();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);scene.traverse(obj=>{if(obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments){obj.geometry.dispose();const mats=Array.isArray(obj.material)?obj.material:[obj.material];mats.forEach(m=>m.dispose());}});renderer.dispose();renderer.domElement.remove();};
  },[training,pace,preview]);
  return <div className="ic-viewport">
    <div className="ic-render" ref={mount}/>{error&&<p className="ic-error">{error}</p>}
    {!preview&&<><div className="ic-hud"><div><span>01 / KADE</span><div className="ic-health"><i style={{width:`${hud.hp[0]}%`}}/></div><small>{hud.hp[0]} HP • YOU</small></div><strong>{hud.time}</strong><div><span>VEX / CPU</span><div className="ic-health enemy"><i style={{width:`${hud.hp[1]}%`}}/></div><small>{hud.hp[1]} HP • {training?'SPARRING':'CHALLENGER'}</small></div></div><div className="ic-callout">{hud.event}<small>{hud.hits} CLEAN HITS / {hud.combo} BEST CHAIN</small></div></>}
    <div className="ic-stage-label">SECTOR 09 <span> / </span> NEON ROOFTOP</div>
    {!preview&&<div className="ic-touch">{[['a','←'],['d','→'],['w','↑'],['s','↓'],['j','Jab'],['k','Kick'],['l','Launch'],[' ','Guard']].map(([key,label])=><button key={key} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);keys.current.add(key);if(key==='w'||key==='s')fight.current.stats.sidesteps++;}} onPointerUp={()=>keys.current.delete(key)} onLostPointerCapture={()=>keys.current.delete(key)}>{label}</button>)}</div>}
  </div>;
}
