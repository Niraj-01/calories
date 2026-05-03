# Calories App — Diagrams

## 1. Flow Diagram (User → Data Path)

```mermaid
flowchart TD
    U([User]) --> A{Authenticated?}
    A -- No --> L[LoginPage<br/>Google Sign-In]
    L --> FB[(Firebase Auth)]
    FB --> A
    A -- Yes --> H[HomePage<br/>Today]

    H --> N{Bottom Nav}
    N --> H
    N --> D[Dashboard<br/>Recharts]
    N --> HI[History]
    N --> MF[My Foods]
    N --> S[Settings]

    H --> ADD{Add Food}
    ADD --> CAM[CameraModal<br/>AI Vision]
    ADD --> BAR[BarcodeScannerModal<br/>html5-qrcode]
    ADD --> SRC[SearchModal]
    ADD --> MFP[Pick from My Foods]

    CAM --> TJS[Transformers.js<br/>client inference]
    TJS --> OFF[(Open Food Facts API)]
    BAR --> OFF
    SRC --> OFF
    OFF --> SCALE[Scale macros to<br/>serving size]
    MFP --> SCALE

    SCALE --> FS[(Firestore<br/>users/uid/logs/date/entries)]
    H --> WAT[WaterTracker] --> FS
    S --> BMR[Mifflin-St Jeor<br/>BMR × activity ± goal] --> FS

    FS --> H
    FS --> D
    FS --> HI
    FS --> MF
    FS --> STR[Streak calc<br/>compare lastLogDate] --> H
```

## 2. Workflow Diagram (Logging a Meal — Sequence)

```mermaid
sequenceDiagram
    actor User
    participant UI as HomePage
    participant Modal as Camera/Barcode/Search Modal
    participant AI as Transformers.js
    participant OFF as Open Food Facts
    participant Svc as firestoreService
    participant DB as Firestore
    participant Streak as Streak Logic

    User->>UI: Tap "Add Food"
    UI->>Modal: Open modal (portal)

    alt Photo
        User->>Modal: Capture image
        Modal->>AI: Run vision inference
        AI-->>Modal: Predicted food label
        Modal->>OFF: Search by label
    else Barcode
        User->>Modal: Scan code
        Modal->>OFF: GET /product/{code}.json
    else Text Search
        User->>Modal: Query string
        Modal->>OFF: Search endpoint
    end

    OFF-->>Modal: name, brand, macros (per 100g)
    User->>Modal: Set serving + meal type
    Modal->>Modal: Scale macros to serving
    Modal->>Svc: addFoodEntry(uid, dateKey, entry)
    Svc->>DB: write entries/{entryId}
    DB-->>Svc: ok

    Svc->>Streak: check lastLogDate vs today
    alt Next day
        Streak->>DB: currentStreak += 1
    else Same day
        Streak-->>Svc: no change
    else Gap > 1 day
        Streak->>DB: currentStreak = 1
    end
    Streak->>DB: lastLogDate = today

    DB-->>UI: snapshot update
    UI-->>User: Ring, macros, streak refresh
```

## 3. Component / Data Architecture

```mermaid
flowchart LR
    subgraph Client[Next.js 14 App Router]
        AC[AuthContext]
        subgraph Pages
            P1[/page.js — Home/]
            P2[/dashboard/]
            P3[/history/]
            P4[/my-foods/]
            P5[/settings/]
        end
        subgraph Components
            C1[HomePage]
            C2[CalorieRing]
            C3[MacroBar]
            C4[MealSection]
            C5[WaterTracker]
            C6[BottomNav]
            C7[CameraModal]
            C8[BarcodeScannerModal]
            C9[SearchModal]
        end
        subgraph Services
            SF[firestoreService.js]
            SN[nutritionService.js]
        end
    end

    subgraph External
        FA[(Firebase Auth)]
        FS[(Cloud Firestore)]
        OFF[(Open Food Facts)]
        HF[(HuggingFace / Transformers.js)]
    end

    AC --> FA
    P1 --> C1 --> C2 & C3 & C4 & C5
    Pages --> C6
    C1 --> C7 & C8 & C9
    C7 --> HF
    C7 & C8 & C9 --> SN --> OFF
    C1 & P2 & P3 & P4 & P5 --> SF --> FS
```
