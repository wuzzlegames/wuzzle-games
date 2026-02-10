// EmailJS Configuration
// 
// To set up EmailJS:
// 1. Sign up for a free account at https://www.emailjs.com/
// 2. Go to Email Services and add a new service (Gmail, Outlook, etc.)
// 3. Go to Email Templates and create a new template:
//    - Template Name: feedback_template
//    - Subject: feedback for better-wordle
//    - To Email: abhijeetsridhar14@gmail.com
//    - Content: {{message}}
// 4. Go to Account > API Keys and copy your Public Key
// 5. Update the values below with your Service ID, Template ID, and Public Key
//
// Note: These are public keys and safe to expose in client-side code

export const EMAILJS_CONFIG = {
  SERVICE_ID: "gmail-better-wordle",
  TEMPLATE_ID: "feedback_better_wordle",
  PUBLIC_KEY: "jIpS9TFRU6hC_kPiN",
  TO_EMAIL: "abhijeetsridhar14@gmail.com",
  SUBJECT: "feedback for better-wordle",
};

// Check if EmailJS is configured
export const isEmailJSConfigured = () => {
  return (
    EMAILJS_CONFIG.SERVICE_ID !== "YOUR_SERVICE_ID" &&
    EMAILJS_CONFIG.TEMPLATE_ID !== "YOUR_TEMPLATE_ID" &&
    EMAILJS_CONFIG.PUBLIC_KEY !== "YOUR_PUBLIC_KEY"
  );
};

