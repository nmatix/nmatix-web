import Link from "next/link";

export default function Home() {
  return (
    <div className="container">
      <section className="about-content">
        <div className="about-section">
          <h2>Our Mission</h2>
          <p>
            At <strong>nMATIX</strong>, we specialize in delivering{" "}
            <strong>innovative technology solutions</strong> that help businesses thrive in an
            increasingly digital world. Combining deep technical expertise with a commitment to
            understanding your unique challenges, we craft tailored solutions that drive{" "}
            <strong>efficiency, scalability</strong>, and <strong>business growth</strong>.
          </p>

          <p>
            Our services span <strong>custom software development</strong>,{" "}
            <strong>AI and machine learning</strong>, <strong>cloud infrastructure design</strong>,{" "}
            <strong>security and QA testing</strong>, and <strong>system integrations</strong>.
            Whether you are building from the ground up or enhancing your existing technology
            landscape, we work as your trusted partner to ensure{" "}
            <strong>seamless digital transformation</strong>.
          </p>

          <p>
            With a focus on <strong>future-ready solutions</strong>,{" "}
            <strong>cutting-edge technology</strong>, and <strong>client collaboration</strong>, we
            empower businesses to <strong>innovate faster</strong>, <strong>operate smarter</strong>
            , and <strong>stay ahead</strong> in a rapidly evolving market.
          </p>
        </div>

        <div className="founder-section">
          <h2>Meet Our Founder</h2>
          <div className="founder-profile">
            <div className="founder-info">
              <div className="founder-photo">
                <img src="/images/kiran-kabalavai.jpg" alt="Kiran Kabalavai - Founder & CEO" />
              </div>
              <div className="founder-details">
                <h3>Kiran Kabalavai</h3>
                <p className="founder-title">Founder & Managing Partner</p>
                <p>
                  With over 30 years of experience in the IT industry, Kiran brings exceptional
                  leadership and technical expertise to nMATIX Technologies. His distinguished
                  career includes roles at leading organizations:
                </p>
                <ul>
                  <li>IT Leader at Amazon</li>
                  <li>Architect at Federal Reserve Bank of Minneapolis</li>
                  <li>Architect at Ameriprise</li>
                  <li>Software Development Consultant at Analysts International</li>
                </ul>
                <p>
                  Throughout his career, Kiran has successfully delivered solutions across diverse
                  industries including:
                </p>
                <ul>
                  <li>
                    <strong>Financial Services:</strong> HSBC, Wells Fargo, Dell Financial Services
                  </li>
                  <li>
                    <strong>Medical:</strong> Boston Scientific
                  </li>
                  <li>
                    <strong>Telecommunications:</strong> CenturyLink
                  </li>
                  <li>
                    <strong>Retail:</strong> Digital River
                  </li>
                </ul>
                <p>
                  Kiran&apos;s vast experience and commitment to excellence ensure that nMATIX
                  delivers exceptional software solutions tailored to our clients&apos; unique
                  needs.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="contact-cta">
          <p>
            Ready to transform your business with innovative technology solutions?{" "}
            <a href="contact.html">Contact us</a> today to learn how nMATIX can support your
            business transformation.
          </p>
        </div>
      </section>
    </div>
  );
}
