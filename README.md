# Shop Stock

Inventory website for a small shop. Anyone minding the counter can see what is in stock and at what
price; selling an item takes it out of stock automatically, and receiving an order puts it back in.

**Any shop owner can open their own account** with a username and password — no email address is
asked for anywhere. Each shop gets its own products, bills, history and bill numbering, and cannot
see any other shop's data — see [Accounts and shops](#accounts-and-shops).

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
bills can share a number. Each shop has its own prefix and its own counter, so two shops both
start at `0001` without ever colliding.

Shop details printed on every bill — name, owner, GSTIN, phone, address, "deals in" line, bill
prefix — are edited **inside the app**, under **Shop details** in the sidebar. They also appear in
the sidebar, on the Dashboard banner, and in the footer of every page. Nothing about a particular
shop lives in the code any more.

## Logo

The original artwork is `assets/logo.png`. It arrived with a checkerboard **painted into the
pixels** (it looked transparent but was not — every pixel was opaque), so the background was
stripped and two transparent versions were generated into `public/`:

- `logo.png` — full logo, icon + wordmark. Printed on bills and shown on the Dashboard banner, for
  a shop whose **Logo image** field points at it.
- `logo-mark.png` — icon only. Used in the sidebar, mobile header, footer, and as the favicon.

A shop only prints a logo if it has filled in the **Logo image** field under Shop details; every
other shop prints its **name** as the bill heading instead. That is deliberate — no shop should
ever print another shop's logo on its bills.

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

`public/signature.png` is the first proprietor's signature, printed above the "For <shop name>" line
on that shop's bills only — a shop prints a signature just when its **Signature image** field under
Shop details points at one, and otherwise gets blank space to sign by hand. It was lifted off a
photo of ruled paper by
[`scripts/prepare-signature.cjs`](scripts/prepare-signature.cjs) — see
[`scripts/prepare-signature.md`](scripts/prepare-signature.md) for how and why that differs from the
logo cleanup.

If the file a shop points at is missing, the bill falls back to blank signing space rather than
showing a broken image.

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

## Installing it as a phone app

The site is a PWA, so it installs to a phone's home screen with its own icon and opens full
screen, without a browser address bar. No Play Store, no APK.

**Android (Chrome):** open the site → menu (⋮) → **Install app** / **Add to Home screen**.
**iPhone (Safari):** open the site → Share → **Add to Home Screen**.

Updates arrive by themselves. A new deploy replaces the cached app the next time it is opened —
nobody has to reinstall anything.

Icons are generated from `public/logo-mark.png`:

```bash
node scripts/prepare-icons.cjs .
```

The mark is black on transparency, which would vanish on a dark wallpaper, so the script
composites it onto white. The maskable icon keeps the artwork inside the 80% safe zone because
Android crops it to the launcher's shape.

### Working offline

Firestore keeps what it has already read in IndexedDB, so **stock and prices can still be looked
up with no connection** — which is the whole point when someone is minding the counter.

**Recording a sale still needs the network.** Sales run as a Firestore transaction to stop two
people overselling the same item, and transactions cannot be resolved offline. Restocking is the
same. So the app is fully usable offline for *looking things up*, but billing has to wait for a
signal.

## Where the data lives

Everything is in **Cloud Firestore**, so the shop computer and every phone see the same stock.
Screens subscribe to the database: when someone records a sale, other open devices update on their
own without a refresh.

Everything hangs off the shop it belongs to, which is what keeps two shops apart:

| Path                                | Holds                                  |
| ----------------------------------- | -------------------------------------- |
| `shops/{shopId}`                    | The shop's name, owner, GSTIN, address |
| `shops/{shopId}/products`           | One document per product               |
| `shops/{shopId}/transactions`       | One document per sale line or delivery |
| `shops/{shopId}/counters/bills`     | That shop's bill number counter        |

`shopId` **is the owner's Firebase Auth uid**. That means no lookup table is needed to find a
signed-in owner's shop, and [`firestore.rules`](firestore.rules) can decide access with a plain
`request.auth.uid == shopId` — no extra billed read on every request.

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

In the Firebase console you need: **Firestore Database** created and **Authentication →
Email/Password** enabled — that provider stays on even though nobody types an email, because it is
what the synthesised addresses sign in against. You no longer create users by hand; owners sign
themselves up.

## Accounts and shops

An owner taps **Create an account**, picks a **username** and a password, and is then asked once
for their shop's details — name, owner, GSTIN, phone, address, what the shop deals in, and the bill
prefix. That creates their `shops/{uid}` document, and from that moment they have their own stock,
their own bills and their own history. They can change any of those details later under **Shop
details**.

**No email address is asked for anywhere.** Firebase Auth has no concept of a username, so each one
is turned into an address behind the scenes — `hajinsteel` signs in as
`hajinsteel@shopstock.local`. Nobody sees or types that, and no mail is ever sent to it. The domain
is deliberately not a real one; see `USERNAME_DOMAIN` in
[`src/config/shop.js`](src/config/shop.js).

Usernames are 3–20 characters, lowercase letters, numbers, dot, dash or underscore, and are
lowercased as they are typed so `Hajin` and `hajin` cannot become two shops. Uniqueness needs no
list of taken names: Firebase refuses a second account on the same address, so the signup itself is
the check, and two people signing up at the same moment cannot both win.

### Nobody can reset their own password

There is no email address on an account, so there is nowhere to send a reset link and there is no
"Forgot password?" anywhere in the app. The signup screen says so plainly, once.

An owner who is signed in can change their own password from **Change password** in the sidebar.
An owner who is **locked out** can only be rescued by you, in the Firebase console:
**Authentication → Users → ⋮ → Reset password**, then tell them the new one. Budget for this
happening — it is the price of username-only login.

### The first shop's username

The first shop on this installation was created by hand against a real email address, before
signups existed. Its username `umerenterprises` maps to that address instead of the fake domain, so
that owner signs in exactly as they always have — see `LEGACY_LOGIN` in
[`src/config/shop.js`](src/config/shop.js). It is also blocked from being claimed at signup.

### Stopping new signups

Firebase console → **Authentication → Settings → User actions → uncheck "Enable create (sign-up)"**.
The signup screen then reports that new accounts are switched off, and existing shops carry on
unaffected.

## Migrating the first shop (one-time)

Before shops had their own space, data sat at the top level: `products`, `transactions`,
`counters/bills`. [`scripts/migrate-to-shops.mjs`](scripts/migrate-to-shops.mjs) **copies** it
under `shops/{uid}`. The originals are never touched — they stay in the database as a backup that
the app can no longer read, and you delete them from the console when you are satisfied.

The finished rules deny reading those old collections, so the migration needs a temporary ruleset
that allows it. Three steps, in order:

```bash
# 1. Let the migration read the old collections
#    (edit firebase.json: "rules": "firestore.migration.rules")
npx firebase deploy --only firestore:rules

# 2. Copy the data. Sign in as the shop being moved when it asks.
node scripts/migrate-to-shops.mjs

# 3. Put the real rules back
#    (edit firebase.json: "rules": "firestore.rules")
npx firebase deploy --only firestore:rules
```

Do not skip step 3 — [`firestore.migration.rules`](firestore.migration.rules) lets any signed-in
account read the old top-level data, which is exactly what the finished rules exist to prevent.

The script preserves document ids, so running it twice overwrites each copy with the same content
rather than duplicating anything. It seeds the shop document from the details that used to be
hard-coded in `src/config/shop.js`; check the `SEED` block at the top of the script before running
it, and fix anything stale there or in **Shop details** afterwards.

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