# API INVENTORY — OF Manager

> STEP 2 de la méthode. Inventaire des **44 routes `route.ts`** de `src/app/api/**` + note sur les ~90 fichiers Server Actions. Colonnes : méthode, auth requise, rôle, cloisonnement tenant, sensible, protection/observations.
> `Auth` : ✅ session requise · 🔑 secret/signature · 🌐 public. `Tenant` : scope par `organismeId` de session / token / signature.

## 1. Routes API HTTP

### Authentification (exclue du middleware ⇒ auth propre)
| Méthode | Endpoint | Auth | Rôle | Tenant | Sensible | Protection / observations |
|---|---|---|---|---|---|---|
| GET/POST | `api/auth/[...nextauth]` | 🌐→✅ | tous | login | 🔴 | NextAuth ; rate-limit 8/email+20/IP, anti-énum temps constant (`auth.ts`) |

### Cron (Bearer `CRON_SECRET`, échec fermé — `lib/cron-auth.ts`)
| POST/GET | `api/cron/parcours` · `documents-b2b` · `mrr-snapshot` · `purge-demos` · `purge-pdf-cache` · `rgpd-purge` · `suspend-trials` | 🔑 | système | multi | 🟠 | ✅ Bearer obligatoire, jamais en query. Confirmé `cron-auth.ts` |

### Webhooks entrants (signature)
| POST | `api/stripe/webhook` | 🔑 sig | — | via customerId | 🔴 | ✅ **PASS** raw body + `constructEventAsync`, fail-closed (`stripe/webhook/route.ts:53-60`) |
| POST | `api/webhooks/wedof/[orgId]` | 🔑 HMAC | — | ✅ orgId lié au secret par-org | 🔴 | ✅ **PASS** HMAC-SHA512 + `timingSafeEqual`, isolation tenant prouvée |
| POST | `api/webhooks/resend` | 🔑 Svix | — | lead | 🟡 | ✅ PASS (Svix) ; repli `?secret=` non temps-constant (mineur) |
| POST | `api/webhooks/brevo` | 🔑 query | — | lead | 🟡 | ⚠️ **PARTIAL** secret en query, pas de HMAC (`brevo/route.ts:36-48`) |

### Lead / démo / vérification (public, protections dédiées)
| POST | `api/lead` | 🔑 `LEAD_API_SECRET` | 🌐 | lead | 🟠 | fail-closed prod ; compare `!==` (non temps-constant, mineur) ; 10/min/IP |
| POST | `api/demo` | 🌐 | 🌐 | crée tenant démo | 🟠 | 3/j IP + 3/j email |
| POST | `api/verification` | 🌐+Turnstile | 🌐 | anti-fraude | 🟡 | ✅ fail-closed si clé Turnstile absente en prod ; 5/10min |
| POST | `api/public/track` | 🌐 | 🌐 | analytics | 🔵 | 60/min |

### Public (lecture — vitrine/portail)
| GET | `api/public/formations` · `formations/[slug]` · `sessions` · `pricing` · `blog` | 🌐 | 🌐 | par organisme (query) | 🔵 | Données publiées volontairement ; **à confirmer** filtrage |
| GET | `api/public/organisme/[id]/logo` · `photos/[id]` · `photos` | 🌐 | 🌐 | [id] | 🟡 | Ressources d'affichage ; **audit Fichiers en cours** |
| GET | **`api/public/piece/[id]`** | ❓ | 🌐 | [id] | 🔴 | **PIÈCE JOINTE candidat (CV/CNI) — contrôle d'accès CRITIQUE, audit Fichiers en cours** |

### Documents / PDF (back-office & liens tokenisés)
| GET | `api/candidats/[id]/expression-besoin` | ✅ | staff | [id] | 🔴 | **IDOR/scope — audit Multi-tenant en cours** |
| GET | `api/inscriptions/[id]/attestation-reussite` | ✅ | staff | [id] | 🔴 | idem |
| GET | `api/financements/[id]/bordereau` | ✅ | staff | [id] | 🔴 | idem |
| GET/POST | `api/parcours-t3p/[id]` | ✅ | staff | [id] | 🟠 | idem |
| POST | `api/convention` | ✅ | staff | session | 🟠 | ⚠️ pas de plafond `candidates[]` (DoS ressources) |
| GET | `api/console/contrat-prestation/[id]/pdf` · `facture-editeur/[id]/{pdf,xml,facturx}` | ✅ | SUPERADMIN | console | 🟠 | **à confirmer** garde SUPERADMIN |
| POST | `api/pdf-test` | ❓ | — | — | 🔵 | Route de test — **vérifier qu'elle est désactivée en prod** |

### Upload / push / IA
| POST | `api/upload` | ✅ | staff | session | 🟠 | ✅ magic-bytes, SVG refusé, cap 4 Mo (`upload/route.ts:20-30`) |
| POST | `api/push/register` | ✅ | tous | user | 🔵 | gate `PUSH_ENABLED` |
| POST | `api/civique/ai` | 🔑 token candidat | apprenant | candidat | 🟡 | ✅ 10/h/candidat + cap entrée |

### E-learning civique (produit public)
| POST | `api/civique/lead` | 🌐 | 🌐 | crée Candidat | 🟠 | ❌ **FAIL** aucun rate-limit ni secret (flood CRM) |
| POST | `api/civique/checkout` | 🌐 | 🌐 | Stripe | 🟠 | ❌ **FAIL** aucun rate-limit (spam sessions Stripe) |
| GET | `api/civique/checkout/[id]` | 🌐 | 🌐 | [id] | 🔴 | ⚠️ renvoie `civicToken` sur simple `session_id` (fuite Referer) |
| POST | `api/civique/auth` | 🌐 | candidat | candidat | 🟠 | auth e-learning (email+token) |
| POST/GET | `api/civique/candidates/[id]/{provision,state}` | ❓ | — | [id] | 🟠 | **à confirmer** auth/scope |

## 2. Server Actions (`"use server"`)

- **~90 fichiers** exposent des Server Actions (`src/lib/actions/**`, composants). Chacune est un **endpoint POST implicite** non couvert par le middleware ⇒ doit appeler l'auth et scoper le tenant.
- Garde standard confirmée : **`requireStaffTenant` / `requireTenant` / `requireAdmin`** (`src/lib/actions/tenant.ts`) + client **`scopedPrisma`** cloisonné par `organismeId`. Re-valide `isActive`/`role` à chaque action. ⚠️ Ne vérifie **pas** `activeSessionId` (cf. SEC-14).
- Protection CSRF : Server Actions Next reposent sur `SameSite=Lax` + `allowedOrigins` restreint aux domaines du projet (`next.config.ts:117`).
- **Couverture réelle du scoping tenant sur l'échantillon** : verdict par l'audit Multi-tenant (SEC-22) — en cours.

## 3. Surface d'attaque — synthèse

| Zone | Volume | Régime d'auth | Risque principal |
|---|---|---|---|
| Routes API `[id]` (documents/pdf) | ~8 | session staff | **IDOR / fuite inter-tenant** |
| `api/public/*` | ~11 | public | Exposition de ressources (piece/photos) |
| Webhooks | 4 | signature/secret | Falsification d'events (Brevo le plus faible) |
| Server Actions | ~90 | session + garde tenant | Scoping manquant sur une action = fuite |
| E-learning `civique/*` | ~9 | mixte | Absence de rate-limit (3 routes) |
| Cron | 7 | `CRON_SECRET` | ✅ solide |
