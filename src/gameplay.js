// Electromageddon v0.1 - deterministic gameplay rules (no renderer dependency)
export const ROOM = Object.freeze({ minX:-11.15,maxX:11.15,minZ:-11.1,maxZ:11.1 });
export const BAG = Object.freeze({ x:0,z:-3.75,radius:.65 });
export const ROBOT = Object.freeze({
 spawnX:-1.55,spawnZ:1.45,radius:.54,walkSpeed:1.18,reach:2.30,
 maxHealth:8,hitFlashSeconds:.85,staggerSeconds:.33,
 waypoints:[[-1.55,1.45],[2.45,1.45],[2.35,-1.55],[-2.3,-1.55]]
});
export function makeRobot(){
 return {x:ROBOT.spawnX,z:ROBOT.spawnZ,yaw:Math.PI/2,walking:true,health:ROBOT.maxHealth,
  waypoint:1,hitFlash:0,stagger:0,knockVx:0,knockVz:0,downTimer:0,hitsReceived:0};
}
export const FLASHLIGHT = Object.freeze({
  intensity:235, distance:36, angle:.57, penumbra:.72, decay:1.3,
  beamRadius:6.2, beamLength:12, beamOpacity:.035
});
export const OBSTACLES = Object.freeze([
  {x:-7.1,z:-6.4,radius:1.15},{x:7.0,z:-6.2,radius:1.15},
  {x:-7.5,z:3.6,radius:1.2},{x:7.5,z:3.65,radius:1.2}
]);
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
export function forward(yaw){return {x:Math.sin(yaw),z:-Math.cos(yaw)}}
export function right(yaw){return {x:Math.cos(yaw),z:Math.sin(yaw)}}
export function newGame(){
  return {x:0,z:5.6,yaw:0,pitch:0,walkPhase:0,isMoving:false,
    flashlight:true,punchCooldown:0,punchAnim:0,punchArm:'left',totalPunches:0,hits:0,
    robotHits:0,robot:makeRobot(),
    bagTiltX:0,bagTiltZ:0,bagVelX:0,bagVelZ:0,lastHitAt:-100,
    time:0};
}
export function look(state,dx,dy,sensitivity=.0035){
  state.yaw+=clamp(dx,-175,175)*sensitivity;
  state.pitch=clamp(state.pitch-clamp(dy,-175,175)*sensitivity*.64,-1.12,1.12);
}
function separateCircle(state,object,playerRadius=.38){
  const dx=state.x-object.x,dz=state.z-object.z;
  const min=object.radius+playerRadius,d=Math.hypot(dx,dz);
  if(d<min){
    const nx=d>.00001?dx/d:1,nz=d>.00001?dz/d:0;
    state.x=object.x+nx*(min+.005);state.z=object.z+nz*(min+.005);
  }
}
export function move(state,strafe,advance,dt,sprint=false){
  dt=clamp(dt,0,.05);
  const length=Math.hypot(strafe,advance);
  state.isMoving=length>.01;
  if(!state.isMoving)return;
  const s=length>1?1/length:1,step=(sprint?5.8:3.45)*dt;
  const f=forward(state.yaw),r=right(state.yaw);
  state.x+=(r.x*strafe+f.x*advance)*s*step;
  state.z+=(r.z*strafe+f.z*advance)*s*step;
  state.x=clamp(state.x,ROOM.minX,ROOM.maxX);
  state.z=clamp(state.z,ROOM.minZ,ROOM.maxZ);
  for(const item of [...OBSTACLES,BAG,{x:state.robot.x,z:state.robot.z,radius:ROBOT.radius}])separateCircle(state,item);
  state.x=clamp(state.x,ROOM.minX,ROOM.maxX);
  state.z=clamp(state.z,ROOM.minZ,ROOM.maxZ);
  state.walkPhase+=dt*(sprint?12.5:8.2);
}
export function bagInRange(state){
  const dx=BAG.x-state.x,dz=BAG.z-state.z,distance=Math.hypot(dx,dz);
  if(distance>2.45||distance<.01)return false;
  const f=forward(state.yaw);
  return (f.x*dx+f.z*dz)/distance>.70 && Math.abs(state.pitch)<.86;
}
export function robotInRange(state){
 const r=state.robot;if(r.downTimer>0)return false;
 const dx=r.x-state.x,dz=r.z-state.z,distance=Math.hypot(dx,dz);
 if(distance>ROBOT.reach||distance<.01)return false;
 const f=forward(state.yaw);
 return (f.x*dx+f.z*dz)/distance>.68&&Math.abs(state.pitch)<.90;
}
function keepRobotInRoom(r){
 r.x=clamp(r.x,ROOM.minX+ROBOT.radius,ROOM.maxX-ROBOT.radius);
 r.z=clamp(r.z,ROOM.minZ+ROBOT.radius,ROOM.maxZ-ROBOT.radius);
 for(const o of [...OBSTACLES,BAG]){
  const dx=r.x-o.x,dz=r.z-o.z,d=Math.hypot(dx,dz),limit=o.radius+ROBOT.radius;
  if(d<limit){const nx=d>.001?dx/d:1,nz=d>.001?dz/d:0;
    r.x=o.x+nx*(limit+.01);r.z=o.z+nz*(limit+.01)}
 }
}
export function updateRobot(state,dt){
 const r=state.robot;
 dt=clamp(dt,0,.05);
 r.hitFlash=Math.max(0,r.hitFlash-dt);
 r.stagger=Math.max(0,r.stagger-dt);
 if(r.downTimer>0){
  r.downTimer=Math.max(0,r.downTimer-dt);r.walking=false;
  if(r.downTimer===0){
   const fresh=makeRobot();Object.assign(r,fresh);
  }
  return;
 }
 // Visible rearward knockback on impact, then a damped recovery.
 if(Math.abs(r.knockVx)+Math.abs(r.knockVz)>.002){
  r.x+=r.knockVx*dt;r.z+=r.knockVz*dt;
  const friction=Math.exp(-9.0*dt);
  r.knockVx*=friction;r.knockVz*=friction;
  keepRobotInRoom(r);
 }
 if(r.stagger>0){r.walking=false;return}
 const goal=ROBOT.waypoints[r.waypoint],dx=goal[0]-r.x,dz=goal[1]-r.z,dist=Math.hypot(dx,dz);
 if(dist<.32){r.waypoint=(r.waypoint+1)%ROBOT.waypoints.length;r.walking=true;return}
 const step=Math.min(dist,ROBOT.walkSpeed*dt),nx=dx/dist,nz=dz/dist;
 r.x+=nx*step;r.z+=nz*step;
 // Face the waypoint in the same yaw convention as the player.
 r.yaw=Math.atan2(nx,-nz);r.walking=true;
 keepRobotInRoom(r);
}
export function punch(state){
  if(state.punchCooldown>0)return {performed:false,hit:false};
  state.punchCooldown=.42;
  state.punchAnim=.33;
  state.totalPunches++;
  // The active punching side changes on every actual attempt, hit or miss.
  state.punchArm=state.punchArm==='right'?'left':'right';
  const robotHit=robotInRange(state);
  if(robotHit){
    const r=state.robot,f=forward(state.yaw);
    state.robotHits++;state.hits++;state.lastHitAt=state.time;
    r.hitsReceived++;r.health=Math.max(0,r.health-1);
    r.hitFlash=ROBOT.hitFlashSeconds;r.stagger=ROBOT.staggerSeconds;
    r.knockVx=f.x*3.4;r.knockVz=f.z*3.4;
    if(r.health===0){r.downTimer=2.5;r.walking=false}
    return {performed:true,hit:true,target:'robot',arm:state.punchArm};
  }
  const hit=bagInRange(state);
  if(hit){
    state.hits++;state.lastHitAt=state.time;
    const f=forward(state.yaw);
    // The bag hangs BELOW its pivot. Positive X rotation sends its
    // bottom toward -Z, and positive Z rotation sends its bottom toward +X.
    // Keep the impulse aligned with the punch, AWAY from the player.
    state.bagVelX-=f.z*2.3;
    state.bagVelZ+=f.x*2.3;
  }
  return {performed:true,hit,target:hit?'bag':null,arm:state.punchArm};
}
export function update(state,dt){
  dt=clamp(dt,0,.05);
  state.time+=dt;
  state.punchCooldown=Math.max(0,state.punchCooldown-dt);
  state.punchAnim=Math.max(0,state.punchAnim-dt);
  updateRobot(state,dt);
  // Damped pendulum at a heavy chain, with modest swing limits.
  const spring=10.5,drag=Math.exp(-1.65*dt);
  state.bagVelX=(state.bagVelX-state.bagTiltX*spring*dt)*drag;
  state.bagVelZ=(state.bagVelZ-state.bagTiltZ*spring*dt)*drag;
  state.bagTiltX=clamp(state.bagTiltX+state.bagVelX*dt,-.67,.67);
  state.bagTiltZ=clamp(state.bagTiltZ+state.bagVelZ*dt,-.67,.67);
}
export function flashlightToggle(state){state.flashlight=!state.flashlight;return state.flashlight}
