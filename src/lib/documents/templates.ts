// =============================================================
//  Modèles de documents (fusion de variables {{...}}).
//  Convention, Contrat et Règlement intérieur : texte intégral des
//  trames CAP Compétences (Qualiopi). Seules les données variables
//  (parties, formation, dates, lieu, prix) sont des {{variables}}.
// =============================================================

import { escapeHtml } from "@/lib/documents/escape";

const header = `
<div class="doc-header">
  <img src="/ofmanager-logo.png" alt="Logo de l'organisme" class="doc-logo" />
  <div class="doc-org">
    <strong>{{organisme}}</strong> — {{qualiopi}}<br/>
    {{organisme_adresse}}<br/>
    Tél. {{organisme_telephone}} · {{organisme_email}}<br/>
    SIRET {{organisme_siret}} · NDA {{organisme_nda}}
  </div>
</div>`;

const footer = `
<div class="doc-footer">
  {{organisme}} — Déclaration d'activité enregistrée sous le numéro {{organisme_nda}}
  auprès du préfet de région Île-de-France. Cet enregistrement ne vaut pas agrément de l'État.
</div>`;

// Image vide (pixel transparent) : sert de cachet/signature quand le tenant n'en
// a pas encore chargé — pour NE JAMAIS afficher l'asset CAP sur les documents
// d'un autre organisme (intégrité de la marque blanche).
export const EMPTY_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC";

// Marqueur interne (placeholder) du cachet/signature de l'organisme. Il est
// TOUJOURS remplacé au moment de la génération par le cachet réel du tenant, ou
// par EMPTY_IMAGE (pixel transparent) s'il n'en a pas — jamais servi tel quel.
// Chaîne neutre volontairement distincte de EMPTY_IMAGE (sinon collision avec le
// repli logo, remplacé en premier) et sans référence de marque.
export const STAMP_PLACEHOLDER = "/__org-cachet__.png";

// Cachet + signature de l'organisme (image), à apposer sur tous les documents.
const stamp = `<img src="${STAMP_PLACEHOLDER}" alt="Cachet et signature de l'organisme" class="doc-stamp" />`;

// Bloc cachet seul (pour les documents sans signature à deux parties).
const orgStampBlock = `<div class="org-stamp-block"><div class="sig-label">Cachet et signature de l'organisme</div>${stamp}</div>`;

const signatures = `
<div class="doc-signatures">
  <div><div class="sig-label">Pour l'organisme — {{organisme_representant}}</div><div class="sig-box">${stamp}</div></div>
  <div><div class="sig-label">Le stagiaire — {{nom_complet}}</div><div class="sig-box">{{signature_stagiaire}}</div></div>
</div>`;

function wrap(title: string, body: string) {
  return `${header}<h1 class="doc-title">${title}</h1>${body}${footer}`;
}

const rateRow = (label: string, cols: number) =>
  `<tr><td>${label}</td>${"<td></td>".repeat(cols)}</tr>`;
const rateHead = (cols: string[]) =>
  `<tr><th></th>${cols.map((c) => `<th>${c}</th>`).join("")}</tr>`;

export const DOCUMENTS: Record<string, { label: string; html: string }> = {
  FICHE_INSCRIPTION: {
    label: "Fiche d'inscription",
    html: wrap(
      "Fiche d'inscription",
      `<p>Demande d'inscription à une action de formation dispensée par {{organisme}}.</p>
      <h2>Stagiaire</h2>
      <div style="display:flex;gap:16px;align-items:flex-start">
        <table class="doc-table" style="flex:1">
          <tr><td>Nom</td><td>{{nom}}</td></tr>
          <tr><td>Prénom</td><td>{{prenom}}</td></tr>
          <tr><td>Date de naissance</td><td>{{date_naissance}}</td></tr>
          <tr><td>Lieu de naissance</td><td>{{lieu_naissance}}</td></tr>
          <tr><td>Département de naissance</td><td>{{departement_naissance}}</td></tr>
          <tr><td>Pays de naissance</td><td>{{pays_naissance}}</td></tr>
          <tr><td>Nationalité</td><td>{{nationalite}}</td></tr>
          <tr><td>Email</td><td>{{email}}</td></tr>
          <tr><td>Téléphone</td><td>{{telephone}}</td></tr>
          <tr><td>Adresse</td><td>{{adresse_candidat}}</td></tr>
          <tr><td>Dernier diplôme obtenu</td><td>{{dernier_diplome}}</td></tr>
        </table>
        <div style="width:104px;flex:none;text-align:center">{{photo}}</div>
      </div>
      <h2>Situation professionnelle</h2>
      <table class="doc-table">
        <tr><td>Situation</td><td>{{situation_pro}}</td></tr>
        <tr><td>Employeur</td><td>{{employeur}}</td></tr>
        <tr><td>Poste occupé</td><td>{{poste_occupe}}</td></tr>
      </table>
      {{bloc_prerequis}}
      <h2>Formation</h2>
      <table class="doc-table">
        <tr><td>Intitulé</td><td>{{formation}}</td></tr>
        <tr><td>Référence / certification</td><td>{{reference_formation}} · {{certification}}</td></tr>
        <tr><td>Durée</td><td>{{duree}}</td></tr>
        <tr><td>Dates</td><td>du {{date_debut}} au {{date_fin}} — {{horaires}}</td></tr>
        <tr><td>Lieu / modalité</td><td>{{lieu}} — {{modalite}}</td></tr>
      </table>
      <h2>Financement</h2>
      <table class="doc-table">
        <tr><td>Mode de financement</td><td>{{financement}}</td></tr>
        <tr><td>Tarif</td><td>{{tarif}}</td></tr>
      </table>
      <p class="mt">Je soussigné(e) <strong>{{nom_complet}}</strong> demande mon inscription à la formation ci-dessus et certifie l'exactitude des informations fournies. Fait le {{date_jour}}.</p>
      ${signatures}`,
    ),
  },

  CONVOCATION: {
    label: "Convocation",
    html: wrap(
      "Convocation à une formation",
      `<p>Madame, Monsieur <strong>{{nom_complet}}</strong>,</p>
      <p>Nous avons le plaisir de vous convoquer à la formation suivante :</p>
      <table class="doc-table">
        <tr><td>Formation</td><td><strong>{{formation}}</strong></td></tr>
        <tr><td>Référence session</td><td>{{session_reference}}</td></tr>
        <tr><td>Dates</td><td>du {{date_debut}} au {{date_fin}}</td></tr>
        <tr><td>Horaires</td><td>{{horaires}}</td></tr>
        <tr><td>Lieu / modalité</td><td>{{lieu}} — {{modalite}}</td></tr>
        <tr><td>Salle</td><td>{{salle}}</td></tr>
      </table>
      <p>Merci de vous présenter muni(e) d'une pièce d'identité. Pour toute question : {{organisme_telephone}} — {{organisme_email}}.</p>
      <p><strong>Accessibilité (situation de handicap) :</strong> pour toute adaptation nécessaire, contactez notre référent handicap : {{referent_handicap}}.</p>
      <p>Cordialement,<br/>{{organisme_representant}} — {{organisme}}</p>
      ${orgStampBlock}`,
    ),
  },

  CONVOCATION_EXAMEN: {
    label: "Convocation à l'examen",
    html: wrap(
      "Convocation à l'examen de certification",
      `<p>Madame, Monsieur <strong>{{nom_complet}}</strong>,</p>
      <p>Né(e) le {{date_naissance}} à {{lieu_naissance}} ({{pays_naissance}}).</p>
      <p>Nous vous convoquons à l'épreuve de certification de la formation suivante :</p>
      <table class="doc-table">
        <tr><td>Formation</td><td><strong>{{formation}}</strong></td></tr>
        <tr><td>Certification</td><td>{{certification}}</td></tr>
        <tr><td>Référence session</td><td>{{session_reference}}</td></tr>
        <tr><td>Date de l'examen</td><td>{{date_examen}}</td></tr>
        <tr><td>Horaires</td><td>{{horaires}}</td></tr>
        <tr><td>Lieu de l'examen</td><td>{{lieu_examen}}</td></tr>
      </table>
      <p>Vous devez vous présenter <strong>muni(e) d'une pièce d'identité en cours de validité</strong>. Tout retard ou absence non justifié(e) pourra entraîner l'impossibilité de passer l'épreuve.</p>
      <p>Pour toute question : {{organisme_telephone}} — {{organisme_email}}.</p>
      <p><strong>Accessibilité (situation de handicap) :</strong> pour toute adaptation nécessaire, contactez notre référent handicap : {{referent_handicap}}.</p>
      <p>Cordialement,<br/>{{organisme_representant}} — {{organisme}}</p>
      ${orgStampBlock}`,
    ),
  },

  CONVENTION_FORMATION: {
    label: "Convention de formation",
    html: wrap(
      "Convention de formation professionnelle",
      `<p><strong>ENTRE LES SOUSSIGNÉS :</strong></p>
      <p>1° <strong>{{organisme}}</strong>, représenté par {{organisme_representant}}, déclaré sous le n° de SIRET {{organisme_siret}}, dont le siège est au {{organisme_adresse}}, <strong>D'UNE PART,</strong></p>
      <p>ET</p>
      <p>2° Le bénéficiaire : <strong>{{nom_complet}}</strong>, né(e) le {{date_naissance}} à {{lieu_naissance}} ({{pays_naissance}}), demeurant {{adresse_candidat}}, <strong>D'AUTRE PART,</strong></p>
      <p>Il est arrêté et convenu ce qui suit :</p>

      <h2>ARTICLE 1 — Objet de la convention</h2>
      <p>L'organisme de formation s'engage à dispenser pour le bénéficiaire une action de formation intitulée : « {{formation}} » (réf. {{reference_formation}}, certification {{certification}}).</p>

      <h2>ARTICLE 2 — Nature de l'action de formation professionnelle</h2>
      <p>Conformément aux dispositions de l'article L.6313-1 du Code du travail, il est précisé que l'action de formation professionnelle susvisée s'inscrit dans la typologie des actions de formation définie par le Code du travail et, plus précisément, dans « actions d'adaptation et de développement des compétences des salariés ».</p>

      <h2>ARTICLE 3 — Durée de l'action de formation professionnelle</h2>
      <p>Il est convenu entre les parties que l'action de formation professionnelle précitée se déroulera sur une durée de {{duree}}. La formation aura lieu du {{date_debut}} au {{date_fin}} ({{horaires}}). Lieu de formation : {{lieu}}.</p>

      <h2>ARTICLE 4 — Effectifs dans le cadre de l'action de formation professionnelle</h2>
      <p>L'organisme de formation précise que l'action de formation professionnelle sera dispensée auprès des stagiaires inscrits à la session, dans la limite de dix (10) stagiaires par groupe, sauf exigence spécifique du référentiel de la certification visée.</p>

      <h2>ARTICLE 5 — Modalités de déroulement de l'action de formation professionnelle</h2>
      <p>Les modalités pédagogiques, le rôle du formateur, les matériels utilisés, les documents remis aux participants et la nature des travaux demandés sont repris ci-dessous.</p>
      <p>L'action de formation se déroulera dans une salle d'une capacité d'accueil en corrélation avec le nombre de stagiaires présents, équipée d'un vidéoprojecteur et d'un paperboard afin de pouvoir aisément garantir un bon déroulement de la formation du point de vue pédagogique et technique.</p>
      <p>La mise en œuvre des mises en situation pratiques sera réalisée au moyen des outils et supports de simulation adaptés à la formation.</p>
      <p>L'action de formation débutera par une présentation du formateur et de chacun des stagiaires afin de permettre une adaptation optimale du processus pédagogique prévu par le formateur au public présent.</p>
      <p>La formation présentielle se déroulera dans le respect du programme de formation qui aura été préalablement remis aux stagiaires, et ce, suivant une alternance d'exposés théoriques et de cas pratiques.</p>
      <p>Le formateur veillera à ce que chaque stagiaire puisse poser ses questions afin de faciliter le transfert de connaissances.</p>
      <p>Le formateur remettra, dès l'ouverture de la journée de formation, un support pédagogique permettant à chaque stagiaire de suivre le déroulement de l'action de formation professionnelle, et ainsi accéder aux connaissances constituant les objectifs inhérents à ladite action de formation professionnelle.</p>

      <h2>ARTICLE 6 — Sanction de la formation</h2>
      <p>Afin de permettre d'évaluer les acquis de la formation, le formateur procédera à une épreuve certificative conformément au référentiel de la certification visée. L'épreuve sera évaluée par le formateur à la fin de la formation et un niveau d'acquisition sera attribué. Les résultats de l'évaluation seront remis confidentiellement à chaque stagiaire sous la forme d'une attestation visée par l'organisme de formation, et ce, postérieurement au stage afin de permettre à l'organisme de formation de disposer du temps nécessaire pour évaluer les acquis.</p>

      <h2>ARTICLE 7 — Prix du stage</h2>
      <p>Le prix de l'action de formation professionnelle est fixé à {{tarif}}. Financement : {{financement}}. Les groupes sont constitués de dix (10) stagiaires maximum.</p>

      <h2>ARTICLE 8 — Délai de rétractation</h2>
      <p>L'article L.6353-5 du Code du travail prévoit que dans le délai de dix jours à compter de la signature du contrat, le bénéficiaire peut se rétracter par lettre recommandée avec accusé de réception adressée à l'organisme de formation.</p>

      <h2>ARTICLE 9 — Indemnité en cas de dédit</h2>
      <p>En cas d'annulation de tout ou partie de l'action de formation définie à l'article 3 de la présente convention, selon l'article L.6353-6 du Code du travail, aucune somme ne peut être exigée du stagiaire avant l'expiration du délai de rétractation prévu à l'article L.6353-5. Il ne peut être payé à l'expiration de ce délai une somme supérieure à 30 % du prix convenu. Ainsi, dans le cas d'une annulation du fait de l'organisme de formation entre la fin du délai de rétractation et le début de la formation, une somme correspondant à 30 % du coût de la formation sera due. Il est précisé que cette indemnité de dédit ne peut pas être imputée sur la participation obligatoire des entreprises au financement de la formation professionnelle continue. Nous attirons votre attention sur le fait que toute absence sera facturée d'un montant de 30 % du coût de la formation par stagiaire, quel qu'en soit le motif, auprès du bénéficiaire.</p>

      <h2>ARTICLE 10 — Échelonnement des paiements</h2>
      <p>Le solde donne lieu à échelonnement des paiements au fur et à mesure du déroulement de l'action de formation comme suit : dès la fin du délai de rétractation et avant le début de la formation, une somme de 30 % sera versée afin de valider l'inscription à l'action de formation ; à la fin de l'action de formation et dès réception de facture, le solde de 70 % sera versé.</p>

      <h2>ARTICLE 11 — Inexécution totale ou partielle de l'action de formation</h2>
      <p>Il est rappelé qu'en application de l'article L.6354-1 du Code du travail, toute inexécution totale ou partielle d'une prestation de formation entraîne l'obligation pour l'organisme prestataire de formation de rembourser au cocontractant les sommes indûment perçues de ce fait.</p>

      <h2>ARTICLE 12 — Prise d'effet</h2>
      <p>La présente convention prend effet à compter de la signature du bénéficiaire. Établie en deux exemplaires. Fait à {{organisme_ville}}, le {{date_jour}}.</p>
      ${signatures}`,
    ),
  },

  CONTRAT_FORMATION: {
    label: "Contrat de formation",
    html: wrap(
      "Contrat de formation professionnelle",
      `<p>(En application des articles L.6353-3 à L.6353-7 du Code du travail.)</p>
      <p><strong>ENTRE LES SOUSSIGNÉS :</strong></p>
      <p>1° <strong>{{organisme}}</strong>, organisme de formation représenté par {{organisme_representant}}, SIRET {{organisme_siret}}, dont le siège est au {{organisme_adresse}}, déclaration d'activité n° {{organisme_nda}}, <strong>D'UNE PART,</strong></p>
      <p>ET</p>
      <p>2° Le stagiaire : <strong>{{nom_complet}}</strong>, né(e) le {{date_naissance}} à {{lieu_naissance}} ({{pays_naissance}}), demeurant {{adresse_candidat}}, <strong>D'AUTRE PART,</strong></p>
      <p>Il est conclu le présent contrat de formation professionnelle :</p>

      <h2>ARTICLE 1 — Objet</h2>
      <p>En exécution du présent contrat, l'organisme de formation s'engage à organiser l'action de formation intitulée : « {{formation}} » (réf. {{reference_formation}}, certification {{certification}}).</p>

      <h2>ARTICLE 2 — Nature de l'action de formation</h2>
      <p>Conformément à l'article L.6313-1 du Code du travail, l'action s'inscrit dans la typologie des actions de formation (actions d'adaptation et de développement des compétences). Elle a pour objectif l'acquisition des compétences visées par le programme de formation remis au stagiaire.</p>

      <h2>ARTICLE 3 — Durée et déroulement</h2>
      <p>L'action de formation se déroulera sur une durée de {{duree}}, du {{date_debut}} au {{date_fin}} ({{horaires}}), en modalité {{modalite}}. Lieu : {{lieu}}.</p>

      <h2>ARTICLE 4 — Modalités pédagogiques</h2>
      <p>La formation se déroule dans une salle adaptée au nombre de stagiaires, équipée du matériel nécessaire (vidéoprojecteur, paperboard). Elle alterne apports théoriques et cas pratiques, à l'aide des outils et supports adaptés. Un support pédagogique est remis au stagiaire dès l'ouverture de la formation. Le formateur veille au transfert des connaissances et répond aux questions de chacun.</p>

      <h2>ARTICLE 5 — Niveau de connaissances préalables et sanction</h2>
      <p>Le stagiaire dispose des prérequis nécessaires au suivi de la formation. À l'issue de la formation, les acquis sont évalués conformément au référentiel de la certification visée et les résultats sont remis confidentiellement au stagiaire sous la forme d'une attestation visée par l'organisme.</p>

      <h2>ARTICLE 6 — Dispositions financières</h2>
      <p>Le prix de l'action de formation est fixé à {{tarif}}. Financement : {{financement}}.</p>

      <h2>ARTICLE 7 — Délai de rétractation</h2>
      <p>À compter de la date de signature du présent contrat, le stagiaire dispose d'un délai de dix (10) jours pour se rétracter (article L.6353-5 du Code du travail), par lettre recommandée avec accusé de réception. Dans ce cas, aucune somme ne peut être exigée du stagiaire.</p>

      <h2>ARTICLE 8 — Indemnité en cas de dédit</h2>
      <p>Selon l'article L.6353-6 du Code du travail, aucune somme ne peut être exigée avant l'expiration du délai de rétractation. À l'expiration de ce délai, il ne peut être payé une somme supérieure à 30 % du prix convenu. Toute absence pourra être facturée à hauteur de 30 % du coût de la formation, quel qu'en soit le motif.</p>

      <h2>ARTICLE 9 — Échelonnement des paiements</h2>
      <p>Dès la fin du délai de rétractation et avant le début de la formation : 30 % du montant afin de valider l'inscription. À la fin de l'action et sur réception de facture : le solde de 70 %.</p>

      <h2>ARTICLE 10 — Inexécution totale ou partielle</h2>
      <p>En application de l'article L.6354-1 du Code du travail, toute inexécution totale ou partielle d'une prestation de formation entraîne l'obligation pour l'organisme de rembourser au cocontractant les sommes indûment perçues de ce fait.</p>

      <h2>ARTICLE 11 — Protection des données personnelles</h2>
      <p>Les données personnelles du stagiaire sont collectées et traitées par {{organisme}} aux seules fins de la gestion de la formation, de son financement et des obligations légales (Qualiopi, financeurs). Conformément au RGPD, le stagiaire dispose d'un droit d'accès, de rectification et de suppression de ses données en écrivant à {{organisme_email}}.</p>

      <h2>ARTICLE 12 — Différend et attribution de juridiction</h2>
      <p>Tout différend relatif à l'interprétation ou à l'exécution du présent contrat, à défaut d'accord amiable, sera soumis au tribunal compétent. Fait à {{organisme_ville}}, le {{date_jour}}, en deux exemplaires.</p>
      ${signatures}`,
    ),
  },

  CONDITIONS_GENERALES: {
    label: "Conditions générales de vente",
    html: wrap(
      "Conditions générales de vente des actions de formation",
      `<p>Les présentes conditions générales s'appliquent à toutes interventions et prestations de services assurées par notre centre de formation et, en particulier, celles relatives au conseil et à l'ingénierie dans le domaine de la formation. Le client signataire du présent contrat les accepte sans réserve.</p>

      <h2>Article 1 — Domaines d'intervention</h2>
      <p>Notre centre de formation intervient, sur demande du client, sur tous les aspects relatifs à la formation. Ces interventions peuvent, selon les cas, se limiter à un rôle de conseil, à une mission d'assistance ou à la prise en charge directe de tout ou partie des opérations de formation que le client souhaite développer. Dans les deux premiers cas, notre rôle est d'apporter au client l'ensemble des informations nécessaires à la prise de décision ainsi que les conseils adaptés. Dans le dernier cas, notre centre prend en charge la bonne fin des opérations de formation externalisées selon les limites fixées par le cahier des charges.</p>

      <h2>Article 2 — Modalités d'intervention</h2>
      <p>Notre centre apporte au client son savoir-faire spécifique dans le domaine de la formation, caractérisé notamment par ses méthodes de travail, la qualification de son personnel, son expertise et sa connaissance des obligations afférentes.</p>
      <ul>
        <li>désignation d'un collaborateur comme interlocuteur privilégié du client pour l'exécution des prestations ;</li>
        <li>établissement, si nécessaire, d'un état des lieux définissant précisément le domaine d'intervention et les obligations respectives.</li>
      </ul>
      <p>Notre centre s'engage à mettre en œuvre tous les moyens nécessaires à l'exécution des prestations confiées. Le client s'engage à mettre à disposition tous les documents et éléments d'information nécessaires. La conclusion d'un contrat n'accorde au client aucune exclusivité.</p>

      <h2>Article 3 — Durée du contrat</h2>
      <p>La durée de nos interventions est à durée déterminée ou indéterminée, fixée pour chaque cas par les conditions particulières (modalités de résiliation et, le cas échéant, de reconduction).</p>

      <h2>Article 4 — Prix et facturation</h2>
      <p>Les prestations sont facturées sur la base d'un prix forfaitaire fixé par les conditions particulières, hors taxes et hors frais annexes. Sauf convention contraire, le règlement se fait par virement bancaire dans un délai de 30 jours à compter de la date de facture. Le non-respect des conditions de paiement entraîne :</p>
      <ul>
        <li>l'exigibilité immédiate de toutes les sommes restant dues ;</li>
        <li>la suspension de l'exécution de la prestation jusqu'au règlement ;</li>
        <li>l'application d'une pénalité (taux BCE majoré de 10 points) ;</li>
        <li>une indemnité forfaitaire de recouvrement de 40 euros (décret n° 2012-1115).</li>
      </ul>

      <h2>Article 5 — Responsabilité, garantie</h2>
      <p>Notre centre s'engage à apporter tous ses soins à l'exécution des prestations. Sa responsabilité ne pourra être engagée qu'en cas de faute et dans la double limite du coût de la facturation des prestations en cause (limitée à six mois) et de la couverture d'assurance responsabilité civile. Sa responsabilité ne saurait être recherchée en cas de faute du client, de force majeure ou de fait d'un tiers.</p>

      <h2>Article 6 — Confidentialité</h2>
      <p>Notre centre s'engage à garder la plus grande confidentialité sur les informations et documents portés à sa connaissance dans le cadre de l'exécution du contrat. Le client accepte toutefois d'être cité en référence pour les types d'opérations réalisées.</p>

      <h2>Article 7 — Clause de non-sollicitation</h2>
      <p>Pendant toute la durée du contrat et pendant un an suivant sa cessation, les parties s'interdisent d'embaucher, directement ou indirectement, un collaborateur de l'autre partie, sauf accord écrit préalable. À défaut, une indemnité équivalente à six mois d'appointements bruts sera due.</p>

      <h2>Article 8 — Résiliation</h2>
      <p>Toute décision du client de ne pas donner suite à une mission moins d'un mois avant la date prévue rend le client redevable d'une indemnité égale à 25 % du prix HT de l'intervention. En cas d'inexécution par l'une des parties, le contrat est résilié de plein droit dans un délai de quinze jours suivant une mise en demeure restée sans effet. Toute résiliation anticipée d'un contrat à durée déterminée à l'initiative du client entraîne une indemnité de 50 % du prix HT des prestations restant à facturer. Dans tous les cas, le client reste tenu du règlement des prestations exécutées.</p>

      <h2>Article 9 — Attribution de juridiction</h2>
      <p>Tout différend sur l'interprétation ou l'exécution du contrat qui n'aura pu faire l'objet d'une solution amiable sera soumis au Tribunal compétent de Bobigny, même en cas d'appel en garantie ou de pluralité de défendeurs.</p>

      <h2>Article 10 — En cas de réclamation</h2>
      <p>Toute réclamation est à adresser par écrit par email à {{organisme_email}} ; nous y répondrons dans un délai de 48 heures. À défaut d'accord amiable, conformément aux articles L.612-1 à L.616-3 du Code de la consommation, le consommateur peut recourir gratuitement à un médiateur de la consommation.</p>

      <p class="mt"><strong>{{organisme}}</strong>, déclarée sous le n° de SIRET {{organisme_siret}}, dont le siège est au {{organisme_adresse}}. Version 1 du 20/12/2025.</p>
      <p class="mt">Lu et approuvé, le {{date_jour}}.</p>
      <div class="doc-signatures">
        <div><div class="sig-label">La direction — {{organisme_representant}}</div><div class="sig-box">${stamp}</div></div>
        <div><div class="sig-label">Le candidat — {{nom_complet}}</div><div class="sig-box">{{signature_stagiaire}}</div></div>
      </div>`,
    ),
  },

  REGLEMENT_INTERIEUR: {
    label: "Règlement intérieur",
    html: wrap(
      "Règlement intérieur",
      `<p><strong>Article L1132-1 du Code du travail :</strong> Aucune personne ne peut être écartée de l'accès à un stage ou à une période de formation en entreprise en raison de son origine, de son appartenance ou de sa non-appartenance, vraie ou supposée, à une ethnie, une nation ou une prétendue race, de ses opinions politiques, de ses activités syndicales ou mutualistes, de ses convictions religieuses.</p>
      <p>« Ainsi nous demandons le respect de chacun, aucune discrimination ne sera tolérée ».</p>

      <h2>LES OBLIGATIONS DES STAGIAIRES</h2>
      <p><strong>1. MESURES GÉNÉRALES.</strong> Il est demandé aux stagiaires de respecter les lieux dans lesquels ils travaillent et le matériel mis à leur disposition. Le matériel mis à la disposition des stagiaires ne peut être utilisé que sous la responsabilité d'un formateur ou d'un stagiaire nommément désigné par le responsable de formation. Les stagiaires conservent la responsabilité de leurs objets personnels.</p>
      <p><strong>2. ASSIDUITÉ – PONCTUALITÉ.</strong> Les stagiaires sont tenus d'assister à tous les cours en y apportant le matériel scolaire et la tenue nécessaire. L'observation stricte des horaires doit être considérée comme une manifestation du respect des autres et comme une préparation à la vie professionnelle. Les retards répétés et/ou volontaires pourront donner lieu à des sanctions prévues au présent règlement, ceux supérieurs à 2 heures seront traités comme des absences.</p>
      <p><strong>3. INAPTITUDE EN PRATIQUE PROFESSIONNELLE.</strong> La présence dans cette discipline d'enseignement est obligatoire. Si, pour une raison de santé, un stagiaire ne peut pas travailler physiquement, il doit fournir un certificat médical établi par son médecin de famille, précisant l'inaptitude partielle ou totale et sa durée.</p>
      <p><strong>4. ABSENCES.</strong> La gestion des absences dans le centre de formation est la suivante : <em>Absence justifiée :</em> arrêt de maladie. <em>Absence imprévisible :</em> les stagiaires sont tenus d'informer le plus rapidement possible par téléphone le centre de formation ; l'absence sera excusée dans la mesure où le stagiaire fournira dès son retour en formation un justificatif, sinon l'absence se verrait décomptée. <em>Absence irrégulière :</em> celles-ci donneront lieu à la mise en œuvre d'une des sanctions prévues dans ce règlement ; des lettres au nombre de 3 vous seront envoyées et, au bout de trois lettres, vous serez sanctionné. En outre, toute absence injustifiée entraînera automatiquement une perte de rémunération.</p>

      <h2>LA VIE DANS L'ÉTABLISSEMENT</h2>
      <p><strong>1. TENUE ET COMPORTEMENT.</strong> Les stagiaires doivent avoir en toute circonstance une tenue vestimentaire propre et décente. De plus, un comportement et un langage corrects à l'égard de l'ensemble de l'établissement garantiront un climat de respect mutuel. Le téléphone portable activé est interdit dans la salle de cours, il doit être en veille.</p>
      <p><strong>2. OBJET DE VALEUR.</strong> Il est vivement recommandé aux stagiaires de ne pas se rendre en cours avec des objets de valeur (bijoux, matériels, radio…). En effet, le centre de formation ne peut, en aucun cas, être tenu pour responsable des vols ou des dégradations commis au préjudice des stagiaires.</p>
      <p><strong>3. PROPRETÉ DES LOCAUX.</strong> Par souci de l'environnement et de la qualité de notre cadre de vie et par considération envers le personnel chargé de l'entretien des locaux, chacun veillera à jeter les papiers ou détritus dans les poubelles, les mégots dans les cendriers se trouvant à l'extérieur du bâtiment (il est interdit de fumer dans la salle de cours), à fermer portes et fenêtres des salles de cours et à éteindre les lumières.</p>
      <p><strong>4. DÉGRADATIONS.</strong> Toute dégradation entraînera la participation totale ou partielle des familles ou du stagiaire aux frais de remise en état ou de remboursement. Si la dégradation est volontaire, elle pourra donner lieu à des sanctions disciplinaires.</p>
      <p><strong>5. ASSURANCE.</strong> Il est vivement conseillé aux familles ou stagiaires de souscrire un contrat d'assurance responsabilité civile, couvrant non seulement le risque de dommage (corporel et matériel) causé par le stagiaire mais également subi par lui. Cette assurance est exigée pour toute activité non prévue dans des obligations pédagogiques.</p>
      <p><strong>6. MOUVEMENTS / PAUSES.</strong> Afin de prévenir tout accident, les mouvements entre les cours doivent s'effectuer dans le calme. De même, pendant les temps de pause, les stagiaires ne doivent pas quitter le périmètre du bâtiment et peuvent rester devant le centre dans le silence afin de ne pas perturber les autres.</p>

      <h2>HYGIÈNE</h2>
      <p><strong>1. ACCIDENTS.</strong> Tout accident ou blessure survenu lors d'un cours doit être immédiatement signalé au formateur et à l'administration, afin que toutes les mesures d'urgence soient prises par les services de santé.</p>
      <p><strong>2. PRODUITS AUTORISÉS ET INTERDITS.</strong> <em>Les médicaments autorisés :</em> aucun remède ne doit être laissé à la libre disposition des stagiaires ; afin d'éviter toute médication abusive, il est demandé au responsable légal d'informer par courrier les services de santé du traitement prescrit et d'y joindre une copie de l'ordonnance. <em>Le tabac :</em> il est strictement interdit de fumer en salle de cours et dans tout le bâtiment (loi Évin). <em>Les animaux :</em> les chiens ou tout autre animal ne sont pas tolérés au sein de l'établissement. <em>Les produits interdits :</em> conformément à l'article L.626 du Code de la Santé Publique (loi 70-1320 du 31/12/70), il est formellement interdit de détenir, consommer, donner ou vendre des produits stupéfiants ; en cas de transgression, outre les sanctions de l'établissement, des poursuites judiciaires pourront être engagées. <em>L'alcool :</em> l'introduction et l'usage de boissons alcoolisées sont vigoureusement interdits dans l'enceinte de l'établissement.</p>
      <p><strong>3. INFORMATIONS GÉNÉRALES RELATIVES À LA TRANSMISSION D'UN VIRUS.</strong> L'organisme de formation mettra en place les recommandations gouvernementales selon l'actualité, disponibles sur le site : www.sante.gouv.fr.</p>

      <h2>HARCÈLEMENT MORAL</h2>
      <p><strong>1. DÉFINITION.</strong> Défini par le Code du travail, le harcèlement moral se manifeste par des agissements répétés qui ont pour objet ou pour effet une dégradation des conditions de travail susceptible de porter atteinte aux droits de la personne et à sa dignité, d'altérer sa santé physique ou mentale ou de compromettre son avenir professionnel. Son auteur peut être un employeur, un collègue de la victime, quelle que soit sa position hiérarchique.</p>
      <p><strong>2. PROTECTION DES VICTIMES ET DES TÉMOINS.</strong> Le principe est posé par l'article L.1152-2 du Code du travail : aucune personne ayant subi ou refusé de subir des agissements répétés de harcèlement moral, ou ayant de bonne foi relaté ou témoigné de tels agissements, ne peut faire l'objet des mesures mentionnées à l'article L.1121-2 du Code du travail, c'est-à-dire être écartée d'une procédure de recrutement ou de l'accès à un stage ou à une période de formation, ou faire l'objet d'une mesure discriminatoire, directe ou indirecte (rémunération, formation, reclassement, affectation, qualification, classification, promotion, horaires, mutation, renouvellement de contrat, etc.). Toute rupture du contrat de travail intervenue en méconnaissance de ces dispositions est nulle.</p>
      <p><strong>3. SANCTIONS À L'ENCONTRE DE L'AUTEUR.</strong> Le fait de harceler autrui par des propos ou comportements répétés est puni de deux ans d'emprisonnement et de 30 000 € d'amende (article 222-33-2 du Code pénal). Les faits de discrimination commis à la suite d'un harcèlement moral sont punis d'un an d'emprisonnement et de 3 750 € d'amende, la juridiction pouvant ordonner l'affichage et la diffusion du jugement.</p>

      <h2>SÉCURITÉ</h2>
      <p><strong>1. CONSIGNES EN CAS D'INCENDIE.</strong> Appliquer les consignes générales précisant les modalités d'évacuation apposées dans chaque salle et couloir. Pour la sécurité de tous, chacun est tenu de s'y conformer.</p>
      <p><strong>2. OBJETS ET PRODUITS DANGEREUX.</strong> Il est strictement interdit d'introduire dans l'enceinte de l'établissement tout produit et objet pouvant nuire à la sécurité des membres de la communauté (objets tranchants, produits inflammables, bombe d'autodéfense, etc.).</p>
      <p><strong>3. MISE EN ŒUVRE DU RÈGLEMENT.</strong> L'affichage dans l'établissement vaut acceptation pleine et entière du présent règlement adopté par la direction de l'organisme de formation. Chaque stagiaire fréquentant le centre de formation en prend connaissance et veille à son application. Il importe que chacun sache combien son attitude et son comportement influent sur l'image de l'établissement et sur son environnement. Des sanctions appropriées sont prises à l'encontre de ceux qui ne se conforment pas aux règles : avertissement oral ; observations ou avertissements écrits ; exclusion de la formation.</p>
      <p class="mt">Fait à {{organisme_ville}}, le {{date_jour}}.</p>
      <div class="doc-signatures"><div><div class="sig-label">Le stagiaire (lu et approuvé)</div><div class="sig-box">{{signature_stagiaire}}</div></div><div><div class="sig-label">Le dirigeant de l'organisme — {{organisme_representant}}</div><div class="sig-box">${stamp}</div></div></div>`,
    ),
  },

  ATTESTATION_ENTREE: {
    label: "Attestation d'entrée en formation",
    html: wrap(
      "Attestation d'entrée en formation",
      `<p>Je soussigné(e) {{organisme_representant}}, représentant <strong>{{organisme}}</strong>, atteste que <strong>{{nom_complet}}</strong> est entré(e) en formation :</p>
      <table class="doc-table">
        <tr><td>Formation</td><td>{{formation}} (réf. {{reference_formation}})</td></tr>
        <tr><td>Date d'entrée</td><td>{{date_debut}}</td></tr>
        <tr><td>Durée prévue</td><td>{{duree}}</td></tr>
      </table>
      <p>Attestation délivrée le {{date_jour}} pour servir et valoir ce que de droit.</p>
      ${orgStampBlock}`,
    ),
  },

  ATTESTATION_FIN: {
    label: "Attestation de fin de formation",
    html: wrap(
      "Attestation de fin de formation",
      `<p>Je soussigné(e) {{organisme_representant}}, représentant <strong>{{organisme}}</strong>, atteste que <strong>{{nom_complet}}</strong> a suivi la formation :</p>
      <table class="doc-table">
        <tr><td>Formation</td><td><strong>{{formation}}</strong> (réf. {{reference_formation}})</td></tr>
        <tr><td>Période</td><td>du {{date_debut}} au {{date_fin}}</td></tr>
        <tr><td>Durée</td><td>{{duree}}</td></tr>
        <tr><td>Modalité</td><td>{{modalite}}</td></tr>
      </table>
      <p>Cette formation prépare à la certification {{certification}}.</p>
      ${orgStampBlock}`,
    ),
  },

  ATTESTATION_REUSSITE: {
    label: "Attestation de réussite (certification)",
    html: wrap(
      "Attestation de réussite",
      `<p>Je soussigné(e) {{organisme_representant}}, représentant l'organisme <strong>{{organisme}}</strong> (NDA {{organisme_nda}}), atteste que <strong>{{nom_complet}}</strong> a satisfait aux épreuves d'évaluation et <strong>obtenu</strong> la certification suivante :</p>
      <table class="doc-table">
        <tr><td>Formation / titre</td><td><strong>{{formation}}</strong> (réf. {{reference_formation}})</td></tr>
        <tr><td>Certification</td><td>{{certification}}</td></tr>
        <tr><td>Période de formation</td><td>du {{date_debut}} au {{date_fin}}</td></tr>
        <tr><td>Résultat</td><td><strong>Admis(e)</strong></td></tr>
      </table>
      <p>Attestation de réussite délivrée le {{date_jour}} pour servir et valoir ce que de droit.</p>
      ${orgStampBlock}`,
    ),
  },

  ATTESTATION_RECYCLAGE: {
    label: "Attestation de recyclage SSIAP",
    html: wrap(
      "Recyclage du Diplôme d'Agent de Service de Sécurité Incendie et d'Assistance à Personnes SSIAP{{ssiap_niveau}}",
      `<p>Vu le diplôme de SSIAP{{ssiap_niveau}} N° {{ssiap_numero}}, obtenu le {{ssiap_date}},
      M. <strong>{{nom_complet}}</strong>, né(e) le {{date_naissance}} à {{lieu_naissance}} ({{pays_naissance}}),
      a recyclé son diplôme d'agent des services de sécurité incendie et d'assistance à personnes,
      {{dates_session}}, tel que défini dans l'arrêté du 02 mai 2005 modifié, relatif aux missions,
      à l'emploi et à la qualification du personnel permanent des Services de sécurité incendie des
      Établissements Recevant du Public et des Immeubles de Grande Hauteur.</p>
      <p class="mt">Délivrée à M. <strong>{{nom_complet}}</strong>, la présente attestation de recyclage.</p>
      <p class="mt">Fait à {{organisme_ville}}, le {{date_jour}}.</p>
      <div class="org-stamp-block"><div class="sig-label">{{organisme_representant}} — Directeur d'établissement</div>${stamp}</div>`,
    ),
  },

  ATTESTATION_REMISE_NIVEAU: {
    label: "Attestation de remise à niveau SSIAP",
    html: wrap(
      "Remise à niveau du Diplôme d'Agent de Service de Sécurité Incendie et d'Assistance à Personnes SSIAP{{ssiap_niveau}}",
      `<p>Vu le diplôme de SSIAP{{ssiap_niveau}} N° {{ssiap_numero}}, obtenu le {{ssiap_date}},
      M. <strong>{{nom_complet}}</strong>, né(e) le {{date_naissance}} à {{lieu_naissance}} ({{pays_naissance}}),
      a effectué une remise à niveau de son diplôme d'agent des services de sécurité incendie et
      d'assistance à personnes, {{dates_session}}, tel que défini dans l'arrêté du 02 mai 2005 modifié,
      relatif aux missions, à l'emploi et à la qualification du personnel permanent des Services de
      sécurité incendie des Établissements Recevant du Public et des Immeubles de Grande Hauteur.</p>
      <p class="mt">Délivrée à M. <strong>{{nom_complet}}</strong>, la présente attestation de remise à niveau.</p>
      <p class="mt">Fait à {{organisme_ville}}, le {{date_jour}}.</p>
      <div class="org-stamp-block"><div class="sig-label">{{organisme_representant}} — Directeur d'établissement</div>${stamp}</div>`,
    ),
  },

  CERTIFICAT_REALISATION: {
    label: "Certificat de réalisation",
    html: wrap(
      "Certificat de réalisation",
      `<p>Je soussigné(e) {{organisme_representant}}, représentant l'organisme <strong>{{organisme}}</strong> (NDA {{organisme_nda}}), atteste de la réalisation de l'action de formation suivante :</p>
      <table class="doc-table">
        <tr><td>Bénéficiaire</td><td><strong>{{nom_complet}}</strong></td></tr>
        <tr><td>Action de formation</td><td>{{formation}} (réf. {{reference_formation}})</td></tr>
        <tr><td>Nature de l'action</td><td>Action de formation</td></tr>
        <tr><td>Dates de réalisation</td><td>du {{date_debut}} au {{date_fin}}</td></tr>
        <tr><td>Durée totale</td><td>{{duree}}</td></tr>
        <tr><td>Modalité</td><td>{{modalite}}</td></tr>
      </table>
      <p>Certificat établi le {{date_jour}} pour faire valoir ce que de droit (financeur, OPCO, CPF…).</p>
      ${orgStampBlock}`,
    ),
  },

  SATISFACTION_STAGIAIRE: {
    label: "Enquête de satisfaction — stagiaire",
    html: wrap(
      "Enquête de satisfaction — stagiaire",
      `<p>Veuillez cocher les cases correspondant à votre appréciation afin d'améliorer notre prestation de formation.</p>
      <table class="doc-table">
        <tr><td>Nom</td><td>{{nom}}</td><td>Prénom</td><td>{{prenom}}</td></tr>
        <tr><td>Formation</td><td colspan="3">{{formation}}</td></tr>
        <tr><td>Dates</td><td colspan="3">du {{date_debut}} au {{date_fin}}</td></tr>
      </table>
      <table class="rate">
        ${rateHead(["Très satisfait", "Satisfait", "Peu satisfait", "Insatisfait"])}
        <tr class="grp"><td colspan="5">FORMATION</td></tr>
        ${rateRow("1/ Les objectifs de la formation étaient clairs et précis", 4)}
        ${rateRow("2/ Qualité de l'organisation et gestion du temps", 4)}
        ${rateRow("3/ La formation a-t-elle répondu à vos attentes ?", 4)}
        ${rateRow("4/ Les ressources pédagogiques ont-elles été mises à disposition ?", 4)}
        <tr class="grp"><td colspan="5">LOCAUX — OUTILS</td></tr>
        ${rateRow("5/ Confort et adaptabilité de la salle de formation", 4)}
        ${rateRow("6/ Qualité des outils pédagogiques et du matériel", 4)}
        <tr class="grp"><td colspan="5">FORMATEUR</td></tr>
        ${rateRow("7/ Qualité pédagogique et d'animation du formateur", 4)}
        ${rateRow("8/ Respect du rythme d'apprentissage et des besoins des participants", 4)}
      </table>
      <p class="mt">J'ai aimé et/ou appris :</p><div class="fill"></div><div class="fill"></div>
      <p class="mt">Je propose d'améliorer la formation de la façon suivante :</p><div class="fill"></div><div class="fill"></div>
      <p class="mt">Les objectifs de la formation ont-ils été atteints ? &nbsp; ☐ OUI &nbsp;&nbsp; ☐ NON</p>
      <p class="mt">Signature du stagiaire :</p><div class="sig-box half"></div>
      ${orgStampBlock}`,
    ),
  },

  SATISFACTION_ENTREPRISE: {
    label: "Enquête de satisfaction — entreprise",
    html: wrap(
      "Collecte des appréciations de l'entreprise",
      `<table class="doc-table">
        <tr><td>Nom de l'entité</td><td class="fillcell"></td></tr>
        <tr><td>Intitulé du stage suivi</td><td>{{formation}}</td></tr>
        <tr><td>Date de réalisation</td><td>du {{date_debut}} au {{date_fin}}</td></tr>
      </table>
      <p class="mt">Quelles sont les compétences apportées par le salarié ayant réalisé la formation ?</p><div class="fill"></div><div class="fill"></div>
      <p class="mt">Est-ce que les objectifs fixés ont été atteints ? (si non, pourquoi)</p><div class="fill"></div><div class="fill"></div>
      <p class="mt">Votre avis global sur les bénéfices apportés à votre activité :</p><div class="fill"></div><div class="fill"></div>
      <p class="mt">Vos suggestions et commentaires :</p><div class="fill"></div><div class="fill"></div>
      <table class="rate">
        ${rateHead(["Très bien", "Bien", "Assez bien", "Insuffisant", "Insatisfait"])}
        ${rateRow("Qualité des documents transmis", 5)}
        ${rateRow("Rythme de réponse", 5)}
        ${rateRow("Qualité des échanges / relationnel", 5)}
        ${rateRow("Délais de facturation", 5)}
        ${rateRow("Respect de la procédure", 5)}
        ${rateRow("Compétences acquises durant la formation", 5)}
        ${rateRow("Utilisation des compétences dans votre activité", 5)}
      </table>
      <p class="mt">Fait à {{organisme_ville}}, le {{date_jour}} — Rempli par : ____________________</p>
      <p>Signature de l'entreprise :</p><div class="sig-box half"></div>
      ${orgStampBlock}`,
    ),
  },

  SATISFACTION_OPCO: {
    label: "Enquête de satisfaction — OPCO",
    html: wrap(
      "Collecte des appréciations de l'OPCO / financeur",
      `<table class="doc-table">
        <tr><td>Nom de l'entité</td><td class="fillcell"></td></tr>
        <tr><td>Intitulé du stage financé</td><td>{{formation}}</td></tr>
        <tr><td>Date de réalisation</td><td>du {{date_debut}} au {{date_fin}}</td></tr>
      </table>
      <p class="mt">Les démarches administratives ont-elles été respectées ? (si non, pourquoi)</p><div class="fill"></div><div class="fill"></div>
      <p class="mt">L'organisme de formation a-t-il respecté les modalités de demande ? (si non, pourquoi)</p><div class="fill"></div><div class="fill"></div>
      <p class="mt">Votre avis global des échanges :</p><div class="fill"></div><div class="fill"></div>
      <p class="mt">Vos suggestions et commentaires :</p><div class="fill"></div><div class="fill"></div>
      <table class="rate">
        ${rateHead(["Très bien", "Bien", "Assez bien", "Insatisfait"])}
        ${rateRow("Qualité des documents transmis", 4)}
        ${rateRow("Rythme de réponse", 4)}
        ${rateRow("Qualité des échanges / relationnel", 4)}
        ${rateRow("Délais de facturation", 4)}
        ${rateRow("Respect de la procédure", 4)}
      </table>
      <p class="mt">Fait à __________________, le ____________ — Rempli par : ____________________</p>
      <p>Signature de l'organisme :</p><div class="sig-box half"></div>
      ${orgStampBlock}`,
    ),
  },

  // ───── Trames Qualiopi (dossier d'audit) ─────

  CONVENTION_ENTREPRISE: {
    label: "Convention de formation — entreprise (B2B)",
    html: wrap(
      "Convention de formation professionnelle",
      `<p><em>(Articles L.6353-1 et suivants du Code du travail)</em></p>
      <p><strong>ENTRE LES SOUSSIGNÉS :</strong></p>
      <p>1° <strong>{{organisme}}</strong>, organisme de formation déclaré sous le
      numéro d'activité {{organisme_nda}}, SIRET {{organisme_siret}}, dont le siège est
      au {{organisme_adresse}}, représenté par {{organisme_representant}},
      ci-après « <strong>l'organisme de formation</strong> », <strong>D'UNE PART,</strong></p>
      <p>ET</p>
      <p>2° <strong>{{entreprise_raison_sociale}}</strong>, SIRET {{entreprise_siret}},
      dont le siège est au {{entreprise_adresse}}, représentée par
      {{entreprise_representant}} ({{entreprise_fonction}}),
      ci-après « <strong>l'entreprise bénéficiaire</strong> », <strong>D'AUTRE PART,</strong></p>
      <p>il est conclu la présente convention de formation professionnelle.</p>

      <h2>Article 1 — Objet, nature et durée de la formation</h2>
      <table class="doc-table">
        <tr><td>Action de formation</td><td><strong>{{formation}}</strong> (réf. {{reference_formation}})</td></tr>
        <tr><td>Certification visée</td><td>{{certification}}</td></tr>
        <tr><td>Stagiaire</td><td><strong>{{nom_complet}}</strong>, salarié(e) de l'entreprise</td></tr>
        <tr><td>Dates</td><td>du {{date_debut}} au {{date_fin}} — {{horaires}}</td></tr>
        <tr><td>Durée</td><td>{{duree}}</td></tr>
        <tr><td>Lieu</td><td>{{lieu}} — {{modalite}}</td></tr>
      </table>

      <h2>Article 2 — Engagements de l'organisme</h2>
      <p>L'organisme s'engage à réaliser l'action prévue, à fournir le programme,
      à assurer le suivi de l'exécution (feuilles d'émargement signées) et à délivrer
      en fin de formation les attestations et le certificat de réalisation.</p>

      <h2>Article 3 — Dispositions financières</h2>
      <table class="doc-table">
        <tr><td>Prix de l'action (net de taxe)</td><td><strong>{{tarif}}</strong></td></tr>
        <tr><td>Mode de financement</td><td>{{financement}} {{entreprise_opco}}</td></tr>
      </table>
      <p>En cas de prise en charge partielle par le financeur, le solde reste dû par
      l'entreprise bénéficiaire.</p>

      <h2>Article 4 — Non-réalisation ou abandon</h2>
      <p>En cas de résiliation par l'entreprise à moins de 7 jours du début de l'action,
      ou d'abandon en cours de formation du fait du stagiaire, l'organisme facturera
      au prorata les sommes réellement dues au titre des heures réalisées.</p>

      <h2>Article 5 — Différends</h2>
      <p>En cas de litige non résolu à l'amiable, le tribunal compétent du siège de
      l'organisme de formation sera seul compétent.</p>

      <p class="mt">Fait à {{organisme_ville}}, le {{date_jour}}, en deux exemplaires.</p>
      <div class="doc-signatures">
        <div><div class="sig-label">Pour l'organisme — {{organisme_representant}}</div><div class="sig-box">${stamp}</div></div>
        <div><div class="sig-label">Pour l'entreprise — {{entreprise_representant}}<br/>(cachet et signature)</div><div class="sig-box"></div></div>
      </div>`,
    ),
  },

  PROGRAMME: {
    label: "Programme de formation (Qualiopi)",
    html: wrap(
      "Programme de formation",
      `<table class="doc-table">
        <tr><td>Intitulé</td><td><strong>{{formation}}</strong> (réf. {{reference_formation}})</td></tr>
        <tr><td>Certification visée</td><td>{{certification}} — Certificateur : {{certificateur}}</td></tr>
        <tr><td>Durée</td><td>{{duree}}</td></tr>
        <tr><td>Modalité</td><td>{{modalite}}</td></tr>
        <tr><td>Tarif</td><td>{{tarif}}</td></tr>
        <tr><td>Délai d'accès</td><td>{{delai_acces}}</td></tr>
      </table>
      <h2>Public visé</h2><p>{{public_vise}}</p>
      <h2>Prérequis</h2><p>{{prerequis}}</p>
      <h2>Objectifs pédagogiques</h2><p>{{objectifs}}</p>
      <h2>Contenu / déroulé</h2><p>{{programme_detail}}</p>
      <h2>Méthodes pédagogiques</h2><p>{{methodes_pedagogiques}}</p>
      <h2>Modalités d'évaluation</h2><p>{{modalites_evaluation}}</p>
      <h2>Accessibilité aux personnes en situation de handicap</h2>
      <p>Nos formations sont accessibles aux personnes en situation de handicap.
      Contactez notre référent handicap ({{organisme_telephone}} — {{organisme_email}})
      afin d'étudier les adaptations possibles (rythmes, supports, locaux).</p>
      <p class="mt">Document établi le {{date_jour}}.</p>
      ${orgStampBlock}`,
    ),
  },

  FICHE_BESOIN: {
    label: "Fiche d'expression du besoin",
    html: wrap(
      "Fiche d'expression du besoin",
      `<p><em>Cette fiche formalise l'analyse du besoin du bénéficiaire avant l'entrée en
      formation (indicateur 4 du Référentiel National Qualité).</em></p>
      <table class="doc-table">
        <tr><td>Bénéficiaire</td><td><strong>{{nom_complet}}</strong> — {{email}} — {{telephone}}</td></tr>
        <tr><td>Formation envisagée</td><td>{{formation}} (réf. {{reference_formation}})</td></tr>
        <tr><td>Mode de financement</td><td>{{financement}}</td></tr>
        <tr><td>Date de l'entretien</td><td>{{date_jour}}</td></tr>
      </table>
      <h2>1. Situation actuelle du bénéficiaire</h2>
      <p>Situation professionnelle (poste, secteur, demandeur d'emploi…) :</p><div class="fill"></div><div class="fill"></div>
      <p class="mt">Dernier diplôme / niveau : {{dernier_diplome}}</p>
      <h2>2. Expression du besoin</h2>
      <p>Quel est l'objectif professionnel visé par cette formation ?</p><div class="fill"></div><div class="fill"></div>
      <p class="mt">Quelles compétences souhaitez-vous acquérir ou développer ?</p><div class="fill"></div><div class="fill"></div>
      <p class="mt">Le projet s'inscrit-il dans le cadre de l'entreprise / d'un financeur ? Précisez :</p><div class="fill"></div>
      <h2>3. Contraintes et adaptations</h2>
      <p>Contraintes (disponibilités, mobilité, matérielles) :</p><div class="fill"></div>
      <p class="mt">Situation de handicap nécessitant une adaptation ? &nbsp; ☐ NON &nbsp;&nbsp; ☐ OUI (le référent handicap prendra contact)</p>
      <h2>4. Préconisation de l'organisme</h2>
      <p>Formation / parcours préconisé, adaptations prévues :</p><div class="fill"></div><div class="fill"></div>
      ${signatures}`,
    ),
  },

  TEST_POSITIONNEMENT: {
    label: "Test de positionnement (entrée)",
    html: wrap(
      "Test de positionnement",
      `<p><em>Ce questionnaire permet d'évaluer vos connaissances avant l'entrée en formation
      afin d'adapter le contenu et le rythme (indicateurs 8 et 9 du RNQ). Les réponses restent
      confidentielles.</em></p>
      <table class="doc-table">
        <tr><td>Stagiaire</td><td><strong>{{nom_complet}}</strong></td></tr>
        <tr><td>Formation</td><td>{{formation}} (réf. {{reference_formation}})</td></tr>
        <tr><td>Session</td><td>du {{date_debut}} au {{date_fin}}</td></tr>
      </table>
      <h2>1. Votre expérience</h2>
      <p>Avez-vous déjà suivi une formation dans ce domaine ? &nbsp; ☐ OUI &nbsp;&nbsp; ☐ NON — Si oui, laquelle et quand ?</p><div class="fill"></div>
      <p class="mt">Exercez-vous (ou avez-vous exercé) une activité en lien avec cette formation ? Précisez :</p><div class="fill"></div>
      <h2>2. Auto-évaluation de vos connaissances</h2>
      <table class="rate">
        ${rateHead(["Débutant", "Notions", "Intermédiaire", "Avancé"])}
        ${rateRow("Connaissances théoriques du domaine", 4)}
        ${rateRow("Pratique / mise en œuvre", 4)}
        ${rateRow("Outils et équipements associés", 4)}
        ${rateRow("Réglementation applicable", 4)}
      </table>
      <h2>3. Vos attentes</h2>
      <p>Qu'attendez-vous en priorité de cette formation ?</p><div class="fill"></div><div class="fill"></div>
      <p class="mt">Points particuliers à signaler au formateur (rythme, difficultés, adaptations…) :</p><div class="fill"></div>
      <p class="mt">Fait le {{date_jour}}.</p>
      <div class="doc-signatures">
        <div><div class="sig-label">Signature du stagiaire — {{nom_complet}}</div><div class="sig-box">{{signature_stagiaire}}</div></div>
      </div>`,
    ),
  },

  EVALUATION_ACQUIS: {
    label: "Évaluation des acquis (fin de formation)",
    html: wrap(
      "Évaluation des acquis de la formation",
      `<p><em>Cette grille atteste de l'évaluation de l'atteinte des objectifs par le
      bénéficiaire (indicateur 11 du RNQ).</em></p>
      <table class="doc-table">
        <tr><td>Stagiaire</td><td><strong>{{nom_complet}}</strong></td></tr>
        <tr><td>Formation</td><td>{{formation}} (réf. {{reference_formation}})</td></tr>
        <tr><td>Période</td><td>du {{date_debut}} au {{date_fin}} — {{duree}}</td></tr>
        <tr><td>Évaluateur (formateur)</td><td class="fillcell"></td></tr>
      </table>
      <h2>Objectifs pédagogiques de la formation</h2>
      <p>{{objectifs}}</p>
      <h2>Grille d'évaluation</h2>
      <table class="rate">
        ${rateHead(["Acquis", "En cours d'acquisition", "Non acquis"])}
        ${rateRow("Objectif / compétence 1 : ______________________________", 3)}
        ${rateRow("Objectif / compétence 2 : ______________________________", 3)}
        ${rateRow("Objectif / compétence 3 : ______________________________", 3)}
        ${rateRow("Objectif / compétence 4 : ______________________________", 3)}
        ${rateRow("Objectif / compétence 5 : ______________________________", 3)}
      </table>
      <h2>Modalités d'évaluation utilisées</h2>
      <p>{{modalites_evaluation}}</p>
      <h2>Résultat global</h2>
      <p>☐ Objectifs atteints &nbsp;&nbsp; ☐ Objectifs partiellement atteints &nbsp;&nbsp; ☐ Objectifs non atteints</p>
      <p class="mt">Observations / préconisations :</p><div class="fill"></div><div class="fill"></div>
      <p class="mt">Fait le {{date_jour}}.</p>
      <div class="doc-signatures">
        <div><div class="sig-label">Le formateur / évaluateur</div><div class="sig-box"></div></div>
        <div><div class="sig-label">Le stagiaire — {{nom_complet}}</div><div class="sig-box">{{signature_stagiaire}}</div></div>
      </div>
      ${orgStampBlock}`,
    ),
  },

  REMISE_SUPPORTS: {
    label: "Attestation de remise des supports",
    html: wrap(
      "Attestation de remise des supports de formation",
      `<p><em>À remettre à l'organisme de formation (indicateur 19 du RNQ — mise à
      disposition des ressources pédagogiques).</em></p>
      <p class="mt">Je soussigné(e) <strong>{{nom_complet}}</strong>, stagiaire de la formation
      <strong>{{formation}}</strong> (réf. {{reference_formation}}) qui s'est déroulée
      du {{date_debut}} au {{date_fin}},</p>
      <p>déclare avoir reçu les supports pédagogiques de la formation remis par l'organisme
      <strong>{{organisme}}</strong> :</p>
      <table class="doc-table">
        <tr><td>☐ Support de cours (papier / numérique)</td><td>☐ Accès plateforme e-learning</td></tr>
        <tr><td>☐ Mémentos / fiches pratiques</td><td>☐ Documentation réglementaire</td></tr>
        <tr><td colspan="2">☐ Autre : ______________________________________________</td></tr>
      </table>
      <p class="mt">Fait à {{organisme_ville}}, le {{date_jour}}.</p>
      ${signatures}`,
    ),
  },
};

// ── Contrat de sous-traitance de formation (formateur) ──
export function contratFormateurHtml(): string {
  return wrap(
    "Contrat de sous-traitance de formation",
    `<p>Entre les soussignés :</p>
    <p><strong>1 — {{organisme}}</strong>, {{organisme_adresse}} — SIRET {{organisme_siret}},
    organisme de formation enregistré sous le numéro de déclaration d'activité {{organisme_nda}}
    auprès du Préfet de région Île-de-France, représenté par {{organisme_representant}},
    ci-après « <strong>le donneur d'ordre</strong> »,</p>
    <p>Et</p>
    <p><strong>2 — {{formateur_nom}}</strong>{{formateur_coords}}, ci-après
    « <strong>le sous-traitant</strong> »,</p>
    <p>Il a été convenu ce qui suit :</p>

    <h2>Article 1 — Nature du contrat</h2>
    <p>Le présent contrat est conclu dans le cadre d'une prestation de formation ponctuelle
    réalisée par le sous-traitant au bénéfice du donneur d'ordre.</p>

    <h2>Article 2 — Objet du contrat</h2>
    <table class="doc-table">
      <tr><td>Formation</td><td><strong>{{formation}}</strong> ({{reference_formation}})</td></tr>
      <tr><td>Dates</td><td>du {{date_debut}} au {{date_fin}}</td></tr>
      <tr><td>Durée</td><td>{{duree}} — soit {{nb_jours}} jour(s)</td></tr>
      <tr><td>Lieu / modalité</td><td>{{lieu}} — {{modalite}}</td></tr>
    </table>

    <h2>Article 3 — Durée du contrat</h2>
    <p>Le présent contrat est strictement limité à la prestation de formation visée à
    l'article 2. Il cesse de plein droit à son terme.</p>

    <h2>Article 4 — Obligations du sous-traitant</h2>
    <p>Le sous-traitant s'engage à : communiquer au donneur d'ordre une copie de son
    immatriculation (extrait K-bis / SIRET) avant le début de la formation ; animer la
    formation dans le respect des objectifs fixés par le donneur d'ordre ; animer
    personnellement la formation, sauf situation exceptionnelle et après accord du donneur
    d'ordre ; communiquer ses besoins en matériel (projecteur, tableau, supports…) au moins
    7 jours avant le début ; assurer l'évaluation des stagiaires à l'issue de l'action de
    formation (article L.6353-1 du Code du travail) ; participer, en tant que de besoin, aux
    réunions de préparation, jurys d'examen et remises de diplôme.</p>

    <h2>Article 5 — Obligations du donneur d'ordre</h2>
    <p>Le donneur d'ordre s'engage à : confier au sous-traitant la formation prévue à
    l'article 2 ; prendre en charge la gestion administrative et logistique de la formation ;
    transmettre une copie des feuilles de présence signées par les stagiaires ; transmettre
    une copie des questionnaires de satisfaction remplis ; prévenir le sous-traitant au moins
    7 jours à l'avance en cas d'annulation ou de report.</p>

    <h2>Article 6 — Modalités financières</h2>
    <table class="doc-table">
      <tr><td>Tarif journalier (€ HT)</td><td><strong>{{prix_jour}}</strong></td></tr>
      <tr><td>Nombre de jours</td><td>{{nb_jours}}</td></tr>
      <tr><td>Total (€ HT)</td><td><strong>{{total}}</strong></td></tr>
    </table>
    <p>Le paiement sera effectué à réception de la facture signée, datée et tamponnée par le
    sous-traitant.</p>

    <h2>Article 7 — Dispositions diverses</h2>
    <p>Le présent contrat ne crée entre les parties aucun lien de subordination, le
    sous-traitant demeurant libre et responsable du contenu de la formation. Le sous-traitant
    dispose d'une propriété intellectuelle et/ou artistique sur le contenu de sa formation ;
    le donneur d'ordre s'engage à ne pas le reproduire ni le diffuser sans son accord.</p>

    <p class="mt">Fait à {{organisme_ville}}, le {{date_jour}}, en deux exemplaires.</p>
    <div class="doc-signatures">
      <div><div class="sig-label">Le donneur d'ordre — {{organisme_representant}}</div><div class="sig-box">${stamp}</div></div>
      <div><div class="sig-label">Le sous-traitant — {{formateur_nom}}</div><div class="sig-box">{{signature_formateur}}</div></div>
    </div>`,
  );
}

// ── Compte-rendu pédagogique formateur (rempli) ──
export function compteRenduFormateurHtml(): string {
  const ligne = (label: string, varKey: string) =>
    `<h2>${label}</h2><p>{{${varKey}}}</p>`;
  return wrap(
    "Compte rendu pédagogique du formateur",
    `<table class="doc-table">
      <tr><td>Intitulé de la formation</td><td><strong>{{formation}}</strong></td></tr>
      <tr><td>Nom du formateur</td><td>{{formateur_nom}}</td></tr>
      <tr><td>Date(s) de la formation</td><td>{{dates}}</td></tr>
    </table>
    <p class="mt"><em>Ce compte rendu alimente nos indicateurs qualité (Qualiopi)
    et nous aide à améliorer le déroulement de nos formations. Merci de votre collaboration !</em></p>
    ${ligne("Conditions matérielles de réalisation", "cr_conditions")}
    ${ligne("Difficultés rencontrées", "cr_difficultes")}
    ${ligne("Autres besoins nécessaires aux formateurs", "cr_besoins")}
    ${ligne("La documentation remise aux stagiaires est-elle adaptée, actualisée et suffisante ?", "cr_documentation")}
    ${ligne("Remarques particulières / Suggestions", "cr_remarques")}
    ${ligne("Rencontre avec la direction du centre de formation", "cr_rencontreDirection")}
    <p class="mt">Fait le {{date_jour}}.</p>
    <div class="doc-signatures">
      <div><div class="sig-label">Signature du formateur — {{formateur_nom}}</div><div class="sig-box">{{signature_formateur}}</div></div>
    </div>`,
  );
}

export type DocType = keyof typeof DOCUMENTS;

export function isDocType(t: string): boolean {
  return Object.prototype.hasOwnProperty.call(DOCUMENTS, t);
}

export const DOCUMENT_MENU = [
  "FICHE_INSCRIPTION",
  "FICHE_BESOIN",
  "TEST_POSITIONNEMENT",
  "PROGRAMME",
  "CONVOCATION",
  "CONVENTION_FORMATION",
  "CONVENTION_ENTREPRISE",
  "CONTRAT_FORMATION",
  "CONDITIONS_GENERALES",
  "REGLEMENT_INTERIEUR",
  "ATTESTATION_ENTREE",
  "EVALUATION_ACQUIS",
  "ATTESTATION_FIN",
  "ATTESTATION_REUSSITE",
  "CERTIFICAT_REALISATION",
  "SATISFACTION_STAGIAIRE",
  "SATISFACTION_ENTREPRISE",
  "SATISFACTION_OPCO",
].map((type) => ({ type, label: DOCUMENTS[type].label }));

// Variables contenant du HTML LÉGITIME généré en code (à NE PAS ré-échapper) :
//  - signature_* : images <img> de signature insérées par build-pdf ;
//  - champs multi-lignes : leur contenu est DÉJÀ échappé par ml() (resolve.ts)
//    puis converti en <br/> — seul HTML autorisé.
// Toute AUTRE variable = donnée utilisateur brute (nom, adresse, raison sociale,
// compte rendu, champ libre…) → échappée par défaut (anti-injection HTML, §26).
const TRUSTED_HTML_VARS = new Set([
  "signature_stagiaire",
  "signature_formateur",
  "objectifs",
  "programme_detail",
  "prerequis",
  "public_vise",
  "methodes_pedagogiques",
  "modalites_evaluation",
  // Photo d'identité (<img> data URL) + bloc prérequis (HTML construit dans
  // resolve.ts, valeurs dynamiques déjà échappées à la source).
  "photo",
  "bloc_prerequis",
]);

/**
 * Remplace les variables {{cle}} par leur valeur (vide si absente).
 * Les valeurs sont ÉCHAPPÉES par défaut ; seules les clés de TRUSTED_HTML_VARS
 * (HTML généré en interne) sont insérées telles quelles.
 */
export function renderTemplate(
  html: string,
  vars: Record<string, string>,
): string {
  return html.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    const v = vars[key];
    if (v === undefined) return "";
    return TRUSTED_HTML_VARS.has(key) ? v : escapeHtml(v);
  });
}
