import { PrismaClient, QualiopiStatut, SeanceType } from "@prisma/client";
import { INDICATEURS } from "../src/lib/qualiopi-indicateurs";

const prisma = new PrismaClient();

async function main() {
  // Indicateurs cloisonnés par organisme : on cible le 1er organisme en base.
  const org = await prisma.organisme.findFirst({ select: { id: true } });
  if (!org) throw new Error("Aucun organisme en base : créez-en un avant ce script.");
  const organismeId = org.id;
  for (const ind of INDICATEURS) {
    await prisma.qualiopiIndicateur.upsert({
      where: { organismeId_numero: { organismeId, numero: ind.numero } },
      update: { libelle: ind.libelle },
      create: { organismeId, numero: ind.numero, libelle: ind.libelle, statut: QualiopiStatut.EN_COURS },
    });
  }
  await prisma.qualiopiIndicateur.updateMany({
    where: { organismeId, numero: { in: [1, 2, 4, 5, 9] } },
    data: { statut: QualiopiStatut.CONFORME },
  });

  const s = await prisma.session.findFirst({
    where: { reference: "SES-DEMO-01" },
    include: { seances: true, inscriptions: true },
  });
  let seanceId = "";
  if (s) {
    for (const insc of s.inscriptions) {
      const app = await prisma.apprenant.upsert({
        where: { candidatId: insc.candidatId },
        update: {},
        create: { candidatId: insc.candidatId },
      });
      if (!insc.apprenantId)
        await prisma.inscription.update({ where: { id: insc.id }, data: { apprenantId: app.id } });
    }
    let se = s.seances[0];
    if (!se)
      se = await prisma.seance.create({
        data: { sessionId: s.id, date: s.dateDebut, type: SeanceType.JOURNEE, heureDebut: "09:00", heureFin: "17:00" },
      });
    seanceId = se.id;
  }
  console.log("SESSION_ID=" + (s?.id ?? ""));
  console.log("SEANCE_ID=" + seanceId);
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
