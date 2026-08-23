import type { TitreTypeDef, TitreData } from "./catalog";
import { esc, fdateLong } from "./util";

/**
 * Moteur de rendu HTML des titres (→ PDF via lib/pdf). A4 paysage, direction
 * artistique « grande école » : cadre ornemental or/marine, sceau, filigrane,
 * polices Cormorant / EB Garamond. Deux variantes de pied :
 *  - diplôme      : « Fait à … » + double signature (Directeur + Président du jury) + sceau
 *  - attestation  : bloc de vérification anti-fraude (QR + phrase) + sceau + signature
 */

export type TitreOrg = {
  name: string;
  representant: string; // nom du signataire (Directeur)
  ville: string;
  adresse: string;
  siret: string;
  nda: string;
  /** Agrément applicable à la famille du titre (cf. lib/agrements). */
  agrement?: string;
};

export type TitreAssets = {
  /** Logo en data-URI (résolu par l'appelant : org.logoUrl ?? fichier public). */
  logoUri: string;
  /** Signature/cachet en data-URI, superposé sur la ligne de signature. */
  signatureUri?: string | null;
  /** Cachet / tampon officiel de l'organisme (data-URI ou URL), apposé près de
   *  la signature. Résolu par l'appelant depuis org.cachetUrl. */
  cachetUri?: string | null;
  /** URL publique de la page de vérification (attestations). */
  verifUrl?: string;
  /** QR code réel (data-URI) encodant l'URL de vérification. À défaut : aperçu. */
  qrDataUri?: string | null;
};

/* ------------------------------------------------------------------ */
/* Ornements                                                           */
/* ------------------------------------------------------------------ */

const CORNER = `<svg viewBox="0 0 60 60" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"><path d="M3 3 H24"/><path d="M3 3 V24"/><circle cx="8" cy="8" r="1.7" fill="currentColor" stroke="none"/><path d="M3 15 Q 9 15 9 21" stroke-width="0.7"/><path d="M15 3 Q 15 9 21 9" stroke-width="0.7"/><path d="M3 30 Q 18 30 18 12" stroke-width="0.5" opacity="0.7"/></svg>`;

function seal(center: string, sub: string): string {
  const fs = center.length > 5 ? 18 : 26;
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><defs><path id="ring" d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0"/></defs><circle cx="100" cy="100" r="88" fill="none" stroke="#0D1B3E" stroke-width="2.4"/><circle cx="100" cy="100" r="81" fill="none" stroke="#B08A3E" stroke-width="1"/><circle cx="100" cy="100" r="50" fill="none" stroke="#B08A3E" stroke-width="1"/><circle cx="100" cy="100" r="47" fill="none" stroke="#0D1B3E" stroke-width="0.6"/><text font-family="'Cormorant Garamond',serif" font-size="12" letter-spacing="2.2" fill="#0D1B3E" font-weight="700"><textPath href="#ring" startOffset="25%" text-anchor="middle">CAP COMPÉTENCES ✦ DOCUMENT OFFICIEL ✦</textPath></text><text x="100" y="96" text-anchor="middle" font-family="'Cormorant Garamond',serif" font-weight="700" font-size="${fs}" fill="#0D1B3E" letter-spacing="1.2">${esc(center)}</text><line x1="66" y1="105" x2="134" y2="105" stroke="#B08A3E" stroke-width="0.8"/><text x="100" y="121" text-anchor="middle" font-family="'EB Garamond',serif" font-size="9.5" fill="#B08A3E" letter-spacing="1.3">${esc(sub)}</text></svg>`;
}

/**
 * QR d'aperçu (placeholder visuel, NON scannable). Sera remplacé par un vrai QR
 * encodant l'URL de vérification au lot ANTI FRAUDE (dépendance `qrcode`).
 */
function qrPreview(seed: number): string {
  const N = 25;
  let s = seed >>> 0;
  const rnd = () => {
    s = (s * 1103515245 + 12345) >>> 0;
    return (s >>> 8) / 0x00ffffff;
  };
  const on: boolean[][] = [];
  for (let y = 0; y < N; y++) {
    on.push([]);
    for (let x = 0; x < N; x++) on[y][x] = rnd() > 0.5;
  }
  const finder = (ox: number, oy: number) => {
    for (let y = 0; y <= 6; y++)
      for (let x = 0; x <= 6; x++) {
        const b = x === 0 || x === 6 || y === 0 || y === 6;
        const c = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        on[oy + y][ox + x] = b || c;
      }
    for (let y = -1; y <= 7; y++)
      for (let x = -1; x <= 7; x++) {
        const gx = ox + x,
          gy = oy + y;
        if (gx < 0 || gy < 0 || gx >= N || gy >= N) continue;
        if (x < 0 || x > 6 || y < 0 || y > 6) on[gy][gx] = false;
      }
  };
  finder(0, 0);
  finder(N - 7, 0);
  finder(0, N - 7);
  let r = "";
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) if (on[y][x]) r += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  return `<svg viewBox="0 0 ${N} ${N}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" fill="#0D1B3E">${r}</svg>`;
}

function seedFrom(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/* ------------------------------------------------------------------ */
/* CSS                                                                 */
/* ------------------------------------------------------------------ */

const CSS = `
:root{--navy:#0D1B3E;--gold:#B08A3E;--ink:#1c2233;--paper:#FCFBF6;}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#fff}
@page{size:A4 landscape;margin:0;}
.page{position:relative;width:297mm;height:210mm;margin:0 auto;background:radial-gradient(120% 120% at 50% 0%,#fff 0%,var(--paper) 55%,#f6f2e8 100%);color:var(--ink);font-family:"EB Garamond",Garamond,"Times New Roman",serif;overflow:hidden;}
.frame-outer{position:absolute;inset:8mm;border:2.4px solid var(--navy);}
.frame-inner{position:absolute;inset:10mm;border:0.8px solid var(--gold);}
.frame-hair{position:absolute;inset:10.8mm;border:0.4px solid rgba(176,138,62,.5);}
.corner{position:absolute;width:14mm;height:14mm;color:var(--gold);}.corner svg{width:100%;height:100%;display:block;}
.corner.tl{top:7mm;left:7mm;}.corner.tr{top:7mm;right:7mm;transform:scaleX(-1);}.corner.bl{bottom:7mm;left:7mm;transform:scaleY(-1);}.corner.br{bottom:7mm;right:7mm;transform:scale(-1,-1);}
.watermark{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;}.watermark .seal-bg{width:120mm;height:120mm;opacity:.045;}
.photo{position:absolute;top:15mm;right:22mm;width:30mm;height:40mm;border:1px solid var(--gold);background:rgba(176,138,62,.05);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2mm;}
.photo::before{content:"";position:absolute;inset:1.4mm;border:0.4px dashed rgba(176,138,62,.55);}
.photo .cap{font-size:6.6pt;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);}
.content{position:absolute;inset:14mm 28mm 23mm;display:flex;flex-direction:column;text-align:center;align-items:center;}
.logo{height:14mm;object-fit:contain;margin:0 auto 2mm;}
.qualiopi{font-size:7.6pt;letter-spacing:.3em;text-transform:uppercase;color:var(--navy);font-weight:600;}
.rule{width:46mm;border-top:0.8px solid var(--gold);margin:2.4mm auto 0;position:relative;}
.rule::before,.rule::after{content:"❖";position:absolute;top:-8px;color:var(--gold);font-size:9px;}.rule::before{left:-13px}.rule::after{right:-13px}
.overline{margin-top:4mm;font-family:"Cormorant Garamond",serif;font-weight:600;letter-spacing:.42em;text-transform:uppercase;font-size:11pt;color:var(--gold);padding-left:.5em;}
.title{font-family:"Cormorant Garamond",serif;font-weight:700;color:var(--navy);font-size:21pt;line-height:1.09;margin-top:1mm;max-width:225mm;}
.level{display:inline-block;margin-top:3mm;padding:1mm 6.5mm;border:1.1px solid var(--navy);border-radius:1mm;font-family:"Cormorant Garamond",serif;font-weight:700;letter-spacing:.24em;font-size:13.5pt;color:var(--navy);background:rgba(13,27,62,.03);font-variant-numeric:lining-nums tabular-nums;}
.body{margin-top:4mm;font-size:12pt;line-height:1.56;color:var(--ink);}
.body p{margin:0 auto;max-width:222mm;}
.lead{font-style:italic;color:#4a4a53;}
.name{font-family:"Cormorant Garamond",serif;font-weight:600;color:var(--navy);font-size:22pt;letter-spacing:.04em;margin:2.5mm 0 .5mm;}
.born{font-size:11pt;color:#3a3f4d;}
.strong,.body b{font-weight:600;color:var(--navy);}
.arrete{font-style:italic;font-size:10.6pt;color:#5a5f6b;}
.refbox{margin:4mm auto 0;display:inline-flex;align-items:center;gap:3mm;border:1px solid var(--gold);background:rgba(176,138,62,.06);padding:1.8mm 6.5mm;border-radius:1mm;}
.refbox .lbl{font-size:8pt;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);font-weight:600;}
.refbox .num{font-family:"Cormorant Garamond",serif;font-weight:700;font-size:14pt;letter-spacing:.1em;color:var(--navy);font-variant-numeric:lining-nums tabular-nums;}
.validite{margin-top:2mm;font-size:10.4pt;color:#5a5f6b;}.validite b{color:var(--navy);}
.foot{margin-top:auto;width:100%;}
.divider{width:66mm;border-top:0.6px solid rgba(176,138,62,.55);margin:0 auto 3mm;}
.place{font-size:10.4pt;font-style:italic;color:#4a4a53;margin-bottom:3mm;text-align:center;}
.signs{display:flex;align-items:flex-end;justify-content:center;gap:16mm;}
.sig{width:60mm;text-align:center;}
.sig .role{font-family:"Cormorant Garamond",serif;font-weight:700;font-size:12pt;color:var(--navy);}
.sig .line{height:12mm;border-bottom:0.7px solid #b9b6ad;margin:1mm 3mm 1.5mm;position:relative;}
.sig .sigimg{position:absolute;bottom:0;left:50%;transform:translateX(-50%);max-height:15mm;max-width:46mm;opacity:.95;}
.sig .cachet{position:absolute;bottom:-4mm;right:-4mm;max-height:24mm;max-width:34mm;opacity:.88;transform:rotate(-7deg);pointer-events:none;}
.sig .who{font-size:10pt;color:#3a3f4d;}.sig .who b{color:var(--navy);font-weight:600;}
.seal{width:29mm;height:29mm;}
.foot.att{display:flex;align-items:flex-end;justify-content:space-between;gap:10mm;}
.verif{width:92mm;text-align:left;display:flex;gap:4mm;align-items:flex-start;border:0.7px solid rgba(176,138,62,.55);border-radius:1.4mm;padding:3mm;background:rgba(176,138,62,.05);}
.qr{width:24mm;height:24mm;flex:0 0 auto;border:0.7px solid var(--navy);background:#fff;display:flex;align-items:center;justify-content:center;}.qr svg{width:88%;height:88%;}
.verif .txt{font-size:8pt;line-height:1.42;color:#4a4a53;}.verif .txt b{color:var(--navy);}.verif .link{color:var(--gold);font-weight:600;}
.sigwrap{display:flex;align-items:flex-end;gap:10mm;}
/* Bloc de vérif du DIPLÔME : ancré en absolu dans le coin bas-gauche, hors du flux.
   Largeur 40mm (bord droit à 53mm) → 5mm de marge avec les signatures centrées
   (bord gauche à 58mm) ; bas à 24mm → au-dessus du pied légal (bas 11mm) même si
   l'adresse d'un OF le fait passer sur 2-3 lignes. Ne peut pas déborder la page. */
.verifdip{position:absolute;left:13mm;bottom:24mm;width:40mm;display:flex;gap:2.5mm;align-items:center;text-align:left;}
.verifdip .qr{width:13mm;height:13mm;flex:0 0 auto;border:0.6px solid var(--navy);background:#fff;padding:0.5mm;}
.verifdip .qr svg,.verifdip .qr img{width:100%;height:100%;object-fit:contain;}
.verifdip .txt{font-size:6.2pt;line-height:1.28;color:#5a5f6b;}.verifdip .txt b{color:var(--navy);}.verifdip .txt .link{color:var(--gold);font-weight:600;}
.footer-legal{position:absolute;left:26mm;right:26mm;bottom:11mm;text-align:center;font-size:7.2pt;letter-spacing:.02em;color:#8a8578;line-height:1.5;border-top:0.5px solid rgba(176,138,62,.4);padding-top:1.6mm;}
`;

const HEAD = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet"><style>${CSS}</style></head><body>`;

/* ------------------------------------------------------------------ */
/* Rendu                                                               */
/* ------------------------------------------------------------------ */

/** Rend le HTML complet (document unique) prêt pour `htmlToPdf(..., { landscape:true })`. */
export function renderTitreHtml(
  def: TitreTypeDef,
  data: TitreData,
  org: TitreOrg,
  assets: TitreAssets,
): string {
  const ville = esc(data.ville || org.ville || "");
  const place = `Fait à ${ville || "……………"}, le ${fdateLong(data.dateDelivrance ?? new Date())}`;
  const sigImg = assets.signatureUri
    ? `<img class="sigimg" src="${assets.signatureUri}" alt="signature" />`
    : "";
  // Cachet/tampon officiel apposé près de la signature (vide tant que le tenant
  // ne l'a pas chargé dans org.cachetUrl — marque blanche multi-tenant).
  const cachetImg = assets.cachetUri
    ? `<img class="cachet" src="${assets.cachetUri}" alt="cachet de l'organisme" />`
    : "";
  const corners = ["tl", "tr", "bl", "br"].map((k) => `<div class="corner ${k}">${CORNER}</div>`).join("");
  const photo = def.photo
    ? `<div class="photo"><span class="cap">Photo</span><span class="cap">d'identité</span></div>`
    : "";
  const badge = def.badge ? `<div class="level">${esc(def.badge)}</div>` : "";
  const refbox = `<div class="refbox"><span class="lbl">${esc(def.refLabel)}</span><span class="num">${esc(
    data.numero,
  )}</span></div>${
    data.dateFinValidite
      ? `<p class="validite">Valable jusqu'au <b>${fdateLong(data.dateFinValidite)}</b></p>`
      : ""
  }`;
  const sceau = seal(def.sealCenter, def.sealSub);

  // Bloc de vérification anti-fraude (QR + phrase) — sur TOUS les titres, y compris
  // les diplômes, pour qu'ils soient tous contrôlables sur la page publique.
  const verifUrl = assets.verifUrl || "ofmanager.info/verification";
  const qrHtml = assets.qrDataUri
    ? `<img src="${assets.qrDataUri}" alt="QR de vérification" style="width:100%;height:100%;object-fit:contain" />`
    : qrPreview(seedFrom(data.numero));
  const verifBlock = `<div class="verif"><div class="qr">${qrHtml}</div><div class="txt"><b>Document authentifiable.</b> Scannez le QR ou rendez-vous sur <span class="link">${esc(
    verifUrl,
  )}</span>, puis saisissez le n° ci-dessus <b>et la date de naissance</b> du titulaire.<br><span style="color:#8a8578">Aucune liste de titulaires n'est consultable.</span></div></div>`;

  let foot: string;
  let diplomeVerif = "";
  if (def.kind === "diplome") {
    const president = data.president?.nom
      ? `${esc(data.president.nom)}${data.president.grade ? ` — ${esc(data.president.grade)}` : ""}`
      : `<b>NOM</b> — Grade`;
    foot = `<div class="foot"><div class="divider"></div><div class="place">${place}</div><div class="signs">
      <div class="sig"><div class="role">${esc(def.sigRole)}</div><div class="line">${sigImg}${cachetImg}</div><div class="who">${esc(
        org.representant,
      )}</div></div>
      <div class="seal">${sceau}</div>
      <div class="sig"><div class="role">Le Président du Jury</div><div class="line"></div><div class="who">${president}</div></div>
    </div></div>`;
    // Vérif COMPACTE en position ABSOLUE (coin bas-gauche) : ne perturbe pas la mise
    // en page fixe du diplôme (aucun overflow, contrairement à un bloc en flux).
    // Uniquement si un VRAI QR est fourni (jamais de QR factice sur un diplôme officiel).
    if (assets.qrDataUri) {
      diplomeVerif = `<div class="verifdip"><div class="qr">${qrHtml}</div><div class="txt"><b>Authentifiable.</b> Scannez le QR ou <span class="link">${esc(
        verifUrl,
      )}</span> — n° + date de naissance.</div></div>`;
    }
  } else {
    foot = `<div class="foot att">
      ${verifBlock}
      <div class="sigwrap"><div class="seal">${sceau}</div><div><div class="place">${place}</div><div class="sig"><div class="role">${esc(
        def.sigRole,
      )}</div><div class="line">${sigImg}${cachetImg}</div><div class="who">${esc(org.representant)}</div></div></div></div>
    </div>`;
  }

  // « [AGREMENT] » → mention d'agrément si l'organisme en a un pour cette famille.
  const footer = def.footer.replace(
    "[AGREMENT]",
    org.agrement ? ` Agrément préfectoral n° ${esc(org.agrement)}.` : "",
  );
  const legal = `${esc(org.name)} — ${esc(org.adresse)}${org.siret ? ` · SIRET ${esc(org.siret)}` : ""}${
    org.nda ? ` · Déclaration d'activité n° ${esc(org.nda)}` : ""
  } · ${footer}`;

  const inner = `<div class="page ${def.kind}">
    <div class="frame-outer"></div><div class="frame-inner"></div><div class="frame-hair"></div>
    ${corners}<div class="watermark"><div class="seal-bg">${sceau}</div></div>${photo}
    <div class="content">
      <img class="logo" src="${assets.logoUri}" alt="${esc(org.name)}">
      <div class="qualiopi">Organisme de formation certifié Qualiopi</div>
      <div class="rule"></div>
      <div class="overline">${esc(def.overline)}</div>
      <div class="title">${esc(def.title)}</div>
      ${badge}
      <div class="body">${def.body(data, org)}${refbox}</div>
      ${foot}
    </div>
    ${diplomeVerif}
    <div class="footer-legal">${legal}</div>
  </div>`;

  return `${HEAD}${inner}</body></html>`;
}
