import Link from "next/link";
import ContactForm from "./ContactForm";

export default function Home() {
  return (
    <div className="container">
      <section className="contact-section">
        <div className="contact-info">
          <h2>Contact Information</h2>
          <div className="contact-details">
            <h3>Head Office</h3>
            <p>G701, Rajapushpa Atria</p>
            <p>Golden Mile Road, Kokapet, Hyderabad</p>
            <p>Telangana 500075 - India</p>
          </div>
        </div>

        <div className="contact-form">
          <h2>Send Us a Message</h2>
          <ContactForm />
        </div>
      </section>
    </div>
  );
}
