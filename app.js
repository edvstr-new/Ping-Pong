(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const toast = (message) => {
    const element = $("#toast");
    element.textContent = message;
    element.classList.add("show");
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => element.classList.remove("show"), 2600);
  };
  const adConsentDialog=$("#ad-consent-dialog");
  const adPreferenceKey="pong-ad-preference-v1";
  function applyAdPreference(preference){
    $$(".court-ad-slot").forEach((slot)=>slot.hidden=preference!=="accepted");
    if(preference==="accepted"){
      document.body.classList.remove("consent-required");
      if(adConsentDialog.open)adConsentDialog.close();
    }
  }
  $("#accept-ads").addEventListener("click",()=>{
    localStorage.setItem(adPreferenceKey,"accepted");
    applyAdPreference("accepted");
  });
  adConsentDialog.addEventListener("cancel",(event)=>event.preventDefault());
  const savedAdPreference=localStorage.getItem(adPreferenceKey);
  if(savedAdPreference==="accepted")applyAdPreference("accepted");
  else{
    document.body.classList.add("consent-required");
    applyAdPreference("required");
    adConsentDialog.showModal();
  }
  const pages = ["home", "tutorial", "problems", "onevone", "evolution", "world"];
  const pageTitles = {home:"OVERVIEW",tutorial:"TUTORIAL",problems:"PONG PROBLEMS",onevone:"PONG 1V1",evolution:"PONG EVOLUTION",world:"PONG WORLD"};
  const setPage = (name) => {
    if (!pages.includes(name)) return;
    $$(".page").forEach((page) => page.classList.toggle("active", page.id === `page-${name}`));
    $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.page === name));
    $("#current-location").textContent = pageTitles[name];
    if (name === "onevone") drawPong();
    if (name === "world") drawWorld();
    window.scrollTo({top:0,behavior:"smooth"});
  };
  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-page]");
    if (target) { event.preventDefault(); setPage(target.dataset.page); }
  });

  const lessons = [
    {title:"Movement & controls",short:"Find your feet",body:"Use W and S only to move your paddle up and down. Press A to tilt it right (front edge up) or D to tilt it left (front edge down). In local matches, Player 2 uses the arrow keys the same way: up/down to move and left/right to tilt."},
    {title:"The perfect return",short:"Meet the ball",body:"A return is more than a save. The point where the ball hits your paddle changes its angle: hit near the center for a steady shot, or near an edge to send it wide."},
    {title:"Paddle tilt",short:"Shape the angle",body:"Moving your paddle tilts it by a full 45 degrees. Meet the ball while moving to add spin and shape a sharper return. The tilt is bold, so time your movement deliberately."},
    {title:"Powerups",short:"Claim an orb",body:"Glowing orbs spawn on the center line. The last player to hit the ball claims its power: fastball, a double-size paddle, or a split double ball. Slowball is sent to the opponent, making their next shot easier to return. Each power lasts up to ten seconds."},
    {title:"Quick time events",short:"React on cue",body:"Watch for a QTE cue during high-pressure rallies. Press the full random combination of W, A, S, and D keys in the order shown before time runs out to steady your return."},
    {title:"Read the rally",short:"Think ahead",body:"The ball reflects off the court walls. Track its angle and speed to predict where it will meet your paddle. Mix up your own return to keep the opponent guessing."}
  ];
  let activeLesson = 0;
  const completedLessons = new Set();
  function renderLesson() {
    const lesson = lessons[activeLesson];
    $("#lesson-list").innerHTML = lessons.map((item,index) => `<button class="lesson-item ${index===activeLesson?"active":""} ${completedLessons.has(index)?"done":""}" data-lesson="${index}"><span class="lesson-number">${completedLessons.has(index)?"✓":String(index+1).padStart(2,"0")}</span><span class="lesson-item-copy"><strong>${item.title}</strong><small>${item.short}</small></span></button>`).join("");
    $("#lesson-kicker").textContent = `LESSON ${String(activeLesson+1).padStart(2,"0")} / ${String(lessons.length).padStart(2,"0")}`;
    $("#lesson-title").textContent = lesson.title;
    $("#lesson-description").textContent = lesson.body;
    $("#lesson-progress").textContent = `${completedLessons.size} OF ${lessons.length} COMPLETED`;
    $("#lesson-next").textContent = completedLessons.has(activeLesson) ? (activeLesson === lessons.length-1 ? "ALL LESSONS COMPLETE ✓" : "NEXT LESSON  ↗") : "MARK COMPLETE  ↗";
  }
  $("#lesson-list").addEventListener("click", (event) => {
    const item = event.target.closest("[data-lesson]");
    if (item) { activeLesson = Number(item.dataset.lesson); renderLesson(); }
  });
  $("#lesson-next").addEventListener("click", () => {
    completedLessons.add(activeLesson);
    if (activeLesson < lessons.length - 1) activeLesson++;
    renderLesson();
    if (completedLessons.size === lessons.length) toast("Tutorial complete. You're ready for the arena.");
  });
  renderLesson();

  let problem={type:"prediction",phase:"aim",x:55,y:36,vx:-.78,vy:.48,paddleY:50,last:0,qteSequence:[],qteIndex:0,qteTime:0,trackingHits:0,streak:0,solved:0,totalAccuracy:0};
  const problemCourt=$("#problem-court"),problemBall=$("#problem-ball"),problemPaddle=$("#problem-player-paddle"),problemAction=$("#check-prediction");
  function finishProblem(success,message){
    if(problem.phase==="success"||problem.phase==="failed")return;
    problem.phase=success?"success":"failed";
    problem.solved++;problem.totalAccuracy+=success?100:0;
    problem.streak=success?problem.streak+1:0;
    $("#problem-streak").textContent=problem.streak;$("#problem-solved").textContent=problem.solved;
    $("#problem-accuracy").innerHTML=`${Math.round(problem.totalAccuracy/problem.solved)}<small>%</small>`;
    $("#problem-result").textContent=message;$("#problem-result").style.color=success?"var(--green)":"var(--orange)";
    problemAction.disabled=false;problemAction.textContent="TRY AGAIN  ↗";
  }
  function resetProblem(){
    problem.phase="aim";problem.x=55;problem.y=20+Math.random()*60;
    problem.vx=-.7-Math.random()*.16;problem.vy=(Math.random()-.5)*1.25;
    problem.paddleY=50;problem.last=0;problem.qteSequence=[];problem.qteIndex=0;problem.qteTime=0;problem.trackingHits=0;
    problemBall.style.left=`${problem.x}%`;problemBall.style.top=`${problem.y}%`;
    problemPaddle.style.top=`${problem.paddleY}%`;
    $("#opponent-paddle").classList.add("hidden");
    $("#problem-qte-prompt").classList.add("hidden");
    $("#tracking-progress").textContent="TRACKED RETURNS: 0 / 3";
    $("#problem-result").textContent="";problemAction.disabled=false;
    problemAction.textContent=problem.type==="prediction"?"RELEASE THE BALL  ↗":problem.type==="timing"?"START QUICKTIME  ↗":"START TRACKING  ↗";
    $("#problem-prompt").textContent=problem.type==="prediction"
      ?"The ball is frozen. Drag your paddle into position, then release the ball. Once it moves, your paddle is locked."
      :problem.type==="timing"?"Ready your fingers. You'll have to hit the complete random WASD sequence before time runs out."
      :"Start the drill, then drag your paddle up and down to catch the ball as it bounces across the court.";
  }
  function newProblem(){resetProblem()}
  function setProblemType(type){
    problem.type=type;
    const config={
      prediction:["Read the bounce","The ball is frozen mid-flight. Place your paddle, then see if your read saves the point."],
      timing:["Quicktime training","React to a random combination of W, A, S, and D before the timer expires."],
      strategy:["Track the ball","Drag your paddle with the ball as it bounces up and down. Land three returns to win."]
    }[type];
    $("#problem-title").textContent=config[0];$("#problem-prompt").textContent=config[1];
    $("#prediction-controls").classList.toggle("hidden",type!=="prediction");
    $(".timing-challenge").classList.toggle("hidden",type!=="timing");
    $(".strategy-challenge").classList.toggle("hidden",type!=="strategy");
    $$(".problem-type").forEach((button)=>button.classList.toggle("active",button.dataset.problemType===type));
    newProblem();
  }
  $$(".problem-type").forEach((button)=>button.addEventListener("click",()=>setProblemType(button.dataset.problemType)));
  function setProblemPaddleFromPointer(event){
    if(problem.phase!=="aim"&&!(problem.type==="strategy"&&problem.phase==="running"))return;
    const bounds=problemCourt.getBoundingClientRect();
    problem.paddleY=Math.max(9,Math.min(91,(event.clientY-bounds.top)/bounds.height*100));
    problemPaddle.style.top=`${problem.paddleY}%`;
  }
  problemCourt.addEventListener("pointerdown",(event)=>{
    if(event.target===problemCourt||event.target===problemBall||event.target===problemPaddle){problemCourt.setPointerCapture(event.pointerId);setProblemPaddleFromPointer(event);event.preventDefault()}
  });
  problemCourt.addEventListener("pointermove",(event)=>{
    if(problemCourt.hasPointerCapture(event.pointerId))setProblemPaddleFromPointer(event);
  });
  problemCourt.addEventListener("pointerup",(event)=>{
    if(problemCourt.hasPointerCapture(event.pointerId))problemCourt.releasePointerCapture(event.pointerId);
  });
  function startQuicktime(){
    const letters=["w","a","s","d"];
    problem.qteSequence=Array.from({length:4+Math.floor(Math.random()*3)},()=>letters[Math.floor(Math.random()*letters.length)]);
    problem.qteIndex=0;problem.qteTime=8;problem.phase="running";
    $("#problem-qte-prompt").innerHTML=problem.qteSequence.map((letter,index)=>`<kbd class="${index===0?"current":""}">${letter.toUpperCase()}</kbd>`).join("");
    $("#problem-qte-prompt").classList.remove("hidden");
    $("#problem-prompt").textContent="Type the highlighted keys in order. Wrong keys reset your combo.";
    problemAction.disabled=true;problemAction.textContent="TYPE THE COMBO";
  }
  function startProblem(){
    if(problem.phase==="success"||problem.phase==="failed"){newProblem();return}
    if(problem.type==="timing"){startQuicktime();return}
    problem.phase="running";problem.last=0;
    if(problem.type==="strategy"){
      problem.x=82;problem.y=16+Math.random()*68;problem.vx=-.62;problem.vy=.62+(Math.random()*.28);
      problemBall.style.left=`${problem.x}%`;problemBall.style.top=`${problem.y}%`;
      $("#problem-prompt").textContent="Track the ball with your paddle. Each clean catch sends it back; miss once and the drill ends.";
      $("#tracking-progress").textContent="TRACKED RETURNS: 0 / 3";
    }else{
      $("#problem-prompt").textContent="The ball is live. Your paddle is locked—see whether your frozen position saves the point.";
    }
    problemAction.disabled=true;problemAction.textContent=problem.type==="strategy"?"TRACK THE BALL":"BALL IN PLAY";
  }
  $("#new-problem").addEventListener("click",newProblem);
  problemAction.addEventListener("click",startProblem);
  function updateProblem(time){
    if(!$("#page-problems").classList.contains("active")){problem.last=time;requestAnimationFrame(updateProblem);return}
    if(problem.phase==="running"){
      const dt=Math.min((time-problem.last)/16.67||1,2.4);problem.last=time;
      if(problem.type==="timing"){
        problem.qteTime-=dt/60;
        if(problem.qteTime<=0)finishProblem(false,"Time's up—you missed the QTE. Start another and try the combo again.");
      }else{
        problem.x+=problem.vx*dt;problem.y+=problem.vy*dt;
        if(problem.y<4){problem.y=4;problem.vy=Math.abs(problem.vy)}
        if(problem.y>96){problem.y=96;problem.vy=-Math.abs(problem.vy)}
        problemBall.style.left=`${problem.x}%`;problemBall.style.top=`${problem.y}%`;
        if(problem.type==="prediction"&&problem.x<=12){
          const caught=Math.abs(problem.y-problem.paddleY)<=11;
          finishProblem(caught,caught?"Saved! Your paddle read was right.":"The ball got past your paddle. You lose this point.");
        }else if(problem.type==="strategy"&&problem.vx<0&&problem.x<=12){
          if(Math.abs(problem.y-problem.paddleY)<=11){
            problem.trackingHits++;problem.vx=Math.abs(problem.vx);
            $("#tracking-progress").textContent=`TRACKED RETURNS: ${problem.trackingHits} / 3`;
            if(problem.trackingHits>=3)finishProblem(true,"Three clean returns! You kept your paddle on the bouncing ball.");
          }else finishProblem(false,"You lost the ball. Keep your paddle moving with it and try again.");
        }else if(problem.type==="strategy"&&problem.vx>0&&problem.x>=88)problem.vx=-Math.abs(problem.vx);
      }
    }else problem.last=time;
    requestAnimationFrame(updateProblem);
  }
  requestAnimationFrame(updateProblem);
  document.addEventListener("keydown",(event)=>{
    if(!$("#page-problems").classList.contains("active")||problem.type!=="timing"||problem.phase!=="running")return;
    const key=event.key.toLowerCase();
    if(!["w","a","s","d"].includes(key))return;
    event.preventDefault();
    if(key===problem.qteSequence[problem.qteIndex])problem.qteIndex++;
    else problem.qteIndex=key===problem.qteSequence[0]?1:0;
    $$("#problem-qte-prompt kbd").forEach((letter,index)=>letter.classList.toggle("current",index===problem.qteIndex));
    if(problem.qteIndex===problem.qteSequence.length)finishProblem(true,"Quick reactions! You nailed the whole combination.");
  });
  setProblemType("prediction");

  const canvas = $("#pong-canvas");
  const ctx = canvas.getContext("2d");
  const game = {mode:"ai",running:false,left:250,right:250,tiltLeft:0,tiltRight:0,balls:[],extraBalls:[],orb:null,orbSpawnTimer:4,leftHeight:76,rightHeight:76,paddleBoost:{left:0,right:0},powers:{left:null,right:null},lastHit:"left",scoreLeft:0,scoreRight:0,last:0,pointsToWin:7,powerups:true,qteTimer:0,qteSequence:[],qteIndex:0,rallies:0};
  const keys = new Set();
  function randomQteSequence(){
    const sequence=["w","a","s","d"];
    for(let index=sequence.length-1;index>0;index--){
      const swap=Math.floor(Math.random()*(index+1));
      [sequence[index],sequence[swap]]=[sequence[swap],sequence[index]];
    }
    return sequence;
  }
  function resetBall(direction = Math.random() < .5 ? -1 : 1,lastHit=direction>0?"left":"right") {
    game.balls=[{x:canvas.width/2,y:canvas.height/2,vx:direction*(4.6+Math.random()*1.1),vy:(Math.random()-.5)*5.2,type:"normal",powerOwner:null,powerTimer:0,baseSpeed:0}];
    game.extraBalls=[];game.orb=null;game.orbSpawnTimer=1.5+Math.random()*2;
    game.powers={left:null,right:null};game.paddleBoost={left:0,right:0};game.leftHeight=76;game.rightHeight=76;
    game.lastHit=lastHit;
    game.qteTimer=0;game.qteSequence=[];game.qteIndex=0;game.rallies=0;$("#qte-prompt").classList.remove("active");
  }
  function resetMatch() {
    game.scoreLeft=0; game.scoreRight=0; game.left=250; game.right=250; game.running=false; game.qteTimer=0;game.qteSequence=[];game.qteIndex=0; game.rallies=0; $("#qte-prompt").classList.remove("active"); resetBall();renderPowerStatus();
    $("#score-left").textContent="0"; $("#score-right").textContent="0"; $("#game-overlay").classList.remove("hidden"); $("#start-game").textContent="START MATCH  ↗"; drawPong();
  }
  const powerupTypes={
    fast:{name:"FASTBALL",color:"#ffcf77"},
    slow:{name:"SLOWBALL",color:"#93baff"},
    paddle:{name:"2× PADDLE",color:"#a4f6b1"},
    double:{name:"DOUBLE BALL",color:"#c5adff"}
  };
  const pongBallRadius=7,powerupOrbRadius=pongBallRadius*3;
  function renderPowerStatus(){
    const active=[];
    for(const side of ["left","right"]){
      const power=game.powers[side],boost=game.paddleBoost[side];
      if(power)active.push(`${side==="left"?"YOU":"CPU"} · ${powerupTypes[power.type].name}`);
      if(boost>0)active.push(`${side==="left"?"YOU":"CPU"} · 2× PADDLE ${Math.ceil(boost)}s`);
    }
    for(const ball of game.balls.concat(game.extraBalls)){
      if(["fast","slow","splitFast","splitSlow"].includes(ball.type)){
        const label=ball.type==="fast"||ball.type==="splitFast"?"FAST BALL":ball.type==="slow"||ball.type==="splitSlow"?"SLOW BALL":"";
        if(label)active.push(`${label} ${Math.ceil(ball.powerTimer)}s`);
      }
    }
    if(game.orb)active.push(`${powerupTypes[game.orb.type].name} ORB ON CENTER LINE`);
    $("#powerup-status").textContent=active.join("  ·  ")||(game.powerups?"Collect a glowing center-line orb":"Powerups disabled");
  }
  function awardPowerup(side,type){
    if(type==="paddle")game.paddleBoost[side]=10;
    else game.powers[side]={type,timer:10};
    toast(type==="slow"
      ?`${side==="left"?"CPU":"You"} sent a SLOWBALL to ${side==="left"?"you":"the CPU"}!`
      :`${side==="left"?"You":"CPU"} claimed ${powerupTypes[type].name}!`);
    renderPowerStatus();
  }
  function splitDoubleBall(ball,side){
    const forward=side==="left"?1:-1,speed=Math.hypot(ball.vx,ball.vy);
    const baseAngle=Math.atan2(ball.vy,Math.abs(ball.vx));
    const splitAngle=Math.max(-.72,Math.min(.72,baseAngle));
    const launch=(angle,type)=>({
      x:ball.x,y:ball.y,vx:forward*Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
      type,powerOwner:side,powerTimer:10,baseSpeed:speed
    });
    ball.type="splitFast";ball.powerOwner=side;ball.powerTimer=10;ball.baseSpeed=speed;
    ball.vx=forward*Math.cos(splitAngle-.3)*speed*1.2;
    ball.vy=Math.sin(splitAngle-.3)*speed*1.2;
    const slowBall=launch(splitAngle+.3,"splitSlow");
    slowBall.vx*=.85;slowBall.vy*=.85;slowBall.baseSpeed*=.85;
    game.extraBalls.push(slowBall);
  }
  function hitPaddle(ball,side){
    const ownPower=game.powers[side];
    if(ball.type==="splitFast")return false;
    if(ball.type==="splitSlow"){
      const speed=ball.baseSpeed||Math.hypot(ball.vx,ball.vy);
      ball.type="normal";ball.powerOwner=null;ball.powerTimer=0;
      ball.vx=(side==="left"?1:-1)*speed;ball.vy+=(ball.y-game[side])*.035;
    }else{
      if(ball.type==="fast"&&ball.powerOwner!==side){
        const speed=Math.hypot(ball.vx,ball.vy),baseSpeed=ball.baseSpeed||speed/1.65;
        ball.vx*=baseSpeed/speed;ball.vy*=baseSpeed/speed;
        ball.type="normal";ball.powerOwner=null;ball.powerTimer=0;
      }
      if(ball.type==="slow"&&ball.powerOwner===side){
        const speed=Math.hypot(ball.vx,ball.vy),baseSpeed=ball.baseSpeed||speed/0.55;
        ball.vx*=baseSpeed/speed;ball.vy*=baseSpeed/speed;
        ball.type="normal";ball.powerOwner=null;ball.powerTimer=0;
      }
      const contact=(ball.y-game[side])/(side==="left"?game.leftHeight:game.rightHeight);
      ball.vx=(side==="left"?1:-1)*Math.abs(ball.vx)*1.045;
      ball.vy+=contact*.11;
      if(ownPower){
        game.powers[side]=null;
        if(ownPower.type==="fast"){
          const speed=Math.hypot(ball.vx,ball.vy);ball.baseSpeed=speed;
          ball.vx*=1.65;ball.vy*=1.65;ball.type="fast";ball.powerOwner=side;ball.powerTimer=ownPower.timer;
        }else if(ownPower.type==="slow"){
          const speed=Math.hypot(ball.vx,ball.vy);ball.baseSpeed=speed;
          ball.vx*=.55;ball.vy*=.55;ball.type="slow";ball.powerOwner=side;ball.powerTimer=ownPower.timer;
        }else if(ownPower.type==="double")splitDoubleBall(ball,side);
        renderPowerStatus();
      }
    }
    game.lastHit=side;game.rallies++;
    if(side==="left"&&game.mode!=="arena"&&game.qteTimer<=0&&game.rallies>=3&&Math.random()<.2){
      game.qteSequence=randomQteSequence();game.qteIndex=0;game.qteTimer=180;
      $("#qte-key").innerHTML=game.qteSequence.map((letter,index)=>`<kbd class="${index===0?"current":""}">${letter.toUpperCase()}</kbd>`).join("");$("#qte-prompt").classList.add("active");
    }
    return true;
  }
  function updatePowerups(dt){
    for(const side of ["left","right"]){
      if(game.powers[side]){game.powers[side].timer-=dt/60;if(game.powers[side].timer<=0)game.powers[side]=null}
      if(game.paddleBoost[side]>0){game.paddleBoost[side]=Math.max(0,game.paddleBoost[side]-dt/60)}
    }
    game.leftHeight=game.paddleBoost.left>0?152:76;
    game.rightHeight=game.paddleBoost.right>0?152:76;
    for(const ball of game.balls.concat(game.extraBalls)){
      if(ball.powerTimer>0){
        ball.powerTimer-=dt/60;
        if(ball.powerTimer<=0){
          const speed=Math.hypot(ball.vx,ball.vy);
          if(ball.type==="fast"||ball.type==="slow"){
            const baseSpeed=ball.baseSpeed||speed;
            ball.vx*=baseSpeed/speed;ball.vy*=baseSpeed/speed;
            ball.type="normal";
          }else if(ball.type==="splitFast"||ball.type==="splitSlow")ball.type="normal";
          ball.powerOwner=null;ball.powerTimer=0;
        }
      }
    }
    if(game.powerups){
      if(!game.orb){game.orbSpawnTimer-=dt/60;if(game.orbSpawnTimer<=0){
        const types=Object.keys(powerupTypes),type=types[Math.floor(Math.random()*types.length)];
        game.orb={x:canvas.width/2,y:35+Math.random()*(canvas.height-70),type};
      }}
      for(const ball of game.balls.concat(game.extraBalls)){
        if(game.orb&&Math.hypot(ball.x-game.orb.x,ball.y-game.orb.y)<=pongBallRadius+powerupOrbRadius){
          const {type}=game.orb;game.orb=null;game.orbSpawnTimer=3+Math.random()*4;
          const side=type==="slow"?(game.lastHit==="left"?"right":"left"):game.lastHit;
          awardPowerup(side,type);
        }
      }
    }else game.orb=null;
    renderPowerStatus();
  }
  function drawPong() {
    if (!ctx) return;
    const w=canvas.width,h=canvas.height;
    ctx.clearRect(0,0,w,h); ctx.fillStyle="#0b1119"; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle="#263241";ctx.setLineDash([6,10]);ctx.beginPath();ctx.moveTo(w/2,0);ctx.lineTo(w/2,h);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle="#80eddd";ctx.shadowColor="#7df2e3";ctx.shadowBlur=14;ctx.save();ctx.translate(28.5,game.left);ctx.rotate(game.tiltLeft);ctx.fillRect(-4.5,-game.leftHeight/2,9,game.leftHeight);ctx.restore();
    ctx.shadowColor="#ff9b72";ctx.fillStyle="#ff9b72";ctx.save();ctx.translate(w-28.5,game.right);ctx.rotate(game.tiltRight);ctx.fillRect(-4.5,-game.rightHeight/2,9,game.rightHeight);ctx.restore();
    for(const ball of game.balls.concat(game.extraBalls)){
      ctx.shadowColor=ball.type==="fast"||ball.type==="splitFast"?"#ffcf77":ball.type==="slow"||ball.type==="splitSlow"?"#93baff":"#7df2e3";
      ctx.fillStyle=ball.type==="fast"||ball.type==="splitFast"?"#ffe3a3":ball.type==="slow"||ball.type==="splitSlow"?"#b9d8ff":"#d6fff8";
      ctx.beginPath();ctx.arc(ball.x,ball.y,7,0,Math.PI*2);ctx.fill();
    }
    if(game.orb){
      ctx.shadowColor=powerupTypes[game.orb.type].color;ctx.shadowBlur=19;ctx.fillStyle=powerupTypes[game.orb.type].color;
      ctx.beginPath();ctx.arc(game.orb.x,game.orb.y,powerupOrbRadius,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;ctx.fillStyle="#10141e";ctx.font="bold 14px monospace";ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillText(game.orb.type==="paddle"?"2×":game.orb.type==="double"?"×2":game.orb.type==="fast"?"F":"S",game.orb.x,game.orb.y+0.5);ctx.textBaseline="alphabetic";
    }
    ctx.shadowBlur=0;
  }
  function finishPoint(missedSide) {
    if(missedSide==="left")game.scoreRight++;
    else game.scoreLeft++;
    $("#score-left").textContent=game.scoreLeft; $("#score-right").textContent=game.scoreRight;
    if (game.scoreLeft >= game.pointsToWin || game.scoreRight >= game.pointsToWin) {
      game.running=false; $("#game-overlay").classList.remove("hidden");
      $("#game-overlay .overlay-chip").textContent=game.scoreLeft>game.scoreRight?"MATCH WON":"MATCH OVER";
      $("#game-overlay strong").textContent=game.scoreLeft>game.scoreRight?"NICE PLAY.":"NEXT RALLY.";
      $("#start-game").textContent="PLAY AGAIN  ↗";
      game.orb=null;game.powers={left:null,right:null};game.paddleBoost={left:0,right:0};game.leftHeight=76;game.rightHeight=76;
      game.extraBalls=[];
      for(const ball of game.balls){ball.type="normal";ball.powerOwner=null;ball.powerTimer=0}
      renderPowerStatus();return;
    }
    resetBall(missedSide==="left"?1:-1,missedSide==="left"?"right":"left");
  }
  function gameFrame(time) {
    const dt=Math.min((time-game.last)/16.67||1,2.4); game.last=time;
    if (game.running && $("#page-onevone").classList.contains("active")) {
      const speed=5.8*dt;
      if (game.mode!=="arena"&&keys.has("w")) game.left=Math.max(game.leftHeight/2,game.left-speed);
      if (game.mode!=="arena"&&keys.has("s")) game.left=Math.min(canvas.height-game.leftHeight/2,game.left+speed);
      if (game.mode==="local") {
        if(keys.has("arrowup"))game.right=Math.max(game.rightHeight/2,game.right-speed);
        if(keys.has("arrowdown"))game.right=Math.min(canvas.height-game.rightHeight/2,game.right+speed);
      } else {
        const aiSpeed=game.mode==="arena"?4.4:3.7;
        const target=game.balls[0]?.x>canvas.width*.45?game.balls[0].y:canvas.height/2;
        game.right+=Math.max(-aiSpeed,Math.min(aiSpeed,target-game.right))*dt;
      }
      if(game.mode==="arena"){
        const target=game.balls[0]?.x<canvas.width*.55?game.balls[0].y:canvas.height/2;
        game.left+=Math.max(-4.4,Math.min(4.4,target-game.left))*dt;
      }
      game.tiltLeft=keys.has("a")?Math.PI/4:keys.has("d")?-Math.PI/4:0;
      game.tiltRight=game.mode==="local"?(keys.has("arrowleft")?Math.PI/4:keys.has("arrowright")?-Math.PI/4:0):0;
      if(game.qteTimer>0){game.qteTimer-=dt;if(game.qteTimer<=0)$("#qte-prompt").classList.remove("active")}
      updatePowerups(dt);
      if(game.mode!=="arena"){
        const leftHalf=game.leftHeight/2;
        game.left=Math.max(leftHalf,Math.min(canvas.height-leftHalf,game.left));
      }
      const rightHalf=game.rightHeight/2;
      game.right=Math.max(rightHalf,Math.min(canvas.height-rightHalf,game.right));
      const allBalls=game.balls.concat(game.extraBalls);
      for(const ball of allBalls){
        ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
        if(ball.y<7||ball.y>canvas.height-7){ball.y=Math.max(7,Math.min(canvas.height-7,ball.y));ball.vy*=-1}
        const leftX=34,rightX=canvas.width-34;
        if(ball.vx<0&&ball.x<=leftX&&Math.abs(ball.y-game.left)<game.leftHeight/2+8){
          ball.x=leftX;
          if(!hitPaddle(ball,"left")){
            game.balls=game.balls.filter((current)=>current!==ball);
            game.extraBalls=game.extraBalls.filter((current)=>current!==ball);
          }
          else{ball.vy+=(keys.has("s")?-.28:keys.has("w")?.28:0);if(ball.type==="normal")ball.vx=Math.min(Math.abs(ball.vx),9)}
        }
        if(ball.vx>0&&ball.x>=rightX&&Math.abs(ball.y-game.right)<game.rightHeight/2+8){
          ball.x=rightX;
          if(!hitPaddle(ball,"right")){
            game.balls=game.balls.filter((current)=>current!==ball);
            game.extraBalls=game.extraBalls.filter((current)=>current!==ball);
          }
          else if(ball.type==="normal")ball.vx=-Math.min(Math.abs(ball.vx),9);
        }
        if(ball.x<0||ball.x>canvas.width){finishPoint(ball.x<0?"left":"right");break}
        const speed=Math.hypot(ball.vx,ball.vy),limit=ball.type==="fast"||ball.type==="splitFast"?15:9;
        if(speed>limit){ball.vx*=limit/speed;ball.vy*=limit/speed}
        ball.vy=Math.max(-10,Math.min(10,ball.vy));
      }
    }
    drawPong();requestAnimationFrame(gameFrame);
  }
  requestAnimationFrame(gameFrame);
  function startMatch() {
    game.pointsToWin=Number($("#points-select").value);game.running=true;game.scoreLeft=0;game.scoreRight=0;resetBall();$("#score-left").textContent="0";$("#score-right").textContent="0";$("#game-overlay").classList.add("hidden");$("#game-overlay .overlay-chip").textContent="READY WHEN YOU ARE";$("#game-overlay strong").textContent=`FIRST TO ${game.pointsToWin}`;
  }
  $("#start-game").addEventListener("click",startMatch);
  $("#reset-game").addEventListener("click",resetMatch);
  $("#points-select").addEventListener("change",()=>game.pointsToWin=Number($("#points-select").value));
  $("#power-toggle").addEventListener("click",function(){game.powerups=!game.powerups;this.classList.toggle("active",game.powerups);this.setAttribute("aria-pressed",String(game.powerups));if(!game.powerups)game.orb=null;renderPowerStatus()});
  $$(".mode-tab").forEach((button)=>button.addEventListener("click",()=>{
    $$(".mode-tab").forEach((tab)=>tab.classList.toggle("selected",tab===button));
    game.mode=button.dataset.mode;
    const isLocal=game.mode==="local",isArena=game.mode==="arena";
    $("#left-player-label").textContent=isArena?"AI 01":"YOU";$("#right-player-label").textContent=isArena?"AI 02":isLocal?"PLAYER 2":"CPU";
    $("#control-opponent").textContent=isArena?"AI vs AI":isLocal?"Local player":"AI";
    $("#game-hint").textContent=isArena?"Watch two AIs go head-to-head":isLocal?"P2: arrows move and tilt":"First to 7 wins the match";
    resetMatch();
  }));
  document.addEventListener("keydown",(event)=>{
    const key=event.key.toLowerCase();
    if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(key)&&$("#page-onevone").classList.contains("active"))event.preventDefault();
    keys.add(key);
    if(game.qteTimer>0&&$("#page-onevone").classList.contains("active")&&["w","a","s","d"].includes(key)){
      if(key===game.qteSequence[game.qteIndex])game.qteIndex++;
      else game.qteIndex=key===game.qteSequence[0]?1:0;
      $$("#qte-key kbd").forEach((letter,index)=>letter.classList.toggle("current",index===game.qteIndex));
      if(game.qteIndex===game.qteSequence.length){game.qteTimer=0;game.paddleBoost.left=Math.max(game.paddleBoost.left,2.5);$("#qte-prompt").classList.remove("active");toast("Perfect combo — short paddle boost!")}
    }
  });
  document.addEventListener("keyup",(event)=>keys.delete(event.key.toLowerCase()));

  const EVOLUTION_KEY="pong-evolution-save-v1";
  const WORLD_KEY="pong-world-save-v1";
  const evolutionDefaults=()=>({format:"pong-evolution-save",version:1,player:"ROOKIE-01",cash:40,xp:0,wins:0,losses:0,upgrades:{reaction:0,range:0,learning:0},incentives:[]});
  const upgradeDefinitions=[
    {id:"reaction",icon:"↯",name:"Quick Reflexes",description:"Faster reactions on tricky returns.",base:30,max:10},
    {id:"range",icon:"↔",name:"Court Coverage",description:"A wider paddle for more reliable saves.",base:40,max:8},
    {id:"learning",icon:"◈",name:"Deep Learning",description:"Earn more insight from each match.",base:55,max:10}
  ];
  const incentiveDefinitions=[
    {id:"angles",name:"Angle hunter",detail:"Encourage sharper, less predictable returns.",price:25},
    {id:"patience",name:"Stay composed",detail:"Reward steady play in long rallies.",price:30},
    {id:"comeback",name:"Never give up",detail:"Focus on resilience when behind.",price:35}
  ];
  let evolution=null;
  const evoCanvas=$("#evo-canvas"),evoCtx=evoCanvas.getContext("2d");
  const evoSim={ballX:300,ballY:115,vx:4.7,vy:2.4,left:115,right:115,leftTilt:0,rightTilt:0,scoreLeft:0,scoreRight:0,pause:0,last:0,matchPause:0,orb:null,orbTimer:4,boost:0,extraBalls:[],lastHit:"left"};
  function drawEvolution(){
    const c=evoCtx,w=evoCanvas.width,h=evoCanvas.height;
    c.clearRect(0,0,w,h);c.fillStyle="#0b1118";c.fillRect(0,0,w,h);
    c.strokeStyle="#34404e";c.setLineDash([5,8]);c.beginPath();c.moveTo(w/2,0);c.lineTo(w/2,h);c.stroke();c.setLineDash([]);
    c.fillStyle="#a4f6b1";c.shadowColor="#a4f6b1";c.shadowBlur=10;c.save();c.translate(25,evoSim.left);c.rotate(evoSim.leftTilt);c.fillRect(-3.5,-(evoSim.boost>0?30:23),7,evoSim.boost>0?60:46);c.restore();
    c.fillStyle="#9aa7b8";c.shadowColor="#a4aebc";c.save();c.translate(w-25,evoSim.right);c.rotate(evoSim.rightTilt);c.fillRect(-3.5,-23,7,46);c.restore();
    for(const ball of [{x:evoSim.ballX,y:evoSim.ballY},...evoSim.extraBalls]){
      c.fillStyle="#e8fff3";c.shadowColor="#a4f6b1";c.beginPath();c.arc(ball.x,ball.y,5,0,Math.PI*2);c.fill();
    }
    if(evoSim.orb){c.fillStyle="#c5adff";c.shadowColor="#c5adff";c.beginPath();c.arc(evoSim.orb.x,evoSim.orb.y,9,0,Math.PI*2);c.fill();c.shadowBlur=0;c.fillStyle="#171522";c.font="bold 8px monospace";c.textAlign="center";c.textBaseline="middle";c.fillText(evoSim.orb.type==="paddle"?"2×":evoSim.orb.type==="double"?"×2":evoSim.orb.type==="fast"?"F":"S",evoSim.orb.x,evoSim.orb.y)}
    c.shadowBlur=0;
    c.fillStyle="#718091";c.font="10px monospace";c.textAlign="center";c.fillText(`${evoSim.scoreLeft}  :  ${evoSim.scoreRight}`,w/2,17);
    if(!evolution){c.fillStyle="#a4f6b1";c.font="11px monospace";c.fillText("START A CAREER TO WATCH YOUR AI PLAY",w/2,h-15)}
  }
  function resetEvolutionBall(direction=Math.random()<.5?-1:1){
    evoSim.ballX=evoCanvas.width/2;evoSim.ballY=evoCanvas.height/2;
    evoSim.vx=direction*(4+Math.random()*1.1);evoSim.vy=(Math.random()-.5)*5;
    evoSim.extraBalls=[];evoSim.lastHit=direction>0?"left":"right";
    evoSim.pause=26;
  }
  function rewardEvolution(cash,xp){
    if(!evolution)return;
    evolution.cash+=cash;evolution.xp+=xp;
    $("#evo-cash").textContent=Math.floor(evolution.cash);
    const level=1+Math.floor(evolution.xp/100),progress=Math.floor(evolution.xp%100);
    $("#evo-level").textContent=`LEVEL ${level} · ${level<3?"NOVICE":level<6?"COMPETITOR":"ACE"}`;
    $("#evo-xp-label").textContent=`${progress} / 100 XP`;$("#evo-xp-bar").style.width=`${progress}%`;
    saveEvolution();
  }
  function finishEvolutionPoint(ball){
    if(ball.x<0)evoSim.scoreRight++;else{evoSim.scoreLeft++;rewardEvolution(5,4);$("#evo-reward-status").textContent="AI scored · +¢5 and +4 XP."}
    if(evoSim.scoreLeft>=5||evoSim.scoreRight>=5){
      const won=evoSim.scoreLeft>evoSim.scoreRight,reward=12+(evolution.upgrades.learning||0)*3;
      if(won){evolution.wins++;evolution.cash+=reward;evolution.xp+=24+(evolution.upgrades.learning||0)*4}
      else{evolution.losses++;evolution.cash+=Math.floor(reward/2);evolution.xp+=12+(evolution.upgrades.learning||0)*2}
      evoSim.matchPause=90;renderEvolution();return;
    }
    resetEvolutionBall(evoSim.ballX<0?1:-1);
  }
  function evolutionFrame(time){
    const dt=Math.min((time-evoSim.last)/16.67||1,2.4);evoSim.last=time;
    if(evolution&&$("#page-evolution").classList.contains("active")){
      const w=evoCanvas.width,h=evoCanvas.height,upgrade=evolution.upgrades;
      if(evoSim.matchPause>0){
        evoSim.matchPause-=dt;
        if(evoSim.matchPause<=0){evoSim.scoreLeft=0;evoSim.scoreRight=0;resetEvolutionBall()}
      }else if(evoSim.pause>0)evoSim.pause-=dt;
      else{
        const leftTarget=evoSim.ballX< w*.52?evoSim.ballY:h/2;
        const rivalTarget=evoSim.ballX>w*.48?evoSim.ballY:h/2;
        const leftSpeed=2.2+(upgrade.reaction||0)*.22+(upgrade.range||0)*.12;
        evoSim.left+=Math.max(-leftSpeed,Math.min(leftSpeed,leftTarget-evoSim.left))*dt;
        evoSim.right+=Math.max(-3.8,Math.min(3.8,rivalTarget-evoSim.right))*dt;
        evoSim.left=Math.max(24,Math.min(h-24,evoSim.left));evoSim.right=Math.max(24,Math.min(h-24,evoSim.right));
        evoSim.leftTilt=evoSim.ballX<w*.52?(evoSim.ballY<evoSim.left?Math.PI/4:-Math.PI/4):0;
        evoSim.rightTilt=evoSim.ballX>w*.48?(evoSim.ballY<evoSim.right?-Math.PI/8:Math.PI/8):0;
        evoSim.boost=Math.max(0,evoSim.boost-dt/60);
        const balls=[{x:evoSim.ballX,y:evoSim.ballY,vx:evoSim.vx,vy:evoSim.vy,lastHit:evoSim.lastHit},...evoSim.extraBalls];
        if(!evoSim.orb){evoSim.orbTimer-=dt/60;if(evoSim.orbTimer<=0)evoSim.orb={x:w/2,y:24+Math.random()*(h-48),type:["fast","slow","paddle","double"][Math.floor(Math.random()*4)]}}
        let pointEnded=false;
        for(const ball of balls){
          ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
          if(ball.y<5||ball.y>h-5){ball.y=Math.max(5,Math.min(h-5,ball.y));ball.vy*=-1}
          const leftHeight=evoSim.boost>0?60:46+(upgrade.range||0)*2.6;
          if(ball.vx<0&&ball.x<=38&&Math.abs(ball.y-evoSim.left)<leftHeight/2){
            ball.x=39;ball.vx=Math.abs(ball.vx)*1.025;ball.vy+=(ball.y-evoSim.left)*.045+Math.sin(evoSim.leftTilt)*.8;ball.lastHit="left";
            rewardEvolution(2,1);$("#evo-reward-status").textContent="AI returned the ball · +¢2 and +1 XP.";
          }
          if(ball.vx>0&&ball.x>=w-38&&Math.abs(ball.y-evoSim.right)<27){
            ball.x=w-39;ball.vx=-Math.abs(ball.vx)*1.025;ball.vy+=(ball.y-evoSim.right)*.04+Math.sin(evoSim.rightTilt)*.4;ball.lastHit="right";
          }
          if(evoSim.orb&&Math.hypot(ball.x-evoSim.orb.x,ball.y-evoSim.orb.y)<=14){
            const type=evoSim.orb.type;evoSim.orb=null;evoSim.orbTimer=5+Math.random()*4;
            if(ball.lastHit==="left"){
              rewardEvolution(8,5);$("#evo-reward-status").textContent=`AI collected ${type.toUpperCase()} · +¢8 and +5 XP.`;
              if(type==="fast"||type==="slow"){const factor=type==="fast"?1.25:.8;ball.vx*=factor;ball.vy*=factor}
              else if(type==="paddle")evoSim.boost=8;
              else balls.push({x:ball.x,y:ball.y,vx:ball.vx,vy:-ball.vy,lastHit:"left"});
            }
          }
          if(ball.x<0||ball.x>w){finishEvolutionPoint(ball);pointEnded=true;break}
          if(ball===balls[0]){evoSim.ballX=ball.x;evoSim.ballY=ball.y;evoSim.vx=ball.vx;evoSim.vy=ball.vy;evoSim.lastHit=ball.lastHit}
        }
        if(!pointEnded)evoSim.extraBalls=balls.slice(1).filter((ball)=>ball.x>=0&&ball.x<=w);
      }
      drawEvolution();
    }
    requestAnimationFrame(evolutionFrame);
  }
  requestAnimationFrame(evolutionFrame);
  function validEvolution(data){
    return data&&data.format==="pong-evolution-save"&&data.version===1&&typeof data.player==="string"&&Number.isFinite(data.cash)&&data.cash>=0&&Number.isFinite(data.xp)&&data.xp>=0&&Number.isFinite(data.wins)&&Number.isFinite(data.losses)&&data.upgrades&&typeof data.upgrades==="object"&&["reaction","range","learning"].every((key)=>Number.isInteger(data.upgrades[key])&&data.upgrades[key]>=0)&&Array.isArray(data.incentives)&&data.incentives.every((id)=>incentiveDefinitions.some((item)=>item.id===id));
  }
  function saveEvolution(){
    if(evolution) localStorage.setItem(EVOLUTION_KEY,JSON.stringify(evolution));
  }
  function renderEvolution(){
    if(!evolution)return;
    $("#evolution-start").classList.add("hidden");$("#evolution-dashboard").classList.remove("hidden");
    $("#evo-name").textContent=evolution.player;$("#evo-cash").textContent=Math.floor(evolution.cash);$("#evo-wins").textContent=evolution.wins;$("#evo-losses").textContent=evolution.losses;
    const level=1+Math.floor(evolution.xp/100),progress=Math.floor(evolution.xp%100);
    $("#evo-level").textContent=`LEVEL ${level} · ${level<3?"NOVICE":level<6?"COMPETITOR":"ACE"}`;
    $("#evo-xp-label").textContent=`${progress} / 100 XP`;$("#evo-xp-bar").style.width=`${progress}%`;
    const upgradeTotal=Object.values(evolution.upgrades).reduce((sum,value)=>sum+value,0);
    $("#upgrade-count").textContent=`${upgradeTotal} UPGRADE${upgradeTotal===1?"":"S"}`;
    $("#upgrade-list").innerHTML=upgradeDefinitions.map((item)=>{
      const levelNow=evolution.upgrades[item.id]||0,cost=item.base*(levelNow+1);
      return `<div class="upgrade-item"><span class="upgrade-icon">${item.icon}</span><span class="upgrade-copy"><strong>${item.name}</strong><small>${item.description}</small></span><span class="upgrade-level">LV ${levelNow}</span><button class="buy-button" data-upgrade="${item.id}" ${levelNow>=item.max||evolution.cash<cost?"disabled":""}>¢ ${cost}</button></div>`;
    }).join("");
    $("#incentive-list").innerHTML=incentiveDefinitions.map((item)=>{
      const owned=evolution.incentives.includes(item.id);
      return `<div class="incentive-row"><span><strong>${item.name}</strong><small>${item.detail}</small></span><button class="buy-button" data-incentive="${item.id}" ${owned||evolution.cash<item.price?"disabled":""}>${owned?"ACTIVE":`¢ ${item.price}`}</button></div>`;
    }).join("");
    saveEvolution();
  }
  function startEvolution(data=evolutionDefaults()){
    evolution=data;saveEvolution();renderEvolution();toast("Your new AI career has started.");
  }
  $("#start-evolution").addEventListener("click",()=>startEvolution());
  $("#import-evolution").addEventListener("click",()=>$("#evolution-file").click());
  $("#evolution-file").addEventListener("change",async(event)=>{
    const file=event.target.files?.[0];if(!file)return;
    try{
      const data=JSON.parse(await file.text());
      if(!validEvolution(data))throw new Error("This file is not a compatible Pong Evolution v1 save.");
      evolution=data;saveEvolution();renderEvolution();toast("Evolution save imported.");
    }catch(error){toast(error instanceof SyntaxError?"That file isn't valid JSON.":error.message||"Unable to import save.");}
    event.target.value="";
  });
  $("#export-evolution").addEventListener("click",()=>{
    if(!evolution)return;
    const blob=new Blob([JSON.stringify(evolution,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),anchor=document.createElement("a");
    anchor.href=url;anchor.download="pong-evolution-save-v1.json";anchor.click();URL.revokeObjectURL(url);toast("Evolution save exported.");
  });
  $("#upgrade-list").addEventListener("click",(event)=>{
    const button=event.target.closest("[data-upgrade]");if(!button||!evolution)return;
    const item=upgradeDefinitions.find((entry)=>entry.id===button.dataset.upgrade);const level=evolution.upgrades[item.id]||0;const cost=item.base*(level+1);
    if(evolution.cash<cost||level>=item.max)return;
    evolution.cash-=cost;evolution.upgrades[item.id]=level+1;renderEvolution();toast(`${item.name} upgraded to level ${level+1}.`);
  });
  $("#incentive-list").addEventListener("click",(event)=>{
    const button=event.target.closest("[data-incentive]");if(!button||!evolution)return;
    const item=incentiveDefinitions.find((entry)=>entry.id===button.dataset.incentive);
    if(evolution.cash<item.price||evolution.incentives.includes(item.id))return;
    evolution.cash-=item.price;evolution.incentives.push(item.id);renderEvolution();toast(`${item.name} incentive activated.`);
  });
  $("#reset-evolution").addEventListener("click",()=>{
    if(!window.confirm("Start a fresh Pong Evolution career? Your current Evolution save will be replaced."))return;
    startEvolution();
  });
  try{
    const saved=localStorage.getItem(EVOLUTION_KEY);
    if(saved){const parsed=JSON.parse(saved);if(validEvolution(parsed)){evolution=parsed;renderEvolution();}else localStorage.removeItem(EVOLUTION_KEY);}
  }catch(error){console.error("Could not load Pong Evolution save.",error);}
  drawEvolution();

  const world=(()=>{
    const defaults={format:"pong-world-save",version:1,seed:Math.floor(Math.random()*2147483647),x:0,y:0,tokens:0,xp:0,wins:0,loot:0,recruits:[],openedLoot:[],inspected:[],talkedTo:[],completedJobs:[],defeatedBosses:[],inventory:[],activeJob:null,tutorialDone:false};
    try{
      const saved=JSON.parse(localStorage.getItem(WORLD_KEY)||"null");
      if(saved&&saved.format==="pong-world-save"&&saved.version===1)return{...defaults,...saved,
        recruits:Array.isArray(saved.recruits)?saved.recruits:[],openedLoot:Array.isArray(saved.openedLoot)?saved.openedLoot:[],
        inspected:Array.isArray(saved.inspected)?saved.inspected:[],talkedTo:Array.isArray(saved.talkedTo)?saved.talkedTo:[],
        completedJobs:Array.isArray(saved.completedJobs)?saved.completedJobs:[],defeatedBosses:Array.isArray(saved.defeatedBosses)?saved.defeatedBosses:[],inventory:Array.isArray(saved.inventory)?saved.inventory:[]};
    }catch(error){console.error("Could not load Pong World save.",error)}
    return defaults;
  })();
  const worldCanvas=$("#world-canvas"),worldCtx=worldCanvas.getContext("2d");
  const worldBattleCanvas=$("#world-battle-canvas"),worldBattleCtx=worldBattleCanvas.getContext("2d");
  const tile=40,regionSize=24,biomes=["MOSS FIELDS","EMBER RIDGE","GLASS DESERT","FROSTLINE","NEON MARSH"];
  const worldNames={
    structure:["Signal Tower","Wayfarer Shrine","Old Relay","Rally Depot","Skybridge"],
    job:["Courier Board","Sparring Yard","Salvage Crew","Rally Workshop"],
    cache:["Supply Cache","Buried Locker","Lost Crate","Glowing Stash"],
    npc:["Rally Scout","Paddle Mechanic","Wandering Ace","Court Drifter","Rookie Bot"],
    duel:["Open Court","Rival Court","Boss Gate","Street Court"]
  };
  const worldColors={structure:"#93baff",job:"#ffcf77",cache:"#a4f6b1",npc:"#c5adff",duel:"#ff9b72"};
  const worldTypes=["structure","job","cache","npc","duel"];
  let worldInterior=null;
  function worldHash(x,y,salt=0){
    let value=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(world.seed|0,1442695041)+salt;
    value=Math.imul(value^(value>>>13),1274126177);
    return(value^(value>>>16))>>>0;
  }
  function regionRandom(rx,ry){
    let seed=worldHash(rx,ry,2654435761);
    return()=>{seed=(seed+0x6d2b79f5)|0;let value=seed;value=Math.imul(value^(value>>>15),value|1);value^=value+Math.imul(value^(value>>>7),value|61);return((value^(value>>>14))>>>0)/4294967296};
  }
  function worldSitesNear(x,y){
    const sites=[];
    for(let ry=Math.floor((y-12)/regionSize);ry<=Math.floor((y+12)/regionSize);ry++){
      for(let rx=Math.floor((x-12)/regionSize);rx<=Math.floor((x+12)/regionSize);rx++){
        const random=regionRandom(rx,ry),used=new Set();
        const count=5+Math.floor(random()*3);
        for(let index=0;index<count;index++){
          let localX,localY,key;
          do{localX=2+Math.floor(random()*(regionSize-4));localY=2+Math.floor(random()*(regionSize-4));key=`${localX},${localY}`}while(used.has(key));
          used.add(key);
          const type=worldTypes[Math.floor(random()*worldTypes.length)];
          const names=worldNames[type],siteX=rx*regionSize+localX,siteY=ry*regionSize+localY;
          sites.push({id:`${world.seed}:${rx}:${ry}:${index}`,x:siteX,y:siteY,type,name:names[Math.floor(random()*names.length)],dungeon:type==="structure"&&worldHash(siteX,siteY,411)%5===0,recruitable:type==="npc"&&random()<.58,jobKind:["courier","scavenger","sparring"][Math.floor(random()*3)]});
        }
      }
    }
    return sites;
  }
  function nearestWorldSite(){
    return worldSitesNear(world.x,world.y).map((site)=>({...site,distance:Math.abs(site.x-world.x)+Math.abs(site.y-world.y)}))
      .filter((site)=>site.distance<=1).sort((a,b)=>a.distance-b.distance)[0]||null;
  }
  function updateWorldActions(){
    const interact=$("#world-interact"),battle=$("#world-battle");
    if(worldInterior){
      const atExit=worldInterior.playerX===4&&worldInterior.playerY>=5;
      interact.innerHTML=atExit?"LEAVE STRUCTURE&nbsp; <kbd>E</kbd>":"EXPLORE / TALK&nbsp; <kbd>E</kbd>";
      battle.hidden=!worldInterior.dungeon||world.defeatedBosses.includes(worldInterior.site.id);
      battle.textContent="CHALLENGE DUNGEON BOSS  ↗";
      return;
    }
    interact.innerHTML="TALK / INTERACT&nbsp; <kbd>E</kbd>";
    battle.hidden=false;battle.textContent="OPEN 1V1 MATCH&nbsp; ↗";
  }
  function saveWorld(){
    localStorage.setItem(WORLD_KEY,JSON.stringify(world));
  }
  function updateWorldStats(){
    $("#world-tokens").textContent=world.tokens;
    $("#world-recruits").textContent=world.recruits.length;
    $("#world-wins").textContent=world.wins;
    $("#world-loot-count").textContent=world.loot;
    $("#world-coordinates").textContent=`X: ${world.x} · Y: ${world.y}`;
    const sectorX=Math.floor(world.x/regionSize),sectorY=Math.floor(world.y/regionSize);
    $("#world-location").textContent=`${biomes[worldHash(sectorX,sectorY)%biomes.length]} · SECTOR ${sectorX}, ${sectorY}`;
    const job=world.activeJob;
    $("#world-job-status").textContent=job?`${job.name}: ${job.progress}/${job.goal} ${job.kind==="courier"?"steps":job.kind==="scavenger"?"caches":"duels won"} · REWARD ◈ ${job.reward}`:"No active contract. Find a job site or ask a local.";
  }
  function drawSite(c,site,screenX,screenY){
    const color=worldColors[site.type],x=screenX,y=screenY;
    c.save();c.shadowColor=color;c.shadowBlur=9;c.fillStyle=color;c.strokeStyle=color;
    if(site.type==="structure"){
      c.fillRect(x+8,y+12,24,22);c.fillRect(x+13,y+7,14,7);c.fillStyle="#18232c";c.fillRect(x+17,y+20,7,14);
    }else if(site.type==="job"){
      c.fillRect(x+10,y+12,20,20);c.fillStyle="#1a2024";c.fillRect(x+14,y+16,12,12);c.strokeRect(x+8,y+9,24,25);
    }else if(site.type==="cache"){
      c.fillRect(x+10,y+17,20,15);c.fillRect(x+8,y+14,24,5);c.fillStyle="#16251d";c.fillRect(x+18,y+19,4,8);
    }else if(site.type==="npc"){
      c.beginPath();c.arc(x+20,y+13,6,0,Math.PI*2);c.fill();c.fillRect(x+14,y+20,12,13);
    }else{
      c.strokeRect(x+5,y+5,30,30);c.strokeRect(x+10,y+10,20,20);c.fillRect(x+17,y+17,6,6);
    }
    c.shadowBlur=0;c.fillStyle="#e7edf4";c.font="8px monospace";c.textAlign="center";c.fillText(site.name.toUpperCase(),x+20,y+39);
    if(site.dungeon){c.fillStyle="#ff9b72";c.font="bold 7px monospace";c.fillText("DUNGEON",x+20,y+48)}
    c.restore();
  }
  function drawWorldInterior(){
    const c=worldCtx,w=worldCanvas.width,h=worldCanvas.height,room=worldInterior;
    c.clearRect(0,0,w,h);c.fillStyle="#10151d";c.fillRect(0,0,w,h);
    c.fillStyle="#292b35";c.fillRect(140,46,520,408);
    c.fillStyle=room.dungeon?"#27202b":"#202b2a";c.fillRect(160,66,480,368);
    for(let y=0;y<7;y++)for(let x=0;x<9;x++){
      c.fillStyle=(x+y)%2?"#293036":"#30373b";c.fillRect(180+x*48,78+y*48,46,46);
    }
    c.fillStyle="#11161d";c.fillRect(360,414,80,40);
    c.fillStyle="#86929e";c.font="10px monospace";c.textAlign="center";c.fillText("EXIT",400,444);
    if(room.dungeon&&!world.defeatedBosses.includes(room.site.id)){
      c.fillStyle="#ff9b72";c.shadowColor="#ff9b72";c.shadowBlur=18;c.beginPath();c.arc(396,202,18,0,Math.PI*2);c.fill();c.shadowBlur=0;
      c.fillStyle="#15151b";c.font="bold 9px monospace";c.fillText("BOSS",396,205);
    }else{
      c.fillStyle="#93baff";c.fillRect(365,178,70,42);c.fillStyle="#151b22";c.font="bold 9px monospace";c.fillText(room.dungeon?"CLEARED":"SAFE ROOM",400,202);
    }
    const px=204+room.playerX*48,py=102+room.playerY*48;
    c.fillStyle="#7df2e3";c.shadowColor="#7df2e3";c.shadowBlur=12;c.beginPath();c.arc(px,py,11,0,Math.PI*2);c.fill();c.shadowBlur=0;
    c.fillStyle="#e8fff9";c.font="bold 9px monospace";c.fillText(room.dungeon?"DUNGEON · BOSS INSIDE":room.site.name.toUpperCase(),400,31);
    c.fillStyle="#84919f";c.font="9px monospace";c.fillText("MOVE WITH WASD · E NEAR THE DOOR TO EXIT",400,477);
    $("#world-location").textContent=room.dungeon?"DUNGEON INTERIOR":`${room.site.name.toUpperCase()} · INTERIOR`;
    $("#world-message").textContent=room.dungeon
      ?world.defeatedBosses.includes(room.site.id)?"The boss is defeated. The glowing entrance at the bottom leads back outside.":"A boss blocks the far end of this room. Move close and press E to challenge it; press E near the exit to leave."
      :"You are inside a bounded structure. Explore the room, then move to the marked exit and press E.";
    updateWorldStats();$("#world-location").textContent=room.dungeon?"DUNGEON INTERIOR":`${room.site.name.toUpperCase()} · INTERIOR`;
    updateWorldActions();
  }
  function drawWorld(){
    const c=worldCtx;if(!c)return;
    if(worldInterior){drawWorldInterior();return}
    const halfCols=Math.ceil(worldCanvas.width/tile/2)+1,halfRows=Math.ceil(worldCanvas.height/tile/2)+1;
    c.clearRect(0,0,worldCanvas.width,worldCanvas.height);
    for(let dy=-halfRows;dy<=halfRows;dy++)for(let dx=-halfCols;dx<=halfCols;dx++){
      const wx=world.x+dx,wy=world.y+dy,hash=worldHash(wx,wy),sx=worldCanvas.width/2-tile/2+dx*tile,sy=worldCanvas.height/2-tile/2+dy*tile;
      const biome=biomes[worldHash(Math.floor(wx/regionSize),Math.floor(wy/regionSize))%biomes.length];
      const colors=biome==="EMBER RIDGE"?["#342823","#3a2a23"]:biome==="GLASS DESERT"?["#35332a","#3c382b"]:biome==="FROSTLINE"?["#26333a","#2b3940"]:biome==="NEON MARSH"?["#20342f","#253a33"]:["#1b302c","#20352f"];
      c.fillStyle=colors[hash%2];c.fillRect(sx,sy,tile,tile);
      if(hash%13===0){c.fillStyle=biome==="FROSTLINE"?"#647985":"#47614d";c.beginPath();c.arc(sx+20,sy+20,4+(hash%5),0,Math.PI*2);c.fill()}
      if(hash%17===0){c.strokeStyle="#ffffff12";c.strokeRect(sx+5,sy+5,30,30)}
    }
    const sites=worldSitesNear(world.x,world.y);
    for(const site of sites){
      const sx=worldCanvas.width/2-tile/2+(site.x-world.x)*tile,sy=worldCanvas.height/2-tile/2+(site.y-world.y)*tile;
      if(sx+tile>=0&&sx<worldCanvas.width&&sy+tile>=0&&sy<worldCanvas.height)drawSite(c,site,sx,sy);
    }
    const playerX=worldCanvas.width/2,playerY=worldCanvas.height/2;
    c.fillStyle="#7df2e3";c.shadowColor="#7df2e3";c.shadowBlur=15;c.beginPath();c.arc(playerX,playerY-5,8,0,Math.PI*2);c.fill();
    c.fillRect(playerX-7,playerY+3,14,14);c.shadowBlur=0;c.fillStyle="#10211f";c.fillRect(playerX-3,playerY-7,2,2);c.fillRect(playerX+2,playerY-7,2,2);
    const nearby=nearestWorldSite();
    $("#world-message").textContent=nearby?`${nearby.name}${nearby.dungeon?" · DUNGEON":""} nearby. Press the large interact button or E to ${nearby.dungeon?"enter and challenge its boss":nearby.type==="duel"?"start a 1v1 match":nearby.type==="cache"?"open it":nearby.type==="npc"?"talk":"interact"}.`:`New ground, new possibilities. Move with WASD. Press E near a landmark to interact.`;
    updateWorldStats();
    updateWorldActions();
  }
  function finishWorldJob(){
    const job=world.activeJob;if(!job||job.progress<job.goal)return;
    world.tokens+=job.reward;world.xp+=job.reward*2;world.completedJobs.push(job.id);world.activeJob=null;
    $("#world-message").textContent=`Contract complete! You earned ${job.reward} tokens.`;
    toast(`Contract complete · +${job.reward} tokens`);
    saveWorld();updateWorldStats();
  }
  function advanceWorldJob(kind){
    const job=world.activeJob;if(!job||job.kind!==kind)return;
    job.progress++;finishWorldJob();saveWorld();
  }
  function offerWorldJob(site,kind=site.jobKind){
    if(world.completedJobs.includes(site.id)){ $("#world-message").textContent=`${site.name} has no more work right now. Explore another sector for new jobs.`;return}
    if(world.activeJob){$("#world-message").textContent=`Finish your ${world.activeJob.name} contract first.`;return}
    const definitions={
      courier:{name:"Long-haul courier",goal:8,reward:14},
      scavenger:{name:"Salvage collection",goal:2,reward:18},
      sparring:{name:"Rival sparring",goal:1,reward:22}
    };
    const details=definitions[kind],job={id:site.id,kind,name:details.name,goal:details.goal,progress:0,reward:details.reward};
    world.activeJob=job;$("#world-message").textContent=`Contract accepted: ${job.name}. ${kind==="courier"?"Travel 8 tiles.":kind==="scavenger"?"Open 2 supply caches.":"Win a 1v1 duel."}`;
    saveWorld();updateWorldStats();
  }
  function enterWorldStructure(site){
    worldInterior={site,dungeon:site.dungeon,playerX:4,playerY:6};
    toast(site.dungeon?"Dungeon discovered · find the boss inside":"Entering structure");
    drawWorld();
  }
  function interactWorld(){
    if(worldInterior){
      const {site,dungeon,playerX,playerY}=worldInterior;
      if(dungeon&&!world.defeatedBosses.includes(site.id)&&Math.abs(playerX-4)+Math.abs(playerY-2)<=1){
        openWorldBattle(site,true);return;
      }
      if(playerX===4&&playerY>=5){
        worldInterior=null;drawWorld();$("#world-message").textContent=`You stepped outside ${site.name}. Press E near another marker to interact.`;return;
      }
      $("#world-message").textContent=dungeon
        ?world.defeatedBosses.includes(site.id)?"The dungeon is clear. Return to the entrance and press E to leave.":"A boss blocks the northern chamber. Move close to it and press E to begin the fight."
        :`Inside ${site.name}, old markings point toward the exit. Explore the room, or return to the entrance and press E to leave.`;
      return;
    }
    const site=nearestWorldSite();
    if(!site){$("#world-message").textContent="Nothing close enough to interact with. Explore in any direction.";return}
    if(site.type==="structure"){enterWorldStructure(site);return}
    if(site.type==="duel"){openWorldBattle(site,false);return}
    if(site.type==="job"){offerWorldJob(site);return}
    if(site.type==="cache"){
      if(world.openedLoot.includes(site.id)){$("#world-message").textContent="This cache has already been looted. There are more out there.";return}
      const roll=worldHash(site.x,site.y,991),tokens=5+(roll%15),loot=["Paddle Patch","Neon Grip","Lucky Ball","Spare Bearings"][roll%4];
      world.openedLoot.push(site.id);world.tokens+=tokens;world.loot++;world.inventory.push(loot);advanceWorldJob("scavenger");
      $("#world-message").textContent=`Cache opened: ${loot} and ${tokens} tokens.`;
      toast(`Loot found · ${loot} · +${tokens} tokens`);saveWorld();updateWorldStats();drawWorld();return;
    }
    if(site.type==="npc"){
      if(world.recruits.includes(site.id)){$("#world-message").textContent=`${site.name} is already part of your travel crew.`;return}
      if(site.recruitable&&world.recruits.length<4){
        world.recruits.push(site.id);world.talkedTo.push(site.id);$("#world-message").textContent=`${site.name} joined your travel crew. Keep exploring to find more people and hidden courts.`;
        toast(`${site.name} joined your AI crew!`);
      }else if(!world.talkedTo.includes(site.id)){
        world.talkedTo.push(site.id);offerWorldJob(site,"courier");
        $("#world-message").textContent=`${site.name}: "Could you run a quick delivery? Travel 8 tiles and I'll pay you."`;
      }else $("#world-message").textContent=`${site.name}: "The courts are always open. Keep moving and you'll find one."`;
      saveWorld();updateWorldStats();return;
    }
    if(!world.inspected.includes(site.id)){
      world.inspected.push(site.id);const reward=3+(worldHash(site.x,site.y,37)%8);world.tokens+=reward;world.xp+=reward;
      $("#world-message").textContent=`You explored ${site.name} and found ${reward} tokens tucked away.`;
      toast(`${site.name} explored · +${reward} tokens`);
    }else $("#world-message").textContent=`You've already explored ${site.name}. There's more world beyond it.`;
    saveWorld();updateWorldStats();
  }
  function moveWorld(dx,dy){
    if(worldInterior){
      worldInterior.playerX=Math.max(1,Math.min(7,worldInterior.playerX+dx));
      worldInterior.playerY=Math.max(1,Math.min(6,worldInterior.playerY+dy));
      drawWorld();return;
    }
    world.x+=dx;world.y+=dy;
    if(world.activeJob?.kind==="courier"){world.activeJob.progress++;finishWorldJob()}
    saveWorld();drawWorld();
  }
  const tutorialSteps=[
    "Move with W, A, S, D or the arrow keys. The camera follows you, and new territory keeps appearing in every direction.",
    "Walk next to a person, structure, job board, supply cache, or court. Press the large TALK / INTERACT button or E, then read the dialogue below the map.",
    "Structures open into bounded rooms. Some are dungeons: move to the boss marker and press E to begin a boss match; return to the entrance to leave.",
    "Job boards offer courier, salvage, and 1v1 sparring contracts. Complete the task to earn tokens; caches have randomized loot.",
    "Challenge rival courts in one-on-one matches. Move with W/S, tilt with A/D, collect powerups, and land quicktime combos."
  ];
  let tutorialStep=0;
  function renderWorldTutorial(){
    $("#world-tutorial-copy").textContent=tutorialSteps[tutorialStep];
    $("#world-tutorial-step").textContent=`STEP ${tutorialStep+1} / ${tutorialSteps.length}`;
    $("#world-tutorial-next").textContent=tutorialStep===tutorialSteps.length-1?"FINISH ✓":"NEXT  →";
  }
  $("#world-tutorial-start").addEventListener("click",()=>{
    tutorialStep=0;renderWorldTutorial();$("#world-tutorial-controls").classList.remove("hidden");$("#world-tutorial-start").textContent="RESTART";
  });
  $("#world-tutorial-next").addEventListener("click",()=>{
    if(tutorialStep<tutorialSteps.length-1){tutorialStep++;renderWorldTutorial();return}
    world.tutorialDone=true;saveWorld();$("#world-tutorial-controls").classList.add("hidden");$("#world-tutorial-start").textContent="REPLAY";toast("Pong World tutorial complete.");
  });
  $("#world-tutorial-close").addEventListener("click",()=>$("#world-tutorial-controls").classList.add("hidden"));
  $("#world-interact").addEventListener("click",interactWorld);
  $("#world-battle").addEventListener("click",()=>{
    if(worldInterior?.dungeon)openWorldBattle(worldInterior.site,true);
    else openWorldBattle(null,false);
  });

  const worldBattle={running:false,active:false,left:180,right:180,leftTilt:0,rightTilt:0,ball:{x:400,y:180,vx:5,vy:2.5,type:"normal",powerOwner:null,powerTimer:0,baseSpeed:0},extraBalls:[],scoreLeft:0,scoreRight:0,last:0,pointPause:0,lastHit:"left",rallies:0,orb:null,orbTimer:2,powers:{left:null,right:null},boosts:{left:0,right:0},powerups:true,qteTimer:0,qteSequence:[],qteIndex:0,qteStage:0,boss:false,bossStage:0,bossTarget:0,bossHealth:3,site:null};
  function allWorldBattleBalls(){return [worldBattle.ball,...worldBattle.extraBalls]}
  function drawWorldBattle(){
    const c=worldBattleCtx;if(!c)return;
    const w=worldBattleCanvas.width,h=worldBattleCanvas.height;
    c.clearRect(0,0,w,h);c.fillStyle="#0b1119";c.fillRect(0,0,w,h);
    c.strokeStyle="#293544";c.setLineDash([6,9]);c.beginPath();c.moveTo(w/2,0);c.lineTo(w/2,h);c.stroke();c.setLineDash([]);
    c.fillStyle="#7df2e3";c.shadowColor="#7df2e3";c.shadowBlur=11;c.save();c.translate(30,worldBattle.left);c.rotate(worldBattle.leftTilt);c.fillRect(-5,-(worldBattle.boosts.left>0?42:27),10,worldBattle.boosts.left>0?84:54);c.restore();
    c.fillStyle="#ff9b72";c.shadowColor="#ff9b72";c.save();c.translate(w-30,worldBattle.right);c.rotate(worldBattle.rightTilt);c.fillRect(-5,-(worldBattle.boosts.right>0?42:27),10,worldBattle.boosts.right>0?84:54);c.restore();
    for(const ball of allWorldBattleBalls()){
      c.fillStyle=ball.type==="fast"||ball.type==="splitFast"?"#ffe3a3":ball.type==="slow"||ball.type==="splitSlow"?"#b9d8ff":"#edfff9";
      c.shadowColor=ball.type==="fast"||ball.type==="splitFast"?"#ffcf77":ball.type==="slow"||ball.type==="splitSlow"?"#93baff":"#7df2e3";
      c.beginPath();c.arc(ball.x,ball.y,7,0,Math.PI*2);c.fill();
    }
    if(worldBattle.orb){
      const colors={fast:"#ffcf77",slow:"#93baff",paddle:"#a4f6b1",double:"#c5adff"};
      c.fillStyle=colors[worldBattle.orb.type];c.shadowColor=c.fillStyle;c.shadowBlur=16;c.beginPath();c.arc(worldBattle.orb.x,worldBattle.orb.y,20,0,Math.PI*2);c.fill();
      c.shadowBlur=0;c.fillStyle="#10141e";c.font="bold 13px monospace";c.textAlign="center";c.textBaseline="middle";
      c.fillText(worldBattle.orb.type==="paddle"?"2×":worldBattle.orb.type==="double"?"×2":worldBattle.orb.type==="fast"?"F":"S",worldBattle.orb.x,worldBattle.orb.y);
    }
    c.shadowBlur=0;
  }
  function resetWorldBall(direction=Math.random()<.5?-1:1){
    const speed=4.4+Math.random()*1.2;
    worldBattle.ball={x:worldBattleCanvas.width/2,y:worldBattleCanvas.height/2,vx:direction*speed,vy:(Math.random()-.5)*5,type:"normal",powerOwner:null,powerTimer:0,baseSpeed:0};
    worldBattle.extraBalls=[];worldBattle.orb=null;worldBattle.orbTimer=2+Math.random()*2;
    worldBattle.powers={left:null,right:null};worldBattle.boosts={left:0,right:0};worldBattle.qteTimer=0;worldBattle.bossStage=0;worldBattle.rallies=0;worldBattle.lastHit=direction>0?"left":"right";
    worldBattle.pointPause=35;$("#world-battle-qte").classList.add("hidden");
  }
  function startWorldQte(stage=0){
    worldBattle.qteSequence=randomQteSequence();worldBattle.qteIndex=0;worldBattle.qteTimer=6;worldBattle.qteStage=stage;
    const label=worldBattle.boss?`BOSS TRIPLE HIT · ${stage===1?"HIT 1 / 3":stage===2?"HIT 2 / 3":"HIT 3 / 3"}`:"QUICK RETURN";
    $("#world-battle-qte").innerHTML=`<span>${label}</span>${worldBattle.qteSequence.map((letter,index)=>`<kbd class="${index===0?"current":""}">${letter.toUpperCase()}</kbd>`).join("")}`;
    $("#world-battle-qte").classList.remove("hidden");
    $("#world-battle-message").textContent=worldBattle.boss?"Time slows while you line up the next hit. Enter the keys in order.":"Time slowed! Complete the combo for a bigger paddle and faster return.";
  }
  function completeWorldQte(success){
    $("#world-battle-qte").classList.add("hidden");worldBattle.qteTimer=0;
    if(!success){worldBattle.bossStage=0;$("#world-battle-message").textContent="Combo missed. The rally continues.";return}
    worldBattle.boosts.left=Math.max(worldBattle.boosts.left,2.5);
    if(worldBattle.boss){
      if(worldBattle.qteStage===1){
        worldBattle.bossStage=2;worldBattle.bossTarget=worldBattleCanvas.width*.375;
        worldBattle.ball.vx=Math.abs(worldBattle.ball.vx)*1.12;worldBattle.ball.vy*=1.08;
        $("#world-battle-message").textContent="HIT 1 LANDED · follow the ball to the halfway mark!";
      }else if(worldBattle.qteStage===2){
        worldBattle.bossStage=3;worldBattle.bossTarget=worldBattleCanvas.width/2;
        worldBattle.ball.vx=Math.abs(worldBattle.ball.vx)*1.08;
        $("#world-battle-message").textContent="HIT 2 LANDED · one final strike on the center line!";
      }else{
        worldBattle.bossHealth--;worldBattle.bossStage=0;
        $("#world-battle-message").textContent=`TRIPLE HIT! BOSS HEALTH: ${worldBattle.bossHealth} / 3`;
        if(worldBattle.bossHealth<=0){finishWorldBattle(true);return}
        worldBattle.ball.x=worldBattleCanvas.width/2+8;worldBattle.ball.vx=Math.abs(worldBattle.ball.vx)*1.2;
      }
    }else{
      const speed=Math.hypot(worldBattle.ball.vx,worldBattle.ball.vy);
      worldBattle.ball.vx*=Math.min(1.2,(speed+1.5)/speed);worldBattle.ball.vy*=Math.min(1.2,(speed+1.5)/speed);
      $("#world-battle-message").textContent="Perfect combo · temporary paddle boost and faster shot!";
    }
  }
  function giveWorldBattlePower(side,type){
    if(type==="paddle")worldBattle.boosts[side]=10;
    else worldBattle.powers[side]={type,timer:10};
    const receiver=side==="left"?"you":"the rival";
    $("#world-battle-message").textContent=type==="slow"?`SLOWBALL sent to ${receiver} — their next shot will be easier to return.`:`${side==="left"?"You":"The rival"} collected ${type.toUpperCase()}!`;
    toast(type==="slow"?`SLOWBALL sent to ${receiver}!`:`${type.toUpperCase()} powerup collected!`);
  }
  function splitWorldBattleBall(ball,side){
    const speed=Math.hypot(ball.vx,ball.vy),direction=side==="left"?1:-1,angle=Math.atan2(ball.vy,Math.abs(ball.vx));
    ball.type="splitFast";ball.powerOwner=side;ball.powerTimer=10;ball.baseSpeed=speed;
    ball.vx=direction*Math.cos(angle-.3)*speed*1.2;ball.vy=Math.sin(angle-.3)*speed*1.2;
    worldBattle.extraBalls.push({x:ball.x,y:ball.y,vx:direction*Math.cos(angle+.3)*speed*.85,vy:Math.sin(angle+.3)*speed*.85,type:"splitSlow",powerOwner:side,powerTimer:10,baseSpeed:speed*.85});
  }
  function hitWorldBattlePaddle(ball,side){
    const isPlayer=side==="left",paddleY=worldBattle[side],height=worldBattle.boosts[side]>0?84:54;
    if(ball.type==="fast"&&ball.powerOwner!==side){
      const speed=Math.hypot(ball.vx,ball.vy),base=ball.baseSpeed||speed/1.65;ball.vx*=base/speed;ball.vy*=base/speed;ball.type="normal";
    }
    if(ball.type==="slow"&&ball.powerOwner===side){
      const speed=Math.hypot(ball.vx,ball.vy),base=ball.baseSpeed||speed/.55;ball.vx*=base/speed;ball.vy*=base/speed;ball.type="normal";
    }
    const contact=(ball.y-paddleY)/(height/2);
    if(ball.type==="splitSlow"){
      const speed=ball.baseSpeed||Math.hypot(ball.vx,ball.vy);
      ball.type="normal";ball.powerOwner=null;ball.powerTimer=0;ball.vx=(isPlayer?1:-1)*speed;ball.vy+=(ball.y-paddleY)*.035;
    }else{
      ball.vx=(isPlayer?1:-1)*Math.abs(ball.vx)*1.045;ball.vy+=contact*.11;
    }
    const power=worldBattle.powers[side];
    if(power){
      worldBattle.powers[side]=null;
      if(power.type==="fast"){
        const speed=Math.hypot(ball.vx,ball.vy);ball.baseSpeed=speed;ball.vx*=1.65;ball.vy*=1.65;ball.type="fast";ball.powerOwner=side;ball.powerTimer=power.timer;
      }else if(power.type==="slow"){
        const speed=Math.hypot(ball.vx,ball.vy);ball.baseSpeed=speed;ball.vx*=.55;ball.vy*=.55;ball.type="slow";ball.powerOwner=side;ball.powerTimer=power.timer;
      }else if(power.type==="double")splitWorldBattleBall(ball,side);
    }
    worldBattle.lastHit=side;worldBattle.rallies++;
    if(isPlayer){
      if(worldBattle.boss)startWorldQte(1);
      else if(worldBattle.rallies>=3&&Math.random()<.2)startWorldQte();
    }
  }
  function awardWorldBattlePoint(missedSide){
    if(missedSide==="left")worldBattle.scoreRight++;else worldBattle.scoreLeft++;
    $("#world-score-left").textContent=worldBattle.scoreLeft;$("#world-score-right").textContent=worldBattle.scoreRight;
    if(worldBattle.scoreLeft>=5||worldBattle.scoreRight>=5){
      finishWorldBattle(worldBattle.scoreLeft>worldBattle.scoreRight);return;
    }
    resetWorldBall(missedSide==="left"?1:-1);
  }
  function finishWorldBattle(won){
    worldBattle.running=false;
    if(won){
      world.wins++;const reward=worldBattle.boss?30:12;world.tokens+=reward;world.xp+=worldBattle.boss?60:30;
      if(worldBattle.boss&&worldBattle.site&&!world.defeatedBosses.includes(worldBattle.site.id))world.defeatedBosses.push(worldBattle.site.id);
      $("#world-battle-message").textContent=`VICTORY! +${reward} tokens · ${worldBattle.boss?"dungeon boss defeated":"rival defeated"}.`;
      toast(`Match won · +${reward} tokens`);advanceWorldJob("sparring");
    }else $("#world-battle-message").textContent="RIVAL WINS. Regroup and challenge another court.";
    $("#world-battle-start").textContent=won?"PLAY AGAIN":"REMATCH";$("#world-battle-start").disabled=false;
    saveWorld();updateWorldStats();updateWorldActions();drawWorld();
  }
  function openWorldBattle(site,boss=false){
    worldBattle.active=true;worldBattle.running=false;worldBattle.scoreLeft=0;worldBattle.scoreRight=0;worldBattle.left=180;worldBattle.right=180;
    worldBattle.boss=boss;worldBattle.bossStage=0;worldBattle.bossHealth=3;worldBattle.site=site||null;worldBattle.rallies=0;
    $("#world-battle-title").textContent=boss?`${site.name.toUpperCase()} · BOSS`:site?`${site.name.toUpperCase()} · 1V1`:"OPEN 1V1 CHALLENGE";
    $("#world-battle-message").textContent=boss?"Land three triple-hit combos to defeat the boss. Each combo has three slowed-down QTE strikes.":"Move with W/S, tilt with A/D, and collect center-line powerups. First to 5 wins.";
    $("#world-battle-start").textContent="START MATCH  ↗";$("#world-battle-start").disabled=false;
    $("#world-battle-overlay").classList.remove("hidden");$("#world-score-left").textContent="0";$("#world-score-right").textContent="0";
    resetWorldBall();drawWorldBattle();
  }
  $("#world-battle-start").addEventListener("click",()=>{
    worldBattle.scoreLeft=0;worldBattle.scoreRight=0;worldBattle.left=180;worldBattle.right=180;worldBattle.running=true;
    $("#world-score-left").textContent="0";$("#world-score-right").textContent="0";$("#world-battle-start").disabled=true;
    $("#world-battle-message").textContent=worldBattle.boss?"Land three triple-hit combos. The QTE pauses the rally between strikes.":"First to 5 wins · collect powerups · A/D tilt.";
    resetWorldBall();drawWorldBattle();
  });
  $("#world-battle-power-toggle").addEventListener("click",function(){
    worldBattle.powerups=!worldBattle.powerups;this.textContent=`POWERUPS: ${worldBattle.powerups?"ON":"OFF"}`;this.setAttribute("aria-pressed",String(worldBattle.powerups));
    if(!worldBattle.powerups)worldBattle.orb=null;
  });
  $("#world-battle-close").addEventListener("click",()=>{
    worldBattle.running=false;worldBattle.active=false;$("#world-battle-overlay").classList.add("hidden");$("#world-battle-qte").classList.add("hidden");drawWorld();
  });
  function worldBattleFrame(time){
    const dt=Math.min((time-worldBattle.last)/16.67||1,2.4);worldBattle.last=time;
    if(worldBattle.running&&$("#page-world").classList.contains("active")){
      const h=worldBattleCanvas.height,w=worldBattleCanvas.width,slowDt=worldBattle.qteTimer>0?dt*.08:dt,paddleSpeed=5.2*slowDt;
      if(keys.has("w"))worldBattle.left=Math.max(42,worldBattle.left-paddleSpeed);
      if(keys.has("s"))worldBattle.left=Math.min(h-42,worldBattle.left+paddleSpeed);
      worldBattle.leftTilt=keys.has("a")?Math.PI/4:keys.has("d")?-Math.PI/4:0;
      const target=worldBattle.ball.x>w*.48?worldBattle.ball.y:h/2;
      worldBattle.right+=Math.max(-4.2,Math.min(4.2,target-worldBattle.right))*slowDt;
      worldBattle.right=Math.max(27,Math.min(h-27,worldBattle.right));
      worldBattle.rightTilt=worldBattle.ball.y>worldBattle.right?Math.PI/8:-Math.PI/8;
      for(const side of ["left","right"])if(worldBattle.boosts[side]>0)worldBattle.boosts[side]=Math.max(0,worldBattle.boosts[side]-slowDt/60);
      for(const side of ["left","right"])if(worldBattle.powers[side]){worldBattle.powers[side].timer-=slowDt/60;if(worldBattle.powers[side].timer<=0)worldBattle.powers[side]=null}
      for(const ball of allWorldBattleBalls())if(ball.powerTimer>0){
        ball.powerTimer-=slowDt/60;
        if(ball.powerTimer<=0){
          const speed=Math.hypot(ball.vx,ball.vy);
          if(ball.type==="fast"||ball.type==="slow"){const base=ball.baseSpeed||speed;ball.vx*=base/speed;ball.vy*=base/speed}
          ball.type="normal";ball.powerOwner=null;ball.powerTimer=0;
        }
      }
      if(worldBattle.qteTimer>0){
        worldBattle.qteTimer-=dt/60;if(worldBattle.qteTimer<=0)completeWorldQte(false);
      }else if(worldBattle.pointPause>0)worldBattle.pointPause-=dt;
      else{
        if(worldBattle.powerups&&!worldBattle.orb){
          worldBattle.orbTimer-=dt/60;
          if(worldBattle.orbTimer<=0){
            const types=["fast","slow","paddle","double"];
            worldBattle.orb={x:w/2,y:35+Math.random()*(h-70),type:types[Math.floor(Math.random()*types.length)]};
          }
        }
        const balls=allWorldBattleBalls();
        for(const ball of balls){
          ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
          if(ball.y<7||ball.y>h-7){ball.y=Math.max(7,Math.min(h-7,ball.y));ball.vy*=-1}
          if(ball.vx<0&&ball.x<=36&&Math.abs(ball.y-worldBattle.left)<(worldBattle.boosts.left>0?50:35)){
            ball.x=36;hitWorldBattlePaddle(ball,"left");
          }
          if(ball.vx>0&&ball.x>=w-36&&Math.abs(ball.y-worldBattle.right)<(worldBattle.boosts.right>0?50:35)){
            ball.x=w-36;hitWorldBattlePaddle(ball,"right");
          }
          if(worldBattle.orb&&Math.hypot(ball.x-worldBattle.orb.x,ball.y-worldBattle.orb.y)<=27){
            const type=worldBattle.orb.type,collector=worldBattle.lastHit,recipient=type==="slow"?(collector==="left"?"right":"left"):collector;
            worldBattle.orb=null;worldBattle.orbTimer=3+Math.random()*3;giveWorldBattlePower(recipient,type);
          }
          if(ball.x<0||ball.x>w){awardWorldBattlePoint(ball.x<0?"left":"right");break}
          const speed=Math.hypot(ball.vx,ball.vy),limit=ball.type==="fast"||ball.type==="splitFast"?12:8.5;
          if(speed>limit){ball.vx*=limit/speed;ball.vy*=limit/speed}
          ball.vy=Math.max(-9,Math.min(9,ball.vy));
        }
        if(worldBattle.boss&&worldBattle.bossStage===2&&worldBattle.ball.vx>0&&worldBattle.ball.x>=worldBattle.bossTarget){
          worldBattle.ball.x=worldBattle.bossTarget;startWorldQte(2);
        }else if(worldBattle.boss&&worldBattle.bossStage===3&&worldBattle.ball.vx>0&&worldBattle.ball.x>=worldBattle.bossTarget){
          worldBattle.ball.x=worldBattle.bossTarget;startWorldQte(3);
        }
      }
    }
    if(worldBattle.active)drawWorldBattle();
    requestAnimationFrame(worldBattleFrame);
  }
  requestAnimationFrame(worldBattleFrame);
  document.addEventListener("keydown",(event)=>{
    if(!$("#page-world").classList.contains("active")||event.target.matches("input,textarea,select"))return;
    const key=event.key.toLowerCase(),moves={w:[0,-1],arrowup:[0,-1],s:[0,1],arrowdown:[0,1],a:[-1,0],arrowleft:[-1,0],d:[1,0],arrowright:[1,0]};
    if(worldBattle.active&&worldBattle.qteTimer>0&&["w","a","s","d"].includes(key)){
      event.preventDefault();
      if(key===worldBattle.qteSequence[worldBattle.qteIndex])worldBattle.qteIndex++;
      else worldBattle.qteIndex=key===worldBattle.qteSequence[0]?1:0;
      $$("#world-battle-qte kbd").forEach((letter,index)=>letter.classList.toggle("current",index===worldBattle.qteIndex));
      if(worldBattle.qteIndex===worldBattle.qteSequence.length)completeWorldQte(true);
      return;
    }
    if(worldBattle.active&&["arrowup","arrowdown","w","s"].includes(key)){event.preventDefault();keys.add(key);return}
    if(worldBattle.active)return;
    if(moves[key]){event.preventDefault();moveWorld(...moves[key])}
    if(key==="e")interactWorld();
    if(key===" ") {event.preventDefault();if(worldInterior?.dungeon)openWorldBattle(worldInterior.site,true);else openWorldBattle(null,false)}
  });
  drawWorld();
  updateWorldStats();
  if(!world.tutorialDone)$("#world-tutorial-start").click();
})();
