:root{
  --paper:#fffaf0; --ink:#1b2440; --muted:#5c6480; --line:#ebe3cf; --accent:#ff9f1c; --accent-d:#e68a00;
  --hi:#ffd98a; --card:#fff; --ok:#1f9d63; --bad:#d64545;
  --hand:'Caveat','Kalam',cursive; --sans:'Inter','Noto Sans Devanagari',system-ui,sans-serif;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;font-family:var(--sans);color:var(--ink);background:var(--paper);
  background-image:radial-gradient(#e3dac3 1px,transparent 1px);background-size:26px 26px;min-height:100vh;
  padding-bottom:env(safe-area-inset-bottom)}
[hidden]{display:none!important}
button{font:inherit;color:inherit;cursor:pointer}
.hand,.hero,.lesson-bar h2{font-family:var(--hand),'Kalam',cursive}
.hero mark{font-family:var(--hand),'Kalam',cursive}

/* header */
.top{display:flex;align-items:center;gap:18px;padding:14px clamp(16px,5vw,64px);position:sticky;top:0;z-index:20;
  background:rgba(255,250,240,.9);backdrop-filter:blur(8px)}
.logo{font-size:30px;font-weight:600;letter-spacing:-.5px;color:var(--ink);text-decoration:none;font-family:var(--sans)}
.logo span{background:linear-gradient(transparent 55%,var(--hi) 55%);padding:0 2px}
.nav{display:flex;gap:24px;margin-left:12px}
.nav a{color:var(--muted);text-decoration:none;font-weight:500}
.nav a:hover{color:var(--ink)}
.top-right{margin-left:auto;display:flex;align-items:center;gap:12px}
.user{display:flex;align-items:center;gap:10px}
.avatar{width:34px;height:34px;border-radius:50%;background:var(--accent);color:#fff;display:grid;place-items:center;font-weight:700;background-size:cover}
.pill{display:flex;align-items:center;gap:6px;padding:9px 14px;border:1px solid var(--line);background:#fff;border-radius:999px;font-weight:600}
.link{background:none;border:0;font-weight:600;padding:8px}
.link.small{font-size:14px;color:var(--muted)}
.btn{border:0;border-radius:999px;padding:12px 22px;font-weight:700;transition:transform .1s,background .15s}
.btn:active{transform:scale(.97)}
.btn.dark{background:var(--ink);color:#fff}
.btn.accent{background:var(--accent);color:#2a1a00}
.btn.accent:hover{background:var(--accent-d)}
.btn.accent:disabled{background:#ece4d0;color:#8f8a7a;cursor:not-allowed}
.btn.ghost{background:transparent;border:1.500px dashed var(--line);color:var(--muted)}
.btn.small{padding:9px 16px}
.btn.big{padding:15px 34px;font-size:18px}
.btn.wide{width:100%}

main{max-width:1060px;margin:0 auto;padding:0 clamp(16px,4vw,32px) 120px}
.view{padding-top:clamp(24px,6vw,56px)}

/* hero */
.hero{font-size:clamp(40px,7.500vw,84px);line-height:1.05;text-align:center;margin:0 0 18px;font-weight:700}
.hero mark{background:linear-gradient(transparent 52%,var(--hi) 52%);color:inherit;padding:0 .12em;display:inline-block}
.sub{text-align:center;color:var(--muted);font-size:clamp(16px,2.400vw,22px);line-height:1.55;max-width:760px;margin:0 auto 34px}

.tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;max-width:1040px;margin:0 auto 22px}
.tab{display:flex;align-items:center;gap:12px;padding:18px 22px;background:#fff;border:1px solid var(--line);border-radius:18px;font-weight:600;font-size:18px}
.tab.active{background:var(--hi);border-color:var(--ink);box-shadow:0 4px 0 var(--ink)}
.card{background:var(--card);border:1px solid var(--line);border-radius:22px;box-shadow:0 10px 30px rgba(27,36,64,.06);max-width:1040px;margin:0 auto}
.input-card{padding:22px 24px}
#prompt{width:100%;border:0;outline:0;resize:none;font:inherit;font-size:18px;line-height:1.5;background:transparent;color:var(--ink);min-height:84px}
#prompt::placeholder,#doubtInput::placeholder{color:#8e93a6}
.row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:10px}
.tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.tool{display:flex;align-items:center;gap:8px;background:none;border:0;font-weight:600;padding:9px 10px;border-radius:12px;font-size:15px}
.tool:hover{background:#f6f1e3}
.tool.select select{border:0;background:none;font:inherit;font-weight:600;cursor:pointer;color:var(--ink)}
.tool.mic.on{background:#ffe3e3;color:var(--bad)}
.tool.mic.on svg{animation:pulse 1s infinite}
@keyframes pulse{50%{transform:scale(1.25)}}
.chips{display:flex;gap:8px;flex-wrap:wrap}
.chip{display:flex;align-items:center;gap:8px;background:#f6f1e3;border-radius:999px;padding:6px 8px 6px 14px;font-size:14px;margin-bottom:6px;max-width:100%}
.chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px}
.chip button{border:0;background:#e5dcc4;border-radius:50%;width:22px;height:22px;line-height:1}
.urlbar{display:flex;gap:8px;margin-top:12px}
.urlbar input,.modal input,.doubt input{flex:1;border:1px solid var(--line);border-radius:14px;padding:13px 16px;font:inherit;background:#fff;color:var(--ink)}
.free{max-width:1040px;margin:12px auto 0;text-align:right;color:var(--muted);font-size:15px}

.ideas,.history{max-width:1040px;margin:26px auto 0}
.ideas-head{display:flex;justify-content:space-between;align-items:center;font-size:26px;margin-bottom:4px}
.ideas ul,.history ul{list-style:none;margin:0;padding:0}
.ideas li,.history li{display:flex;gap:30px;align-items:baseline;border-top:1px dashed #d9cfb5;padding:16px 8px;cursor:pointer;font-size:18px}
.ideas li:hover,.history li:hover{background:rgba(255,217,138,.25)}
.ideas li i,.history li i{font-family:var(--hand),'Kalam',cursive;font-style:normal;font-size:24px;color:var(--muted);min-width:120px}
.history li small{margin-left:auto;color:var(--muted)}

.info{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;max-width:1040px;margin:70px auto 0}
.step-card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:20px}
.step-card b{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:var(--accent);color:#2a1a00;font-size:18px;margin-bottom:10px}
.step-card p{margin:0;line-height:1.55;color:var(--muted)}
.faq{max-width:1040px;margin:40px auto 0}
.faq details{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 18px;margin-bottom:10px}
.faq summary{font-weight:600;cursor:pointer}
.faq p{color:var(--muted);margin:10px 0 0;line-height:1.5}

/* lesson */
.lesson-bar{display:flex;align-items:center;gap:14px}
.lesson-bar h2{margin:0;font-size:clamp(26px,4vw,38px);flex:1;line-height:1.1}
.steplabel{color:var(--muted);font-weight:600;white-space:nowrap}
.progress{height:6px;background:#ebe3cf;border-radius:9px;margin:10px 0 14px;overflow:hidden}
.progress i{display:block;height:100%;width:0;background:var(--accent);transition:width .4s}
.board-wrap{position:relative}
.board{background:#fff;background-image:linear-gradient(#f1ebdb 1px,transparent 1px),linear-gradient(90deg,#f1ebdb 1px,transparent 1px);background-size:32px 32px;
  border:2px solid var(--ink);border-radius:18px;height:min(62vh,640px);overflow-y:auto;padding:22px clamp(16px,3vw,34px);box-shadow:0 6px 0 var(--ink);scroll-behavior:smooth}
.loading{position:absolute;inset:0;border-radius:18px;background:rgba(255,255,255,.92);display:grid;place-content:center;justify-items:center;gap:8px;color:var(--muted)}
.scribble{stroke-dasharray:260;stroke-dashoffset:260;animation:scrib 1.400s ease-in-out infinite}
@keyframes scrib{60%,100%{stroke-dashoffset:0}}

.step{margin-bottom:34px;padding-bottom:26px;border-bottom:2px dashed #e3dac3;position:relative;padding-left:48px}
.step .num{position:absolute;left:0;top:2px;width:34px;height:34px;border-radius:50%;background:var(--accent);color:#2a1a00;display:grid;place-items:center;font-weight:700;font-family:var(--sans)}
.step h3{font-family:var(--hand),'Kalam',cursive;font-size:clamp(28px,4vw,38px);margin:0 0 8px;line-height:1.1;display:inline;background:linear-gradient(transparent 58%,var(--hi) 58%)}
.step ul{list-style:none;padding:0;margin:14px 0 0}
.step li{font-family:var(--hand),'Kalam',cursive;font-size:clamp(24px,3.400vw,32px);line-height:1.3;margin:4px 0;color:var(--ink);padding-left:22px;position:relative}
.step li::before{content:"✎";position:absolute;left:0;font-size:.6em;top:.4em;color:var(--accent)}
.diagram{width:100%;max-width:620px;display:block;margin:14px 0 0;background:#fffdf7;border:1.500px dashed #e3dac3;border-radius:12px}
.diagram text{font-family:var(--hand),'Kalam',cursive;font-size:20px}
.reveal{opacity:0;transform:translateY(6px);animation:rev .6s ease forwards}
@keyframes rev{to{opacity:1;transform:none}}
.step h3.reveal{display:inline-block}
.draw{stroke-dasharray:1;stroke-dashoffset:1;animation:draw .9s ease forwards}
@keyframes draw{to{stroke-dashoffset:0}}
.pop,.diagram text{opacity:0;animation:rev .6s ease forwards}
.static .reveal,.static .pop,.static .diagram text{animation:none;opacity:1;transform:none}
.static .draw{animation:none;stroke-dasharray:none;stroke-dashoffset:0}

.end h3{font-family:var(--hand),'Kalam',cursive;font-size:34px;margin:6px 0}
.quiz-q{background:#fffdf7;border:1.500px solid var(--line);border-radius:14px;padding:14px 16px;margin:12px 0}
.quiz-q p{margin:0 0 10px;font-weight:600;font-size:17px}
.quiz-q button{display:block;width:100%;text-align:left;background:#fff;border:1.500px solid var(--line);border-radius:12px;padding:10px 14px;margin:6px 0;font-size:16px}
.quiz-q button:hover{border-color:var(--ink)}
.quiz-q button.right{background:#e3f7ec;border-color:var(--ok)}
.quiz-q button.bad{background:#fde8e8;border-color:var(--bad)}
.quiz-q small{display:block;margin-top:6px;color:var(--muted);font-size:15px}
.sum li{font-size:clamp(22px,3vw,28px)}

.caption{min-height:52px;margin:14px 2px 6px;padding:10px 16px;border-radius:14px;background:#fff;border:1px solid var(--line);color:var(--muted);line-height:1.5;font-size:16px}
.controls{display:flex;gap:10px;justify-content:center;align-items:center;margin:12px 0;flex-wrap:wrap}
.ctl{display:grid;place-items:center;min-width:46px;height:46px;border-radius:50%;border:1.500px solid var(--line);background:#fff;padding:0}
.ctl:hover{border-color:var(--ink)}
.ctl.main{width:62px;height:62px;background:var(--ink);color:#fff;border-color:var(--ink)}
.ctl.txt{border-radius:999px;padding:0 16px;font-weight:700}
.ctl.on{background:#ffe3e3;color:var(--bad)}
.doubt{display:flex;gap:10px;align-items:center}

/* modal */
.overlay{position:fixed;inset:0;background:rgba(27,36,64,.45);z-index:50;display:grid;place-items:center;padding:16px;overflow:auto}
.modal{background:#fff;border-radius:26px;padding:30px 30px 24px;width:min(520px,100%);position:relative;display:grid;gap:12px}
.modal h2{margin:0;font-size:42px;line-height:1}
.modal .muted{margin:0 0 6px;color:var(--muted);font-size:18px}
.x{position:absolute;right:18px;top:14px;border:0;background:none;font-size:34px;line-height:1;color:var(--ink)}
.oauth{display:flex;justify-content:center;align-items:center;gap:12px;padding:16px;border-radius:999px;border:1.500px solid var(--line);background:#fff;font-weight:700;font-size:17px}
.oauth:hover{border-color:var(--ink)}
.or{display:flex;align-items:center;gap:14px;color:var(--muted)}
.or::before,.or::after{content:"";flex:1;height:1px;background:var(--line)}
.tiny{margin:0;text-align:center;color:var(--muted);font-size:13px;line-height:1.5}
.msg{margin:0;text-align:center;font-weight:600;color:var(--ok);min-height:0}
.msg.err{color:var(--bad)}

/* install + toast */
.install{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom));z-index:40;display:flex;gap:12px;align-items:center;
  background:var(--ink);color:#fff;border-radius:20px;padding:12px 14px;width:min(680px,calc(100% - 24px));box-shadow:0 12px 40px rgba(0,0,0,.3)}
.install img{border-radius:10px}
.install div{flex:1;display:grid;font-size:15px;line-height:1.35}
.install span{opacity:.75;font-size:13px}
.x2{background:none;border:0;color:#fff;font-size:26px;opacity:.7}
.toast{position:fixed;left:50%;transform:translateX(-50%);bottom:90px;background:#2a2f45;color:#fff;padding:12px 20px;border-radius:14px;z-index:60;max-width:calc(100% - 32px);text-align:center}

@media (max-width:760px){
  .nav{display:none}
  .top{gap:8px;padding:10px 14px}
  .logo{font-size:26px}
  .tabs{grid-template-columns:1fr;gap:10px}
  .tab{padding:14px 18px}
  .info{grid-template-columns:1fr}
  .btn.dark#startFreeBtn{padding:10px 16px}
  .ideas li{gap:14px;flex-direction:column;align-items:flex-start;gap:2px}
  .free{text-align:center}
  .board{height:56vh}
  .step{padding-left:0}
  .step .num{position:static;margin-bottom:8px}
  .row .big{width:100%}
  .modal{padding:26px 20px 20px}
  .install{bottom:calc(10px + env(safe-area-inset-bottom))}
}
@media (prefers-reduced-motion:reduce){*{animation-duration:.01s!important;scroll-behavior:auto!important}}

.voice{max-width:190px;height:46px;border-radius:999px;border:1.5px solid var(--line);background:#fff;padding:0 12px;font:inherit;font-size:14px;color:var(--ink)}
.voice[hidden]{display:none}
