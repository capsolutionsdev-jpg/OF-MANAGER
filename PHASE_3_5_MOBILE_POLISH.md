# Phase 3.5 — Mobile Optimization + PWA Polish

**Status :** ⏳ NOT STARTED
**Effort :** 25-30h
**Depends On :** Lot 2.3 (navigation), 3.1-3.4 (all pages)
**Impact :** Mobile engagement +35%, install rate +20%

---

## 📋 Overview

Optimiser pour **mobile-first**, PWA install, offline capability.

### Targets
```
MOBILE METRICS
├─ Touch targets: 48px minimum
├─ Form fields: stacked (1 column)
├─ Buttons: full-width (easier tap)
├─ Modals: full-height drawer (easier dismiss)
├─ Bottom nav: always accessible
└─ Gesture support (swipe, pull-to-refresh)

PWA FEATURES
├─ Install prompt (dismiss, remind, install)
├─ Home screen icon
├─ Splash screen (while loading)
├─ Offline fallback (cached pages)
├─ Push notifications (optional)
└─ App shelf (like native app)
```

---

## 🏗️ Implementation

### 1. Touch Targets (48px minimum)
```css
/* All interactive elements >= 48px */
button {
  min-height: 48px;
  min-width: 48px;
  padding: 12px 16px;
}

input, textarea, select {
  min-height: 48px;
  padding: 12px;
  font-size: 16px; /* Prevents zoom on iOS */
}

/* Form labels are big enough to tap */
label {
  font-size: 16px;
  margin-bottom: 12px;
}
```

### 2. Mobile-First Form Layout
```typescript
// Before: 2-column grid
<form className="grid grid-cols-2 gap-4">
  <input placeholder="First" />
  <input placeholder="Last" />
</form>

// After: Mobile stacked, desktop grid
<form className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <input placeholder="First" />
  <input placeholder="Last" />
</form>
```

### 3. Bottom Navigation
```typescript
export function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t md:hidden">
      <div className="flex justify-around">
        <NavLink to="/formations" icon={BookOpen} label="Formations" />
        <NavLink to="/sessions" icon={Calendar} label="Sessions" />
        <NavLink to="/candidats" icon={Users} label="Candidats" />
        <NavLink to="/finance" icon={DollarSign} label="Finance" />
        <NavLink to="/profile" icon={User} label="Profile" />
      </div>
    </nav>
  )
}
```

### 4. PWA Installation
```typescript
// Check if PWA installable
export function useInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setPrompt(e)
    })
    
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      console.log('PWA installed')
    })
  }, [])
  
  const handleInstall = async () => {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    console.log(`User response: ${outcome}`)
    setPrompt(null)
  }
  
  return { prompt, isInstalled, handleInstall }
}

// Install button
export function InstallButton() {
  const { prompt, isInstalled, handleInstall } = useInstallPrompt()
  
  if (isInstalled || !prompt) return null
  
  return (
    <button onClick={handleInstall} className="flex items-center gap-2">
      📱 Install App
    </button>
  )
}
```

### 5. Offline Fallback
```typescript
// service-worker.ts
const CACHE_NAME = 'app-v1'

// Cache critical pages on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/formations',
        '/sessions',
        '/offline.html',
      ])
    })
  )
})

// Network-first, fallback to cache
self.addEventListener('fetch', (event) => {
  if (event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200) {
            return caches.match(event.request)
          }
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone())
            return response
          })
        })
        .catch(() => caches.match(event.request))
    )
  }
})
```

### 6. Mobile Viewport
```html
<!-- manifest.webmanifest -->
{
  "name": "OF Manager",
  "short_name": "OFM",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1A5FD4"
}
```

---

## ✅ Checklist

- [ ] Touch targets: 48px minimum (all interactive)
- [ ] Forms: mobile stacked, desktop grid
- [ ] Buttons: full-width on mobile
- [ ] Modals: full-height drawer on mobile
- [ ] Bottom nav (mobile only)
- [ ] PWA manifest + install prompt
- [ ] Offline fallback (service worker)
- [ ] Home screen icon (192x192, 512x512)
- [ ] Splash screen (while loading)
- [ ] Apple status bar (color scheme)
- [ ] Responsive images (srcset)
- [ ] Keyboard: auto-correct disabled (if needed)
- [ ] Testing: iOS Safari + Android Chrome

---

**Next:** Phase 4.2 (Core Web Vitals)
