import React, { useState, useRef, useEffect } from "react";
import emailjs from "@emailjs/browser";
import Modal from "./Modal";
import { EMAILJS_CONFIG, isEmailJSConfigured } from "../config/emailjs";

function FeedbackModal({ isOpen, onRequestClose }) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null
  const timeoutRef = useRef(null);

  const clearTimeouts = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearTimeouts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    clearTimeouts();

    // Check if EmailJS is configured
    if (!isEmailJSConfigured()) {
      setSubmitStatus("error");
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        setSubmitStatus(null);
      }, 3000);
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        {
          message: message.trim(),
          to_email: EMAILJS_CONFIG.TO_EMAIL,
          subject: EMAILJS_CONFIG.SUBJECT,
        },
        EMAILJS_CONFIG.PUBLIC_KEY
      );

      setSubmitStatus("success");
      setMessage("");

      // Close modal after 2 seconds
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        onRequestClose();
        setSubmitStatus(null);
      }, 2000);
    } catch (error) {
      console.error("Error sending feedback:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    clearTimeouts();
    setMessage("");
    setSubmitStatus(null);
    onRequestClose();
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={handleClose} titleId="feedback-title">
      <div style={{ textAlign: "left" }}>
        <h2
          id="feedback-title"
          style={{
            margin: "0 0 16px 0",
            fontSize: 20,
            fontWeight: "bold",
            color: "#ffffff",
          }}
        >
          Send Feedback
        </h2>

        <p
          style={{
            margin: "0 0 20px 0",
            fontSize: 14,
            color: "#d7dadc",
            lineHeight: 1.5,
          }}
        >
          Your feedback helps us improve Wuzzle Games. All feedback is anonymous.
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Share your thoughts, suggestions, or report issues..."
            rows={6}
            maxLength={1000}
            required
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 8,
              border: "1px solid #3A3A3C",
              background: "#212121",
              color: "#ffffff",
              fontSize: 14,
              outline: "none",
              resize: "vertical",
              fontFamily: "inherit",
              boxSizing: "border-box",
              marginBottom: "16px",
            }}
          />

          {submitStatus === "success" && (
            <div
              style={{
                padding: "12px",
                marginBottom: "16px",
                borderRadius: 8,
                background: "#50a339",
                color: "#ffffff",
                fontSize: 14,
                textAlign: "center",
              }}
            >
              ✓ Feedback sent successfully!
            </div>
          )}

          {submitStatus === "error" && (
            <div
              style={{
                padding: "12px",
                marginBottom: "16px",
                borderRadius: 8,
                background: "#c45858",
                color: "#ffffff",
                fontSize: 14,
                textAlign: "center",
              }}
            >
              Error sending feedback. Please try again later.
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              className="homeBtn homeBtnOutline homeBtnLg"
              onClick={handleClose}
              disabled={isSubmitting}
              style={{
                minWidth: 110,
                opacity: isSubmitting ? 0.7 : 1,
                cursor: isSubmitting ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={"homeBtn homeBtnGreen homeBtnLg" + (isSubmitting || !message.trim() ? " homeBtnNeutral" : "")}
              disabled={isSubmitting || !message.trim()}
              style={{
                minWidth: 150,
                cursor:
                  isSubmitting || !message.trim() ? "not-allowed" : "pointer",
                opacity: isSubmitting || !message.trim() ? 0.8 : 1,
              }}
            >
              {isSubmitting ? "Sending..." : "Send Feedback"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default FeedbackModal;

