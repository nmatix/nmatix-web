import Link from "next/link";

export default function Home() {
  return (
    <div className="container">
      <main>
        <section className="hero">
          <h1>Innovative Tech Solutions</h1>
          <p>
            We turn complex technology challenges into smart, efficient solutions that accelerate
            your business growth. Our expert developers and strategists continuously explore
            emerging technologies, delivering innovative systems that optimize processes, enhance
            customer experiences, and drive digital transformation for lasting competitive
            advantage.
          </p>
        </section>

        <section className="features">
          <div className="feature">
            <h2>Software Development</h2>
            <p>
              Custom software and mobile solutions designed to scale with your business, seamlessly
              integrating systems and streamlining operations for maximum efficiency and growth.
            </p>
          </div>

          <div className="feature">
            <h2>Consulting &amp; Services</h2>
            <p>
              Expert consulting in QA, security testing, and cloud migration — ensuring secure,
              scalable, and reliable technology foundations to support innovation and long-term
              success.
            </p>
          </div>

          <div className="feature">
            <h2>AI &amp; Machine Learning</h2>
            <p>
              AI-powered solutions that transform data into insights, automate processes, and drive
              smarter decisions — helping businesses innovate, optimize, and stay competitive.
            </p>
          </div>

          <div className="reach-out">
            <p>
              Explore how nMATIX can support your digital transformation with cutting-edge solutions
              and expert guidance — <Link href="/contact">contact us</Link> to get started.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
