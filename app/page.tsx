import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.logo}>
          Pass<span className={styles.logoAccent}>port</span>
        </div>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.h1}>What do you want to check?</h1>
        <p className={styles.lede}>
          Two ways to find out which remote roles you can take from Uganda or
          Africa.
        </p>
      </header>

      <div className={styles.grid}>
        <Link href="/scan" className={styles.card}>
          <div className={styles.cardLabel}>Scan</div>
          <h2 className={styles.cardTitle}>
            Pull remote jobs from around the world
          </h2>
          <p className={styles.cardBody}>
            Passport fetches live remote jobs, then filters for companies that
            can hire someone based in Uganda — or anywhere in Africa — to work
            fully remote. Every listing links straight to the company&apos;s
            own application page.
          </p>
          <span className={styles.cardCta}>Open Scan →</span>
        </Link>

        <Link href="/check" className={styles.card}>
          <div className={styles.cardLabel}>Check</div>
          <h2 className={styles.cardTitle}>
            Paste a posting you already found
          </h2>
          <p className={styles.cardBody}>
            Saw a job on LinkedIn, in an email, or from a referral? Paste the
            full advert. Same engine, same verdict, same evidence.
          </p>
          <span className={styles.cardCta}>Open Check →</span>
        </Link>
      </div>
    </main>
  );
}
