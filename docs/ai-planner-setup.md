# Turning on the AI weekly planner

The planner screen calls a Firebase Function (`generateWeeklyPlan`, Node.js, region `europe-west1`)
that asks Claude (model `claude-opus-5-5`) for a plan. These one-time steps are done by the
account owner; the secret API key never goes into the app or into Git.

## 1. Get a Claude API key
1. Open https://console.anthropic.com and sign in.
2. **Billing** → add a card and some credit (for example $10; each plan costs about 2–5 cents).
3. **API keys** → **Create key** → name it `flowday` → copy it (it is shown only once).

## 2. Switch Firebase to the Blaze plan
1. https://console.firebase.google.com → project **flowday-b7fb6** → **Upgrade** (bottom left) → **Blaze**.
2. Recommended: set a budget alert, for example $5/month, in the same screen.

## 3. Install the Firebase command-line tool (once)
```bash
npm install -g firebase-tools
```
```bash
firebase login
```

## 4. Save the API key as a secret
From the project folder:
```bash
firebase functions:secrets:set ANTHROPIC_API_KEY
```
Paste the key when asked. It is stored in Google Secret Manager, readable only by the function.

## 5. Deploy the function and the updated security rules
```bash
firebase deploy --only functions,firestore:rules
```
The first deploy can take a few minutes and may ask to enable some Google Cloud services; answer yes.

## Limits and costs
- Only signed-in users can call the function.
- Each user can create up to 10 plans per day (`DAILY_PLAN_LIMIT` in `functions/src/index.ts`).
- If Claude declines a request for safety reasons, the API retries it on a fallback model
  automatically (`fallbacks: "default"`).
- Logs: `firebase functions:log`, or Firebase console → Functions → Logs.
