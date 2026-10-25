export type Move = 'jab' | 'kick' | 'launcher';
export const MOVES = {
  jab: { damage: 8, reach: 2.35, duration: .34, impact: .12 },
  kick: { damage: 14, reach: 2.95, duration: .65, impact: .25 },
  launcher: { damage: 20, reach: 2.5, duration: .95, impact: .38 },
};
export type Fighter = { x: number; z: number; hp: number; guard: boolean; move: Move | null; age: number; hit: boolean; stun: number; air: number };
export type Stats = { attacks: number; hits: number; blocks: number; sidesteps: number; damage: number; combo: number; bestCombo: number };
export type Fight = { fighters: [Fighter, Fighter]; time: number; result: string; event: string; stats: Stats; lastHit: number; elapsed: number };
export function createFight(seconds = 60): Fight {
  const fighter = (x: number): Fighter => ({ x, z: 0, hp: 100, guard: false, move: null, age: 0, hit: false, stun: 0, air: 0 });
  return { fighters: [fighter(-1.3), fighter(1.3)], time: seconds, result: '', event: 'FIGHT', stats: { attacks: 0, hits: 0, blocks: 0, sidesteps: 0, damage: 0, combo: 0, bestCombo: 0 }, lastHit: -10, elapsed: 0 };
}
export function attack(f: Fight, index: number, move: Move) {
  const p = f.fighters[index];
  if (f.result || p.move || p.stun > 0 || p.guard) return false;
  p.move = move; p.age = 0; p.hit = false;
  if (index === 0) f.stats.attacks++;
  return true;
}
export function stepFight(f: Fight, dt: number, training = false) {
  if (f.result) return;
  f.time = Math.max(0, f.time - dt); f.elapsed += dt;
  for (const [i, p] of f.fighters.entries()) {
    p.stun = Math.max(0, p.stun - dt); p.air = Math.max(0, p.air - dt);
    if (!p.move) continue;
    p.age += dt;
    const m = MOVES[p.move], enemy = f.fighters[1 - i];
    if (!p.hit && p.age >= m.impact) {
      p.hit = true;
      if (Math.hypot(p.x - enemy.x, p.z - enemy.z) <= m.reach) {
        const blocked = enemy.guard && enemy.air === 0;
        const damage = blocked ? 1 : m.damage;
        enemy.hp = Math.max(training ? 1 : 0, enemy.hp - damage);
        enemy.stun = blocked ? .08 : .22;
        if (!blocked) { enemy.move = null; if (p.move === 'launcher') enemy.air = .65; }
        f.event = blocked ? 'GUARD • CHIP DAMAGE' : `${p.move.toUpperCase()} • ${damage} DAMAGE`;
        if (i === 1 && blocked) f.stats.blocks++;
        if (i === 0 && !blocked) {
          f.stats.hits++; f.stats.damage += damage;
          f.stats.combo = f.elapsed - f.lastHit < 1.4 ? f.stats.combo + 1 : 1;
          f.stats.bestCombo = Math.max(f.stats.bestCombo, f.stats.combo); f.lastHit = f.elapsed;
        }
      } else f.event = 'WHIFF • CLOSE THE DISTANCE';
    }
    if (p.age >= m.duration) p.move = null;
  }
  if (!f.fighters[0].hp || !f.fighters[1].hp || !f.time) {
    const [a, b] = f.fighters;
    f.result = training ? 'PROBE COMPLETE' : a.hp === b.hp ? 'DRAW' : a.hp > b.hp ? 'YOU WIN' : 'CPU WINS';
    f.event = f.time ? 'K.O.' : 'TIME UP';
  }
}
export function moveFighter(f: Fight, index: number, x: number, z: number, dt: number) {
  const p = f.fighters[index], enemy = f.fighters[1 - index];
  if (f.result || p.move || p.stun > 0) return;
  const speed = p.guard ? 1.5 : 3.4;
  const length = Math.max(1, Math.hypot(x, z));
  const nx = Math.max(-6.5, Math.min(6.5, p.x + x / length * speed * dt));
  const nz = Math.max(-4, Math.min(4, p.z + z / length * speed * dt));
  if (Math.hypot(nx - enemy.x, nz - enemy.z) > 1.35) { p.x = nx; p.z = nz; }
}
export function profile(stats: Stats) {
  if (!stats.attacks && !stats.blocks && !stats.sidesteps) return { name: 'Balanced fighter', detail: 'No combat inputs recorded. Start with a balanced opponent.', pace: 1.15 };
  if (stats.blocks > stats.hits) return { name: 'Counter striker', detail: 'Your guard-first approach invites a patient opponent. Create an opening, then punish.', pace: 1.4 };
  if (stats.sidesteps > stats.attacks / 2) return { name: 'Ring tactician', detail: 'You favor lateral movement. Use depth to evade attacks and control spacing.', pace: 1.05 };
  return { name: 'Pressure fighter', detail: 'You favor offense. Chain quick jabs into kicks and finish with a launcher.', pace: .85 };
}
