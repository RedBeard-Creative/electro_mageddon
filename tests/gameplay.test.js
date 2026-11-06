import test from 'node:test';
import assert from 'node:assert/strict';
import {
 ROOM,BAG,OBSTACLES,newGame,forward,right,look,move,bagInRange,punch,update,flashlightToggle
} from '../src/gameplay.js';

test('new game starts inside the darkroom facing forward',()=>{
 const s=newGame();
 assert.equal(s.x,0);assert.equal(s.z,5.6);assert.equal(s.yaw,0);
 assert.equal(s.hits,0);assert.equal(s.flashlight,true);
});
test('arrow-up moves in the direction the character faces',()=>{
 const s=newGame();move(s,0,1,.05);assert.ok(s.z<5.6);assert.equal(s.x,0);
});
test('forward movement turns with mouse yaw',()=>{
 const s=newGame();s.yaw=Math.PI/2;
 move(s,0,1,.05);assert.ok(s.x>0);assert.ok(Math.abs(s.z-5.6)<.001);
});
test('left/right arrows strafe instead of rotating',()=>{
 const s=newGame();move(s,1,0,.05);
 assert.ok(s.x>0);assert.equal(s.yaw,0);assert.equal(s.z,5.6);
 move(s,-1,0,.05);assert.ok(Math.abs(s.x)<.0001);
});
test('down arrow moves backward relative to viewpoint',()=>{
 const s=newGame();move(s,0,-1,.05);assert.ok(s.z>5.6);
 s.yaw=Math.PI/2;move(s,0,-1,.05);assert.ok(s.x<0);
});
test('diagonal movement is normalized',()=>{
 const a=newGame(),b=newGame();move(a,1,0,.05);move(b,1,1,.05);
 const da=Math.hypot(a.x,a.z-5.6),db=Math.hypot(b.x,b.z-5.6);
 assert.ok(Math.abs(da-db)<.000001);
});
test('sprint is faster than normal movement',()=>{
 const a=newGame(),b=newGame();move(a,0,1,.05);move(b,0,1,.05,true);assert.ok(b.z<a.z);
});
test('mouse movement changes yaw and pitch without a click gate',()=>{
 const s=newGame();look(s,100,-60);
 assert.ok(s.yaw>0);assert.ok(s.pitch>0);
});
test('vertical look is clamped',()=>{
 const s=newGame();for(let i=0;i<50;i++)look(s,0,-200);
 assert.ok(s.pitch<=1.12);for(let i=0;i<100;i++)look(s,0,200);
 assert.ok(s.pitch>=-1.12);
});
test('forward/right basis vectors are perpendicular',()=>{
 for(const yaw of [0,.1,1,Math.PI/2,Math.PI]){
  const f=forward(yaw),r=right(yaw);
  assert.ok(Math.abs(f.x*r.x+f.z*r.z)<.000001);
 }
});
test('player cannot walk beyond the room walls',()=>{
 const s=newGame();for(let i=0;i<1800;i++)move(s,0,1,.05);
 assert.ok(s.z>=ROOM.minZ);
 for(let i=0;i<1800;i++)move(s,1,0,.05);
 assert.ok(s.x<=ROOM.maxX);
});
test('bag collider stops the player walking through it',()=>{
 const s=newGame();
 for(let i=0;i<300;i++)move(s,0,1,.05);
 assert.ok(s.z>BAG.z,'player must stay in front of bag collision volume');
 assert.ok(Math.hypot(s.x-BAG.x,s.z-BAG.z)>=BAG.radius+.38-.015);
});
test('punching while too far away misses',()=>{
 const s=newGame(),r=punch(s);
 assert.deepEqual(r,{performed:true,hit:false});
 assert.equal(s.totalPunches,1);assert.equal(s.hits,0);
});
test('punch is only effective close to the bag and facing it',()=>{
 const s=newGame();s.z=BAG.z+1.5;assert.equal(bagInRange(s),true);
 assert.equal(punch(s).hit,true);assert.equal(s.hits,1);
});
test('punching backward does not hit the bag',()=>{
 const s=newGame();s.z=BAG.z+1.5;s.yaw=Math.PI;
 assert.equal(bagInRange(s),false);assert.equal(punch(s).hit,false);
});
test('punching while looking too far away from bag vertically misses',()=>{
 const s=newGame();s.z=BAG.z+1.5;s.pitch=1.0;
 assert.equal(punch(s).hit,false);
});
test('punch cooldown prevents punching every frame',()=>{
 const s=newGame();s.z=BAG.z+1.5;
 assert.equal(punch(s).hit,true);assert.equal(punch(s).performed,false);
 update(s,.05);assert.equal(punch(s).performed,false);
 for(let i=0;i<10;i++)update(s,.05);
 assert.equal(punch(s).hit,true);assert.equal(s.hits,2);
});
test('hitting the bag gives it a real pendulum impulse',()=>{
 const s=newGame();s.z=BAG.z+1.5;punch(s);
 assert.ok(Math.abs(s.bagVelX)+Math.abs(s.bagVelZ)>0);
 update(s,.05);
 assert.ok(Math.abs(s.bagTiltX)+Math.abs(s.bagTiltZ)>0);
});
test('bag swing decays gradually instead of freezing',()=>{
 const s=newGame();s.z=BAG.z+1.5;punch(s);
 for(let i=0;i<25;i++)update(s,.05);
 const peak=Math.hypot(s.bagTiltX,s.bagTiltZ);
 for(let i=0;i<250;i++)update(s,.05);
 assert.ok(Math.hypot(s.bagTiltX,s.bagTiltZ)<peak);
});
test('punch swing remains bounded under repeated hits',()=>{
 const s=newGame();s.z=BAG.z+1.5;
 for(let i=0;i<150;i++){punch(s);for(let n=0;n<12;n++)update(s,.05)}
 assert.ok(Math.abs(s.bagTiltX)<=.67&&Math.abs(s.bagTiltZ)<=.67);
});
test('flashlight turns off and on without affecting movement',()=>{
 const s=newGame();assert.equal(flashlightToggle(s),false);
 move(s,0,1,.05);assert.ok(s.z<5.6);
 assert.equal(flashlightToggle(s),true);
});
test('frame times are clamped to avoid physics explosions',()=>{
 const s=newGame();move(s,0,1,25);
 assert.ok(Math.abs(s.z-5.6)<1);
 update(s,25);assert.ok(s.time<=.05);
});
test('all crate colliders have defined positive radii',()=>{
 for(const c of OBSTACLES){assert.ok(Number.isFinite(c.x));assert.ok(Number.isFinite(c.z));assert.ok(c.radius>0)}
});
