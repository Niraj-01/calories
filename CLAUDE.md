# Calories App – Project Context

## Overview

An **AI-powered mobile web app** for automated calorie and macro tracking. Users can log meals by either searching a food database or taking a photo — the photo is run through an AI vision model which identifies the food and fetches its nutritional data automatically.

Built as a **Next.js 14 App Router** project, designed to feel like a native mobile app (PWA-style, bottom nav, glassmorphism UI).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, `"use client"` where needed) |
| Styling | CSS Modules + global CSS variables (no Tailwind) |
| Auth | Firebase Authentication — Google Sign-In via popup |
| Database | Firebase Cloud Firestore (NoSQL) |
| AI Vision | Hugging Face Inference API — `nateraw/food101` model |
| Nutrition | Edamam Nutrition Data API (used in AI pipeline only) |
| Food Search | Open Food Facts REST API (used in manual search modal) |
| Hosting | Firebase App Hosting (configured in `firebase.json` + `apphosting.yaml`) |

---

## Project Structure

```
/app                        # Next.js App Router pages
  layout.js                 # Root layout — wraps app in AuthProvider
  template.js               # Page transition wrapper
  page.js                   # Entry point — renders HomePage or LoginPage
  globals.css               # Global design tokens (CSS variables), utility classes
  /api/analyze-food/
    route.js                # POST — HuggingFace → Edamam pipeline (server-side)
  /history/page.js          # History route
  /my-foods/page.js         # My Foods route
  /settings/page.js         # Settings route

/src
  /components               # All UI components (each has a paired .module.css)
    HomePage.js             # Main dashboard — calorie ring, macros, meal sections
    CalorieRing.js          # Animated SVG ring (consumed vs. goal)
    MacroBar.js             # Protein / Carbs / Fat summary display
    MealSection.js          # Collapsible meal card (Breakfast, Lunch, Dinner, Snacks)
    SearchModal.js          # Text search modal — queries Open Food Facts
    CameraModal.js          # AI scan modal — image upload → analyze → log
    HistoryPage.js          # Past days' logs with per-day calorie totals
    MyFoodsPage.js          # User's saved custom foods (CRUD)
    SettingsPage.js         # Calorie goal + display name settings
    LoginPage.js            # Google Sign-In screen
    BottomNav.js            # Fixed bottom navigation bar

  /context
    AuthContext.js          # React context — exposes { user, loading, signIn, signOut }
                            # useAuth() hook is the standard way to access auth state

  /services
    firestoreService.js     # All Firestore CRUD — food entries, user settings, my foods
    nutritionService.js     # Open Food Facts search + debounce helper

  firebase.js               # Firebase app init — exports { db, auth, googleProvider }
```

---

## Data Model (Firestore)

```
users/{uid}
  calorieGoal: number
  displayName: string

users/{uid}/logs/{YYYY-MM-DD}/entries/{entryId}
  name: string
  brand: string
  calories: number        # already scaled to serving size
  protein: number
  carbs: number
  fat: number
  meal: "breakfast" | "lunch" | "dinner" | "snacks"
  servingAmount: number   # e.g. 150
  servingUnit: string     # "g" | "ml" | "oz" | "serving"
  createdAt: Timestamp

users/{uid}/myFoods/{foodId}
  name, brand, calories, protein, carbs, fat, createdAt
```

> **Important:** All macro values stored in Firestore are **already scaled** to the user's chosen serving size. The base values (per 100g) are only used temporarily during the food selection flow and scaled by `handleAddFood` in `HomePage.js` before writing to Firestore.

---

## AI Food Scan Pipeline

This is the core feature. Route: `POST /api/analyze-food`

1. **Client** (`CameraModal.js`) uploads an image file via `FormData` to `/api/analyze-food`.
2. **Server** (`route.js`) forwards the raw image buffer to HuggingFace (`nateraw/food101`).
3. HuggingFace returns a ranked list; the **top label** (e.g. `"pizza"`) is extracted.
4. The food name is passed to the **Edamam Nutrition Data API** for 100g macro data.
5. The result `{ name, confidence, calories, protein, carbs, fat }` is returned to the client.
6. The user can then **adjust the serving size** — macros are recalculated live in the modal.
7. On confirm, `CameraModal` calls `onAdd(foodData)` → `HomePage.handleAddFood()` → Firestore.

**Environment variables required:**
```
HUGGINGFACE_API_KEY=
EDAMAM_APP_ID=
EDAMAM_APP_KEY=
```

---

## Auth Flow

- `AuthContext.js` wraps the entire app and listens to `onAuthStateChanged`.
- `app/page.js` reads `{ user, loading }` from `useAuth()` and renders either `<LoginPage>` or `<HomePage>`.
- All Firestore reads/writes require `user.uid` — never call Firestore services without checking auth first.

---

## Styling Conventions

- **CSS Variables** are defined in `app/globals.css` — always use var tokens (e.g. `var(--accent)`, `var(--bg-card)`, `var(--text-primary)`).
- **Utility classes** like `.btn`, `.btn-primary`, `.card`, `.skeleton`, `.input`, `.num`, `.label`, `.page`, `.container` are defined globally and used across components.
- **Never use inline styles** for colors or spacing — always prefer CSS variables or module classes.
- All components use **CSS Modules** (e.g. `styles.wrapper`) scoped to their file.

---

## Navigation

`BottomNav.js` provides 4 tabs routed via Next.js `<Link>`:
- `/` → Today (HomePage)
- `/history` → History
- `/my-foods` → My Foods
- `/settings` → Settings

---

## Key Conventions

- Use `"use client"` at the top of any component that uses hooks or browser APIs.
- `dateKey(date?)` from `firestoreService.js` returns `YYYY-MM-DD` — used as the Firestore log document ID for each day.
- The four meal types are `["breakfast", "lunch", "dinner", "snacks"]` (lowercase).
- Serving amount math: `storedValue = basePerHundredG * (servingAmount / 100)`.
- Modals use `createPortal(...)` rendered into `document.body`.
