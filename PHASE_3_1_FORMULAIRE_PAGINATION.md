# Phase 3.1 — Formulaire Candidat Pagination Multi-Étapes

**Status :** ⏳ NOT STARTED
**Effort :** 30-35h
**Depends On :** Lot 2.2 (components), 2.4 (WCAG)
**Impact :** −78% mobile form abandons, +25% completion rate

---

## 📋 Overview

Refactoriser le formulaire candidat de **1 page géante** → **5 étapes animées** avec soft-delete undo.

### Current State (Problems)
```
1 PAGE HUGE FORM
├─ 45+ fields
├─ 8 sections collapsibles
├─ Mobile: scroll hell (users abandon at 50%)
├─ No progress indicator
├─ Accidental delete = lost data (0 undo)
└─ Form height = 3000px+
```

### Target State (5 Steps)
```
STEP 1: Identité (5 fields)
├─ First name, Last name, Email, Phone, DOB
├─ Progress: 20%
└─ [Next] button

STEP 2: Adresse (6 fields)
├─ Street, City, Postal, Country, Address 2, Région
├─ Progress: 40%
├─ [Back] [Next] buttons
└─ Auto-save (localStorage)

STEP 3: Formation (3 fields)
├─ Select Formation, Modalité, Spécificités
├─ Progress: 60%
├─ Prerequisite checker (dynamic)
└─ [Back] [Next] buttons

STEP 4: Prérequis (dynamic, 0-10 fields)
├─ Conditional fields based on Formation.requiredDocs
├─ File uploads (SST card, CNAPS, etc.)
├─ Progress: 80%
└─ [Back] [Next] buttons

STEP 5: Confirmation (Review + Submit)
├─ Read-only summary of all data
├─ Edit button per section (jump to step)
├─ Soft-delete with 30s undo
├─ Progress: 100%
└─ [Back] [Submit] buttons
```

---

## 🎯 Implementation Plan

### Architecture
```typescript
// lib/forms/candidat-form.ts
export type FormStep = 'identite' | 'adresse' | 'formation' | 'prerequis' | 'confirmation'

export interface CandidatFormData {
  // Step 1
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: Date
  
  // Step 2
  street: string
  city: string
  postal: string
  country: string
  region: string
  
  // Step 3
  formationId: string
  modalite: 'presentiel' | 'distanciel' | 'hybrid'
  specificites: string[]
  
  // Step 4
  prerequisites: {
    docType: string    // 'sst_card', 'cnaps', 'diploma', etc.
    files: File[]
    expiryDate?: Date
  }[]
  
  // Meta
  createdAt: Date
  updatedAt: Date
  savedToServer: boolean
}

export interface FormValidation {
  step: FormStep
  isValid: boolean
  errors: Record<string, string[]>
  warnings: Record<string, string>
}

// lib/forms/use-candidat-form.ts
export function useCandidatForm() {
  const [data, setData] = useState<CandidatFormData>(initialData)
  const [step, setStep] = useState<FormStep>('identite')
  const [errors, setErrors] = useState<FormValidation['errors']>({})
  const [savedDraft, setSavedDraft] = useState<CandidatFormData | null>(null)
  
  // Auto-save to localStorage every 30s
  useEffect(() => {
    const timer = setInterval(() => {
      localStorage.setItem('candidat-form-draft', JSON.stringify(data))
      setSavedDraft(data)
    }, 30000)
    return () => clearInterval(timer)
  }, [data])
  
  // Restore from localStorage on mount
  useEffect(() => {
    const draft = localStorage.getItem('candidat-form-draft')
    if (draft) {
      setData(JSON.parse(draft))
      setSavedDraft(JSON.parse(draft))
    }
  }, [])
  
  const validate = (stepToValidate: FormStep) => {
    const validation = validateStep(stepToValidate, data)
    setErrors(validation.errors)
    return validation.isValid
  }
  
  const goToStep = (nextStep: FormStep) => {
    if (validate(step)) {
      setStep(nextStep)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
  
  const handleSubmit = async () => {
    if (!validate('confirmation')) {
      return
    }
    
    try {
      const response = await fetch('/api/candidat', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      
      if (response.ok) {
        localStorage.removeItem('candidat-form-draft')
        // Show success + redirect
      }
    } catch (error) {
      setErrors({ submit: [error.message] })
    }
  }
  
  return {
    data,
    setData,
    step,
    goToStep,
    errors,
    validate,
    handleSubmit,
    savedDraft,
    isDirty: JSON.stringify(data) !== JSON.stringify(savedDraft),
  }
}
```

### Component Structure
```
FormPagination/
├─ index.tsx (main wrapper + progress bar)
├─ Step1Identite.tsx
├─ Step2Adresse.tsx
├─ Step3Formation.tsx
├─ Step4Prerequis.tsx (dynamic based on formation)
├─ Step5Confirmation.tsx
├─ ProgressBar.tsx (visual progress, step nav)
├─ UndoToast.tsx (soft-delete 30s window)
└─ ValidationErrors.tsx (aria-live alerts)
```

### Step 1 — Identité
```typescript
export function Step1Identite({ data, setData, errors, onNext }) {
  const handleChange = (field: string, value: any) => {
    setData({
      ...data,
      [field]: value,
    })
  }
  
  return (
    <FormStep title="Identité" subtitle="Vos coordonnées" step={1} totalSteps={5}>
      <div className="space-y-4">
        <Input
          label="Prénom"
          value={data.firstName}
          onChange={(e) => handleChange('firstName', e.target.value)}
          error={errors.firstName?.[0]}
          required
        />
        
        <Input
          label="Nom"
          value={data.lastName}
          onChange={(e) => handleChange('lastName', e.target.value)}
          error={errors.lastName?.[0]}
          required
        />
        
        <Input
          label="Email"
          type="email"
          value={data.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={errors.email?.[0]}
          required
        />
        
        <Input
          label="Téléphone"
          type="tel"
          value={data.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          error={errors.phone?.[0]}
          required
        />
        
        <Input
          label="Date de naissance"
          type="date"
          value={data.dateOfBirth}
          onChange={(e) => handleChange('dateOfBirth', e.target.value)}
          error={errors.dateOfBirth?.[0]}
          required
        />
      </div>
      
      <Button onClick={onNext} className="w-full mt-6">
        Suivant →
      </Button>
    </FormStep>
  )
}
```

### Step 4 — Prérequis (Dynamic)
```typescript
export function Step4Prerequis({ data, setData, formation, errors, onNext, onBack }) {
  // Dynamically load required docs based on formation
  const requiredDocs = getFormationPrerequisites(formation.id)
  
  return (
    <FormStep title="Prérequis & Documents" step={4} totalSteps={5}>
      {requiredDocs.map((doc) => (
        <div key={doc.id} className="mb-6 p-4 border rounded-lg">
          <h3 className="font-semibold mb-2">{doc.label}</h3>
          <p className="text-sm text-muted mb-4">{doc.description}</p>
          
          <FileUpload
            label={`Télécharger ${doc.label}`}
            accept={doc.fileTypes.join(',')}
            maxSize={doc.maxSizeMb * 1024 * 1024}
            onChange={(files) => handleUpload(doc.id, files)}
            error={errors[`doc_${doc.id}`]?.[0]}
            required={doc.required}
          />
          
          {doc.hasExpiry && (
            <Input
              label="Date d'expiration"
              type="date"
              onChange={(e) => handleExpiryDate(doc.id, e.target.value)}
              error={errors[`expiry_${doc.id}`]?.[0]}
            />
          )}
        </div>
      ))}
    </FormStep>
  )
}
```

### Step 5 — Confirmation & Soft-Delete Undo
```typescript
export function Step5Confirmation({ data, onSubmit, onUndo }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [undoTimeLeft, setUndoTimeLeft] = useState(30)
  
  const handleDelete = () => {
    setIsDeleting(true)
    
    // 30s countdown
    const interval = setInterval(() => {
      setUndoTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          // Permanently delete
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }
  
  const handleUndo = () => {
    onUndo()
    setIsDeleting(false)
    setUndoTimeLeft(30)
  }
  
  return (
    <FormStep title="Confirmation" step={5} totalSteps={5}>
      <div className="space-y-6">
        {/* Summary sections */}
        <SummarySection title="Identité" data={data} onEdit={() => goToStep('identite')}>
          <p>{data.firstName} {data.lastName}</p>
          <p>{data.email}</p>
        </SummarySection>
        
        {/* ... more summary sections */}
        
        {/* Soft-delete undo */}
        {isDeleting && (
          <UndoToast
            message={`Suppression en cours... (${undoTimeLeft}s)`}
            onUndo={handleUndo}
          />
        )}
      </div>
      
      <div className="flex gap-3 mt-6">
        <Button variant="secondary" onClick={onBack}>
          ← Retour
        </Button>
        
        <Button variant="destructive" onClick={handleDelete}>
          Supprimer la réponse
        </Button>
        
        <Button onClick={onSubmit} className="ml-auto">
          Soumettre →
        </Button>
      </div>
    </FormStep>
  )
}
```

---

## 📊 Success Metrics

| Metric | Before | Target | Method |
|--------|--------|--------|--------|
| Form completion rate | 55% | 95%+ | Analytics |
| Mobile abandonment | 45% | <10% | Session analytics |
| Avg time to complete | 12min | 5min | Form analytics |
| Data loss (accidental delete) | 8/month | 0 | Soft-delete undo |
| Step dropout (mobile) | 60% at step 2 | <5% | Step analytics |

---

## ✅ Checklist

- [ ] Schema validation (zod)
- [ ] Form state machine (steps, transitions)
- [ ] Auto-save to localStorage (every 30s)
- [ ] Restore draft on page reload
- [ ] Progress bar (visual + accessible)
- [ ] Step-by-step layout (one step per page)
- [ ] Keyboard nav (Tab, Enter, Esc)
- [ ] Mobile optimized (stacked layout)
- [ ] Accessibility (WCAG 2.1 AA)
- [ ] Error messages (aria-live)
- [ ] Soft-delete with 30s undo window
- [ ] E2E tests (Playwright)
- [ ] Analytics tracking (steps completed, abandon rate)

---

**Next:** Phase 3.2 (Tables with Sorting + Sticky Headers + Bulk Actions)
