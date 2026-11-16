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
  function isSidebarVisible(){
    return document.body.classList.contains("world-mode-active")
      ?document.body.classList.contains("world-nav-open")
      :!document.body.classList.contains("sidebar-collapsed");
  }
  function setSidebarVisible(visible){
    if(document.body.classList.contains("world-mode-active")){
      document.body.classList.toggle("world-nav-open",visible);
    }else document.body.classList.toggle("sidebar-collapsed",!visible);
    $(".sidebar").hidden=!visible;
    $("#sidebar-toggle").setAttribute("aria-expanded",String(visible));
    $("#sidebar-toggle").setAttribute("aria-label",visible?"Hide arcade navigation":"Show arcade navigation");
    $("#sidebar-toggle").textContent=visible?"HIDE MENU":"SHOW MENU";
    const worldMenu=$("#world-mode-menu");
    worldMenu.setAttribute("aria-expanded",String(visible&&document.body.classList.contains("world-mode-active")));
    worldMenu.textContent=`${visible?"HIDE":"SHOW"} GAMEMODES`;
  }
  const setPage = (name) => {
    if (!pages.includes(name)) return;
    $$(".page").forEach((page) => page.classList.toggle("active", page.id === `page-${name}`));
    $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.page === name));
    document.body.classList.toggle("world-mode-active",name==="world");
    document.body.classList.remove("world-nav-open","sidebar-collapsed");
    setSidebarVisible(name!=="world");
    $("#current-location").textContent = pageTitles[name];
    if (name === "onevone") drawPong();
    if (name === "problems") updateProblemDirection();
    if (name === "world") drawWorld();
    window.scrollTo({top:0,behavior:"smooth"});
  };
  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-page]");
    if (target) { event.preventDefault(); setPage(target.dataset.page); }
  });
  $("#sidebar-toggle").addEventListener("click",()=>setSidebarVisible(!isSidebarVisible()));
  $("#world-mode-menu").addEventListener("click",()=>setSidebarVisible(!isSidebarVisible()));

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

  let problem={type:"prediction",phase:"aim",x:55,y:36,vx:-.78,vy:.48,paddleY:50,last:0,qteSequence:[],qteIndex:0,qteTime:0,trackingHits:0,streak:0,bestStreak:0,solved:0,totalAccuracy:0};
  const problemCourt=$("#problem-court"),problemBall=$("#problem-ball"),problemPaddle=$("#problem-player-paddle"),problemAction=$("#check-prediction");
  const problemPaddleKeys=new Set();
  function canMoveProblemPaddle(){return(problem.type==="prediction"&&problem.phase==="aim")||(problem.type==="strategy"&&(problem.phase==="aim"||problem.phase==="running"))}
  function setProblemPaddleY(y){
    problem.paddleY=Math.max(9,Math.min(91,y));
    problemPaddle.style.top=`${problem.paddleY}%`;
  }
  function updateProblemDirection(){
    const indicator=$("#problem-direction"),arrow=$("#problem-direction-arrow"),label=$("#problem-direction-label");
    const bounds=problemCourt.getBoundingClientRect(),courtWidth=bounds.width||1,courtHeight=bounds.height||260;
    const pixelVx=problem.vx*courtWidth,pixelVy=problem.vy*courtHeight;
    const angle=Math.atan2(pixelVy,pixelVx),degrees=Math.round(Math.atan2(Math.abs(pixelVy),Math.abs(pixelVx))*180/Math.PI);
    const vertical=degrees<=1?"LEVEL":problem.vy<0?"UP":"DOWN";
    indicator.classList.toggle("active",problem.type==="prediction"&&problem.phase==="aim");
    arrow.style.transform=`rotate(${angle*180/Math.PI}deg)`;
    label.textContent=vertical==="LEVEL"?`MOVING LEFT · ${degrees}°`:`MOVING ${vertical}-LEFT · ${degrees}°`;
    indicator.setAttribute("aria-label",`Ball moving ${vertical.toLowerCase()} and left at ${degrees} degrees from horizontal`);
  }
  function finishProblem(success,message){
    if(problem.phase==="success"||problem.phase==="failed")return;
    problem.phase=success?"success":"failed";
    problem.solved++;problem.totalAccuracy+=success?100:0;
    problem.streak=success?problem.streak+1:0;
    problem.bestStreak=Math.max(problem.bestStreak,problem.streak);
    $("#problem-streak").textContent=problem.bestStreak;$("#problem-solved").textContent=problem.solved;
    $("#problem-accuracy").innerHTML=`${Math.round(problem.totalAccuracy/problem.solved)}<small>%</small>`;
    $("#problem-result").textContent=message;$("#problem-result").style.color=success?"var(--green)":"var(--orange)";
    problemAction.disabled=false;problemAction.textContent="TRY AGAIN  ↗";
  }
  function resetProblem(){
    problemPaddleKeys.clear();
    problem.phase="aim";problem.x=55;problem.y=20+Math.random()*60;
    problem.vx=-.7-Math.random()*.16;problem.vy=(Math.random()-.5)*1.25;
    updateProblemDirection();
    problem.paddleY=50;problem.last=0;problem.qteSequence=[];problem.qteIndex=0;problem.qteTime=0;problem.trackingHits=0;
    problemBall.style.left=`${problem.x}%`;problemBall.style.top=`${problem.y}%`;
    problemPaddle.style.top=`${problem.paddleY}%`;
    $("#opponent-paddle").classList.add("hidden");
    $("#problem-qte-prompt").classList.add("hidden");
    $("#tracking-progress").textContent="TRACKED RETURNS: 0 / 3";
    $("#problem-result").textContent="";problemAction.disabled=false;
    problemAction.textContent=problem.type==="prediction"?"RELEASE THE BALL  ↗":problem.type==="timing"?"START QUICKTIME  ↗":"START TRACKING  ↗";
    $("#problem-prompt").textContent=problem.type==="prediction"
      ?"The ball is frozen. Use W/S or drag to position your paddle, then release the ball. Once it moves, your paddle is locked."
      :problem.type==="timing"?"Ready your fingers. You'll have to hit the complete random WASD sequence before time runs out."
      :"Start the drill, then use W/S or drag to catch the ball as it bounces across the court.";
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
    if(!canMoveProblemPaddle())return;
    const bounds=problemCourt.getBoundingClientRect();
    setProblemPaddleY((event.clientY-bounds.top)/bounds.height*100);
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
    updateProblemDirection();
    if(problem.type==="strategy"){
      problem.x=82;problem.y=16+Math.random()*68;problem.vx=-.62;problem.vy=.62+(Math.random()*.28);
      problemBall.style.left=`${problem.x}%`;problemBall.style.top=`${problem.y}%`;
      $("#problem-prompt").textContent="Track the ball with W/S or by dragging. Each clean catch sends it back; miss once and the drill ends.";
      $("#tracking-progress").textContent="TRACKED RETURNS: 0 / 3";
    }else{
      $("#problem-prompt").textContent="The ball is live. Your paddle is locked—see whether your frozen position saves the point.";
    }
    problemAction.disabled=true;problemAction.textContent=problem.type==="strategy"?"TRACK THE BALL":"BALL IN PLAY";
  }
  $("#new-problem").addEventListener("click",newProblem);
  problemAction.addEventListener("click",startProblem);
  function updateProblem(time){
    if(!$("#page-problems").classList.contains("active")){
      problem.last=time;problemPaddleKeys.clear();requestAnimationFrame(updateProblem);return
    }
    const dt=Math.min((time-problem.last)/16.67||1,2.4);problem.last=time;
    if(canMoveProblemPaddle()&&problemPaddleKeys.size){
      const direction=Number(problemPaddleKeys.has("s"))-Number(problemPaddleKeys.has("w"));
      setProblemPaddleY(problem.paddleY+direction*dt*.9);
    }
    if(problem.phase==="running"){
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
    }
    requestAnimationFrame(updateProblem);
  }
  requestAnimationFrame(updateProblem);
  document.addEventListener("keydown",(event)=>{
    if(!$("#page-problems").classList.contains("active"))return;
    const key=event.key.toLowerCase();
    if(problem.type==="timing"&&problem.phase==="running"){
      if(!["w","a","s","d"].includes(key))return;
      event.preventDefault();
      if(key===problem.qteSequence[problem.qteIndex])problem.qteIndex++;
      else problem.qteIndex=key===problem.qteSequence[0]?1:0;
      $$("#problem-qte-prompt kbd").forEach((letter,index)=>letter.classList.toggle("current",index===problem.qteIndex));
      if(problem.qteIndex===problem.qteSequence.length)finishProblem(true,"Quick reactions! You nailed the whole combination.");
      return;
    }
    if(!canMoveProblemPaddle()||!["w","s"].includes(key))return;
    event.preventDefault();problemPaddleKeys.add(key);
  });
  document.addEventListener("keyup",(event)=>problemPaddleKeys.delete(event.key.toLowerCase()));
  setProblemType("prediction");

  const canvas = $("#pong-canvas");
  const ctx = canvas.getContext("2d");
  const game = {mode:"ai",running:false,left:250,right:250,tiltLeft:0,tiltRight:0,paddleMoved:{left:false,right:false},balls:[],extraBalls:[],orb:null,orbSpawnTimer:4,leftHeight:76,rightHeight:76,paddleBoost:{left:0,right:0},powers:{left:null,right:null},lastHit:"left",scoreLeft:0,scoreRight:0,last:0,pointsToWin:7,powerups:true,qteTimer:0,qteAutoTimer:0,qteSequence:[],qteIndex:0,qteSide:null,playerReturns:{left:0,right:0},rallies:0};
  const keys = new Set();
  function randomQteSequence(side="left"){
    const sequence=side==="right"?["arrowup","arrowleft","arrowdown","arrowright"]:["w","a","s","d"];
    for(let index=sequence.length-1;index>0;index--){
      const swap=Math.floor(Math.random()*(index+1));
      [sequence[index],sequence[swap]]=[sequence[swap],sequence[index]];
    }
    return sequence;
  }
  const qteKeyLabels={w:"W",a:"A",s:"S",d:"D",arrowup:"↑",arrowleft:"←",arrowdown:"↓",arrowright:"→"};
  function startPongQte(side){
    game.qteSequence=randomQteSequence(side);game.qteIndex=0;game.qteSide=side;game.qteTimer=game.mode==="arena"?90:540;game.qteAutoTimer=8;
    keys.clear();
    $("#qte-prompt span").textContent=game.mode==="arena"?`${side==="left"?"AI 01":"AI 02"} QUICKTIME COMBO`:side==="left"?"PLAYER 1 QUICK RETURN":"PLAYER 2 QUICK RETURN";
    $("#qte-key").innerHTML=game.qteSequence.map((key,index)=>`<kbd class="${index===0?"current":""}">${qteKeyLabels[key]}</kbd>`).join("");
    $("#qte-prompt").classList.add("active");
  }
  function finishPongQte(success){
    const side=game.qteSide;
    game.qteTimer=0;game.qteSide=null;game.qteSequence=[];game.qteIndex=0;keys.clear();
    $("#qte-prompt").classList.remove("active");
    if(success&&side){
      game.paddleBoost[side]=Math.max(game.paddleBoost[side],2.5);
      if(game.mode!=="arena")toast("Perfect combo — short paddle boost!");
    }else if(side)toast("Combo expired — rally resumes.");
  }
  function resetBall(direction = Math.random() < .5 ? -1 : 1,lastHit=direction>0?"left":"right") {
    game.balls=[{x:canvas.width/2,y:canvas.height/2,vx:direction*(4.6+Math.random()*1.1),vy:(Math.random()-.5)*5.2,type:"normal",powerOwner:null,powerTimer:0,baseSpeed:0}];
    game.extraBalls=[];game.orb=null;game.orbSpawnTimer=1.5+Math.random()*2;
    game.powers={left:null,right:null};game.paddleBoost={left:0,right:0};game.leftHeight=76;game.rightHeight=76;
    game.lastHit=lastHit;
    game.qteTimer=0;game.qteSequence=[];game.qteIndex=0;game.qteSide=null;game.playerReturns={left:0,right:0};game.rallies=0;$("#qte-prompt").classList.remove("active");
  }
  function resetMatch() {
    game.scoreLeft=0; game.scoreRight=0; game.left=250; game.right=250; game.running=false; game.qteTimer=0;game.qteSequence=[];game.qteIndex=0;game.qteSide=null; game.rallies=0; $("#qte-prompt").classList.remove("active"); resetBall();renderPowerStatus();
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
    const canTriggerQte=game.mode==="arena"||game.mode==="ai"&&side==="left"||game.mode==="local"&&game.paddleMoved[side];
    if(canTriggerQte&&game.qteTimer<=0){
      game.playerReturns[side]++;
      if(game.playerReturns[side]%2===0)startPongQte(side);
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
      game.paddleMoved={left:false,right:false};
      if(game.qteTimer>0){
        if(game.mode==="arena"){
          game.qteAutoTimer-=dt;
          if(game.qteAutoTimer<=0){
            game.qteIndex++;
            $$("#qte-key kbd").forEach((letter,index)=>letter.classList.toggle("current",index===game.qteIndex));
            if(game.qteIndex===game.qteSequence.length)finishPongQte(true);
            else game.qteAutoTimer=8;
          }
        }
        if(game.qteTimer>0)game.qteTimer-=dt;
        if(game.qteTimer<=0&&game.qteSide)finishPongQte(false);
      }else{
        const previousLeft=game.left,previousRight=game.right;
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
        updatePowerups(dt);
        if(game.mode!=="arena"){
          const leftHalf=game.leftHeight/2;
          game.left=Math.max(leftHalf,Math.min(canvas.height-leftHalf,game.left));
        }
        const rightHalf=game.rightHeight/2;
        game.right=Math.max(rightHalf,Math.min(canvas.height-rightHalf,game.right));
        game.paddleMoved.left=game.left!==previousLeft;
        game.paddleMoved.right=game.right!==previousRight;
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
          if(game.qteTimer>0)break;
          if(ball.x<0||ball.x>canvas.width){finishPoint(ball.x<0?"left":"right");break}
          const speed=Math.hypot(ball.vx,ball.vy),limit=ball.type==="fast"||ball.type==="splitFast"?15:9;
          if(speed>limit){ball.vx*=limit/speed;ball.vy*=limit/speed}
          ball.vy=Math.max(-10,Math.min(10,ball.vy));
        }
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
    $("#game-hint").textContent=isArena?"AI QTE preview · combos auto-play":isLocal?"QTE on every 2nd moving return · P2 uses arrows":"QTE every 2nd return";
    resetMatch();
  }));
  document.addEventListener("keydown",(event)=>{
    const key=event.key.toLowerCase();
    const oneVOneActive=$("#page-onevone").classList.contains("active");
    if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(key)&&oneVOneActive)event.preventDefault();
    if(game.qteTimer>0&&oneVOneActive){
      const qteKeys=game.qteSide==="right"?["arrowup","arrowleft","arrowdown","arrowright"]:["w","a","s","d"];
      if(!qteKeys.includes(key))return;
      event.preventDefault();
      if(key===game.qteSequence[game.qteIndex])game.qteIndex++;
      else game.qteIndex=key===game.qteSequence[0]?1:0;
      $$("#qte-key kbd").forEach((letter,index)=>letter.classList.toggle("current",index===game.qteIndex));
      if(game.qteIndex===game.qteSequence.length)finishPongQte(true);
      return;
    }
    if(oneVOneActive)keys.add(key);
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
    updateEvolutionPurchaseAvailability();
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
  function updateEvolutionPurchaseAvailability(){
    if(!evolution)return;
    for(const button of $$("#upgrade-list [data-upgrade]")){
      const item=upgradeDefinitions.find((entry)=>entry.id===button.dataset.upgrade);
      if(!item)continue;
      const level=evolution.upgrades[item.id]||0;
      button.disabled=evolution.cash<item.base*(level+1)||level>=item.max;
    }
    for(const button of $$("#incentive-list [data-incentive]")){
      const item=incentiveDefinitions.find((entry)=>entry.id===button.dataset.incentive);
      if(!item)continue;
      button.disabled=evolution.cash<item.price||evolution.incentives.includes(item.id);
    }
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

  const worldDifficultySettings={
    easy:{label:"Easy",saveRate:.7},
    medium:{label:"Medium",saveRate:.8},
    hard:{label:"Hard",saveRate:.9},
    impossible:{label:"Impossible",saveRate:.99}
  };
  const worldPotionTypes={
    saving:{name:"POTION OF SAVING",description:"Lowers the enemy's chance to save the ball by 10 percentage points."},
    paddleSpeed:{name:"PADDLE SPEED POTION",description:"Raises your maximum paddle movement speed by 50%."},
    opponentSlow:{name:"PADDLE SLOWNESS POTION",description:"Rival paddles move 30% slower in World matches."},
    intelligence:{name:"POTION OF INTELLIGENCE",description:"World QTEs and puzzles need one fewer key."}
  };
  const worldPotionDurations=[{minutes:1,price:10},{minutes:5,price:35},{minutes:10,price:60}];
  const worldPotionProducts=Object.fromEntries(Object.entries(worldPotionTypes).flatMap(([type,potion])=>
    worldPotionDurations.map(({minutes,price})=>[`${type}-${minutes}`,{...potion,type,minutes,price}])
  ));
  let worldSaveNeedsMigration=false;
  const world=(()=>{
    const defaults={format:"pong-world-save",version:1,seed:Math.floor(Math.random()*2147483647),x:0,y:0,tokens:0,xp:0,wins:0,loot:0,recruits:[],openedLoot:[],inspected:[],talkedTo:[],completedJobs:[],defeatedBosses:[],defeatedGuards:[],completedActivities:[],activityProgress:{},inventory:[],potions:[],activePotions:{},activeJob:null,tutorialDone:false,difficulty:"medium",superBossDefeated:false,superBossVictoryScore:0};
    try{
      const saved=JSON.parse(localStorage.getItem(WORLD_KEY)||"null");
      if(saved&&saved.format==="pong-world-save"&&saved.version===1){
        const victoryScore=Number.isInteger(saved.superBossVictoryScore)&&saved.superBossVictoryScore>=3?saved.superBossVictoryScore:0;
        worldSaveNeedsMigration=Boolean(saved.superBossDefeated&&victoryScore===0);
        return{...defaults,...saved,
        recruits:Array.isArray(saved.recruits)?saved.recruits:[],openedLoot:Array.isArray(saved.openedLoot)?saved.openedLoot:[],
        inspected:Array.isArray(saved.inspected)?saved.inspected:[],talkedTo:Array.isArray(saved.talkedTo)?saved.talkedTo:[],
        completedJobs:Array.isArray(saved.completedJobs)?saved.completedJobs:[],defeatedBosses:Array.isArray(saved.defeatedBosses)?saved.defeatedBosses:[],
        defeatedGuards:Array.isArray(saved.defeatedGuards)?saved.defeatedGuards:[],completedActivities:Array.isArray(saved.completedActivities)?saved.completedActivities:[],
        activityProgress:saved.activityProgress&&typeof saved.activityProgress==="object"?saved.activityProgress:{},inventory:Array.isArray(saved.inventory)?saved.inventory:[],
        potions:Array.isArray(saved.potions)?saved.potions.filter((id)=>Object.hasOwn(worldPotionProducts,id)):[],
        activePotions:saved.activePotions&&typeof saved.activePotions==="object"?Object.fromEntries(Object.entries(saved.activePotions).filter(([type,expiry])=>Object.hasOwn(worldPotionTypes,type)&&Number.isFinite(expiry))):{},
        difficulty:Object.hasOwn(worldDifficultySettings,saved.difficulty)?saved.difficulty:"medium",
        superBossVictoryScore:victoryScore,superBossDefeated:Boolean(saved.superBossDefeated&&victoryScore>=3)};
      }
    }catch(error){console.error("Could not load Pong World save.",error)}
    return defaults;
  })();
  const worldCanvas=$("#world-canvas"),worldCtx=worldCanvas.getContext("2d");
  const worldBattleCanvas=$("#world-battle-canvas"),worldBattleCtx=worldBattleCanvas.getContext("2d");
  const worldShopOverlay=$("#world-shop-overlay");
  function hasActiveWorldPotion(type){return Number.isFinite(world.activePotions[type])&&world.activePotions[type]>Date.now()}
  function updateWorldInventoryCount(){const count=$("#world-inventory-count");if(count)count.textContent=world.potions.length+world.inventory.length}
  function renderWorldPotionShop(){
    $("#world-shop-items").innerHTML=Object.entries(worldPotionTypes).map(([type,potion])=>
      `<article class="world-shop-item"><div><strong>${potion.name}</strong><p>${potion.description}</p></div><div class="world-potion-prices">${worldPotionDurations.map(({minutes,price})=>`<button class="button button-secondary button-small" data-buy-potion="${type}-${minutes}" ${world.tokens<price?"disabled":""}>${minutes} MIN · ◈ ${price}</button>`).join("")}</div></article>`
    ).join("");
    $("#world-shop-balance").textContent=world.tokens;
  }
  function renderWorldPotionInventory(){
    const counts=new Map();
    for(const id of world.potions)counts.set(id,(counts.get(id)||0)+1);
    const inventory=$("#world-inventory-potions");
    const entries=[...counts].map(([id,count])=>{
      const potion=worldPotionProducts[id];
      return `<article class="world-inventory-item"><div><strong>${potion.name} · ${potion.minutes} MIN</strong><small>Owned: ${count}</small></div><button class="button button-primary button-small" data-use-potion="${id}">USE</button></article>`;
    });
    inventory.innerHTML=entries.join("")||`<p class="world-shop-empty">No potions yet. Buy some in the Shop.</p>`;
    const lootCounts=new Map();
    for(const item of world.inventory)lootCounts.set(item,(lootCounts.get(item)||0)+1);
    const lootList=$("#world-inventory-loot");
    lootList.replaceChildren();
    if(lootCounts.size){
      for(const [name,count] of lootCounts){
        const item=document.createElement("span");
        item.className="world-loot-item";item.textContent=`${name}${count>1?` ×${count}`:""}`;
        lootList.append(item);
      }
    }else{
      const empty=document.createElement("p");
      empty.className="world-shop-empty";empty.textContent="No collected items yet.";
      lootList.append(empty);
    }
    updateWorldPotionTimers();
  }
  function renderWorldPotionPanels(tab){
    const shop=tab==="shop";
    $("#world-shop-tab").classList.toggle("selected",shop);
    $("#world-inventory-tab").classList.toggle("selected",!shop);
    $("#world-shop-tab").setAttribute("aria-selected",String(shop));
    $("#world-inventory-tab").setAttribute("aria-selected",String(!shop));
    $("#world-shop-content").classList.toggle("hidden",!shop);
    $("#world-inventory-content").classList.toggle("hidden",shop);
    if(shop)renderWorldPotionShop();else renderWorldPotionInventory();
  }
  function openWorldPotionPanel(tab){
    renderWorldPotionPanels(tab);
    worldShopOverlay.classList.remove("hidden");
  }
  function closeWorldPotionPanel(){worldShopOverlay.classList.add("hidden")}
  function formatPotionTime(milliseconds){
    const seconds=Math.max(0,Math.ceil(milliseconds/1000));
    return`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}`;
  }
  function updateWorldPotionTimers(){
    const now=Date.now();let expired=false;
    for(const [type,expiry] of Object.entries(world.activePotions)){
      if(expiry<=now){delete world.activePotions[type];expired=true}
    }
    if(expired)saveWorld();
    const active=Object.entries(world.activePotions).filter(([,expiry])=>expiry>now);
    $("#world-active-potions").innerHTML=active.length
      ?active.map(([type,expiry])=>`<span class="world-active-potion">${worldPotionTypes[type].name}<strong data-potion-expiry="${expiry}">${formatPotionTime(expiry-now)}</strong></span>`).join("")
      :`<p class="world-shop-empty">No active potion effects.</p>`;
    updateWorldInventoryCount();
  }
  const tile=40,regionSize=24,biomes=["MOSS FIELDS","EMBER RIDGE","GLASS DESERT","FROSTLINE","NEON MARSH"];
  const worldNames={
    structure:["Signal Tower","Wayfarer Shrine","Old Relay","Rally Depot","Skybridge"],
    job:["Courier Board","Sparring Yard","Salvage Crew","Rally Workshop"],
    cache:["Supply Cache","Buried Locker","Lost Crate","Glowing Stash"],
    npc:["Rally Scout","Paddle Mechanic","Wandering Ace","Court Drifter","Rookie Bot"],
    duel:["Open Court","Rival Court","Boss Gate","Street Court"]
  };
  const worldColors={structure:"#93baff",job:"#ffcf77",cache:"#a4f6b1",npc:"#c5adff",duel:"#ff9b72"};
  const worldCompanionRoles={
    "Rally Scout":{title:"SCOUT",perk:"Points out a nearby structure when you talk."},
    "Paddle Mechanic":{title:"MECHANIC",perk:"Gives your paddle a brief boost at match start."},
    "Wandering Ace":{title:"ACE",perk:"Adds 5 tokens to a duel victory reward."},
    "Court Drifter":{title:"COURIER",perk:"Adds 4 tokens to courier contract rewards."},
    "Rookie Bot":{title:"DUNGEON GUIDE",perk:"Offers a tip about dungeon rooms."}
  };
  const worldTypes=["structure","job","cache","npc","duel"];
  const dungeonKinds=["path","maze","riddle","treasure","rivals"];
  const roomActivities=["cache","riddle","training","qte","rivals"];
  const dungeonNames={path:"WINDING PATH",riddle:"ECHO PUZZLE",treasure:"TREASURE VAULT",rivals:"RIVAL GAUNTLET",maze:"GUARDIAN MAZE",beyond:"BEYOND THIS WORLD"};
  const activityNames={cache:"SEALED CACHE",path:"WINDING PATH",riddle:"DIRECTIONAL PUZZLE",treasure:"TREASURE VAULT",training:"TARGET TRAINING",qte:"QUICKTIME TRIAL",rivals:"NPC RIVAL MATCH"};
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
          const name=names[Math.floor(random()*names.length)],recruitable=type==="npc"&&random()<.58;
          const beyond=type==="structure"&&worldHash(siteX,siteY,412)%30===0;
          const dungeon=type==="structure"&&(beyond||worldHash(siteX,siteY,411)%5===0);
          const dungeonKind=dungeon?(beyond?"beyond":dungeonKinds[worldHash(siteX,siteY,413)%dungeonKinds.length]):null;
          const roomActivity=type==="structure"?(dungeon?dungeonKind:roomActivities[worldHash(siteX,siteY,414)%roomActivities.length]):null;
          sites.push({id:`${world.seed}:${rx}:${ry}:${index}`,x:siteX,y:siteY,type,name,dungeon,dungeonKind,roomActivity,recruitable,jobKind:["courier","scavenger","sparring"][Math.floor(random()*3)]});
        }
      }
    }
    return sites;
  }
  function nearestWorldSite(){
    return worldSitesNear(world.x,world.y).map((site)=>({...site,distance:Math.abs(site.x-world.x)+Math.abs(site.y-world.y)}))
      .filter((site)=>site.distance<=1).sort((a,b)=>a.distance-b.distance)[0]||null;
  }
  function areaActivityKey(site){return`${site.id}:activity`}
  function worldSiteById(id){
    const match=/^(\d+):(-?\d+):(-?\d+):(\d+)$/.exec(id);
    if(!match||Number(match[1])!==world.seed)return null;
    const [, ,regionX,regionY]=match;
    return worldSitesNear(Number(regionX)*regionSize+12,Number(regionY)*regionSize+12).find((site)=>site.id===id)||null;
  }
  function hasWorldCompanion(name){return world.recruits.some((id)=>worldSiteById(id)?.name===name)}
  function updateWorldCrew(){
    const list=$("#world-crew-list"),empty=$("#world-crew-empty");
    const companions=world.recruits.map((id)=>({id,site:worldSiteById(id)})).filter(({site})=>site);
    list.innerHTML=companions.map(({id,site})=>{
      const role=worldCompanionRoles[site.name]||{title:"TRAVELER",perk:"A friendly face on the road."};
      return `<article class="world-companion"><div class="world-companion-copy"><strong>${site.name}</strong><small>${role.title} · ${role.perk}</small></div><div class="world-companion-actions"><button class="text-button" data-companion-action="talk" data-companion-id="${id}">TALK</button><button class="text-button world-companion-remove" data-companion-action="remove" data-companion-id="${id}" aria-label="Remove ${site.name} from your crew">REMOVE</button></div></article>`;
    }).join("");
    empty.classList.toggle("hidden",companions.length>0);
    $("#world-crew-count").textContent=`${companions.length}/4`;
  }
  function talkToWorldCompanion(site){
    if(site.name==="Rally Scout"){
      const target=worldSitesNear(world.x,world.y).filter((nearby)=>nearby.type==="structure")
        .sort((a,b)=>Math.abs(a.x-world.x)+Math.abs(a.y-world.y)-Math.abs(b.x-world.x)-Math.abs(b.y-world.y))[0];
      if(target){
        const dx=target.x-world.x,dy=target.y-world.y;
        const direction=`${dy<0?"north":dy>0?"south":""}${dx&&dy?"-":""}${dx<0?"west":dx>0?"east":""}`;
        $("#world-message").textContent=`${site.name}: "There's a ${target.name} ${Math.abs(dx)+Math.abs(dy)} tiles ${direction || "nearby"}. I'll keep watch."`;
      }else $("#world-message").textContent=`${site.name}: "No structures in sight. Let's explore a little farther."`;
    }else if(site.name==="Paddle Mechanic")$("#world-message").textContent=`${site.name}: "I'll tune your paddle before each match. You'll get a short coverage boost."`;
    else if(site.name==="Wandering Ace")$("#world-message").textContent=`${site.name}: "Win a duel with me on the crew and I'll add 5 tokens to the prize."`;
    else if(site.name==="Court Drifter")$("#world-message").textContent=`${site.name}: "I'll help with courier runs. Finish one with me along and you'll earn 4 extra tokens."`;
    else $("#world-message").textContent=`${site.name}: "Dungeon rooms have trials and clues. Clear the room activity before challenging its boss."`;
  }
  function areaActivityComplete(site){return world.completedActivities.includes(areaActivityKey(site))}
  function guardKey(site,index){return`${site.id}:guard-${index}`}
  function completeWorldArea(site,message){
    if(!areaActivityComplete(site)){
      const reward=10+worldHash(site.x,site.y,601)%11;
      world.completedActivities.push(areaActivityKey(site));world.tokens+=reward;world.xp+=reward*2;world.loot++;
      world.inventory.push(`${site.name} relic`);
      $("#world-message").textContent=`${message} You found a relic and ${reward} tokens.`;
      toast(`Area cleared · relic found · +${reward} tokens`);
      saveWorld();updateWorldStats();
    }else $("#world-message").textContent=`${message} You already claimed this area's relic.`;
    drawWorld();
  }
  function interiorWallCells(room){
    if(!room.dungeon)return[];
    if(room.dungeonKind==="path"){
      const routes=[
        [[4,6],[4,5],[5,5],[5,4],[5,3],[4,3],[4,2]],
        [[4,6],[3,6],[3,5],[3,4],[4,4],[5,4],[5,3],[5,2],[4,2]],
        [[4,6],[4,5],[3,5],[2,5],[2,4],[2,3],[3,3],[4,3],[4,2]]
      ];
      const route=routes[worldHash(room.site.x,room.site.y,622)%routes.length];
      const openCells=new Set(route.map(([x,y])=>`${x},${y}`)),walls=[];
      for(let y=1;y<=6;y++)for(let x=1;x<=7;x++)if(!openCells.has(`${x},${y}`))walls.push([x,y]);
      return walls;
    }
    if(!["maze","beyond"].includes(room.dungeonKind))return[];
    const base=[[1,4],[2,4],[3,4],[5,4],[6,4],[7,4],[1,2],[7,2]];
    const variants=[
      [[1,5],[2,5],[6,5],[7,5]],
      [[1,3],[7,3],[2,1],[6,1]],
      [[1,1],[7,1],[1,5],[7,5]]
    ];
    return base.concat(variants[worldHash(room.site.x,room.site.y,622)%variants.length]);
  }
  function areaGuardCount(site){return[1,2].filter((index)=>world.defeatedGuards.includes(guardKey(site,index))).length}
  function updateWorldActions(){
    const interact=$("#world-interact"),battle=$("#world-battle");
    if(worldInterior){
      const atExit=worldInterior.playerX===4&&worldInterior.playerY>=5;
      const activity=worldInterior.site.dungeonKind||worldInterior.site.roomActivity;
      interact.innerHTML=atExit?"LEAVE AREA&nbsp; <kbd>E</kbd>":`EXPLORE / ${activityNames[activity]||dungeonNames[activity]||"INTERACT"}&nbsp; <kbd>E</kbd>`;
      battle.hidden=false;
      battle.textContent=worldInterior.dungeon&&activity==="path"&&!areaActivityComplete(worldInterior.site)
        ?"FOLLOW THE PATH TO GOAL  ↗"
        :worldInterior.dungeon&&["maze","beyond"].includes(activity)
        ?`CHALLENGE ${world.defeatedBosses.includes(worldInterior.site.id)?"AREA":"GATE BOSS"}  ↗`
        :worldInterior.dungeon&&areaActivityComplete(worldInterior.site)
          ?`CHALLENGE DUNGEON BOSS  ↗`
          :`START ${activityNames[activity]||dungeonNames[activity]||"AREA ACTIVITY"}  ↗`;
      return;
    }
    interact.innerHTML="TALK / INTERACT&nbsp; <kbd>E</kbd>";
    battle.hidden=false;battle.textContent="OPEN 1V1 MATCH&nbsp; ↗";
  }
  function saveWorld(){
    localStorage.setItem(WORLD_KEY,JSON.stringify(world));
  }
  if(worldSaveNeedsMigration)saveWorld();
  function updateWorldDifficulty(){
    const setting=worldDifficultySettings[world.difficulty]||worldDifficultySettings.medium;
    $("#world-difficulty").value=world.difficulty;
    $("#world-difficulty-copy").textContent=`Rivals save about ${Math.round(setting.saveRate*100)}% of shots. This applies to every match in this World save.`;
  }
  $("#world-difficulty").addEventListener("change",()=>{
    if(!Object.hasOwn(worldDifficultySettings,$("#world-difficulty").value))return;
    world.difficulty=$("#world-difficulty").value;
    saveWorld();updateWorldDifficulty();
    toast(`${worldDifficultySettings[world.difficulty].label} difficulty saved for this World.`);
  });
  $("#world-shop-open").addEventListener("click",()=>openWorldPotionPanel("shop"));
  $("#world-inventory-open").addEventListener("click",()=>openWorldPotionPanel("inventory"));
  $("#world-shop-tab").addEventListener("click",()=>renderWorldPotionPanels("shop"));
  $("#world-inventory-tab").addEventListener("click",()=>renderWorldPotionPanels("inventory"));
  $("#world-shop-close").addEventListener("click",closeWorldPotionPanel);
  worldShopOverlay.addEventListener("click",(event)=>{
    if(event.target===worldShopOverlay)closeWorldPotionPanel();
  });
  $("#world-shop-items").addEventListener("click",(event)=>{
    const button=event.target.closest("[data-buy-potion]");
    if(!button)return;
    const id=button.dataset.buyPotion,potion=worldPotionProducts[id];
    if(!potion){toast("That potion is unavailable.");return}
    if(world.tokens<potion.price){toast("You need more World tokens for that potion.");return}
    world.tokens-=potion.price;world.potions.push(id);
    saveWorld();updateWorldStats();renderWorldPotionPanels("shop");
    toast(`${potion.name} added to your inventory.`);
  });
  $("#world-inventory-potions").addEventListener("click",(event)=>{
    const button=event.target.closest("[data-use-potion]");
    if(!button)return;
    const id=button.dataset.usePotion,potion=worldPotionProducts[id],inventoryIndex=world.potions.indexOf(id);
    if(!potion||inventoryIndex<0){toast("That potion is no longer in your inventory.");return}
    world.potions.splice(inventoryIndex,1);
    world.activePotions[potion.type]=Math.max(Date.now(),world.activePotions[potion.type]||0)+potion.minutes*60*1000;
    saveWorld();updateWorldStats();renderWorldPotionPanels("inventory");
    $("#world-message").textContent=`${potion.name} active for ${potion.minutes} minute${potion.minutes===1?"":"s"}.`;
    toast(`${potion.name} used.`);
  });
  document.addEventListener("keydown",(event)=>{
    if(worldShopOverlay.classList.contains("hidden"))return;
    if(event.key==="Escape"){closeWorldPotionPanel();event.preventDefault()}
    event.stopImmediatePropagation();
  });
  $("#world-quests-toggle").addEventListener("click",()=>{
    const expanded=$("#world-quests-toggle").getAttribute("aria-expanded")!=="true";
    $("#world-quests-content").classList.toggle("hidden",!expanded);
    $("#world-quests-toggle").setAttribute("aria-expanded",String(expanded));
    $("#world-quests-toggle").textContent=expanded?"HIDE QUESTS":"SHOW QUESTS";
  });
  $("#world-quests-open").addEventListener("click",()=>{
    const panel=$("#world-quests-panel");
    panel.scrollIntoView({behavior:"smooth",block:"center"});
    if($("#world-quests-toggle").getAttribute("aria-expanded")!=="true")$("#world-quests-toggle").click();
  });
  $("#world-god-hint").addEventListener("click",()=>{
    const expanded=$("#world-god-hint").getAttribute("aria-expanded")!=="true";
    $("#world-god-hint-copy").classList.toggle("hidden",!expanded);
    $("#world-god-hint").setAttribute("aria-expanded",String(expanded));
  });
  $("#world-quest-cancel").addEventListener("click",()=>{
    if(!world.activeJob)return;
    const name=world.activeJob.name;
    world.activeJob=null;
    $("#world-message").textContent=`Canceled ${name} quest.`;
    saveWorld();updateWorldStats();
  });
  updateWorldDifficulty();
  function updateWorldQuests(){
    const job=world.activeJob;
    $("#world-pong-god-status").textContent=world.superBossDefeated?"COMPLETE":"IN PROGRESS";
    $("#world-contract-quest").classList.toggle("hidden",!job);
    $("#world-no-optional-quests").classList.toggle("hidden",Boolean(job));
    if(job){
      $("#world-contract-quest-name").textContent=job.name;
      $("#world-contract-quest-description").textContent=job.kind==="courier"?"Travel 8 tiles.":job.kind==="scavenger"?"Open 2 supply caches.":"Win a 1v1 duel.";
      $("#world-contract-quest-progress").textContent=`${job.progress}/${job.goal} ${job.kind==="courier"?"TILES":job.kind==="scavenger"?"CACHES":"DUELS"} · REWARD ◈ ${job.reward}`;
    }
  }
  function updateWorldStats(){
    $("#world-tokens").textContent=world.tokens;
    $("#world-recruits").textContent=world.recruits.length;
    $("#world-wins").textContent=world.wins;
    $("#world-loot-count").textContent=world.loot;
    updateWorldInventoryCount();
    $("#world-coordinates").textContent=`X: ${world.x} · Y: ${world.y}`;
    const sectorX=Math.floor(world.x/regionSize),sectorY=Math.floor(world.y/regionSize);
    $("#world-location").textContent=`${biomes[worldHash(sectorX,sectorY)%biomes.length]} · SECTOR ${sectorX}, ${sectorY}`;
    const job=world.activeJob;
    $("#world-job-status").textContent=job?`${job.name}: ${job.progress}/${job.goal} ${job.kind==="courier"?"steps":job.kind==="scavenger"?"caches":"duels won"} · REWARD ◈ ${job.reward}`:"No active contract. Find a job site or ask a local.";
    updateWorldCrew();
    updateWorldQuests();
  }
  $("#world-crew-list").addEventListener("click",(event)=>{
    const button=event.target.closest("[data-companion-action]");
    if(!button)return;
    const id=button.dataset.companionId,site=worldSiteById(id);
    if(!site)return;
    if(button.dataset.companionAction==="talk"){
      talkToWorldCompanion(site);
      return;
    }
    world.recruits=world.recruits.filter((recruitId)=>recruitId!==id);
    $("#world-message").textContent=`${site.name} left your travel crew.`;
    saveWorld();updateWorldStats();
  });
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
    const walls=interiorWallCells(room);
    for(const [x,y] of walls){c.fillStyle="#11131b";c.fillRect(180+x*48,78+y*48,46,46);c.strokeStyle="#6a536f";c.strokeRect(184+x*48,82+y*48,38,38)}
    c.fillStyle="#11161d";c.fillRect(360,414,80,40);
    c.fillStyle="#86929e";c.font="10px monospace";c.textAlign="center";c.fillText("EXIT",400,444);
    const isMaze=room.dungeon&&["maze","beyond"].includes(room.site.dungeonKind),guardsDefeated=areaGuardCount(room.site);
    if(isMaze){
      for(let index=1;index<=2;index++){
        if(world.defeatedGuards.includes(guardKey(room.site,index)))continue;
        const [gx,gy]=index===1?[2,2]:[6,2],guardX=203+gx*48,guardY=100+gy*48;
        c.fillStyle="#ffcf77";c.shadowColor="#ff9b72";c.shadowBlur=12;c.beginPath();c.arc(guardX,guardY,12,0,Math.PI*2);c.fill();c.shadowBlur=0;
        c.fillStyle="#17151a";c.font="bold 7px monospace";c.fillText(`AI ${index}`,guardX,guardY+3);
      }
    }
    const activityDone=areaActivityComplete(room.site);
    if(room.dungeon&&!world.defeatedBosses.includes(room.site.id)&&(!isMaze||guardsDefeated===2)&&activityDone){
      c.fillStyle="#ff9b72";c.shadowColor="#ff9b72";c.shadowBlur=18;c.beginPath();c.arc(396,202,18,0,Math.PI*2);c.fill();c.shadowBlur=0;
      c.fillStyle="#15151b";c.font="bold 9px monospace";c.fillText("BOSS",396,205);
    }else if(isMaze&&guardsDefeated<2){
      c.fillStyle="#ffcf77";c.fillRect(365,178,70,42);c.fillStyle="#241a15";c.font="bold 8px monospace";c.fillText(`${2-guardsDefeated} BOSS`,400,202);
    }else if(!activityDone&&(!room.dungeon||!isMaze)){
      const activity=room.site.dungeonKind||room.site.roomActivity;
      c.shadowBlur=10;
      if(activity==="treasure"){
        c.fillStyle="#ffcf77";c.shadowColor="#ffcf77";c.fillRect(382,192,28,20);c.fillRect(379,188,34,6);
        c.fillStyle="#3a2a19";c.fillRect(394,195,5,10);
      }else if(activity==="rivals"){
        c.fillStyle="#ff9b72";c.shadowColor="#ff9b72";
        c.beginPath();c.arc(386,196,8,0,Math.PI*2);c.arc(406,196,8,0,Math.PI*2);c.fill();
        c.fillRect(380,204,12,10);c.fillRect(400,204,12,10);
      }else if(activity==="path"){
        c.fillStyle="#a4f6b1";c.shadowColor="#a4f6b1";c.fillRect(392,188,8,26);c.beginPath();c.moveTo(400,190);c.lineTo(414,195);c.lineTo(400,201);c.fill();
      }else{
        c.fillStyle="#c5adff";c.shadowColor="#c5adff";c.beginPath();c.arc(396,202,12,0,Math.PI*2);c.fill();
      }
      c.shadowBlur=0;c.fillStyle="#16131d";c.font="bold 7px monospace";
      c.fillText(activity==="treasure"?"CHEST":activity==="rivals"?"RIVALS":activity==="path"?"GOAL":activity==="riddle"?"PUZZLE":"TRIAL",396,activity==="treasure"?205:activity==="path"?208:205);
    }else{
      c.fillStyle="#93baff";c.fillRect(365,178,70,42);c.fillStyle="#151b22";c.font="bold 9px monospace";c.fillText(room.dungeon?"CLEARED":"SAFE ROOM",400,202);
    }
    const px=204+room.playerX*48,py=102+room.playerY*48;
    c.fillStyle="#7df2e3";c.shadowColor="#7df2e3";c.shadowBlur=12;c.beginPath();c.arc(px,py,11,0,Math.PI*2);c.fill();c.shadowBlur=0;
    c.fillStyle="#e8fff9";c.font="bold 9px monospace";c.fillText(room.dungeon?`${dungeonNames[room.site.dungeonKind]||"DUNGEON"} · ${room.site.name.toUpperCase()}`:room.site.name.toUpperCase(),400,31);
    c.fillStyle="#84919f";c.font="9px monospace";c.fillText("MOVE WASD · E AT TRIAL / GUARD / EXIT",400,477);
    $("#world-location").textContent=room.dungeon?"DUNGEON INTERIOR":`${room.site.name.toUpperCase()} · INTERIOR`;
    $("#world-message").textContent=room.dungeon
      ?world.defeatedBosses.includes(room.site.id)?"The boss is defeated. The glowing entrance at the bottom leads back outside.":isMaze?`${2-guardsDefeated} guardian AI(s) block the maze. Defeat them before you can challenge the boss.`:"A boss blocks the far end of this room. Move close and press E to challenge it; press E near the exit to leave."
      :activityDone?"The activity is complete. Return to the entrance or challenge the dungeon boss.":`A ${activityNames[room.site.dungeonKind||room.site.roomActivity]||"world activity"} waits in the middle of the room. Complete it before challenging any dungeon boss.`;
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
    $("#world-message").textContent=nearby?`${nearby.name}${nearby.dungeon?" · DUNGEON":""} nearby. Press the large interact button or E to ${nearby.dungeon?"enter and explore its varied rooms":nearby.type==="duel"?"start a 1v1 match":nearby.type==="cache"?"open it":nearby.type==="npc"?"talk":"interact"}.`:`New ground, new possibilities. Move with WASD. Press E near a landmark to interact.`;
    updateWorldStats();
    updateWorldActions();
  }
  function finishWorldJob(){
    const job=world.activeJob;if(!job||job.progress<job.goal)return;
    const companionBonus=job.kind==="courier"&&hasWorldCompanion("Court Drifter")?4:0,reward=job.reward+companionBonus;
    world.tokens+=reward;world.xp+=reward*2;world.completedJobs.push(job.id);world.activeJob=null;
    $("#world-message").textContent=`Contract complete! You earned ${reward} tokens${companionBonus? " (including your companion's +4 bonus)":""}.`;
    toast(`Contract complete · +${reward} tokens`);
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
  const keyGlyphs={ArrowUp:"↑",ArrowDown:"↓",ArrowLeft:"←",ArrowRight:"→",w:"W",a:"A",s:"S",d:"D"};
  const superBossCode=["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight"];
  let activeActivity=null,superBossCodeIndex=0;
  function makeActivitySequence(site,kind){
    const sequence=kind==="riddle"
      ?["ArrowUp","ArrowRight","ArrowDown","ArrowLeft","ArrowUp"]
      :kind==="qte"
        ?Array.from({length:6},(_,index)=>["ArrowUp","ArrowRight","ArrowDown","ArrowLeft"][(worldHash(site.x,site.y,710+index)%4)])
        :["w","d","s","a","w","d"];
    return hasActiveWorldPotion("intelligence")?sequence.slice(1):sequence;
  }
  function renderActivitySequence(sequence,index){
    $("#world-activity-sequence").innerHTML=sequence.map((key,i)=>`<kbd class="${i===index?"current":""}">${keyGlyphs[key]||key.toUpperCase()}</kbd>`).join("");
  }
  function beginWorldActivity(site){
    const kind=site.dungeonKind||site.roomActivity;
    if(areaActivityComplete(site)){completeWorldArea(site,"This area is already cleared.");return}
    if(kind==="cache"||kind==="treasure"){completeWorldArea(site,kind==="treasure"?"You opened the dungeon treasure vault.":"You opened the sealed cache.");return}
    if(kind==="rivals"){openWorldBattle(site,false);return}
    if(kind==="maze"||kind==="beyond"){
      const nextGuard=[1,2].find((index)=>!world.defeatedGuards.includes(guardKey(site,index)));
      if(nextGuard){openWorldBattle(site,true,nextGuard);return}
      if(world.defeatedBosses.includes(site.id)){completeWorldArea(site,"The dungeon is already cleared.");return}
      if(kind==="beyond")openBeyondBoss(site);else openWorldBattle(site,true);
      return;
    }
    if(kind==="path"){completeWorldArea(site,"The winding dungeon path is cleared.");return}
    const sequence=makeActivitySequence(site,kind);
    activeActivity={site,kind,sequence,index:0,timeLeft:kind==="qte"?12:0,timer:null};
    $("#world-activity-tag").textContent=dungeonNames[kind]||activityNames[kind]||"WORLD TRIAL";
    $("#world-activity-title").textContent=kind==="riddle"?"Read the echo":kind==="training"?"Hit the training pattern":"Stay on the beat";
    $("#world-activity-copy").textContent=kind==="riddle"?"Enter the directional sequence etched into the court.":kind==="training"?"Repeat the paddle movement pattern to calibrate your aim.":"Enter the sequence before the timer expires. One mistake resets the trial.";
    renderActivitySequence(sequence,0);$("#world-activity-progress").textContent=kind==="qte"?"12 SECONDS · NO MISSES":"0 / "+sequence.length;
    $("#world-activity-overlay").classList.remove("hidden");
    if(kind==="qte")activeActivity.timer=setInterval(()=>{
      if(!activeActivity)return;
      activeActivity.timeLeft--;
      $("#world-activity-progress").textContent=`${activeActivity.timeLeft} SECONDS · ${activeActivity.index}/${sequence.length}`;
      if(activeActivity.timeLeft<=0)closeWorldActivity("The reflex trial timed out. Try again.");
    },1000);
  }
  function closeWorldActivity(message="Challenge closed."){
    if(activeActivity?.timer)clearInterval(activeActivity.timer);
    activeActivity=null;$("#world-activity-overlay").classList.add("hidden");
    if(message)$("#world-message").textContent=message;
  }
  function handleWorldActivityKey(event){
    if(!activeActivity||$("#world-activity-overlay").classList.contains("hidden"))return;
    event.preventDefault();event.stopImmediatePropagation();
    const key=event.key.length===1?event.key.toLowerCase():event.key;
    if(key!==activeActivity.sequence[activeActivity.index]){
      activeActivity.index=0;renderActivitySequence(activeActivity.sequence,0);
      $("#world-activity-progress").textContent=activeActivity.kind==="qte"?`${activeActivity.timeLeft} SECONDS · WRONG KEY — RESET`:`WRONG KEY · RESET TO 0/${activeActivity.sequence.length}`;
      return;
    }
    activeActivity.index++;
    renderActivitySequence(activeActivity.sequence,activeActivity.index);
    if(activeActivity.index>=activeActivity.sequence.length){
      const site=activeActivity.site,kind=activeActivity.kind;
      closeWorldActivity(null);
      completeWorldArea(site,kind==="training"?"Training complete.":kind==="riddle"?"The echo puzzle is solved.":"Quicktime trial cleared.");
      return;
    }
    $("#world-activity-progress").textContent=activeActivity.kind==="qte"?`${activeActivity.timeLeft} SECONDS · ${activeActivity.index}/${activeActivity.sequence.length}`:`${activeActivity.index} / ${activeActivity.sequence.length}`;
  }
  $("#world-activity-close").addEventListener("click",()=>closeWorldActivity());
  $("#world-activity-overlay").addEventListener("click",(event)=>{if(event.target.id==="world-activity-overlay")closeWorldActivity()});
  document.addEventListener("keydown",handleWorldActivityKey);
  function openBeyondBoss(site){
    openWorldBattle(site,true);
  }
  function enterWorldStructure(site){
    worldInterior={site,dungeon:site.dungeon,playerX:4,playerY:6};
    toast(site.dungeon?`${dungeonNames[site.dungeonKind]||"Dungeon"} · activity inside`:"Area discovered · explore its trial");
    drawWorld();
  }
  function interactWorld(){
    if(worldInterior){
      const {site,dungeon,playerX,playerY}=worldInterior;
      const maze=dungeon&&["maze","beyond"].includes(site.dungeonKind);
      if(maze){
        for(let index=1;index<=2;index++){
          if(world.defeatedGuards.includes(guardKey(site,index)))continue;
          const [gx,gy]=index===1?[2,2]:[6,2];
          if(Math.abs(playerX-gx)+Math.abs(playerY-gy)<=1){openWorldBattle(site,true,index);return}
        }
        if(areaGuardCount(site)===2&&!world.defeatedBosses.includes(site.id)&&Math.abs(playerX-4)+Math.abs(playerY-2)<=1){
          beginWorldActivity(site);return;
        }
      }else if(dungeon&&!world.defeatedBosses.includes(site.id)&&Math.abs(playerX-4)+Math.abs(playerY-2)<=1){
        if(areaActivityComplete(site))openWorldBattle(site,true);
        else beginWorldActivity(site);
        return;
      }else if(!dungeon&&!areaActivityComplete(site)&&Math.abs(playerX-4)+Math.abs(playerY-2)<=1){
        beginWorldActivity(site);return;
      }
      if(playerX===4&&playerY>=5){
        worldInterior=null;drawWorld();$("#world-message").textContent=`You stepped outside ${site.name}. Press E near another marker to interact.`;return;
      }
      $("#world-message").textContent=dungeon
        ?world.defeatedBosses.includes(site.id)?"The dungeon is clear. Return to the entrance and press E to leave.":maze?`Explore the maze. ${2-areaGuardCount(site)} guardian AI(s) remain, then the Beyond boss awaits. Move next to a marker and press E to fight.`:"A boss blocks the northern chamber. Move close and press E to begin the fight."
        :areaActivityComplete(site)?`Inside ${site.name}, the trial is complete. Return to the entrance and press E to leave.`:`Move to the ${activityNames[site.roomActivity]||"activity"} marker in the middle and press E, or use the challenge button.`;
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
      const nextX=Math.max(1,Math.min(7,worldInterior.playerX+dx)),nextY=Math.max(1,Math.min(6,worldInterior.playerY+dy));
      if(interiorWallCells(worldInterior).some(([x,y])=>x===nextX&&y===nextY))return;
      worldInterior.playerX=nextX;worldInterior.playerY=nextY;
      drawWorld();return;
    }
    world.x+=dx;world.y+=dy;
    if(world.activeJob?.kind==="courier"){world.activeJob.progress++;finishWorldJob()}
    saveWorld();drawWorld();
  }
  const tutorialSteps=[
    "Move with W, A, S, D or the arrow keys. The camera follows you, and new territory keeps appearing in every direction.",
    "Walk next to a person, structure, job board, supply cache, or court. Press the large TALK / INTERACT button or E, then read the dialogue below the map.",
    "Every structure has a reward or activity: caches, directional puzzles, target training, timed trials, and rival matches. Rooms are bounded; return to the entrance to leave.",
    "Dungeon routes vary: winding paths, guardian mazes, puzzles, treasure vaults, and rival gauntlets all lead to a boss. The rare Beyond encounter uses a moving 3D boss.",
    "Job boards offer courier, salvage, and 1v1 sparring contracts. Complete the task to earn tokens; caches have randomized loot.",
    "Challenge rival courts in one-on-one matches. Move with W/S, tilt with A/D, collect powerups, and land quicktime combos. QTEs come up regularly, and tilt stays active briefly after release to make timing more forgiving."
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
    if(worldInterior?.dungeon&&worldInterior.site.dungeonKind==="path"&&!areaActivityComplete(worldInterior.site)){
      $("#world-message").textContent="Follow the winding route to the goal, then press E to clear the path.";
    }else if(worldInterior&&!worldInterior.dungeon)beginWorldActivity(worldInterior.site);
    else if(worldInterior&&["maze","beyond"].includes(worldInterior.site.dungeonKind))beginWorldActivity(worldInterior.site);
    else if(worldInterior?.dungeon&&areaActivityComplete(worldInterior.site))openWorldBattle(worldInterior.site,true);
    else if(worldInterior?.dungeon)beginWorldActivity(worldInterior.site);
    else openWorldBattle(null,false);
  });

  const worldBattle={running:false,active:false,left:180,right:180,paddleX:30,leftTilt:0,rightTilt:0,tiltAssistTimer:0,tiltAssistAngle:0,teleport:null,playerEcho:null,depthEcho:null,depthPhase:0,ball:{x:400,y:180,vx:5,vy:2.5,type:"normal",powerOwner:null,powerTimer:0,baseSpeed:0},extraBalls:[],scoreLeft:0,scoreRight:0,last:0,pointPause:0,lastHit:"left",rallies:0,playerReturns:0,orb:null,orbTimer:2,powers:{left:null,right:null},boosts:{left:0,right:0},powerups:true,qteTimer:0,qteSequence:[],qteIndex:0,boss:false,superBoss:false,bossStage:0,bossStack:0,bossComboOrigin:null,bossHealth:3,site:null,guardIndex:null};
  function allWorldBattleBalls(){return [worldBattle.ball,...worldBattle.extraBalls]}
  function worldBattlePaddleHeight(side){
    if(worldBattle.boosts[side]>0)return 84;
    return side==="left"?72:54;
  }
  function predictWorldAiImpact(ball){
    const height=worldBattleCanvas.height,low=7,span=height-14;
    const frames=(worldBattleCanvas.width-36-ball.x)/ball.vx;
    let phase=(ball.y-low+ball.vy*frames)%(span*2);
    if(phase<0)phase+=span*2;
    return low+(phase<=span?phase:span*2-phase);
  }
  function setWorldAiTarget(ball){
    if(ball.vx<=0)return;
    let rate=Number.isFinite(ball.aiSaveRate)?ball.aiSaveRate:(worldBattle.superBoss ? .9999 : worldDifficultySettings[world.difficulty].saveRate);
    if(worldBattle.guardIndex)rate=Math.min(.999,rate+.1);
    if(!worldBattle.superBoss&&hasActiveWorldPotion("saving"))rate=Math.max(0,rate-.1);
    ball.aiSaves=Math.random()<rate;
    ball.aiTeleportCount=0;
    ball.realityWarpCount=0;
    updateWorldAiTarget(ball);
  }
  function updateWorldAiTarget(ball){
    const impact=predictWorldAiImpact(ball),half=worldBattlePaddleHeight("right")/2;
    const top=half,bottom=worldBattleCanvas.height-half;
    ball.aiTarget=ball.aiSaves?impact:(Math.abs(impact-top)>Math.abs(impact-bottom)?top:bottom);
  }
  function drawPongDevilArena(c,w,h){
    const phase=worldBattle.depthPhase,sky=c.createLinearGradient(0,0,0,h);
    sky.addColorStop(0,"#180b13");sky.addColorStop(.58,"#260b0c");sky.addColorStop(1,"#10070a");
    c.fillStyle=sky;c.fillRect(0,0,w,h);
    const glow=c.createRadialGradient(w/2,h,4,w/2,h*.78,h*.95);
    glow.addColorStop(0,"#ff361b88");glow.addColorStop(.55,"#a20f1e44");glow.addColorStop(1,"#a20f1e00");
    c.fillStyle=glow;c.fillRect(0,0,w,h);
    c.save();c.shadowColor="#ff3b19";c.shadowBlur=12;c.strokeStyle="#ff4a2677";c.lineWidth=2;
    for(let crack=0;crack<8;crack++){
      const x=crack*w/8+Math.sin(phase*1.7+crack)*12;
      c.beginPath();c.moveTo(x,h);c.lineTo(x+Math.sin(crack*7)*12,h-28);c.lineTo(x-15,h-52);c.lineTo(x+Math.cos(crack*4)*16,h-78);c.stroke();
    }
    for(let flame=0;flame<22;flame++){
      const x=(flame+.5)*w/22,pulse=.5+.5*Math.sin(phase*5+flame*1.9);
      const height=32+pulse*76,sway=Math.sin(phase*3.4+flame*2.2)*14,width=9+pulse*8;
      const fire=c.createLinearGradient(0,h-height,0,h);
      fire.addColorStop(0,"#fff18cff");fire.addColorStop(.3,"#ff6a1fff");fire.addColorStop(1,"#9f1119ee");
      c.fillStyle=fire;c.beginPath();c.moveTo(x-width,h);c.quadraticCurveTo(x-width*.8+sway,h-height*.45,x+sway,h-height);c.quadraticCurveTo(x+width*.8+sway,h-height*.45,x+width,h);c.closePath();c.fill();
    }
    c.restore();
    c.save();c.shadowColor="#ffb238";c.fillStyle="#ffc15a";
    for(let ember=0;ember<28;ember++){
      const rise=(phase*.16+ember*.071)%1;
      const x=(ember*97+Math.sin(phase*2+ember)*24+w)%w,y=h-10-rise*(h+12),size=1+(ember%3)*.55;
      c.globalAlpha=.25+.55*(1-rise);c.beginPath();c.arc(x,y,size,0,Math.PI*2);c.fill();
    }
    c.restore();
    if(Math.sin(phase*2.7+.7)>.96){
      c.save();c.globalAlpha=.18;c.fillStyle="#ff263c";
      for(let slice=0;slice<3;slice++){
        const y=(phase*81+slice*119)%h;
        c.fillRect(0,y,w,2);c.fillStyle="#ffbd5533";c.fillRect((phase*173+slice*71)%w,y+3,w*.22,3);c.fillStyle="#ff263c";
      }
      c.restore();
    }
  }
  function drawWorldBattle(){
    const c=worldBattleCtx;if(!c)return;
    const w=worldBattleCanvas.width,h=worldBattleCanvas.height;
    c.clearRect(0,0,w,h);
    if(worldBattle.superBoss)drawPongDevilArena(c,w,h);
    else{c.fillStyle="#0b1119";c.fillRect(0,0,w,h)}
    c.strokeStyle=worldBattle.superBoss?"#ff735366":"#293544";c.shadowColor=worldBattle.superBoss?"#ff321f":"transparent";c.shadowBlur=worldBattle.superBoss?8:0;c.setLineDash([6,9]);c.beginPath();c.moveTo(w/2,0);c.lineTo(w/2,h);c.stroke();c.setLineDash([]);c.shadowBlur=0;
    const leftHeight=worldBattlePaddleHeight("left"),rightHeight=worldBattlePaddleHeight("right");
    if(worldBattle.teleport){
      const progress=Math.min(1,worldBattle.teleport.elapsed/worldBattle.teleport.duration);
      c.strokeStyle=`rgba(125,242,227,${(1-progress)*.55})`;c.lineWidth=4;c.beginPath();c.moveTo(30,worldBattle.teleport.from);c.lineTo(30,worldBattle.teleport.to);c.stroke();
    }
    if(worldBattle.playerEcho){
      const progress=1-worldBattle.playerEcho.timer/.32;
      c.save();c.globalAlpha=Math.max(0,(1-progress)*.7);c.strokeStyle="#d981ff";c.lineWidth=3;
      for(const segment of worldBattle.playerEcho.segments){
        c.beginPath();c.moveTo(segment.fromX,segment.fromY);c.lineTo(segment.toX,segment.toY);c.stroke();
        c.fillStyle="#d981ff";c.fillRect(segment.fromX-5,segment.fromY-leftHeight/2,10,leftHeight);
      }
      c.restore();
    }
    c.fillStyle="#7df2e3";c.shadowColor="#7df2e3";c.shadowBlur=worldBattle.superBoss&&worldBattle.bossStack>0?22:11;c.save();c.translate(worldBattle.paddleX,worldBattle.left);c.rotate(worldBattle.leftTilt);c.fillRect(-5,-leftHeight/2,10,leftHeight);c.restore();
    if(worldBattle.superBoss){
      c.save();c.shadowBlur=0;c.fillStyle="#d981ff";
      for(let layer=1;layer<=3;layer++){
        const progress=worldBattle.depthEcho?1-worldBattle.depthEcho.timer/.5:1;
        const y=worldBattle.depthEcho
          ?worldBattle.depthEcho.from+(worldBattle.depthEcho.to-worldBattle.depthEcho.from)*Math.min(1,progress*layer/3)
          :worldBattle.right+Math.sin(worldBattle.depthPhase*2+layer)*layer*9;
        c.globalAlpha=worldBattle.depthEcho?Math.max(0,(1-progress)*(.52-layer*.08)):.12/layer;
        c.fillRect(w-30-layer*8-5,y-rightHeight/2,10,rightHeight);
      }
      c.restore();
    }
    c.fillStyle="#ff9b72";c.shadowColor="#ff9b72";c.save();c.translate(w-30,worldBattle.right);c.rotate(worldBattle.rightTilt);c.fillRect(-5,-rightHeight/2,10,rightHeight);c.restore();
    for(const ball of allWorldBattleBalls()){
      if(ball.warpEcho){
        const progress=1-ball.warpEcho.timer/.28;
        c.save();c.globalAlpha=Math.max(0,(1-progress)*.7);c.strokeStyle="#d981ff";c.lineWidth=2;
        c.beginPath();c.moveTo(ball.warpEcho.x,ball.warpEcho.y);c.lineTo(ball.x,ball.y);c.stroke();
        c.beginPath();c.arc(ball.warpEcho.x,ball.warpEcho.y,8+progress*7,0,Math.PI*2);c.stroke();c.restore();
      }
      c.fillStyle=ball.type==="fast"||ball.type==="splitFast"?"#ffe3a3":ball.type==="slow"||ball.type==="splitSlow"?"#b9d8ff":worldBattle.superBoss?"#fff1c8":"#edfff9";
      c.shadowColor=ball.type==="fast"||ball.type==="splitFast"?"#ffcf77":ball.type==="slow"||ball.type==="splitSlow"?"#93baff":worldBattle.superBoss?"#ff4a1f":"#7df2e3";
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
    if(direction>0)setWorldAiTarget(worldBattle.ball);
    worldBattle.extraBalls=[];worldBattle.orb=null;worldBattle.orbTimer=2+Math.random()*2;
    worldBattle.paddleX=30;worldBattle.powers={left:null,right:null};worldBattle.boosts={left:0,right:0};worldBattle.qteTimer=0;worldBattle.bossStage=0;worldBattle.bossStack=0;worldBattle.bossComboOrigin=null;worldBattle.rallies=0;worldBattle.playerReturns=0;worldBattle.teleport=null;worldBattle.playerEcho=null;worldBattle.depthEcho=null;worldBattle.tiltAssistTimer=0;worldBattle.leftTilt=0;worldBattle.rightTilt=0;worldBattle.lastHit=direction>0?"left":"right";
    worldBattle.pointPause=35;$("#world-battle-qte").classList.add("hidden");
  }
  function teleportWorldBattlePaddle(x,y){
    const half=worldBattlePaddleHeight("left")/2,toY=Math.max(half,Math.min(worldBattleCanvas.height-half,y));
    worldBattle.playerEcho={segments:[{fromX:worldBattle.paddleX,fromY:worldBattle.left,toX:x,toY}],timer:.32};
    worldBattle.paddleX=x;worldBattle.left=toY;
  }
  function smashWorldBattleBallTo(ball,x){
    ball.warpEcho={x:ball.x,y:ball.y,timer:.28};
    ball.x=x;ball.vx=Math.min(Math.abs(ball.vx)*1.12,14);
    updateWorldAiTarget(ball);
  }
  function startWorldQte(){
    worldBattle.qteSequence=randomQteSequence();
    if(!worldBattle.superBoss&&hasActiveWorldPotion("intelligence"))worldBattle.qteSequence=worldBattle.qteSequence.slice(1);
    worldBattle.qteIndex=0;worldBattle.qteTimer=9;
    const label=worldBattle.superBoss?`PONG DEVIL SMASH · QTE ${worldBattle.bossStack+1}/3`:worldBattle.boss?`BOSS TILT STACK · QTE ${worldBattle.bossStack+1}`:"QUICK RETURN";
    $("#world-battle-qte").innerHTML=`<span>${label}</span>${worldBattle.qteSequence.map((letter,index)=>`<kbd class="${index===0?"current":""}">${letter.toUpperCase()}</kbd>`).join("")}`;
    $("#world-battle-qte").classList.remove("hidden");
    $("#world-battle-message").textContent=worldBattle.superBoss?"Smash the ball forward, teleport to it, and complete all three QTEs.":worldBattle.boss?"Enter the combo. Each success speeds the ball and warps your paddle toward it.":"Quicktime combo ready. You have 9 seconds; the rally pauses while you enter it.";
  }
  function completeWorldQte(success){
    $("#world-battle-qte").classList.add("hidden");worldBattle.qteTimer=0;
    if(!success){
      worldBattle.bossStage=0;
      if(worldBattle.superBoss){
        const origin=worldBattle.bossComboOrigin||{x:30,y:worldBattle.left};
        worldBattle.bossStack=0;worldBattle.bossComboOrigin=null;
        teleportWorldBattlePaddle(origin.x,origin.y);
        $("#world-battle-message").textContent="Combo missed. The Pong Devil sequence ended; your paddle teleports back.";
      }else{
        worldBattle.bossStack=0;
        $("#world-battle-message").textContent=worldBattle.boss?"Combo missed. The rally continues; the tilt stack resets.":"Combo missed. The rally continues.";
      }
      return;
    }
    worldBattle.boosts.left=Math.max(worldBattle.boosts.left,2.5);
    if(worldBattle.superBoss){
      const ball=worldBattle.ball,origin=worldBattle.bossComboOrigin||{x:30,y:worldBattle.left},midpoint=worldBattleCanvas.width/2;
      worldBattle.bossStack++;
      if(worldBattle.bossStack===1){
        smashWorldBattleBallTo(ball,ball.x+(midpoint-ball.x)/2);
        teleportWorldBattlePaddle(Math.max(30,ball.x-6),ball.y);
        startWorldQte();
        $("#world-battle-message").textContent="SMASH 1/3! The ball jumps forward. Teleporting in for QTE 2/3.";
      }else if(worldBattle.bossStack===2){
        smashWorldBattleBallTo(ball,midpoint);
        teleportWorldBattlePaddle(Math.max(30,ball.x-6),ball.y);
        startWorldQte();
        $("#world-battle-message").textContent="SMASH 2/3! The ball reaches the center line. Teleporting in for the final QTE.";
      }else{
        ball.x=midpoint;ball.vx=Math.min(Math.abs(ball.vx)*1.12,14);ball.aiSaveRate=.999;
        setWorldAiTarget(ball);
        const strikeX=Math.max(30,ball.x-6),strikeY=ball.y;
        teleportWorldBattlePaddle(strikeX,strikeY);
        const strikeEcho=worldBattle.playerEcho.segments[0];
        teleportWorldBattlePaddle(origin.x,origin.y);
        worldBattle.playerEcho.segments.unshift(strikeEcho);
        worldBattle.bossStack=0;worldBattle.bossComboOrigin=null;worldBattle.bossStage=0;
        $("#world-battle-message").textContent="FINAL SMASH! The ball is sent from the center line, and your paddle teleports back. The Pong Devil has a 0.1% miss chance.";
      }
    }else if(worldBattle.boss){
      worldBattle.bossStack++;
      worldBattle.ball.vx=Math.abs(worldBattle.ball.vx)*1.18;worldBattle.ball.vy*=1.18;
      const paddleHalf=worldBattlePaddleHeight("left")/2;
      worldBattle.teleport={from:worldBattle.left,to:Math.max(paddleHalf,Math.min(worldBattleCanvas.height-paddleHalf,worldBattle.ball.y)),elapsed:0,duration:14};
      if(worldBattle.ball.x<worldBattleCanvas.width/2)startWorldQte();
      else completeWorldBossStack();
    }else{
      const speed=Math.hypot(worldBattle.ball.vx,worldBattle.ball.vy);
      worldBattle.ball.vx*=Math.min(1.2,(speed+1.5)/speed);worldBattle.ball.vy*=Math.min(1.2,(speed+1.5)/speed);
      $("#world-battle-message").textContent="Perfect combo · temporary paddle boost and faster shot!";
    }
  }
  function completeWorldBossStack(){
    const stack=worldBattle.bossStack;
    if(stack>0)worldBattle.bossHealth--;
    worldBattle.qteTimer=0;worldBattle.bossStage=0;worldBattle.bossStack=0;$("#world-battle-qte").classList.add("hidden");
    $("#world-battle-message").textContent=stack>0
      ?`${stack} QTE${stack===1?"":"s"} stacked · BOSS HEALTH: ${worldBattle.bossHealth} / 3`
      :"The ball crossed the halfway line before a combo landed. No boss damage this volley.";
    if(worldBattle.bossHealth<=0){finishWorldBattle(true);return}
    worldBattle.ball.x=worldBattleCanvas.width/2;
    worldBattle.ball.vx=-Math.abs(worldBattle.ball.vx);
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
    const isPlayer=side==="left",paddleY=worldBattle[side],height=worldBattlePaddleHeight(side);
    if(ball.type==="fast"&&ball.powerOwner!==side){
      const speed=Math.hypot(ball.vx,ball.vy),base=ball.baseSpeed||speed/1.65;ball.vx*=base/speed;ball.vy*=base/speed;ball.type="normal";
    }
    if(ball.type==="slow"&&ball.powerOwner===side){
      const speed=Math.hypot(ball.vx,ball.vy),base=ball.baseSpeed||speed/.55;ball.vx*=base/speed;ball.vy*=base/speed;ball.type="normal";
    }
    const contact=(ball.y-paddleY)/(height/2);
    if(ball.type==="splitSlow"){
      const speed=ball.baseSpeed||Math.hypot(ball.vx,ball.vy);
      ball.type="normal";ball.powerOwner=null;ball.powerTimer=0;ball.vx=(isPlayer?1:-1)*speed;ball.vy+=(ball.y-paddleY)*.035+Math.sin(isPlayer?worldBattle.leftTilt:worldBattle.rightTilt)*.6;
    }else{
      ball.vx=(isPlayer?1:-1)*Math.abs(ball.vx)*1.045;
      ball.vy+=contact*.11+Math.sin(isPlayer?worldBattle.leftTilt:worldBattle.rightTilt)*.6;
    }
    if(worldBattle.superBoss&&!isPlayer){
      const speed=Math.hypot(ball.vx,ball.vy),launchSpeed=11.5+Math.random()*1.5;
      ball.vx*=launchSpeed/speed;ball.vy*=launchSpeed/speed;
      ball.devilShot=true;ball.devilWarpCount=0;
    }else if(isPlayer){
      delete ball.devilShot;delete ball.devilWarpCount;
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
      setWorldAiTarget(ball);
      for(const extra of worldBattle.extraBalls)if(extra.vx>0&&extra.aiTarget===undefined)setWorldAiTarget(extra);
      worldBattle.playerReturns++;
      if(worldBattle.superBoss){
        if(worldBattle.bossStack===0)worldBattle.bossComboOrigin={x:worldBattle.paddleX,y:worldBattle.left};
        startWorldQte();
      }else if(worldBattle.boss){worldBattle.bossStage=1;worldBattle.bossStack=0;startWorldQte()}
      else if(worldBattle.playerReturns%2===0)startWorldQte();
    }else{
      ball.aiTarget=null;
      delete ball.aiSaveRate;
    }
  }
  function awardWorldBattlePoint(missedSide){
    if(missedSide==="left")worldBattle.scoreRight++;else worldBattle.scoreLeft++;
    $("#world-score-left").textContent=worldBattle.scoreLeft;$("#world-score-right").textContent=worldBattle.scoreRight;
    const winningScore=worldBattle.superBoss?3:5;
    if(worldBattle.scoreLeft>=winningScore||worldBattle.scoreRight>=winningScore){
      finishWorldBattle(worldBattle.scoreLeft>worldBattle.scoreRight);return;
    }
    resetWorldBall(missedSide==="left"?1:-1);
  }
  function finishWorldBattle(won){
    if(worldBattle.superBoss)won=won&&worldBattle.scoreLeft>=3&&worldBattle.scoreLeft>worldBattle.scoreRight;
    worldBattle.running=false;
    if(won){
      world.wins++;const reward=(worldBattle.superBoss?100:worldBattle.boss?30:12)+(hasWorldCompanion("Wandering Ace")?5:0);world.tokens+=reward;world.xp+=worldBattle.superBoss?200:worldBattle.boss?60:30;
      if(worldBattle.guardIndex&&      worldBattle.site&&!world.defeatedGuards.includes(guardKey(worldBattle.site,worldBattle.guardIndex)))world.defeatedGuards.push(guardKey(worldBattle.site,worldBattle.guardIndex));
      else if(worldBattle.superBoss){
        world.superBossDefeated=true;
        world.superBossVictoryScore=worldBattle.scoreLeft;
        if(worldBattle.site&&!world.defeatedBosses.includes(worldBattle.site.id)){
          world.defeatedBosses.push(worldBattle.site.id);completeWorldArea(worldBattle.site,"The Pong Devil is defeated.");
        }
      }
      else if(worldBattle.boss&&worldBattle.site&&!world.defeatedBosses.includes(worldBattle.site.id)){
        world.defeatedBosses.push(worldBattle.site.id);completeWorldArea(worldBattle.site,"Dungeon boss defeated.");
      }
      $("#world-battle-message").textContent=`VICTORY! +${reward} tokens · ${worldBattle.superBoss?"Pong Devil defeated":worldBattle.guardIndex?"Boss defeated":worldBattle.boss?"dungeon boss defeated":"rival defeated"}.`;
      toast(`Match won · +${reward} tokens`);advanceWorldJob("sparring");
      if(worldBattle.site&&!worldBattle.boss&&worldBattle.site.type==="structure")completeWorldArea(worldBattle.site,"Rival match won.");
    }else $("#world-battle-message").textContent=worldBattle.guardIndex?"THE BOSS WINS. Regroup and challenge again.":"RIVAL WINS. Regroup and challenge another court.";
    $("#world-battle-start").textContent=won?"PLAY AGAIN":"REMATCH";$("#world-battle-start").disabled=false;
    saveWorld();updateWorldStats();updateWorldActions();drawWorld();
  }
  function openWorldBattle(site,boss=false,guardIndex=null,superBoss=false){
    worldBattle.active=true;worldBattle.running=false;worldBattle.scoreLeft=0;worldBattle.scoreRight=0;worldBattle.left=180;worldBattle.right=180;
    worldBattle.boss=boss;worldBattle.superBoss=superBoss;worldBattle.guardIndex=guardIndex;worldBattle.bossStage=0;worldBattle.bossStack=0;worldBattle.bossHealth=3;worldBattle.site=site||null;worldBattle.rallies=0;worldBattle.playerReturns=0;
    $("#world-hell-effects").classList.toggle("active",superBoss);
    $("#world-battle-title").textContent=superBoss?"THE PONG DEVIL":boss?`${site.name.toUpperCase()} · BOSS`:site?`${site.name.toUpperCase()} · 1V1`:"OPEN 1V1 CHALLENGE";
    $("#world-battle-message").textContent=superBoss?"The Pong Devil saves 99.99% of ordinary shots. Three QTE smashes move the ball to the center line; the final strike has a 0.1% miss chance. First to 3 points wins.":boss?"Stack QTEs before the halfway line to damage the boss. Each hit speeds up the ball and warps your paddle toward it.":"Move with W/S, tilt with A/D, and collect center-line powerups. Tilt lingers briefly after release; QTEs trigger every other player return.";
    $("#world-battle-start").textContent="START MATCH  ↗";$("#world-battle-start").disabled=false;
    $("#world-battle-overlay").classList.remove("hidden");$("#world-score-left").textContent="0";$("#world-score-right").textContent="0";
    resetWorldBall();drawWorldBattle();
  }
  $("#world-battle-start").addEventListener("click",()=>{
    const alreadyDefeated=worldBattle.site&&(worldBattle.boss
      ?worldBattle.guardIndex?world.defeatedGuards.includes(guardKey(worldBattle.site,worldBattle.guardIndex)):world.defeatedBosses.includes(worldBattle.site.id)
      :worldBattle.site.type==="structure"&&areaActivityComplete(worldBattle.site));
    if(alreadyDefeated){worldBattle.active=false;$("#world-battle-overlay").classList.add("hidden");drawWorld();return}
    worldBattle.scoreLeft=0;worldBattle.scoreRight=0;worldBattle.left=180;worldBattle.right=180;worldBattle.running=true;
    $("#world-score-left").textContent="0";$("#world-score-right").textContent="0";$("#world-battle-start").disabled=true;
    $("#world-battle-message").textContent=worldBattle.superBoss?"First to 3 points. Ordinary shots have a 0.01% miss chance; three consecutive QTE smashes raise it to 0.1% for the final strike.":worldBattle.boss?"Stack QTEs before the halfway line. The ball moves slowly while you enter each combo.":"First to 5 wins · QTEs trigger every other player return · A/D tilt lingers briefly.";
    resetWorldBall();
    if(hasWorldCompanion("Paddle Mechanic")){
      worldBattle.boosts.left=8;
      $("#world-battle-message").textContent+=" Your Mechanic tuned your paddle for an opening boost.";
    }
    drawWorldBattle();
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
      const h=worldBattleCanvas.height,w=worldBattleCanvas.width,slowDt=worldBattle.qteTimer>0?dt*.08:dt,paddleSpeed=5.2*slowDt*(!worldBattle.superBoss&&hasActiveWorldPotion("paddleSpeed")?1.5:1);
      worldBattle.depthPhase+=dt/60;
      if(worldBattle.depthEcho){
        worldBattle.depthEcho.timer-=dt/60;
        if(worldBattle.depthEcho.timer<=0)worldBattle.depthEcho=null;
      }
      if(worldBattle.playerEcho){
        worldBattle.playerEcho.timer-=dt/60;
        if(worldBattle.playerEcho.timer<=0)worldBattle.playerEcho=null;
      }
      if(worldBattle.teleport){
        const jump=worldBattle.teleport,progress=Math.min(1,(jump.elapsed+=dt)/jump.duration),eased=progress*progress*(3-2*progress);
        worldBattle.left=jump.from+(jump.to-jump.from)*eased;
        if(progress===1)worldBattle.teleport=null;
      }else if(worldBattle.qteTimer<=0){
        if(keys.has("w")||keys.has("arrowup"))worldBattle.left=Math.max(worldBattlePaddleHeight("left")/2,worldBattle.left-paddleSpeed);
        if(keys.has("s")||keys.has("arrowdown"))worldBattle.left=Math.min(h-worldBattlePaddleHeight("left")/2,worldBattle.left+paddleSpeed);
      }
      if(keys.has("a")){worldBattle.leftTilt=Math.PI/4;worldBattle.tiltAssistAngle=worldBattle.leftTilt;worldBattle.tiltAssistTimer=.45}
      else if(keys.has("d")){worldBattle.leftTilt=-Math.PI/4;worldBattle.tiltAssistAngle=worldBattle.leftTilt;worldBattle.tiltAssistTimer=.45}
      else if(worldBattle.tiltAssistTimer>0){worldBattle.tiltAssistTimer=Math.max(0,worldBattle.tiltAssistTimer-dt/60);worldBattle.leftTilt=worldBattle.tiltAssistAngle}
      else worldBattle.leftTilt=0;
      const incoming=allWorldBattleBalls().filter((ball)=>ball.vx>0).sort((a,b)=>a.x-b.x)[0];
      if(incoming&&incoming.aiTarget===undefined)setWorldAiTarget(incoming);
      const target=incoming&&Number.isFinite(incoming.aiTarget)?incoming.aiTarget:h/2;
      const rightHalf=worldBattlePaddleHeight("right")/2;
      const teleportStage=incoming?.aiTeleportCount||0;
      const teleportThresholds=[.24,.5,.74];
      if(worldBattle.superBoss&&incoming&&teleportStage<teleportThresholds.length&&incoming.x>w*teleportThresholds[teleportStage]){
        const decoyOffset=teleportStage===2?0:(teleportStage===0?1:-1)*60;
        const destination=Math.max(rightHalf,Math.min(h-rightHalf,target+decoyOffset));
        worldBattle.depthEcho={from:worldBattle.right,to:destination,timer:.5};
        worldBattle.right=destination;incoming.aiTeleportCount=teleportStage+1;
      }else{
        const aiSpeedMultiplier=!worldBattle.superBoss&&hasActiveWorldPotion("opponentSlow")?0.7:1;
        const aiSpeed=(worldBattle.guardIndex?8.5:6.5)*aiSpeedMultiplier;
        worldBattle.right+=Math.max(-aiSpeed,Math.min(aiSpeed,target-worldBattle.right))*slowDt;
      }
      worldBattle.right=Math.max(rightHalf,Math.min(h-rightHalf,worldBattle.right));
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
      for(const ball of allWorldBattleBalls())if(ball.warpEcho){
        ball.warpEcho.timer-=dt/60;
        if(ball.warpEcho.timer<=0)ball.warpEcho=null;
      }
      if(worldBattle.qteTimer>0){
        if(worldBattle.boss&&!worldBattle.superBoss&&worldBattle.bossStage===1){
          const ball=worldBattle.ball;
          ball.x+=ball.vx*dt*.08;ball.y+=ball.vy*dt*.08;
          if(ball.y<7||ball.y>h-7){ball.y=Math.max(7,Math.min(h-7,ball.y));ball.vy*=-1}
          if(ball.x>=w/2){ball.x=w/2;completeWorldBossStack()}
        }
        if(worldBattle.qteTimer>0){worldBattle.qteTimer-=dt/60;if(worldBattle.qteTimer<=0)completeWorldQte(false)}
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
          const warpStage=ball.realityWarpCount||0;
          const warpThresholds=[.34,.62];
          if(worldBattle.superBoss&&ball.vx>0&&typeof ball.aiSaves==="boolean"&&warpStage<warpThresholds.length&&ball.x>w*warpThresholds[warpStage]){
            const fromX=ball.x,fromY=ball.y,offset=(Math.random()<.5?-1:1)*(14+Math.random()*12);
            ball.x=Math.min(w-48,ball.x+18);
            ball.y=Math.max(7,Math.min(h-7,ball.y+offset));
            ball.vy=Math.max(-8,Math.min(8,ball.vy+Math.sign(offset)*.45));
            ball.warpEcho={x:fromX,y:fromY,timer:.28};ball.realityWarpCount=warpStage+1;
            updateWorldAiTarget(ball);
          }
          const devilWarpStage=ball.devilWarpCount||0;
          const devilWarpThresholds=[.68,.38];
          if(worldBattle.superBoss&&ball.devilShot&&ball.vx<0&&devilWarpStage<devilWarpThresholds.length&&ball.x<w*devilWarpThresholds[devilWarpStage]){
            const fromX=ball.x,fromY=ball.y,offset=(Math.random()<.5?-1:1)*(24+Math.random()*24);
            ball.x=Math.max(48,ball.x-18);
            ball.y=Math.max(7,Math.min(h-7,ball.y+offset));
            ball.vy=Math.max(-10,Math.min(10,ball.vy+Math.sign(offset)*1.1));
            ball.warpEcho={x:fromX,y:fromY,timer:.28};ball.devilWarpCount=devilWarpStage+1;
          }
          if(ball.vx<0&&ball.x<=36&&Math.abs(ball.y-worldBattle.left)<worldBattlePaddleHeight("left")/2+8){
            ball.x=36;hitWorldBattlePaddle(ball,"left");
          }
          if(ball.vx>0&&ball.x>=w-36){
            const catches=worldBattle.superBoss?ball.aiSaves:Math.abs(ball.y-worldBattle.right)<worldBattlePaddleHeight("right")/2+8;
            if(catches){ball.x=w-36;hitWorldBattlePaddle(ball,"right")}
          }
          if(worldBattle.orb&&Math.hypot(ball.x-worldBattle.orb.x,ball.y-worldBattle.orb.y)<=27){
            const type=worldBattle.orb.type,collector=worldBattle.lastHit,recipient=type==="slow"?(collector==="left"?"right":"left"):collector;
            worldBattle.orb=null;worldBattle.orbTimer=3+Math.random()*3;giveWorldBattlePower(recipient,type);
          }
          if(ball.x<0||ball.x>w){awardWorldBattlePoint(ball.x<0?"left":"right");break}
          const speed=Math.hypot(ball.vx,ball.vy),limit=worldBattle.boss?14:ball.type==="fast"||ball.type==="splitFast"?12:8.5;
          if(speed>limit){ball.vx*=limit/speed;ball.vy*=limit/speed}
          ball.vy=Math.max(-9,Math.min(9,ball.vy));
        }
      }
    }
    if(worldBattle.active)drawWorldBattle();
    requestAnimationFrame(worldBattleFrame);
  }
  requestAnimationFrame(worldBattleFrame);
  function challengeSuperBoss(){
    superBossCodeIndex=0;
    openWorldBattle(null,true,null,true);
    $("#world-battle-start").click();
  }
  function handleSuperBossCode(event){
    if(!$("#page-world").classList.contains("active")||worldBattle.active||activeActivity||event.target.matches("input,textarea")){
      superBossCodeIndex=0;return;
    }
    const key=event.code.startsWith("Arrow")?event.code:event.key;
    if(!superBossCode.includes(key)){superBossCodeIndex=0;return}
    superBossCodeIndex=key===superBossCode[superBossCodeIndex]
      ?superBossCodeIndex+1
      :key===superBossCode[0]?1:0;
    if(superBossCodeIndex>0){event.preventDefault();event.stopImmediatePropagation()}
    if(superBossCodeIndex===superBossCode.length){
      challengeSuperBoss();
    }
  }
  document.addEventListener("keydown",handleSuperBossCode);
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
    if(worldBattle.active&&["arrowup","arrowdown","w","s","a","d"].includes(key)){
      event.preventDefault();
      keys.add(key);
      if(key==="a"||key==="d"){worldBattle.tiltAssistAngle=key==="a"?Math.PI/4:-Math.PI/4;worldBattle.tiltAssistTimer=.45}
      return;
    }
    if(worldBattle.active)return;
    if(moves[key]){event.preventDefault();moveWorld(...moves[key])}
    if(key==="e")interactWorld();
    if(key===" ") {event.preventDefault();if(worldInterior)$("#world-battle").click();else openWorldBattle(null,false)}
  });
  drawWorld();
  updateWorldStats();
  updateWorldPotionTimers();
  window.setInterval(updateWorldPotionTimers,1000);
  if(!world.tutorialDone)$("#world-tutorial-start").click();
})();
