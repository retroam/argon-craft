import { useState } from 'react';
import { FighterViewport } from './FighterViewport';
import { profile, Stats } from './combat';
import './fighter.css';
const STEPS = ['Arena blueprint', 'Combat probe', 'Fighter profile', 'Full match'];
export default function FighterStudio() {
  const [step,setStep]=useState(0),[run,setRun]=useState(0),[result,setResult]=useState('');
  const [stats,setStats]=useState<Stats>({attacks:0,hits:0,blocks:0,sidesteps:0,damage:0,combo:0,bestCombo:0});
  const [matchStats,setMatchStats]=useState<Stats|null>(null);
  const inferred=profile(stats);
  const begin=()=>{setResult('');setMatchStats(null);setRun(v=>v+1);setStep(3);};
  return <main className="ic-app">
    <header className="ic-header"><a href="/">ARGON<span>CRAFT</span> <small>/ GAME LAB</small></a><span className="ic-local"><i/> LOCAL PLAYABLE BUILD</span><a href="/">Back to studio ↗</a></header>
    <nav className="ic-steps" aria-label="Game creation progress">{STEPS.map((name,i)=><div key={name} className={i===step?'active':i<step?'done':''}><b>{i<step?'✓':`0${i+1}`}</b>{name}</div>)}</nav>
    <div className="ic-heading"><div><p>ORIGINAL 3D FIGHTER / PROTOTYPE 001</p><h1>IRON CIRCUIT<span>™</span></h1></div><div className="ic-edition">CLOSE THE DISTANCE.<br/><strong>MAKE THE NEXT HIT COUNT.</strong></div></div>
    <section className="ic-workspace"><aside className="ic-sidebar">
      <p className="ic-eyebrow">{`0${step+1}`} / {STEPS[step].toUpperCase()}</p>
      <h2>{['Build the battleground.','Find your fighting style.','Your inputs. Your fighter.','Enter the circuit.'][step]}</h2>
      <p className="ic-description">{['A rooftop arena. Two original rivals. A third dimension to dodge into. Turn a combat blueprint into a playable match.','Play a 20-second sparring round. We measure actual attacks, clean hits, guards, and lateral movement.','A local rule-based profile turns your sparring telemetry into the CPU attack cadence for the full match.','One round. 60 seconds. Defeat Vex by knockout, or finish with more health when the clock runs out.'][step]}</p>
      {step===0&&<><div className="ic-blueprint"><div className="ic-ring"><span className="ic-dot one">P1</span><span className="ic-dot two">CPU</span></div><small>TOP VIEW / 3D SIDESTEP ARENA</small></div><dl><div><dt>Stage</dt><dd>Neon rooftop</dd></div><div><dt>Rules</dt><dd>1 vs 1 · 60 sec</dd></div><div><dt>Moveset</dt><dd>Strike / launch / guard</dd></div></dl><button className="ic-primary" onClick={()=>setStep(1)}>Run combat probe <span>→</span></button></>}
      {step===1&&<><div className="ic-note">LIVE INPUT CAPTURE<br/><span>Both fighters survive the probe. The full match enables knockouts.</span></div><div className="ic-move-list"><p><kbd>J</kbd> Quick jab <span>8 DMG</span></p><p><kbd>K</kbd> Heavy kick <span>14 DMG</span></p><p><kbd>L</kbd> Launcher <span>20 DMG</span></p><p><kbd>SPACE</kbd> Guard <span>REDUCES DAMAGE</span></p></div><p className="ic-description">Use A / D to approach or retreat. W / S sidestep into the arena’s depth. Arrow keys also work.</p></>}
      {step===2&&<><div className="ic-profile"><small>OBSERVED STYLE</small><h3>{inferred.name}</h3><p>{inferred.detail}</p></div><div className="ic-stats"><div><b>{stats.attacks}</b><span>ATTACKS</span></div><div><b>{stats.hits}</b><span>CLEAN HITS</span></div><div><b>{stats.blocks}</b><span>BLOCKS</span></div><div><b>{stats.sidesteps}</b><span>SIDESTEPS</span></div></div><p className="ic-description">CPU opening delay: {inferred.pace.toFixed(2)}s. No API call or model inference is used in this local prototype.</p><button className="ic-primary" onClick={begin}>Build & play full match <span>→</span></button></>}
      {step===3&&<><div className="ic-profile"><small>ACTIVE PROFILE</small><h3>{inferred.name}</h3><p>Jab → kick → launcher. Watch your distance; attacks only land inside their reach.</p></div><div className="ic-note">MOVE WITH INTENT<br/><span>Hold Space to guard. Sidestep to make an opponent’s strike miss.</span></div><button className="ic-secondary" onClick={begin}>Restart match ↻</button><button className="ic-secondary" onClick={()=>{setStep(0);setResult('');}}>New session</button></>}
      <div className="ic-sidebar-footer"><span>●</span> THREE.JS / PROCEDURAL 3D</div>
    </aside><div className="ic-arena-wrap">
      <FighterViewport key={`${step}-${run}`} training={step===1} preview={step===0||step===2} pace={step===1?1.3:inferred.pace} onComplete={(captured,outcome)=>{if(step===1){setStats(captured);setStep(2);}else if(step===3){setMatchStats(captured);setResult(outcome);}}}/>
      {(step===0||step===2)&&<div className="ic-preview-caption"><span>{step===0?'BLUEPRINT PREVIEW':'PROFILE READY'}</span><h2>KADE <em>vs</em> VEX</h2><p>Precision meets pressure.</p></div>}
      {result&&step===3&&<div className="ic-result" role="status"><p>ROUND COMPLETE</p><h2>{result}</h2><p>{matchStats?.hits} clean hits · {matchStats?.damage} damage · {matchStats?.bestCombo} best chain</p><button className="ic-primary" onClick={begin}>Rematch →</button><button className="ic-secondary" onClick={()=>{setStep(0);setResult('');}}>Back to blueprint</button></div>}
    </div></section><footer className="ic-footer"><span>BLUEPRINT → PLAY → OBSERVE → PROFILE → FIGHT</span><span>Original characters & arena · Inspired by arcade 3D fighters</span></footer>
  </main>;
}
