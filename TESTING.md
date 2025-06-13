# Running Tests and Static Checks

This repo keeps frontend and backend in separate workspaces, each with its own test suite powered by **Vitest**.

## Prerequisites

```
node >= 18
npm  >= 9
```

Run the following once to install all dependencies:

```
# From the project root
cd backend && npm install
cd ../frontend && npm install
```

## 1. Lint & Format (static check)

*(ESLint and Prettier coming soon – add scripts once configs land)*

## 2. Backend unit tests

```
cd backend
npm run test
```
What it covers:
* Amount-parser utility (`extractAmountCents`, `wordsToNumber`).
* More API tests can be added under `backend/tests`.

## 3. Frontend component tests

```
cd frontend
npm run test
```
What it covers:
* Rendering of `PaymentResult` component.
* Additional React tests go in `frontend/src/__tests__`.

## 4. Continuous integration (suggested)

Add a GitHub Action that runs:
```
frontend/npm run test
backend/npm run test
```
Failing any test will block the PR merge, ensuring code health before commits land on main. 