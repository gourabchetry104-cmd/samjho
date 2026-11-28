# Samjho: AI whiteboard tutor (installable web app, English + Hindi)

Type or speak a topic, pick **Topic / Exam Prep / Homework**, attach a photo, PDF, text file or link, and Samjho
explains out loud while drawing every step on a whiteboard. Login with Google or email. Works on phones as an
installable app (an install banner appears at the bottom).

## What's inside
```
public/        the app (index.html, app.js, board.js, styles.css, i18n.js, config.js, sw.js, manifest, icons)
api/teach.js   serverless backend: checks login, calls Claude, returns the lesson
server.js      local test server
```

## 1. Run it on your computer (5 minutes)
1. Install Node.js 18 or newer.
2. Get an Anthropic API key at console.anthropic.com.
3. Copy `.env.example` to `.env` and paste your key. Leave `ALLOW_GUEST=1` for now.
4. Run `node server.js`, open http://localhost:3000, click **Sign in**, then **Continue as guest (demo)**.

(Voice input works best in Chrome. Voice output uses your device's built-in voices.)

## 2. Turn on real login (Firebase, free plan is enough)
1. Go to console.firebase.google.com, create a project, then **Build -> Authentication -> Get started**.
2. **Sign-in method**: enable **Google** and **Email link (passwordless)**. Both are free.
3. **Project settings -> Your apps -> Web (</>)**: copy the config and paste it into `public/config.js`.
4. **Authentication -> Settings -> Authorized domains**: add your live domain (for example `samjho.vercel.app`).
5. Put the same Firebase **Web API key** in `.env` as `FIREBASE_API_KEY` (the server uses it to check each user's login).
6. Remove `ALLOW_GUEST=1` before going live.

## 3. Put it online (Vercel, free plan)
1. Upload this folder to a GitHub repository.
2. On vercel.com choose **Add New -> Project**, import the repository, and deploy.
3. In **Settings -> Environment Variables** add `ANTHROPIC_API_KEY` and `FIREBASE_API_KEY`.
4. Redeploy. Open your link on your phone.

## 4. Install on a phone
- **Android / Chrome**: a banner appears at the bottom with an **Install** button.
- **iPhone / Safari**: tap Share, then **Add to Home Screen** (the banner shows this hint).

## Good to know
- Lessons are saved in the browser on that device. To sync across devices, add Firestore later.
- The server limits each user to 30 lessons per hour (`HOURLY_LIMIT`). Each lesson costs a small amount of API credit.
- Change the model with `ANTHROPIC_MODEL` if you like.
- To rename the app, edit the name in `index.html`, `manifest.webmanifest`, `i18n.js` and replace the icons in `public/icons`.
- Never put your `ANTHROPIC_API_KEY` in the `public` folder. It belongs only in `.env` or the Vercel settings.
- 
