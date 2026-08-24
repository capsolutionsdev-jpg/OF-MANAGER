// Styles de la vitrine OFManager (charte « .ofm-v2 »), partagés par la landing
// (app/page.tsx) et la page /fonctionnalites. Scopés sous .ofm-v2 → aucune
// collision avec Tailwind/l'app. Injectés via <style dangerouslySetInnerHTML>.

export const OFM_CSS = `
.ofm-v2{
  --navy:#0D1B3E;--navy-2:#12245a;--navy-deep:#070f28;--ink:#0f1729;
  --primary:#3B6EF5;--primary-d:#2954d4;--amber:#E8A33D;--amber-d:#c9832a;
  --green:#12B886;--paper:#F5F8FD;--white:#ffffff;--line:#E3E9F4;--muted:#5b6b86;
  --shadow:0 20px 50px -24px rgba(13,27,62,.35);
  --shadow-sm:0 8px 24px -14px rgba(13,27,62,.30);
  --r:16px;
  font-family:var(--font-inter),system-ui,sans-serif;
  color:var(--ink);background:var(--white);line-height:1.6;-webkit-font-smoothing:antialiased;
}
.ofm-v2 *{box-sizing:border-box}
.ofm-v2 h1,.ofm-v2 h2,.ofm-v2 h3,.ofm-v2 h4{font-family:var(--font-sora),sans-serif;line-height:1.12;margin:0;letter-spacing:-.02em}
.ofm-v2 a{color:inherit;text-decoration:none}
.ofm-v2 img{max-width:100%;display:block}
.ofm-v2 .wrap{max-width:1140px;margin:0 auto;padding:0 22px}
.ofm-v2 .eyebrow{font-family:var(--font-sora);font-size:.74rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--primary)}
.ofm-v2 .btn{display:inline-flex;align-items:center;gap:.5rem;font-family:var(--font-sora);font-weight:600;font-size:.96rem;padding:.85rem 1.4rem;border-radius:12px;border:1px solid transparent;cursor:pointer;transition:.18s ease;white-space:nowrap}
.ofm-v2 .btn-primary{background:var(--primary);color:#fff;box-shadow:0 10px 24px -12px rgba(59,110,245,.75)}
.ofm-v2 .btn-primary:hover{background:var(--primary-d);transform:translateY(-1px)}
.ofm-v2 .btn-ghost{background:transparent;color:var(--navy);border-color:var(--line)}
.ofm-v2 .btn-ghost:hover{border-color:var(--primary);color:var(--primary)}

/* ---------- HEADER ---------- */
.ofm-v2 header{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.86);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.ofm-v2 .nav{display:flex;align-items:center;justify-content:space-between;height:68px}
.ofm-v2 .logo{display:flex;align-items:center;gap:.6rem}
.ofm-v2 .nav-links{display:flex;gap:1.6rem;font-size:.92rem;font-weight:500;color:#33415c}
.ofm-v2 .nav-links a:hover{color:var(--primary)}
.ofm-v2 .nav-cta{display:flex;align-items:center;gap:.7rem}
.ofm-v2 .nav-cta .login{font-size:.92rem;font-weight:600;color:var(--navy)}
@media(max-width:900px){.ofm-v2 .nav-links{display:none}.ofm-v2 .nav-cta .login{display:none}}

/* ---------- HERO ---------- */
.ofm-v2 .hero{background:radial-gradient(1200px 500px at 78% -10%,rgba(59,110,245,.16),transparent 60%),radial-gradient(900px 500px at 8% 120%,rgba(232,163,61,.12),transparent 55%),linear-gradient(180deg,#fff,#fff 60%,var(--paper));padding:clamp(48px,7vw,86px) 0 64px}
.ofm-v2 .hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:52px;align-items:center}
@media(max-width:940px){.ofm-v2 .hero-grid{grid-template-columns:1fr;gap:38px}}
.ofm-v2 .hero .tag{display:inline-flex;gap:.5rem;align-items:center;background:#fff;border:1px solid var(--line);border-radius:999px;padding:.4rem .9rem;font-size:.78rem;font-weight:600;color:var(--navy);box-shadow:var(--shadow-sm)}
.ofm-v2 .hero .tag b{color:var(--amber-d)}
.ofm-v2 h1{font-size:clamp(2.1rem,4.6vw,3.35rem);font-weight:800;color:var(--navy);margin:1.1rem 0}
.ofm-v2 h1 .hl{background:linear-gradient(120deg,var(--primary),var(--amber));-webkit-background-clip:text;background-clip:text;color:transparent}
.ofm-v2 .hero p.lead{font-size:1.12rem;color:#3a4a66;max-width:560px}
.ofm-v2 .hero-cta{display:flex;gap:.8rem;flex-wrap:wrap;margin:1.7rem 0 1.3rem}
.ofm-v2 .trust-strip{display:flex;gap:1.4rem;flex-wrap:wrap;font-size:.86rem;color:#43536f;font-weight:500}
.ofm-v2 .trust-strip span{display:flex;align-items:center;gap:.45rem}
.ofm-v2 .trust-strip .dot{width:8px;height:8px;border-radius:50%;background:var(--green)}

/* hero mockup */
.ofm-v2 .mock{background:var(--navy);border-radius:20px;padding:16px;box-shadow:var(--shadow);position:relative;overflow:hidden}
.ofm-v2 .mock:before{content:"";position:absolute;inset:0;background:radial-gradient(600px 200px at 80% 0,rgba(59,110,245,.35),transparent 60%)}
.ofm-v2 .mock-head{display:flex;justify-content:space-between;align-items:center;color:#c7d3ef;font-size:.78rem;position:relative;margin-bottom:12px}
.ofm-v2 .mock-dots{display:flex;gap:6px}
.ofm-v2 .mock-dots i{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.22)}
.ofm-v2 .mock-card{background:#fff;border-radius:13px;padding:16px;position:relative}
.ofm-v2 .kpi-row{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}
.ofm-v2 .kpi{background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:11px 12px}
.ofm-v2 .kpi .n{font-family:var(--font-sora);font-weight:700;font-size:1.35rem;color:var(--navy);line-height:1}
.ofm-v2 .kpi .l{font-size:.68rem;color:var(--muted);margin-top:3px}
.ofm-v2 .kpi.green .n{color:var(--green)}
.ofm-v2 .row-item{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid var(--line);font-size:.82rem}
.ofm-v2 .av{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;font-size:.7rem;font-weight:700;color:#fff}
.ofm-v2 .pill{margin-left:auto;font-size:.68rem;font-weight:700;padding:.2rem .55rem;border-radius:999px}
.ofm-v2 .pill.b{background:#e7efff;color:var(--primary-d)}
.ofm-v2 .pill.a{background:#fdf1dd;color:var(--amber-d)}
.ofm-v2 .pill.g{background:#e2f7ee;color:#0c8f66}

/* ---------- STAT BAND ---------- */
.ofm-v2 .band{background:var(--navy);color:#fff;padding:34px 0}
.ofm-v2 .band-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;text-align:center}
@media(max-width:760px){.ofm-v2 .band-grid{grid-template-columns:repeat(2,1fr);gap:26px}}
.ofm-v2 .band .n{font-family:var(--font-sora);font-weight:800;font-size:2rem;background:linear-gradient(120deg,#fff,var(--primary));-webkit-background-clip:text;background-clip:text;color:transparent}
.ofm-v2 .band .l{font-size:.85rem;color:#aab8d8;margin-top:2px}
.ofm-v2 .band small{display:block;text-align:center;color:#7f8cad;font-size:.72rem;margin-top:22px}

/* ---------- SECTIONS ---------- */
.ofm-v2 section.blk{padding:clamp(56px,7vw,92px) 0}
.ofm-v2 .center{text-align:center;max-width:720px;margin:0 auto 44px}
.ofm-v2 h2{font-size:clamp(1.7rem,3.2vw,2.35rem);font-weight:700;color:var(--navy)}
.ofm-v2 .center p{color:var(--muted);font-size:1.05rem;margin-top:.7rem}

/* problem / solution */
.ofm-v2 .ps{display:grid;grid-template-columns:1fr 1fr;gap:22px}
@media(max-width:820px){.ofm-v2 .ps{grid-template-columns:1fr}}
.ofm-v2 .ps-col{border-radius:var(--r);padding:26px;border:1px solid var(--line)}
.ofm-v2 .ps-col.bad{background:#fff}
.ofm-v2 .ps-col.good{background:linear-gradient(180deg,#0d1b3e,#12245a);color:#fff;border:none}
.ofm-v2 .ps-col h3{font-size:1.05rem;margin-bottom:14px;display:flex;align-items:center;gap:.5rem}
.ofm-v2 .ps-col ul{list-style:none;padding:0;margin:0}
.ofm-v2 .ps-col li{display:flex;gap:.6rem;padding:.42rem 0;font-size:.94rem}
.ofm-v2 .ps-col.bad li:before{content:"✕";color:#d64b4b;font-weight:700}
.ofm-v2 .ps-col.good li:before{content:"✓";color:var(--green);font-weight:700}
.ofm-v2 .ps-col.good li{color:#dfe6f6}

/* MÉTIERS (dual) */
.ofm-v2 .metiers{display:grid;grid-template-columns:1fr 1fr;gap:22px}
@media(max-width:820px){.ofm-v2 .metiers{grid-template-columns:1fr}}
.ofm-v2 .metier{border-radius:var(--r);padding:30px;border:1px solid var(--line);background:#fff;position:relative;overflow:hidden}
.ofm-v2 .metier:before{content:"";position:absolute;top:0;left:0;right:0;height:5px}
.ofm-v2 .metier.sec:before{background:linear-gradient(90deg,var(--primary),#6f9bff)}
.ofm-v2 .metier.vtc:before{background:linear-gradient(90deg,var(--amber),#f4c778)}
.ofm-v2 .metier .ic{width:52px;height:52px;border-radius:13px;display:grid;place-items:center;font-size:1.5rem;margin-bottom:14px}
.ofm-v2 .metier.sec .ic{background:#e9f0ff}
.ofm-v2 .metier.vtc .ic{background:#fdf3e2}
.ofm-v2 .metier h3{font-size:1.28rem;color:var(--navy)}
.ofm-v2 .metier .sub{font-size:.83rem;font-weight:600;letter-spacing:.02em;margin:.15rem 0 .9rem}
.ofm-v2 .metier.sec .sub{color:var(--primary-d)}
.ofm-v2 .metier.vtc .sub{color:var(--amber-d)}
.ofm-v2 .metier ul{list-style:none;padding:0;margin:.4rem 0 0}
.ofm-v2 .metier li{display:flex;gap:.55rem;padding:.4rem 0;font-size:.92rem;color:#33415c;border-top:1px dashed var(--line)}
.ofm-v2 .metier li:first-child{border-top:none}
.ofm-v2 .metier li b{color:var(--navy)}
.ofm-v2 .chk{color:var(--green);font-weight:700;flex:none}

/* features grid */
.ofm-v2 .feat{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
@media(max-width:820px){.ofm-v2 .feat{grid-template-columns:1fr 1fr}}
@media(max-width:520px){.ofm-v2 .feat{grid-template-columns:1fr}}
.ofm-v2 .fcard{background:#fff;border:1px solid var(--line);border-radius:14px;padding:22px;transition:.18s}
.ofm-v2 .fcard:hover{transform:translateY(-3px);box-shadow:var(--shadow-sm);border-color:#cfd9ef}
.ofm-v2 .fcard .fi{width:44px;height:44px;border-radius:11px;background:linear-gradient(135deg,var(--navy),var(--primary));display:grid;place-items:center;color:#fff;font-size:1.2rem;margin-bottom:12px}
.ofm-v2 .fcard h3{font-size:1.05rem;color:var(--navy);margin-bottom:6px}
.ofm-v2 .fcard p{font-size:.9rem;color:var(--muted);margin:0}
.ofm-v2 .fcard ul{list-style:none;padding:12px 0 0;margin:12px 0 0;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:7px}
.ofm-v2 .fcard li{display:flex;gap:.5rem;font-size:.82rem;color:var(--ink);line-height:1.45}
.ofm-v2 .fcard li .chk{color:var(--green);font-weight:700;flex:none}
.ofm-v2 .also{margin-top:30px;text-align:center}
.ofm-v2 .also .lbl{font-family:var(--font-sora);font-size:.72rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:13px}
.ofm-v2 .chips{display:flex;flex-wrap:wrap;gap:9px;justify-content:center;max-width:840px;margin:0 auto}
.ofm-v2 .chips span{font-size:.8rem;background:#fff;border:1px solid var(--line);color:var(--navy);padding:.42rem .82rem;border-radius:999px;transition:.16s}
.ofm-v2 .chips span:hover{border-color:#cfd9ef;box-shadow:var(--shadow-sm)}

/* QUALIOPI (signature) */
.ofm-v2 .qua{background:linear-gradient(160deg,var(--navy-deep),var(--navy) 55%,var(--navy-2));color:#fff;border-radius:24px;padding:clamp(30px,4vw,52px);position:relative;overflow:hidden}
.ofm-v2 .qua:before{content:"";position:absolute;right:-80px;top:-80px;width:340px;height:340px;border-radius:50%;background:radial-gradient(circle,rgba(59,110,245,.35),transparent 65%)}
.ofm-v2 .qua-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center;position:relative}
@media(max-width:860px){.ofm-v2 .qua-grid{grid-template-columns:1fr;gap:30px}}
.ofm-v2 .qua h2{color:#fff;font-size:clamp(1.6rem,3vw,2.2rem)}
.ofm-v2 .qua .badge{display:inline-flex;align-items:center;gap:.5rem;background:rgba(18,184,134,.16);color:#4ee0ac;border:1px solid rgba(18,184,134,.35);border-radius:999px;padding:.4rem .9rem;font-size:.78rem;font-weight:700;margin-bottom:1rem}
.ofm-v2 .qua ul{list-style:none;padding:0;margin:1.3rem 0 0}
.ofm-v2 .qua li{display:flex;gap:.7rem;padding:.55rem 0;font-size:.96rem;color:#d9e2f6}
.ofm-v2 .qua li b{color:#fff;display:block}
.ofm-v2 .qua li .chk{color:#4ee0ac}
.ofm-v2 .ring{width:100%;aspect-ratio:1;max-width:280px;margin:0 auto;position:relative;display:grid;place-items:center}
.ofm-v2 .ring svg{width:100%;transform:rotate(-90deg)}
.ofm-v2 .ring .ctr{position:absolute;text-align:center}
.ofm-v2 .ring .ctr .p{font-family:var(--font-sora);font-weight:800;font-size:2.6rem;line-height:1}
.ofm-v2 .ring .ctr .t{font-size:.72rem;color:#9fb0d6;letter-spacing:.08em;text-transform:uppercase}
.ofm-v2 .crits{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:18px}
.ofm-v2 .crits span{font-size:.68rem;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);color:#cdd9f2;padding:.28rem .6rem;border-radius:999px}

/* RGPD */
.ofm-v2 .rgpd{display:grid;grid-template-columns:.85fr 1.15fr;gap:40px;align-items:center}
@media(max-width:860px){.ofm-v2 .rgpd{grid-template-columns:1fr}}
.ofm-v2 .rgpd-shield{background:linear-gradient(160deg,#0d1b3e,#1a2f66);border-radius:20px;padding:34px;color:#fff;text-align:center;box-shadow:var(--shadow)}
.ofm-v2 .rgpd-shield .lock{font-size:2.6rem}
.ofm-v2 .rgpd-shield .big{font-family:var(--font-sora);font-weight:800;font-size:1.5rem;margin:.4rem 0}
.ofm-v2 .rgpd-shield p{color:#b9c6e6;font-size:.86rem;margin:0}
.ofm-v2 .rgpd-list{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:520px){.ofm-v2 .rgpd-list{grid-template-columns:1fr}}
.ofm-v2 .rgpd-item{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px}
.ofm-v2 .rgpd-item .h{font-family:var(--font-sora);font-weight:600;font-size:.96rem;color:var(--navy);display:flex;gap:.5rem;align-items:center;margin-bottom:4px}
.ofm-v2 .rgpd-item p{font-size:.84rem;color:var(--muted);margin:0}
.ofm-v2 .rgpd-item .chk{color:var(--green)}

/* hosting */
.ofm-v2 .host{display:grid;grid-template-columns:1fr 1fr;gap:22px}
@media(max-width:760px){.ofm-v2 .host{grid-template-columns:1fr}}
.ofm-v2 .host-card{border:1px solid var(--line);border-radius:var(--r);padding:28px;background:#fff}
.ofm-v2 .host-card.reco{border-color:var(--primary);box-shadow:0 0 0 3px rgba(59,110,245,.1)}
.ofm-v2 .host-card .tagt{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
.ofm-v2 .host-card.reco .tagt{color:var(--primary)}
.ofm-v2 .host-card.own .tagt{color:var(--amber-d)}
.ofm-v2 .host-card h3{font-size:1.2rem;color:var(--navy);margin:.35rem 0 .6rem}
.ofm-v2 .host-card ul{list-style:none;padding:0;margin:0}
.ofm-v2 .host-card li{display:flex;gap:.55rem;font-size:.9rem;padding:.35rem 0;color:#33415c}

/* pricing */
.ofm-v2 .pricing{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;align-items:start}
@media(max-width:820px){.ofm-v2 .pricing{grid-template-columns:1fr;max-width:420px;margin:0 auto}}
.ofm-v2 .price{border:1px solid var(--line);border-radius:18px;padding:28px;background:#fff;position:relative}
.ofm-v2 .price.pop{border-color:var(--primary);box-shadow:var(--shadow);transform:scale(1.03)}
@media(max-width:820px){.ofm-v2 .price.pop{transform:none}}
.ofm-v2 .price .flag{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--primary);color:#fff;font-size:.7rem;font-weight:700;padding:.3rem .8rem;border-radius:999px}
.ofm-v2 .price h3{font-family:var(--font-sora);font-size:1.15rem;color:var(--navy)}
.ofm-v2 .price .amt{font-family:var(--font-sora);font-weight:800;font-size:2.3rem;color:var(--navy);margin:.4rem 0 .1rem}
.ofm-v2 .price .amt span{font-size:.9rem;font-weight:500;color:var(--muted)}
.ofm-v2 .price .desc{font-size:.86rem;color:var(--muted);min-height:38px}
.ofm-v2 .price ul{list-style:none;padding:0;margin:16px 0}
.ofm-v2 .price li{display:flex;gap:.5rem;font-size:.88rem;padding:.34rem 0;color:#33415c}
.ofm-v2 .price .btn{width:100%;justify-content:center;margin-top:6px}
.ofm-v2 .price-note{text-align:center;color:var(--muted);font-size:.85rem;margin-top:22px}

/* testimonial */
.ofm-v2 .quote{background:linear-gradient(160deg,#0d1b3e,#16295f);color:#fff;border-radius:22px;padding:clamp(30px,4vw,48px);text-align:center;box-shadow:var(--shadow)}
.ofm-v2 .quote .stars{color:var(--amber);letter-spacing:3px;margin-bottom:14px}
.ofm-v2 .quote blockquote{font-family:var(--font-sora);font-weight:500;font-size:clamp(1.15rem,2.3vw,1.55rem);line-height:1.4;margin:0;max-width:760px;margin-inline:auto}
.ofm-v2 .quote cite{display:block;margin-top:18px;color:#aab8d8;font-style:normal;font-size:.9rem}

/* FAQ */
.ofm-v2 .faq{max-width:820px;margin:0 auto}
.ofm-v2 details{border:1px solid var(--line);border-radius:12px;margin-bottom:12px;background:#fff;overflow:hidden}
.ofm-v2 summary{cursor:pointer;padding:18px 20px;font-family:var(--font-sora);font-weight:600;color:var(--navy);font-size:1rem;list-style:none;display:flex;justify-content:space-between;gap:1rem;align-items:center}
.ofm-v2 summary::-webkit-details-marker{display:none}
.ofm-v2 summary:after{content:"+";font-size:1.4rem;color:var(--primary);font-weight:400;transition:.2s}
.ofm-v2 details[open] summary:after{transform:rotate(45deg)}
.ofm-v2 details p{padding:0 20px 18px;margin:0;color:#44526d;font-size:.94rem}

/* DEMO / CTA */
.ofm-v2 .demo{background:linear-gradient(160deg,var(--navy-deep),var(--navy) 60%,var(--navy-2));border-radius:26px;padding:clamp(30px,4vw,52px);color:#fff}
.ofm-v2 .demo-grid{display:grid;grid-template-columns:1fr 1fr;gap:44px;align-items:center}
@media(max-width:840px){.ofm-v2 .demo-grid{grid-template-columns:1fr;gap:30px}}
.ofm-v2 .demo h2{color:#fff}
.ofm-v2 .demo .lead{color:#c2cee9;font-size:1.02rem;margin-top:.8rem}
.ofm-v2 .demo .how{list-style:none;padding:0;margin:1.6rem 0 0}
.ofm-v2 .demo .how li{display:flex;gap:.9rem;padding:.5rem 0;font-size:.94rem;color:#d9e2f6;align-items:flex-start}
.ofm-v2 .demo .how .num{flex:none;width:26px;height:26px;border-radius:8px;background:rgba(59,110,245,.25);color:#9dc0ff;display:grid;place-items:center;font-family:var(--font-sora);font-weight:700;font-size:.82rem}
.ofm-v2 .demo .how b{color:#fff}
.ofm-v2 .form{background:#fff;border-radius:18px;padding:26px;color:var(--ink)}
.ofm-v2 .form h3{font-size:1.15rem;color:var(--navy);margin-bottom:4px}
.ofm-v2 .form .fh{font-size:.85rem;color:var(--muted);margin-bottom:16px}
.ofm-v2 .form p{font-size:.92rem;color:var(--muted);margin:0 0 18px}
.ofm-v2 .form .btn{width:100%;justify-content:center;margin-top:6px}
.ofm-v2 .form .rgpd-mini{font-size:.72rem;color:var(--muted);margin-top:12px;text-align:center}

/* footer */
.ofm-v2 footer{background:var(--navy-deep);color:#aeb9d6;padding:52px 0 30px;font-size:.9rem}
.ofm-v2 .foot-grid{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:30px;margin-bottom:30px}
@media(max-width:760px){.ofm-v2 .foot-grid{grid-template-columns:1fr 1fr}}
.ofm-v2 footer h4{color:#fff;font-size:.82rem;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px}
.ofm-v2 footer a{display:block;padding:.28rem 0;color:#aeb9d6}
.ofm-v2 footer a:hover{color:#fff}
.ofm-v2 .foot-bottom{border-top:1px solid rgba(255,255,255,.1);padding-top:20px;text-align:center;font-size:.8rem;color:#7f8cad}
`;
