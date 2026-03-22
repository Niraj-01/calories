# Calories App – Project Context

## Overview

An **AI-powered mobile web app** for automated calorie, macro, and water tracking. Users can log meals by either taking a photo (run through an AI vision model which identifies the food and fetches its nutritional data), scanning a product barcode, or searching a food database. The app features automatic BMR/TDEE calorie goal calculations, historical progress charts, daily water tracking, and gamified streaks.

Built as a **Next.js 14 App Router** project, designed to feel like a premium native mobile app (PWA-style, bottom nav, glassmorphism UI, Apple Dark minimal aesthetic).

---

## Tech Stack

| Layer               | Technology                                           |
| ------------------- | ---------------------------------------------------- |
| Framework           | Next.js 14 (App Router, `"use client"` where needed) |
| Styling             | CSS Modules + global CSS variables (no Tailwind)     |
| Auth                | Firebase Authentication — Google Sign-In             |
| Database            | Firebase Cloud Firestore (NoSQL)                     |
| AI Vision (Camera)  | client-side `Transformers.js` / Hugging Face model   |
| Barcode Scanner     | `html5-qrcode` (client-side)                         |
| Food Search/Barcode | Open Food Facts REST API                             |
| Charts & Viz        | `recharts` (Responsive line & bar charts)            |
| Hosting             | Firebase App Hosting / Firebase Hosting              |

---

## Project Structure

```
/app                        # Next.js App Router pages
  layout.js                 # Root layout — wraps app in AuthProvider
  template.js               # Page transition wrapper
  page.js                   # Entry point — renders HomePage or LoginPage
  globals.css               # Global design tokens (CSS variables), utility classes
  /dashboard/page.js        # Dashboard route (Charts & Weight tracking)
  /history/page.js          # History route
  /my-foods/page.js         # My Foods route
  /settings/page.js         # Settings route

/src
  /components               # All UI components (each has a paired .module.css)
    HomePage.js             # Main dashboard — calorie ring, water tracker, streaks, meal sections
    CalorieRing.js          # Animated SVG ring (consumed vs. goal)
    MacroBar.js             # Protein / Carbs / Fat summary display
    MealSection.js          # Collapsible meal card (Breakfast, Lunch, Dinner, Snacks)
    WaterTracker.js         # Daily water intake tracking progress bar
    BarcodeScannerModal.js  # Barcode scanner UI via html5-qrcode
    SearchModal.js          # Text search modal — queries Open Food Facts
    CameraModal.js          # AI scan modal — image upload → analyze
    DashboardPage.js        # Recharts visualizations for calories, macros, water, weight
    HistoryPage.js          # Past days' logs with per-day calorie totals
    MyFoodsPage.js          # User's saved custom foods (CRUD)
    SettingsPage.js         # Body profile (age, weight, height) + automated TDEE/BMR goal setter
    LoginPage.js            # Google Sign-In screen
    BottomNav.js            # Fixed bottom navigation bar

  /context
    AuthContext.js          # React context — exposes { user, loading, signIn, signOut }

  /services
    firestoreService.js     # All Firestore CRUD (food entries, generic logs, user settings, streaks, weight)
    nutritionService.js     # Open Food Facts API integrations

  firebase.js               # Firebase app init — exports { db, auth, googleProvider }
```

---

## Data Model (Firestore)

```
users/{uid}                 # User Profile and Settings
  calorieGoal: number       # Auto-calculated from BMR/TDEE if profile is set
  displayName: string
  age: number
  gender: "male" | "female"
  height: number            # cm
  weight: number            # kg
  weightGoal: "lose" | "maintain" | "gain"
  activityLevel: number     # 1.2 to 1.9 multiplier
  currentStreak: number     # Gamification consecutive log days
  lastLogDate: string       # "YYYY-MM-DD"

users/{uid}/logs/{YYYY-MM-DD}   # Daily Aggregates & Logs
  waterIntake: number           # ml
  loggedWeight: number          # kg

users/{uid}/logs/{YYYY-MM-DD}/entries/{entryId}   # Food Entries
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

> **Important:** All macro values stored in Firestore are **already scaled** to the user's chosen serving size. The base values (per 100g) are only used temporarily during the food selection flow and scaled before writing to Firestore.

---

## Core Flows & Logic

1. **AI Food Scan (`CameraModal`)**: Client captures an image, runs inference client-side OR posts to a server API to recognize food, fetching macros via Open Food Facts / Edamam, letting user amend serving size before saving to Firebase.
2. **Barcode Scan (`BarcodeScannerModal`)**: Opens camera feed via `html5-qrcode`. On successful code detection, hits `https://world.openfoodfacts.org/api/v2/product/{code}.json` to parse name, brand, and 100g macros.
3. **Automated Goals (`SettingsPage`)**: Captures Body Profile traits. Under the hood, applies the **Mifflin-St Jeor Equation** for BMR, multiplies by `activityLevel` for TDEE, then applies an offset based on `weightGoal` (e.g., `-500` for lose weight).
4. **Streaks (`HomePage`)**: On successful food logging array read, compares `today` to `userSettings.lastLogDate`. Increments `currentStreak` if it's the next day; resets if a day was skipped; shows a "🔥" badge in the UI.

---

## Auth & State Architecture

- `AuthContext.js` wraps the entire app and listens to `onAuthStateChanged`.
- All Firestore reads/writes require `user.uid` — never call Firestore services without checking auth first.
- Modals use `createPortal(...)` rendered into `document.body`.
- `dateKey(date?)` from `firestoreService.js` returns `YYYY-MM-DD` — used as the Firestore log document ID for each day.
- Global styles leverage heavily CSS variables (`app/globals.css`) for consistent dark mode and dynamic colors. Avoid inline styles in React components.

---

## Navigation & Routing

`BottomNav.js` provides 5 tabs routed via Next.js `<Link>`:

- `/` → Today (HomePage - Tracking & Streaks)
- `/dashboard` → Dashboard (Recharts visual progress)
- `/history` → History (List of past meals)
- `/my-foods` → My Foods (Saved items library)
- `/settings` → Settings (Profile, Goals, Sign out)
