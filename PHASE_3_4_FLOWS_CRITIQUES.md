# Phase 3.4 — Flows Critiques (Sessions, Finance, Documents)

**Status :** ⏳ NOT STARTED
**Effort :** 40-50h
**Depends On :** Lot 2.2, 2.3, 3.1, 3.2
**Impact :** Clarity +40%, error rate −45%

---

## 📋 Overview

Refactoriser 3 user flows critiques pour **clarté, robustesse, guidage**.

### 1. Session Creation Flow
```
START
├─ Session Metadata (date, capacity, formateurs)
├─ Room Selection (location, capacity check)
├─ Pricing (session cost, budget check)
├─ Confirmation + Calendar Add
└─ SUCCESS → Session visible in planning
```

### 2. Devis (Quote) Flow
```
START
├─ Formation Selection (+ price lookup)
├─ Candidate/Company (auto-populate if returning)
├─ Financing (CPF, OPCO, private, etc.)
├─ TVA + Total (auto-calculate)
├─ E-signature (YouSign integration)
├─ Confirmation + PDF email
└─ SUCCESS → Devis in database, follow-up automated
```

### 3. Document Generation Flow
```
START
├─ Document Type Selection (contract, invoice, cert, etc.)
├─ Data Validation (all required fields present)
├─ PDF Generation (Chromium, cached)
├─ Preview (before download)
└─ Download / Email / Archive
SUCCESS → Document archived + linked to dossier
```

---

## 🎯 Flow Improvements

### Session Creation — Enhancements
```typescript
// Before: Unclear steps
<form>
  <input placeholder="Date" />
  <input placeholder="Formateurs" />
  <input placeholder="Salle" />
  <submit>Save</submit>
</form>

// After: Clear steps with validation
<StepForm steps={['Metadata', 'Rooms', 'Pricing', 'Confirm']}>
  <Step1 />
  {/* Dynamic capacity check */}
  <ErrorMessage>
    {capacityIssue && "Salle trop petite pour X candidats"}
  </ErrorMessage>
  
  <Step2 />
  {/* Budget validation */}
  {budgetExceeded && <Alert severity="warning">Budget dépassé</Alert>}
  
  <Step3 />
  {/* Calendar integration */}
  <Button onClick={addToCalendar}>+ Add to Google Calendar</Button>
  
  <Step4 />
  {/* Confirmation with summary */}
  <SubmitButton />
</StepForm>
```

### Devis Flow — Enhancements
```typescript
// Auto-populate returning customer
useEffect(() => {
  if (customerId) {
    const customer = getCustomer(customerId)
    setFormData({
      companyName: customer.company,
      contact: customer.contact,
      email: customer.email,
      // ...
    })
  }
}, [customerId])

// Auto-calculate TVA
useEffect(() => {
  const htPrice = formations[formationId].price
  const tvaPct = getTvaPercentage(company.region)
  const tva = htPrice * (tvaPct / 100)
  const ttc = htPrice + tva
  setTotals({ ht: htPrice, tva, ttc })
}, [formationId, company.region])

// E-signature integration
const handleSignature = async () => {
  const response = await signWithYouSign({
    devisId: devis.id,
    signerEmail: contact.email,
    signerName: contact.name,
  })
  // Webhook listens for signature completion
}
```

### Document Generation — Enhancements
```typescript
// Validate all required fields before generation
const validateDocument = (docType, data) => {
  const required = DOCUMENT_REQUIREMENTS[docType]
  return required.every(field => data[field])
}

// Cache PDFs to reduce Chromium cost
const getPDF = async (docType, data) => {
  const cacheKey = `pdf:${docType}:${hash(data)}`
  const cached = await redis.get(cacheKey)
  if (cached) return cached
  
  const pdf = await generatePDF(docType, data)
  await redis.setex(cacheKey, 7200, pdf) // 2h TTL
  return pdf
}

// Preview before download
<PdfPreview data={data} />
<Button onClick={() => downloadPDF(pdf)}>Download</Button>
<Button onClick={() => emailPDF(contact.email)}>Send by Email</Button>
```

---

## ✅ Checklist

- [ ] Session Creation: metadata → rooms → pricing → confirm
- [ ] Room capacity auto-validation
- [ ] Calendar integration (Google/Outlook)
- [ ] Devis: auto-populate returning customers
- [ ] Devis: auto-calculate TVA based on region
- [ ] Devis: E-signature (YouSign) integration
- [ ] Devis: PDF email to customer
- [ ] Documents: validation before generation
- [ ] Documents: PDF caching (Chromium cost optimization)
- [ ] Documents: preview before download
- [ ] Error handling + recovery
- [ ] Accessibility (WCAG 2.1 AA)

---

**Next:** Phase 3.5 (Mobile Optimization)
