import { PDFDocument, AFRelationship, PDFName } from "pdf-lib";

// =============================================================
//  FACTUR-X — fusion PDF lisible + XML CII (EN 16931) en UN fichier hybride.
//
//  Factur-X = un PDF/A-3 qui embarque le XML structuré nommé EXACTEMENT
//  `factur-x.xml` (relation « Alternative ») + des métadonnées XMP déclarant le
//  profil. Le XML (généré en 4a par factureCiiXml) devient ainsi lisible par
//  l'humain (le PDF) ET par la machine (le XML), dans un seul fichier — c'est la
//  forme attendue par la réforme e-invoicing 2026 et par les PDP.
//
//  NB : la conformité PDF/A-3 STRICTE (OutputIntent + profil ICC sRGB, polices
//  toutes embarquées, validation veraPDF) est une finalisation à confirmer avant
//  transmission en production ; la PDP re-valide/normalise généralement le flux.
// =============================================================

const CREATOR_TOOL = "OF Manager";

/** Métadonnées XMP Factur-X : marqueurs PDF/A-3B + schéma d'extension (profil EN 16931). */
export function facturxXmp(meta: { numero: string; dateIso: string }): string {
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">Facture ${meta.numero}</rdf:li></rdf:Alt></dc:title>
  </rdf:Description>
  <rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/">
   <xmp:CreatorTool>${CREATOR_TOOL}</xmp:CreatorTool>
   <xmp:CreateDate>${meta.dateIso}</xmp:CreateDate>
  </rdf:Description>
  <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
   <pdfaid:part>3</pdfaid:part>
   <pdfaid:conformance>B</pdfaid:conformance>
  </rdf:Description>
  <rdf:Description rdf:about="" xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/" xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#" xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#">
   <pdfaExtension:schemas>
    <rdf:Bag>
     <rdf:li rdf:parseType="Resource">
      <pdfaSchema:schema>Factur-X PDFA Extension Schema</pdfaSchema:schema>
      <pdfaSchema:namespaceURI>urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#</pdfaSchema:namespaceURI>
      <pdfaSchema:prefix>fx</pdfaSchema:prefix>
      <pdfaSchema:property>
       <rdf:Seq>
        <rdf:li rdf:parseType="Resource"><pdfaProperty:name>DocumentFileName</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>Nom du fichier XML embarque</pdfaProperty:description></rdf:li>
        <rdf:li rdf:parseType="Resource"><pdfaProperty:name>DocumentType</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>INVOICE</pdfaProperty:description></rdf:li>
        <rdf:li rdf:parseType="Resource"><pdfaProperty:name>Version</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>Version du profil</pdfaProperty:description></rdf:li>
        <rdf:li rdf:parseType="Resource"><pdfaProperty:name>ConformanceLevel</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType><pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>Niveau de conformite</pdfaProperty:description></rdf:li>
       </rdf:Seq>
      </pdfaSchema:property>
     </rdf:li>
    </rdf:Bag>
   </pdfaExtension:schemas>
  </rdf:Description>
  <rdf:Description rdf:about="" xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#">
   <fx:DocumentType>INVOICE</fx:DocumentType>
   <fx:DocumentFileName>factur-x.xml</fx:DocumentFileName>
   <fx:Version>1.0</fx:Version>
   <fx:ConformanceLevel>EN 16931</fx:ConformanceLevel>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

/**
 * Produit le PDF Factur-X : reprend le PDF lisible (Chromium), y embarque le XML
 * CII sous le nom obligatoire `factur-x.xml`, et pose les métadonnées XMP.
 */
export async function buildFacturXPdf(
  pdfBytes: Uint8Array,
  xml: string,
  meta: { numero: string; date: Date },
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);

  // Fichier XML embarqué — nom EXACT `factur-x.xml`, relation « Alternative ».
  doc.attach(new TextEncoder().encode(xml), "factur-x.xml", {
    mimeType: "text/xml",
    description: "Facture electronique Factur-X (CII / EN 16931)",
    afRelationship: AFRelationship.Alternative,
    creationDate: meta.date,
    modificationDate: meta.date,
  });

  // Métadonnées XMP Factur-X (posées EN DERNIER pour rester le /Metadata final).
  const xmp = facturxXmp({ numero: meta.numero, dateIso: meta.date.toISOString() });
  const metaStream = doc.context.stream(new TextEncoder().encode(xmp), {
    Type: PDFName.of("Metadata"),
    Subtype: PDFName.of("XML"),
  });
  doc.catalog.set(PDFName.of("Metadata"), doc.context.register(metaStream));

  // useObjectStreams:false → métadonnées non compressées (plus proche PDF/A).
  return doc.save({ useObjectStreams: false });
}
