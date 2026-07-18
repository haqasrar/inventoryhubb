# Shop Stock

Inventory website for an electronics and furniture shop. Anyone minding the counter can see what
is in stock and at what price; selling an item takes it out of stock automatically, and receiving
an order puts it back in.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

Other commands: `npm run build` (production build into `dist/`), `npm run lint`.

## What each screen does

| Screen        | Purpose                                                                |
| ------------- | ---------------------------------------------------------------------- |
| **Dashboard** | Stock value, selling value, today's sales, what needs reordering       |
| **Products**  | Add, edit, delete products; search and filter by type or stock status  |
| **Sell**      | Build a customer's basket, take payment, print a bill; stock goes down |
| **Restock**   | Record a delivery — stock goes **up**; reprice cost and selling here   |
| **History**   | Every sale and delivery, grouped by day; search + category + date      |

Stock never goes negative: selling more than you have is refused, both in the form and in the data
layer.

When a delivery arrives, Restock lets you set **both** a new cost price and a new selling price,
with the profit per item shown live as you type. Leave either blank to keep it unchanged. Changing
a price here updates the product everywhere, not just that delivery.

The Dashboard shows two different values for the same stock: **Stock value** is what you paid for
it, **Selling value** is what it will fetch on the shop floor. The gap between them is the profit
sitting on your shelves.

## Bills

Selling works like a counter: tap each product the customer is buying to add it to the bill,
adjust quantities, choose how they paid, then **Complete sale & make bill**. One bill covers the
whole purchase. It appears immediately with a **Print** button, and can be reopened later from any
of its rows in History.

Bills are numbered `UE-0001`, `UE-0002`, … and the counter only ever moves forward, so no two
bills can share a number. Shop details printed on every bill live in
[`src/config/shop.js`](src/config/shop.js) — edit that one file to change the name, owner, GSTIN,
address, or the bill prefix. They also appear in the sidebar, on the Dashboard banner, and in the
footer of every page.

## Logo

The original artwork is `assets/logo.png`. It arrived with a checkerboard **painted into the
pixels** (it looked transparent but was not — every pixel was opaque), so the background was
stripped and two transparent versions were generated into `public/`:

- `logo.png` — full logo, icon + wordmark. Used on bills and the Dashboard banner.
- `logo-mark.png` — icon only. Used in the sidebar, mobile header, footer, and as the favicon.

Both are pure black line art on real transparency, so they sit on any light background. If you
replace the artwork, keep the same two filenames. Note the black ink is invisible on dark
backgrounds — a white version would be needed for that.

To redo this after swapping `assets/logo.png`:

```bash
node scripts/prepare-logo.cjs .
```

It strips the background, crops to the artwork, splits the icon from the wordmark, and writes both
files. Pure Node — no image libraries needed.

## Signature

`public/signature.png` is the proprietor's signature, printed above the "For Umer Enterprises" line
on every bill. It was lifted off a photo of ruled paper by
[`scripts/prepare-signature.cjs`](scripts/prepare-signature.cjs) — see
[`scripts/prepare-signature.md`](scripts/prepare-signature.md) for how and why that differs from the
logo cleanup.

If `public/signature.png` is missing, the bill falls back to blank signing space rather than showing
a broken image.

> ### ⚠️ This is a Cash Memo, not a GST tax invoice
>
> The bill shows your GSTIN but has **no CGST/SGST breakup and no HSN codes**, so it is labelled
> "Cash Memo" rather than "Tax Invoice" — claiming otherwise on a document without a tax breakup
> would be wrong. If you need to issue proper GST tax invoices, each product needs a **GST rate**
> and an **HSN code**, and the bill needs a CGST/SGST split. Please check with your accountant what
> your shop is actually required to issue.

## Payment methods

Every sale is marked **Cash**, **Online**, or **Credit**. A credit sale requires a customer name —
money owed is useless if you do not know who owes it. History shows the method on each row, can be
filtered to one method, and totals how much of a period was sold on credit.

History groups rows under **Today / Yesterday / the date**, with that day's totals on the heading.
Filter by category (Everything, Sold, Restocked, Cash, Online, Credit) and by range (All time,
Today, Last 7 days, Last 30 days, or custom dates).

The **search box** looks in both the note and the product name, so typing a customer or trader
name pulls up everything involving them. The totals above the list then re-label to "Sold in these
results" — search a name and you can read straight off how much they bought and how much of it was
on credit. Search combines with the category and date filters.

**Note:** credit here means "this sale was on udhaar", not a running ledger of who currently owes
what. There is no way yet to mark a debt as repaid, so the credit total is *what was sold on
credit in that period* — it does not go down when Ramesh pays you back. A proper customer ledger
with repayments is the natural next feature if you want it.

## Where the data lives

Everything is in **Cloud Firestore**, so the shop computer and every phone see the same stock.
Screens subscribe to the database: when someone records a sale, other open devices update on their
own without a refresh.

Three collections:

| Collection      | Holds                                              |
| --------------- | -------------------------------------------------- |
| `products`      | One document per product                           |
| `transactions`  | One document per sale line or delivery             |
| `counters/bills`| The bill number counter                            |

Sales and deliveries are an **audit trail**: [`firestore.rules`](firestore.rules) allows them to be
created and read but never edited or deleted, by anyone. History is the record of where stock went
and who owes money, so it must not be rewritable. Products stay fully editable.

Stock changes run inside `runTransaction()`. If two people sell the last item at the same moment,
one gets a clear "only N in stock" error instead of the count silently drifting — and bill numbers
are allocated in that same transaction, so two bills can never share a number.

## Setup

```bash
npm install
cp .env.example .env.local     # then paste your Firebase web config into it
npm run dev
```

The values in `.env.local` are **not secrets** — Firebase ships them to every browser. The data is
protected by the login and by `firestore.rules`.

In the Firebase console you need: **Firestore Database** created, **Authentication → Email/Password**
enabled, and one user created under **Authentication → Users**.

### Logging in with a username

Firebase Auth only understands email addresses, so the app maps the username to one. Set both in
[`src/config/shop.js`](src/config/shop.js):

```js
export const LOGIN = {
  username: 'umerenterprises',
  email: 'the-address-the-firebase-user-was-created-with',
}
```

Staff type the username; the email swap happens behind the scenes. Keep `email` a **real inbox you
can open** — that is what makes "Forgot password?" work. No password is stored in the code; Firebase
checks it.

To change the password: sign in and use the change-password flow, or reset it from
**Authentication → Users → ⋮ → Reset password** in the console.

## Deploying

```bash
npm run build
npx firebase deploy
```

[`firebase.json`](firebase.json) serves `dist/` and rewrites all routes to `index.html`, which React
Router needs so `/sell` still works on a refresh. Deploy the rules too — they are what keep the data
private.
#   u m e r e n t e r p r i s e s  
 