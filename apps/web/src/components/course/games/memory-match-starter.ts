/** 内置初始版小游戏 HTML —— 首次进入课程时自动保存，可直接进「小游戏优化」 */
export const MEMORY_MATCH_STARTER_VERSION = 3;

export const MEMORY_MATCH_STARTER_HTML = `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>小侦探·记忆力挑战</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:system-ui,sans-serif;background:linear-gradient(160deg,#0f766e,#134e4a 55%,#115e59);color:#ecfdf5;padding:16px}
.wrap{max-width:720px;margin:0 auto}
h1{margin:0;font-size:clamp(1.4rem,4vw,1.9rem);text-align:center;color:#fef08a;text-shadow:0 2px 8px rgba(0,0,0,.25)}
.sub{margin:8px 0 16px;text-align:center;font-size:.95rem;color:#ccfbf1;font-weight:600}
.panel{background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.2);border-radius:20px;padding:16px;backdrop-filter:blur(4px)}
.bar{display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;margin-bottom:12px;font-size:.85rem;font-weight:700}
.tag{background:rgba(0,0,0,.25);padding:6px 10px;border-radius:999px}
.grid{display:grid;gap:10px;justify-content:center}
.card-wrap{position:relative;width:72px;height:88px;cursor:pointer}
.card{position:relative;width:100%;height:100%;border-radius:12px}
.face{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:12px;font-size:2rem;border:2px solid rgba(255,255,255,.35);box-shadow:0 4px 12px rgba(0,0,0,.2);transition:opacity .35s ease,transform .35s ease}
.back{background:linear-gradient(145deg,#155e75,#0e7490);color:#fff;font-size:1.8rem;opacity:1;z-index:2}
.front{background:#fff;color:#0f766e;opacity:0;z-index:1;transform:scale(.94)}
.card-wrap.flipped .back{opacity:0;z-index:1}
.card-wrap.flipped .front{opacity:1;z-index:2;transform:scale(1)}
.card-wrap.matched .front{background:#d1fae5;border-color:#34d399}
.card-wrap.disabled{pointer-events:none;opacity:.92}
.btn{display:inline-block;margin-top:14px;padding:12px 20px;border:none;border-radius:14px;background:#fbbf24;color:#78350f;font-weight:800;font-size:1rem;cursor:pointer}
.btn:hover{filter:brightness(1.05)}
.btn-ghost{background:rgba(255,255,255,.15);color:#fff;border:2px solid rgba(255,255,255,.35)}
input{padding:10px 14px;border-radius:12px;border:2px solid rgba(255,255,255,.35);background:rgba(255,255,255,.9);font-size:1rem;width:min(100%,240px)}
.msg{text-align:center;margin-top:12px;font-weight:700;color:#fde68a;min-height:1.4em}
.leaderboard{width:100%;border-collapse:collapse;margin-top:12px;font-size:.9rem}
.leaderboard th,.leaderboard td{padding:8px;border-bottom:1px solid rgba(255,255,255,.15);text-align:left}
.leaderboard tr.highlight{background:rgba(251,191,36,.25)}
.hidden{display:none!important}
</style>
</head>
<body>
<div class="wrap">
  <h1>🕵️ 小侦探·记忆力挑战</h1>
  <p class="sub">翻开线索卡，找出相同的侦探Emoji！</p>
  <div id="screen-start" class="panel" style="text-align:center">
    <p style="margin:0 0 10px">输入你的侦探昵称，开始挑战两关！</p>
    <input id="nickname" placeholder="侦探昵称" maxlength="12">
    <div><button class="btn" id="btn-start">开始挑战</button></div>
  </div>
  <div id="screen-game" class="panel hidden">
    <div class="bar">
      <span class="tag" id="level-name">第一关｜见习侦探</span>
      <span class="tag" id="timer">⏱️ 0.0s</span>
      <span class="tag" id="flips">🃏 翻牌 0 次</span>
      <span class="tag" id="progress">✅ 0 / 0</span>
    </div>
    <div class="grid" id="grid"></div>
    <div class="msg" id="msg"></div>
    <div id="level-actions" class="hidden" style="text-align:center">
      <button class="btn" id="btn-next">进入下一关</button>
      <button class="btn btn-ghost hidden" id="btn-retry">重新挑战本关</button>
    </div>
  </div>
  <div id="screen-result" class="panel hidden" style="text-align:center">
    <h2 style="margin:0 0 8px;color:#fde68a">侦探记忆力排行榜</h2>
    <p style="margin:0 0 12px;font-size:.9rem">翻牌次数越少、完成时间越短，排名越高。</p>
    <div id="summary"></div>
    <table class="leaderboard"><thead><tr><th>排名</th><th>侦探</th><th>翻牌</th><th>用时</th><th>综合分</th></tr></thead><tbody id="lb-body"></tbody></table>
    <button class="btn" id="btn-again" style="margin-top:16px">再玩一次</button>
  </div>
</div>
<script>
const EMOJIS=['🔍','🗝️','👣','🔦','📷','🧤','🔒','🧩'];
const LEVELS=[{name:'第一关｜见习侦探',cards:8},{name:'第二关｜线索侦探',cards:12}];
const LB_KEY='memoryMatchLeaderboard';
let nickname='无名侦探',levelIdx=0,deck=[],open=[],lock=false,flips=0,matched=0,t0=0,timerId=null;
let stats=[{flips:0,time:0},{flips:0,time:0}];
const $=id=>document.getElementById(id);
function show(id){['screen-start','screen-game','screen-result'].forEach(s=>$(s).classList.toggle('hidden',s!==id));}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function buildDeck(n){const pairs=n/2;const pool=EMOJIS.slice(0,Math.min(pairs,EMOJIS.length));while(pool.length<pairs){pool.push(EMOJIS[pool.length%EMOJIS.length]);}const d=[];for(let i=0;i<pairs;i++){d.push(pool[i],pool[i]);}return shuffle(d);}
function cols(n){if(n<=8)return 4;if(n<=12)return 4;return 4;}
function stopTimer(){if(timerId){clearInterval(timerId);timerId=null;}}
function startTimer(){stopTimer();t0=Date.now();timerId=setInterval(()=>{$('timer').textContent='⏱️ '+((Date.now()-t0)/1000).toFixed(1)+'s';},100);}
function renderLevel(){
  const lv=LEVELS[levelIdx];matched=0;flips=0;open=[];lock=false;
  $('level-name').textContent=lv.name;
  $('flips').textContent='🃏 翻牌 0 次';
  $('progress').textContent='✅ 0 / '+(lv.cards/2);
  $('msg').textContent='';
  $('level-actions').classList.add('hidden');
  $('btn-retry').classList.add('hidden');
  deck=buildDeck(lv.cards);
  const grid=$('grid');grid.style.gridTemplateColumns='repeat('+cols(lv.cards)+',72px)';grid.innerHTML='';
  deck.forEach((emoji,i)=>{
    const w=document.createElement('div');w.className='card-wrap';
    w.innerHTML='<div class="card" data-i="'+i+'"><div class="face back">❓</div><div class="face front">'+emoji+'</div></div>';
    w.onclick=()=>flip(i,w);
    grid.appendChild(w);
  });
  stopTimer();$('timer').textContent='⏱️ 0.0s';
}
function flip(i,wrap){
  if(lock||wrap.classList.contains('flipped')||wrap.classList.contains('matched'))return;
  if(!timerId&&flips===0&&open.length===0)startTimer();
  wrap.classList.add('flipped');flips++;open.push({i,wrap});
  $('flips').textContent='🃏 翻牌 '+flips+' 次';
  if(open.length<2)return;
  lock=true;
  const[a,b]=open;
  if(deck[a.i]===deck[b.i]){
    setTimeout(()=>{
      a.wrap.classList.add('matched','disabled');
      b.wrap.classList.add('matched','disabled');
      matched++;open=[];lock=false;
      $('progress').textContent='✅ '+matched+' / '+(LEVELS[levelIdx].cards/2);
      if(matched===LEVELS[levelIdx].cards/2)finishLevel();
    },350);
  }else{
    setTimeout(()=>{
      a.wrap.classList.remove('flipped');
      b.wrap.classList.remove('flipped');
      open=[];lock=false;
    },800);
  }
}
function finishLevel(){
  stopTimer();
  const sec=((Date.now()-t0)/1000).toFixed(1);
  stats[levelIdx]={flips,time:parseFloat(sec)};
  $('msg').textContent='本关完成！翻牌 '+flips+' 次，用时 '+sec+' 秒';
  $('level-actions').classList.remove('hidden');
  $('btn-next').textContent=levelIdx<LEVELS.length-1?'进入下一关':'查看侦探成绩';
}
function saveScore(totalFlips,totalTime){
  const score=Math.round(totalFlips*2+totalTime);
  const list=JSON.parse(localStorage.getItem(LB_KEY)||'[]');
  const row={name:nickname,flips:totalFlips,time:totalTime,score,at:Date.now()};
  list.push(row);list.sort((a,b)=>a.score-b.score);
  localStorage.setItem(LB_KEY,JSON.stringify(list.slice(0,50)));
  return {row,list:list.slice(0,10)};
}
function showResult(){
  const tf=stats.reduce((s,x)=>s+x.flips,0);
  const tt=stats.reduce((s,x)=>s+x.time,0);
  const {row,list}=saveScore(tf,tt);
  $('summary').innerHTML='<p><b>'+nickname+'</b> 总翻牌 '+tf+' 次 · 总用时 '+tt.toFixed(1)+' 秒 · 综合分 '+row.score+'</p>';
  const medals=['🥇','🥈','🥉'];
  $('lb-body').innerHTML=list.map((r,i)=>{
    const hi=r.at===row.at;
    return '<tr class="'+(hi?'highlight':'')+'"><td>'+(medals[i]||(i+1))+ '</td><td>'+r.name+(hi?' · 你':'')+'</td><td>'+r.flips+'</td><td>'+r.time.toFixed(1)+'s</td><td>'+r.score+'</td></tr>';
  }).join('');
  show('screen-result');
}
$('btn-start').onclick=()=>{
  nickname=($('nickname').value||'').trim()||'无名侦探';
  levelIdx=0;stats=LEVELS.map(()=>({flips:0,time:0}));
  show('screen-game');renderLevel();
};
$('btn-next').onclick=()=>{
  if(levelIdx<LEVELS.length-1){levelIdx++;renderLevel();}
  else showResult();
};
$('btn-retry').onclick=()=>renderLevel();
$('btn-again').onclick=()=>{show('screen-start');};
</script>
</body>
</html>`;
