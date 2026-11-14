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
    {title:"Movement & controls",short:"Find your feet",body:"Move your paddle with W and S. In a local match, the second player uses the up and down arrow keys. Small adjustments are usually better than chasing the ball."},
    {title:"The perfect return",short:"Meet the ball",body:"A return is more than a save. The point where the ball hits your paddle changes its angle: hit near the center for a steady shot, or near an edge to send it wide."},
    {title:"Paddle tilt",short:"Shape the angle",body:"Your paddle subtly tilts as it moves. Meet the ball while moving to add spin and shape a sharper return. Keep your movement deliberate and make the angle work for you."},
    {title:"Powerups",short:"Change the rally",body:"Tap Space to trigger a power serve when the ability is ready. With powerups enabled, it temporarily widens your paddle—save it for a difficult return."},
    {title:"Quick time events",short:"React on cue",body:"Watch for a QTE cue during high-pressure rallies. Hit the indicated key before the window closes to steady your return; the timing window tightens as rallies get longer."},
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

  let problem = {type:"prediction",landing:50,target:50,guard:"top",answer:"bottom",choice:null,streak:0,solved:0,totalAccuracy:0};
  function newProblem() {
    const startX=34+Math.random()*30,startY=15+Math.random()*70,velocityX=5,velocityY=(Math.random()-.5)*8;
    const time=(92-startX)*9/velocityX;
    const foldedY=(((startY*5+velocityY*time)%1000)+1000)%1000;
    problem.landing=(foldedY<=500?foldedY:1000-foldedY)/5;
    problem.target=10+Math.random()*77;
    problem.guard=Math.random()<.5?"top":"bottom";
    problem.answer=problem.guard==="top"?"bottom":"top";
    problem.choice=null;
    const ball=$("#problem-ball");
    ball.style.top=`${startY}%`;ball.style.left=`${startX}%`;
    ball.style.setProperty("--trajectory-angle",`${Math.atan2(velocityY*500,velocityX*900)*180/Math.PI}deg`);
    $("#prediction-range").value = 50;
    $("#prediction-marker").style.top = "50%";
    $("#timing-target").style.left=`${problem.target}%`;
    $("#opponent-paddle").style.top=problem.guard==="top"?"15%":"67%";
    $$(".strategy-option").forEach((option)=>option.classList.remove("selected"));
    $("#problem-result").textContent = "";
    $("#check-prediction").disabled = false;
    if(problem.type==="strategy")$("#problem-prompt").textContent=`The opponent is guarding ${problem.guard}. Choose the side they left open.`;
  }
  function setProblemType(type) {
    problem.type=type;
    const config={
      prediction:["Read the bounce","The ball is frozen mid-flight. Follow its angle and predict where it will reach your paddle.","LOCK IN PREDICTION  ↗"],
      timing:["Find your timing","The return window is brief. Lock in when the moving pulse crosses the target zone.","TIME YOUR RETURN  ↗"],
      strategy:["Find the open court",`The opponent is guarding ${problem.guard}. Choose the side they left open.`,"CHOOSE YOUR SHOT  ↗"]
    }[type];
    $("#problem-title").textContent=config[0];$("#problem-prompt").textContent=config[1];$("#check-prediction").textContent=config[2];
    $("#prediction-controls").classList.toggle("hidden",type!=="prediction");
    $(".timing-challenge").classList.toggle("hidden",type!=="timing");
    $(".strategy-challenge").classList.toggle("hidden",type!=="strategy");
    $$(".problem-type").forEach((button)=>button.classList.toggle("active",button.dataset.problemType===type));
    $("#problem-result").textContent="";$("#check-prediction").disabled=false;
  }
  $$(".problem-type").forEach((button)=>button.addEventListener("click",()=>{problem.type=button.dataset.problemType;newProblem();setProblemType(button.dataset.problemType)}));
  $("#prediction-range").addEventListener("input", (event) => $("#prediction-marker").style.top = `${event.target.value}%`);
  $$(".strategy-option").forEach((button)=>button.addEventListener("click",()=>{
    problem.choice=button.dataset.target;
    $$(".strategy-option").forEach((option)=>option.classList.toggle("selected",option===button));
  }));
  $("#new-problem").addEventListener("click", newProblem);
  $("#check-prediction").addEventListener("click", () => {
    let difference,accuracy,success;
    if(problem.type==="prediction"){
      difference=Math.abs(Number($("#prediction-range").value)-problem.landing);
      accuracy=Math.max(0,Math.round(100-difference*1.65));success=difference<10;
    }else if(problem.type==="timing"){
      const marker=$(".timing-marker").getBoundingClientRect(),track=$("#timing-track").getBoundingClientRect();
      const markerPosition=((marker.left+marker.width/2-track.left)/track.width)*100;
      difference=Math.abs(markerPosition-(problem.target+6.5));
      accuracy=Math.max(0,Math.round(100-difference*4));success=difference<8;
    }else{
      success=problem.choice===problem.answer;difference=success?0:55;accuracy=success?100:10;
    }
    problem.solved++;
    problem.totalAccuracy += accuracy;
    if (success) problem.streak++;
    else problem.streak = 0;
    $("#problem-streak").textContent = problem.streak;
    $("#problem-solved").textContent = problem.solved;
    $("#problem-accuracy").innerHTML = `${Math.round(problem.totalAccuracy/problem.solved)}<small>%</small>`;
    const feedback=problem.type==="prediction"?(success?"beautiful read!":"watch the angle off the wall."):problem.type==="timing"?(success?"perfect timing!":"wait for the pulse to enter the target."):success?"smart shot — you found the open side.":`the ${problem.answer} side was open.`;
    $("#problem-result").textContent = `${accuracy}% accurate — ${feedback}`;
    $("#problem-result").style.color = success ? "var(--green)" : "var(--orange)";
    $("#check-prediction").disabled = true;
    $("#prediction-marker").style.top = `${problem.landing}%`;
  });
  newProblem();

  const canvas = $("#pong-canvas");
  const ctx = canvas.getContext("2d");
  const game = {mode:"ai",running:false,left:250,right:250,tiltLeft:0,tiltRight:0,ballX:450,ballY:250,vx:5,vy:2.6,scoreLeft:0,scoreRight:0,paddleHeight:76,boost:0,last:0,pointsToWin:7,powerups:true,qteTimer:0,qteKey:"e",rallies:0};
  const keys = new Set();
  function resetBall(direction = Math.random() < .5 ? -1 : 1) {
    game.ballX = canvas.width/2; game.ballY = canvas.height/2;
    game.vx = direction * (4.6 + Math.random()*1.1); game.vy = (Math.random()-.5)*5.2;
    game.qteTimer=0;game.rallies=0;$("#qte-prompt").classList.remove("active");
  }
  function resetMatch() {
    game.scoreLeft=0; game.scoreRight=0; game.left=250; game.right=250; game.running=false; game.boost=0; game.qteTimer=0; game.rallies=0; $("#qte-prompt").classList.remove("active"); resetBall();
    $("#score-left").textContent="0"; $("#score-right").textContent="0"; $("#game-overlay").classList.remove("hidden"); $("#start-game").textContent="START MATCH  ↗"; drawPong();
  }
  function drawPong() {
    if (!ctx) return;
    const w=canvas.width,h=canvas.height;
    ctx.clearRect(0,0,w,h); ctx.fillStyle="#0b1119"; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle="#263241";ctx.setLineDash([6,10]);ctx.beginPath();ctx.moveTo(w/2,0);ctx.lineTo(w/2,h);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle="#80eddd";ctx.shadowColor="#7df2e3";ctx.shadowBlur=14;ctx.save();ctx.translate(28.5,game.left);ctx.rotate(game.tiltLeft);ctx.fillRect(-4.5,-game.paddleHeight/2,9,game.paddleHeight);ctx.restore();
    ctx.shadowColor="#ff9b72";ctx.fillStyle="#ff9b72";ctx.save();ctx.translate(w-28.5,game.right);ctx.rotate(game.tiltRight);ctx.fillRect(-4.5,-38,9,76);ctx.restore();
    ctx.shadowColor="#7df2e3";ctx.fillStyle="#d6fff8";ctx.beginPath();ctx.arc(game.ballX,game.ballY,7,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  }
  function finishPoint() {
    if (game.ballX < 0) game.scoreRight++; else game.scoreLeft++;
    $("#score-left").textContent=game.scoreLeft; $("#score-right").textContent=game.scoreRight;
    if (game.scoreLeft >= game.pointsToWin || game.scoreRight >= game.pointsToWin) {
      game.running=false; $("#game-overlay").classList.remove("hidden");
      $("#game-overlay .overlay-chip").textContent=game.scoreLeft>game.scoreRight?"MATCH WON":"MATCH OVER";
      $("#game-overlay strong").textContent=game.scoreLeft>game.scoreRight?"NICE PLAY.":"NEXT RALLY.";
      $("#start-game").textContent="PLAY AGAIN  ↗"; return;
    }
    resetBall(game.ballX<0?1:-1);
  }
  function gameFrame(time) {
    const dt=Math.min((time-game.last)/16.67||1,2.4); game.last=time;
    if (game.running && $("#page-onevone").classList.contains("active")) {
      const speed=5.8*dt;
      const previousLeft=game.left,previousRight=game.right;
      if (game.mode!=="arena"&&keys.has("w")) game.left=Math.max(game.paddleHeight/2,game.left-speed);
      if (game.mode!=="arena"&&keys.has("s")) game.left=Math.min(canvas.height-game.paddleHeight/2,game.left+speed);
      if (game.mode==="local") {
        if(keys.has("arrowup"))game.right=Math.max(game.paddleHeight/2,game.right-speed);
        if(keys.has("arrowdown"))game.right=Math.min(canvas.height-game.paddleHeight/2,game.right+speed);
      } else {
        const aiSpeed=game.mode==="arena"?4.4:3.7;
        const target=game.ballX>canvas.width*.45?game.ballY:canvas.height/2;
        game.right+=Math.max(-aiSpeed,Math.min(aiSpeed,target-game.right))*dt;
      }
      if(game.mode==="arena"){
        const target=game.ballX<canvas.width*.55?game.ballY:canvas.height/2;
        game.left+=Math.max(-4.4,Math.min(4.4,target-game.left))*dt;
      }
      game.tiltLeft=Math.max(-.12,Math.min(.12,(game.left-previousLeft)*.035));
      game.tiltRight=Math.max(-.12,Math.min(.12,(game.right-previousRight)*.035));
      if(game.boost>0){game.boost-=dt;game.paddleHeight=112}else game.paddleHeight=76;
      if(game.qteTimer>0){game.qteTimer-=dt;if(game.qteTimer<=0)$("#qte-prompt").classList.remove("active")}
      game.ballX+=game.vx*dt;game.ballY+=game.vy*dt;
      if(game.ballY<7||game.ballY>canvas.height-7)game.vy*=-1;
      const leftX=34,rightX=canvas.width-34;
      if(game.vx<0&&game.ballX<=leftX&&Math.abs(game.ballY-game.left)<game.paddleHeight/2+8){game.ballX=leftX;game.vx=Math.abs(game.vx)*1.045;game.vy+=(game.ballY-game.left)*.055+(keys.has("s")?-.28:keys.has("w")?.28:0);game.rallies++;if(game.mode!=="arena"&&game.qteTimer<=0&&game.rallies>=3&&Math.random()<.2){game.qteKey=Math.random()<.5?"e":"q";game.qteTimer=82;$("#qte-key").textContent=game.qteKey.toUpperCase();$("#qte-prompt").classList.add("active")}}
      if(game.vx>0&&game.ballX>=rightX&&Math.abs(game.ballY-game.right)<38+8){game.ballX=rightX;game.vx=-Math.abs(game.vx)*1.035;game.vy+=(game.ballY-game.right)*.045;game.rallies++}
      if(game.ballX<0||game.ballX>canvas.width)finishPoint();
      game.vx=Math.max(-9,Math.min(9,game.vx));game.vy=Math.max(-7,Math.min(7,game.vy));
    }
    drawPong();requestAnimationFrame(gameFrame);
  }
  requestAnimationFrame(gameFrame);
  function startMatch() {
    game.pointsToWin=Number($("#points-select").value);game.running=true;game.scoreLeft=0;game.scoreRight=0;game.paddleHeight=76;resetBall();$("#score-left").textContent="0";$("#score-right").textContent="0";$("#game-overlay").classList.add("hidden");$("#game-overlay .overlay-chip").textContent="READY WHEN YOU ARE";$("#game-overlay strong").textContent=`FIRST TO ${game.pointsToWin}`;
  }
  $("#start-game").addEventListener("click",startMatch);
  $("#reset-game").addEventListener("click",resetMatch);
  $("#points-select").addEventListener("change",()=>game.pointsToWin=Number($("#points-select").value));
  $("#power-toggle").addEventListener("click",function(){game.powerups=!game.powerups;this.classList.toggle("active",game.powerups);this.setAttribute("aria-pressed",String(game.powerups))});
  $$(".mode-tab").forEach((button)=>button.addEventListener("click",()=>{
    $$(".mode-tab").forEach((tab)=>tab.classList.toggle("selected",tab===button));
    game.mode=button.dataset.mode;
    const isLocal=game.mode==="local",isArena=game.mode==="arena";
    $("#left-player-label").textContent=isArena?"AI 01":"YOU";$("#right-player-label").textContent=isArena?"AI 02":isLocal?"PLAYER 2":"CPU";
    $("#control-opponent").textContent=isArena?"AI vs AI":isLocal?"Local player":"AI";
    $("#game-hint").textContent=isArena?"Watch two AIs go head-to-head":isLocal?"Player 2: arrow keys":"First to 7 wins the match";
    resetMatch();
  }));
  document.addEventListener("keydown",(event)=>{
    const key=event.key.toLowerCase();
    if(["arrowup","arrowdown"," "].includes(key)&&$("#page-onevone").classList.contains("active"))event.preventDefault();
    keys.add(key);
    if(key===" "&&$("#page-onevone").classList.contains("active")&&game.running&&game.powerups)game.boost=230;
    if(key===game.qteKey&&game.qteTimer>0&&$("#page-onevone").classList.contains("active")){
      game.qteTimer=0;game.boost=Math.max(game.boost,150);$("#qte-prompt").classList.remove("active");toast("Perfect timing — paddle boost!");
    }
    if(key==="e"&&$("#page-world").classList.contains("active"))interactWorld();
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
  window.setInterval(()=>{
    if(!evolution)return;
    const level=1+Math.floor(evolution.xp/100),reward=2+(evolution.upgrades.learning||0);
    const incentiveBoost=evolution.incentives.reduce((boost,id)=>boost+(["angles","patience","comeback"].includes(id)?0.012:0),0);
    const winChance=Math.min(.76,.25+level*.018+(evolution.upgrades.reaction||0)*.025+(evolution.upgrades.range||0)*.02+incentiveBoost);
    if(Math.random()<winChance){evolution.wins++;evolution.cash+=reward;evolution.xp+=4+(evolution.upgrades.learning||0)*2}
    else{evolution.losses++;evolution.cash+=Math.max(1,reward-1);evolution.xp+=2+(evolution.upgrades.learning||0)}
    renderEvolution();
  },4200);

  const world=(()=>{let state={x:8,y:6,tokens:0};try{const saved=JSON.parse(localStorage.getItem(WORLD_KEY)||"null");if(saved&&saved.format==="pong-world-save"&&saved.version===1)state={...state,...saved}}catch(error){console.error("Could not load Pong World save.",error)}
    return state;
  })();
  const worldCanvas=$("#world-canvas"),worldCtx=worldCanvas.getContext("2d");
  const tile=40,worldRows=12,worldCols=20,arcade={x:15,y:4},npc={x:5,y:8};
  function saveWorld(){localStorage.setItem(WORLD_KEY,JSON.stringify({format:"pong-world-save",version:1,x:world.x,y:world.y,tokens:world.tokens}))}
  function drawWorld(){
    const c=worldCtx;if(!c)return;
    c.clearRect(0,0,worldCanvas.width,worldCanvas.height);
    for(let y=0;y<worldRows;y++)for(let x=0;x<worldCols;x++){
      const isPath=(y>=5&&y<=7)||(x>=9&&x<=11);
      c.fillStyle=isPath?((x+y)%2?"#1b3034":"#1d3437"):((x+y)%2?"#15282a":"#172b2c");
      c.fillRect(x*tile,y*tile,tile,tile);
      c.strokeStyle="#23393a";c.strokeRect(x*tile,y*tile,tile,tile);
      if(!isPath&&(x*7+y*13)%11===0){c.fillStyle="#355448";c.beginPath();c.arc(x*tile+20,y*tile+20,7,0,Math.PI*2);c.fill();c.fillStyle="#6b976a";c.fillRect(x*tile+18,y*tile+10,4,8)}
    }
    c.fillStyle="#304648";c.fillRect(arcade.x*tile+4,arcade.y*tile+4,32,32);c.fillStyle="#15211e";c.fillRect(arcade.x*tile+8,arcade.y*tile+8,24,24);c.shadowColor="#a4f6b1";c.shadowBlur=14;c.fillStyle="#a4f6b1";c.fillRect(arcade.x*tile+14,arcade.y*tile+13,12,10);c.shadowBlur=0;c.fillStyle="#c9d5bd";c.fillRect(arcade.x*tile+14,arcade.y*tile+26,12,3);
    c.fillStyle="#b8a1ff";c.beginPath();c.arc(npc.x*tile+20,npc.y*tile+18,7,0,Math.PI*2);c.fill();c.fillStyle="#d5caff";c.fillRect(npc.x*tile+14,npc.y*tile+24,12,10);
    c.fillStyle="#7df2e3";c.shadowColor="#7df2e3";c.shadowBlur=13;c.beginPath();c.arc(world.x*tile+20,world.y*tile+18,8,0,Math.PI*2);c.fill();c.shadowBlur=0;c.fillStyle="#e7fffb";c.fillRect(world.x*tile+17,world.y*tile+25,6,9);
    $("#world-coordinates").textContent=`X: ${String(world.x).padStart(2,"0")} · Y: ${String(world.y).padStart(2,"0")}`;$("#world-tokens").textContent=world.tokens;
  }
  function moveWorld(dx,dy){
    const nextX=Math.max(0,Math.min(worldCols-1,world.x+dx)),nextY=Math.max(0,Math.min(worldRows-1,world.y+dy));
    if(nextX===world.x&&nextY===world.y)return;
    world.x=nextX;world.y=nextY;saveWorld();drawWorld();
    $("#world-message").textContent=Math.abs(world.x-arcade.x)+Math.abs(world.y-arcade.y)<=1?"Press E to play at the arcade.":"Find the glowing arcade to earn a token.";
  }
  function interactWorld(){
    if(Math.abs(world.x-arcade.x)+Math.abs(world.y-arcade.y)<=1){
      world.tokens++;saveWorld();$("#world-tokens").textContent=world.tokens;$("#world-message").textContent="You found a Pong token! The arcade is yours.";toast("Pong token collected.");return;
    }
    if(Math.abs(world.x-npc.x)+Math.abs(world.y-npc.y)<=1){$("#world-message").textContent="“Best rally wins. Fancy a match?” — local player";return}
    $("#world-message").textContent="Nothing nearby. Explore the paths and look for the glowing arcade.";
  }
  document.addEventListener("keydown",(event)=>{
    if(!$("#page-world").classList.contains("active")||event.target.matches("input,textarea,select"))return;
    const key=event.key.toLowerCase(),moves={w:[0,-1],arrowup:[0,-1],s:[0,1],arrowdown:[0,1],a:[-1,0],arrowleft:[-1,0],d:[1,0],arrowright:[1,0]};
    if(moves[key]){event.preventDefault();moveWorld(...moves[key])}
  });
  drawWorld();
})();
