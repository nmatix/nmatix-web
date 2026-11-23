"use client";

import { useState } from "react";

export default function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      domain_id: "0001",
      form_id: "0001",
      name: formData.get("name"),
      email: formData.get("email"),
      message: formData.get("message"),
    };

    try {
      const response = await fetch("https://d2uch7qqykgttv.cloudfront.net/api/form/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Submission failed");
      }

      if (!data.id) {
        throw new Error("The server did not return a reference number.");
      }

      setMessage(
        `Thank you for your message! We'll get back to you soon. Reference Number: #${data.id}`
      );

      setSubmitted(true);
      form.reset();
    } catch (error) {
      console.error("Contact form error:", error);
      setMessage("There was an error submitting your message. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {!submitted && (
        <form id="contact-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name:</label>
            <input type="text" id="name" name="name" required />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email ID:</label>
            <input type="email" id="email" name="email" required />
          </div>

          <div className="form-group">
            <label htmlFor="message">Message:</label>
            <textarea id="message" name="message" rows="4" required />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit"}
          </button>
        </form>
      )}

      {message && (
        <div id="contact-form-message" role="status" aria-live="polite">
          {message}
        </div>
      )}
    </div>
  );
}
