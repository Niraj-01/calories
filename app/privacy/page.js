import Link from "next/link";
import styles from "./privacy.module.css";

export const metadata = {
  title: "Privacy Policy — Calories",
  description:
    "How the Calories app collects, uses, stores, and protects your data.",
};

const CONTACT_EMAIL = "joblessduo18@gmail.com";
const LAST_UPDATED = "June 25, 2026";

export default function PrivacyPolicy() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/" className={styles.back}>
          ← Back to app
        </Link>

        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.updated}>Last updated: {LAST_UPDATED}</p>

        <p className={styles.lead}>
          Calories (&ldquo;the app&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is a
          personal calorie, macro, and water tracker. This policy explains what
          information we collect, how we use it, and the choices you have. We
          only collect what the app needs to work, and we do not sell your data.
        </p>

        <section className={styles.section}>
          <h2>Information we collect</h2>
          <ul>
            <li>
              <strong>Account information.</strong> When you sign in with Google,
              we receive your name, email address, and profile photo from your
              Google account to create and identify your account.
            </li>
            <li>
              <strong>Body profile.</strong> Details you enter to calculate your
              goals — age, gender, height, weight, activity level, and weight
              goal.
            </li>
            <li>
              <strong>Activity logs.</strong> The food entries, water intake,
              exercise, weight, and progress data you record in the app.
            </li>
            <li>
              <strong>Meal photos.</strong> If you use the AI photo-scan feature,
              the image you provide is processed to identify the food. Photos are
              used only to return nutrition results for that scan.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>How we use your information</h2>
          <p>
            We use your information solely to provide the app&rsquo;s features:
            calculating your calorie and macro goals, displaying your daily and
            historical progress, tracking streaks, and saving your logs so they
            sync across your devices. We do not use your data for advertising and
            we do not sell or rent it to anyone.
          </p>
        </section>

        <section className={styles.section}>
          <h2>How your data is stored</h2>
          <p>
            Your account and logs are stored using Google Firebase
            (Firebase Authentication and Cloud Firestore), operated by Google.
            Access is protected by authentication and server-side security rules,
            so each user can only read and write their own data.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Third-party services</h2>
          <ul>
            <li>
              <strong>Google Firebase</strong> — authentication and database
              storage. See{" "}
              <a
                href="https://firebase.google.com/support/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Firebase&rsquo;s privacy and security information
              </a>
              .
            </li>
            <li>
              <strong>Open Food Facts</strong> — used to look up nutrition data
              from barcodes and food searches. Only the barcode or search term is
              sent; no personal information about you is shared.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Data retention and deletion</h2>
          <p>
            Your data is kept while your account is active. You can delete
            individual food, water, or weight entries at any time within the app.
            To delete your account and all associated data, email us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will
            remove it.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Children&rsquo;s privacy</h2>
          <p>
            The app is not directed to children under 13, and we do not knowingly
            collect personal information from children under 13.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Changes to this policy</h2>
          <p>
            We may update this policy from time to time. Material changes will be
            reflected by updating the &ldquo;Last updated&rdquo; date above.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Contact</h2>
          <p>
            Questions about this policy or your data? Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        </section>

        <p className={styles.footer}>
          Calories — Daily Nutrition Tracker · {CONTACT_EMAIL}
        </p>
      </div>
    </main>
  );
}
