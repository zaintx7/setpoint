# Setpoint

A simple gym workout tracker: plan lifts ahead of time, log sets/reps/weight
with tap-only steppers, and track your streak on a calendar.

Data is stored in the browser's `localStorage`, so it's private to whatever
device/browser you use it on.

## Run locally

```
npm install
npm run dev
```

## Deploy (GitHub + Vercel)

1. Create a new repo on GitHub (e.g. `setpoint`), then from this folder:

   ```
   git init
   git add .
   git commit -m "Setpoint workout tracker"
   git branch -M main
   git remote add origin https://github.com/<your-username>/setpoint.git
   git push -u origin main
   ```

2. Go to https://vercel.com, sign in with GitHub, click **Add New → Project**,
   and import the `setpoint` repo. Vercel auto-detects Vite — leave the
   defaults and click **Deploy**.

3. In a couple minutes you'll get a URL like `setpoint-yourname.vercel.app`.

## Put it on your phone

Open the Vercel URL on your phone, then:

- **iPhone (Safari):** tap the Share icon → **Add to Home Screen**.
- **Android (Chrome):** tap the ⋮ menu → **Add to Home screen** / **Install app**.

It'll launch full-screen like a normal app, no browser bar.
