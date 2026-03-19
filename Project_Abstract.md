<style>
  body {
    font-family: "Times New Roman", Times, serif;
    font-size: 12pt;
    text-align: justify;
  }
  h1, h2, h3, h4, h5, h6 {
    font-size: 14pt;
  }
</style>

<div align="center">
  <h2><u>An AI-Powered Mobile Web Application for Automated Dietary Tracking and Nutritional Analysis</u></h2>
</div>

<br>

<p>
  Niraj Vaidya&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;A70405223113<br>
  Diwakar Rai&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;A70405223026<br>
  P Jaswant Rao&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;A70405223030
</p>

<br><br>

<div align="center">
  <i><h3>ABSTRACT</h3></i>
</div>

Dietary tracking is often tedious and error-prone, requiring users to manually search databases, estimate portion sizes, and log macronutrients. This project introduces a **smart calorie tracking application** built with modern web technologies—integrating an AI vision pipeline and robust cloud databases—to explore whether nutritional logging can be automated and streamlined for a better user experience.

In **Stage 1**, the model leverages **AI image classification trends**—processing user-uploaded photos through pre-trained computer vision models—to predict and identify the specific food item _before the user even types a word_.

In **Stage 2**, the system adapts dynamically, integrating **real-time nutritional telemetry** from the **Edamam API**, including exact calorie counts, protein, carbohydrates, and fats based on the identified food and user-adjusted portion sizes, to refine its dietary logging.

This hybrid approach not only demonstrates the power of combining sophisticated backend APIs with a responsive frontend but also highlights the challenges of seamless user experience in health tech. Beyond just tracking meals, the project showcases how **integrated AI models and cloud architecture** can be applied to everyday, high-friction domains like personal health—where accuracy and ease-of-use are paramount.


<br>
<br>
<br>
<br>

<h3><u><b>Flow Diagram Description</b></u></h3>

The prediction and tracking pipeline consists of **two major stages** connected sequentially:

1. **Stage 1: AI Food Recognition**
   - **Input Data:** User-uploaded image of a food item via the mobile-friendly camera modal.
   - **Processing:** Data preprocessing (image compression, formatting) → fed into a **Vision Classification Model** (hosted via Hugging Face Inference API).
   - **Output:** Baseline probabilities and top predictions for the food category _before nutritional data is queried_.

2. **Stage 2: Post-Classification Update**
   - **Input Data:** Edamam API provides real-time caloric density, macronutrient breakdowns, and standard serving sizes based on the predicted food string.
   - **Processing:** This real-time data is combined with the user's manual portion adjustments and passed through a **backend processing layer** (Next.js API Routes).
   - **Output:** Updated total calories and macros for the specific meal, more accurate since it accounts for user-specific serving sizes.

3. **Final Stage: Storage and Presentation**
   - Data is securely stored and displayed as:
     - Interactive Calorie Ring (highest visibility).
     - Macro breakdown (Protein, Carbs, Fats likelihoods).
     - Persistent history via Firebase Cloud Firestore.

<br>

<i><u><h3>Libraries and API's to be used</h3></u></i>

**Frontend & State Management**
- `Next.js / React` → for component-based UI, routing, and efficient server/client state handling.
- `CSS Modules` → for scoping modern UI effects (glassmorphism, backdrop filters, spring animations).

**Backend & Database**
- `Firebase / Firestore` → for real-time NoSQL data storage and secure user authentication.

**Data Sources / APIs**
- `Hugging Face Inference API` → to fetch real-time image classification data (using Food-101 or similar vision models).
- `Edamam API` → for highly accurate, programmatic access to global nutrition and dietary databases.
