<div align="center">
<img src="https://upload.wikimedia.org/wikipedia/en/8/87/Amity_University_logo.png" alt="Amity University Logo" width="120" style="margin-bottom: 20px;" />

# AMITY UNIVERSITY, MUMBAI
### Amity School of Engineering and Technology
### Department of Computer Science & Engineering

<br/>

## MINI PROJECT SYNOPSIS
### (Academic Year 2025–26)

<br/>

## ----- SMART CALORIE & NUTRITION TRACKER -----

</div>

<br/>

**Submitted By:**

1. Niraj Vaidya (Enrl No: A70405223113)
2. Diwkar Rai (Enrl No: A70405223026)
3. P. Jaswant Rao (Enrl No: A70405223030)

<br/>

**Under the Guidance of:**

Name of Guide: Dr. Dipak Raskar  
Designation: Professor  

<div style="page-break-before: always;"></div>

### 1. Title of the Project
**Smart Calorie & Nutrition Tracker**

### 2. Abstract
In today's fast-paced world, maintaining a healthy lifestyle and tracking dietary intake can be challenging. To address this, the Smart Calorie & Nutrition Tracker proposes a modern, mobile-first web application designed to simplify daily food and macronutrient monitoring. Leveraging modern web technologies, the application allows users to seamlessly log meals, track water intake, and monitor their progress toward customized caloric goals. The application incorporates advanced features such as real-time barcode scanning and camera-based workflows to eliminate the friction of manual data entry. Built with Next.js and Firebase, the app ensures real-time cross-device synchronization, secure authentication, and a responsive, glassmorphism-inspired UI for an engaging user experience. The expected outcome is a fast, intuitive, and reliable tool that empowers users to make informed, healthier dietary choices with minimal effort.

### 3. Problem Statement
Maintaining an accurate record of daily food consumption is often tedious and time-consuming, leading to low long-term adherence among individuals trying to eat healthier. Standard applications often have cluttered interfaces, require manual search for every food item, or lock essential features like barcode scanning behind expensive paywalls. There is a need for a streamlined, accessible, and fast tool that minimizes the effort required to log food and track macronutrients (protein, carbs, and fats).

### 4. Objectives
* **Objective 1:** To develop a user-friendly, responsive Progressive Web Application (PWA) with a premium aesthetic for tracking daily caloric and macronutrient intake.
* **Objective 2:** To implement a real-time barcode scanner feature to drastically reduce the time needed to log packaged meals.
* **Objective 3:** To provide real-time dashboard analytics with intuitive visualizations (e.g., Calorie Rings and Macro Bars) to give users immediate feedback on their daily nutritional progress.
* **Objective 4:** To integrate cloud database synchronization via Firebase for persistent, secure data storage and multi-device access without data loss.

### 5. Scope of the Project
The project includes user authentication, personalized daily calorie goals, real-time nutrient tracking (calories, protein, fats, carbohydrates), water tracking capabilities, and an integrated barcode scanner. 
**Limitations:** The application relies on an active internet connection to query food databases and sync with Firebase. Camera and barcode functionality depend on device hardware constraints and browser permissions. Medical or highly specialized dietary planning (e.g., diabetic tracking) is beyond the current scope.

### 6. Literature Survey / Existing System
Existing health tracking systems like MyFitnessPal, LoseIt!, and Cronometer offer extensive tracking features but suffer from several drawbacks. Many of these platforms have increasingly monetized basic functionalities, effectively removing free barcode scanning and hiding macronutrient details behind premium subscriptions. Furthermore, their interfaces can be overwhelming for casual users who just need a quick, distraction-free logging experience. This project improves upon existing systems by offering a lightweight, core-focused feature set with integrated free barcode scanning and a clean, ad-free UI.

### 7. Proposed System
The proposed system is a Next.js-based web application that specifically targets the friction of dietary tracking. It features an intuitive dashboard that displays the day's remaining calories and macro split using modern visual indicators. Users can quickly add food through text search or utilize the built-in HTML5 barcode scanner utilizing their device's camera. By relying on Firebase for backend services, the application provides instantaneous data syncing and safe authentication without the overhead of maintaining a custom REST API. This results in a superior, lightweight native-app-like experience in the browser.

### 8. Methodology
* **Requirement Analysis:** Identified user pain points with existing apps; gathered functional requirements like authentication, quick food logging, and visual data representation.
* **Design (UML Diagrams):** Architected the component hierarchy in React/Next.js and designed the Firestore database document models (Users, Meals, DailyLogs). Created UI/UX wireframes emphasizing a "glassmorphism" modern dark mode approach.
* **Development:** Built the frontend utilizing Next.js and React. Designed global CSS variables for UI consistency. Integrated Firebase Auth for secure login and Firestore for real-time CRUD operations on food logs. Integrated the `html5-qrcode` library for web-based barcode scanning.
* **Testing:** Conducted component-level layout testing, verified database read/write permissions via Firebase Security Rules, and performed cross-browser compatibility and responsive design testing on both mobile and desktop environments.

### 9. Tools & Technologies
**Programming Language:** JavaScript (ES6+), HTML5, CSS3  
**Database:** Firebase Cloud Firestore  
**Tools:** Next.js (React Framework), Firebase Authentication, Firebase Hosting, Git/GitHub, html5-qrcode API  

### 10. System Requirements
**Hardware:** Any smartphone, tablet, or PC with a modern web browser and a functioning camera (for barcode scanning).  
**Software:** Any modern web browser (Google Chrome, Apple Safari, Mozilla Firefox, Microsoft Edge).  

### 11. Expected Outcomes
The final deliverable will be a fully functional, publicly hosted web application. Users will be able to securely sign up, set up a nutritional profile, and effortlessly track their daily intake by scanning barcodes or searching for food manually. The overarching benefit to the user is increased awareness of their dietary habits through a seamless UI experience, without the barrier of subscription fees for essential functionalities.

### 12. Timeline / Work Plan (January 3rd week to May 1st week)
| Phase | Activity | Duration |
| :--- | :--- | :--- |
| 1 | Requirement Analysis & UI Prototyping | 2 Weeks |
| 2 | Architecture Design & Database Setup | 2 Weeks |
| 3 | Core Development & Feature Integration (Next.js, Firebase, Barcode Scanner) | 6 Weeks |
| 4 | Testing, Debugging, Deployment, & Documentation | 4 Weeks |

### 13. References
[1] Next.js Documentation. [Online]. Available: https://nextjs.org/docs  
[2] Firebase Documentation. [Online]. Available: https://firebase.google.com/docs  
[3] React.js Official Documentation. [Online]. Available: https://react.dev/  
[4] Mebjas, "html5-qrcode," GitHub. [Online]. Available: https://github.com/mebjas/html5-qrcode  
