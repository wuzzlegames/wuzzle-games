# wuzzle-games

Wuzzle Games is an advanced Wordle-style browser game with multi-board puzzles, marathon, speedrun, and multiplayer modes.

**Live site:** https://wisdom-githb.github.io/wuzzle-games/

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Deploy to GitHub Pages

### First-time setup:

1. Make sure your repository is pushed to GitHub
2. Go to your repository settings on GitHub
3. Navigate to "Pages" in the settings
4. Set source to "gh-pages" branch (this will be created automatically)
5. Save the settings

### Deploy:

Run the deploy command:
```bash
npm run deploy
```

This will:
- Build your React app
- Deploy it to the `gh-pages` branch
- Make it available at: `https://[your-username].github.io/wuzzle-games/`

### Note:
The base path is configured as `/wuzzle-games/` in `vite.config.js`. If your repository name is different, update the `base` property in `vite.config.js` accordingly.

## Firebase Authentication Setup

The sign-in button on the homepage allows users to authenticate using Google Sign-In or email/password. To enable this feature, you need to set up Firebase:

1. **Create a Firebase Project**:
   - Go to https://console.firebase.google.com/
   - Click "Add project" or select an existing project
   - Follow the setup wizard to create your project

2. **Enable Authentication**:
   - In your Firebase project, go to "Authentication" in the left sidebar
   - Click "Get started"
   - Go to the "Sign-in method" tab
   - Enable "Google" as a sign-in provider:
     - Click on "Google"
     - Toggle "Enable"
     - Enter your project support email
     - Click "Save"
   - Enable "Email/Password" as a sign-in provider:
     - Click on "Email/Password"
     - Toggle "Enable"
     - Toggle "Email link (passwordless sign-in)" if desired (optional)
     - Click "Save"

3. **Get Your Firebase Configuration**:
   - In Firebase Console, go to "Project Settings" (gear icon)
   - Scroll down to "Your apps" section
   - If you haven't created a web app, click "Add app" and select the web icon (`</>`)
   - Copy the Firebase configuration object (it will look like this):
     ```javascript
     {
       apiKey: "AIza...",
       authDomain: "your-project.firebaseapp.com",
       projectId: "your-project-id",
       storageBucket: "your-project.appspot.com",
       messagingSenderId: "123456789",
       appId: "1:123456789:web:abc123..."
     }
     ```

4. **Configure Environment Variables** (Recommended):
   - Create a `.env` file in the root of your project (if it doesn't exist)
   - Add your Firebase configuration as environment variables:
     ```env
     VITE_FIREBASE_API_KEY=your-api-key
     VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
     VITE_FIREBASE_PROJECT_ID=your-project-id
     VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
     VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
     VITE_FIREBASE_APP_ID=1:123456789:web:abc123
     ```
   - **Important**: Add `.env` to your `.gitignore` file to keep your credentials secure

5. **Alternative: Direct Configuration** (Less Secure):
   - If you don't want to use environment variables, you can directly edit `src/config/firebase.js`
   - Replace the placeholder values with your actual Firebase configuration
   - **Warning**: This is less secure and your credentials will be visible in your code

6. **Authorized Domains** (For Production):
   - In Firebase Console, go to "Authentication" > "Settings" > "Authorized domains"
   - Add your production domain (e.g., `your-username.github.io`)
   - Firebase automatically includes `localhost` for development

7. **Test the Feature**:
   - Run the development server: `npm run dev`
   - Click the "Sign In" button on the homepage
   - Try signing in with Google or creating an account with email/password

The authentication feature will work once Firebase is configured. Users can sign in to sync their game progress across devices (when you implement that feature).

## Firebase Realtime Database Setup (for multiplayer head-to-head mode)

The head-to-head multiplayer mode requires Firebase Realtime Database to sync game state between players. To set this up:

1. **Create Realtime Database**:
   - In your Firebase Console, go to "Realtime Database" in the left sidebar
   - Click "Create Database"
   - Choose your preferred location
   - **Start in locked mode** (recommended for security)
   - Click "Enable"

2. **Get Your Database URL**:
   - After creation, you'll see your database URL at the top
   - It will look like: `https://your-project-id-default-rtdb.firebaseio.com`
   - Copy this URL

3. **Add Database URL to Environment Variables**:
   - Open Firebase Console > Realtime Database and copy the database URL (e.g. from the database root or project settings).
   - Add this line to your `.env` file, using the **exact** URL from the Console:
     ```env
     VITE_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
     ```
   - Replace with your actual URL (US region uses `...-default-rtdb.firebaseio.com`; other regions may use `...REGION.firebasedatabase.app`).
   - **Restart the dev server** after editing `.env` so the app picks up the new URL.

4. **Configure Security Rules** (Required):
   - In Firebase Console, go to "Realtime Database" > "Rules" tab
   - Replace the default rules with one of the following:

   **Option 1: Simple (Recommended for Development)**:
   ```json
   {
     "rules": {
       "multiplayer": {
         "$gameCode": {
           ".read": "auth != null",
           ".write": "auth != null"
         }
       }
     }
   }
   ```

   **Option 2: More Secure (Recommended for Production)**:
   ```json
   {
     "rules": {
       "multiplayer": {
         "$gameCode": {
           ".read": "auth != null && (
             data.child('hostId').val() === auth.uid || 
             data.child('guestId').val() === auth.uid ||
             !data.exists()
           )",
           ".write": "auth != null && (
             data.child('hostId').val() === auth.uid || 
             data.child('guestId').val() === auth.uid ||
             (!data.exists() && newData.child('hostId').val() === auth.uid) ||
             (data.child('guestId').val() === null && newData.child('guestId').val() === auth.uid)
           )"
         }
       }
     }
   }
   ```
   - Click "Publish" to save the rules

5. **Test head-to-head Multiplayer Mode**:
- Sign in with two different accounts (or use two browsers/devices)
- One user hosts a private multiplayer room and shares the game code
- The other user enters the code and clicks "Join"
   - Both should see the waiting room and can click "Ready" to start

**Note**: The security rules ensure that only authenticated users can access multiplayer games, and with Option 2, only the host or guest of a specific game can read/write to that game.

## Feedback Feature Setup

The feedback button on the homepage allows users to send anonymous feedback via email. To enable this feature, you need to set up EmailJS:

1. **Sign up for EmailJS**: Create a free account at https://www.emailjs.com/

2. **Add an Email Service**:
   - Go to "Email Services" in the EmailJS dashboard
   - Click "Add New Service"
   - Choose your email provider (Gmail, Outlook, etc.)
   - Follow the setup instructions to connect your email account
   - Note your Service ID

3. **Create an Email Template**:
   - Go to "Email Templates" in the EmailJS dashboard
   - Click "Create New Template"
   - Set the template name (e.g., "feedback_template")
   - Set the Subject to: `feedback for wuzzle-games`
   - Set the To Email to: `abhijeetsridhar14@gmail.com`
   - In the Content/Message field, use: `{{message}}`
   - Save the template and note your Template ID

4. **Get your Public Key**:
   - Go to "Account" > "General" in the EmailJS dashboard
   - Find your Public Key (API Key)

5. **Update Configuration**:
   - Open `src/config/emailjs.js`
   - Replace `YOUR_SERVICE_ID` with your Service ID
   - Replace `YOUR_TEMPLATE_ID` with your Template ID
   - Replace `YOUR_PUBLIC_KEY` with your Public Key

6. **Test the Feature**:
   - Run the development server and click the "Feedback" button
   - Submit a test message to verify it works

The feedback feature will work once EmailJS is configured. Users can send anonymous feedback directly from the homepage.
