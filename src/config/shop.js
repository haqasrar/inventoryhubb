/**
 * Shop details printed on every bill. Edit here to change what customers see.
 */
export const SHOP = {
  name: 'Umer Enterprises',
  owner: 'Umer-ud-Din Ahangar',
  gstin: '01CTBPA2880C1ZJ',
  phone: '9906634041',
  /** The line under the shop name on the printed bill book. */
  dealsIn:
    'Deals in all kinds of Wooden Furniture, Steel Furniture, Plastic Furniture, Electronics, Stationery and Tailoring Machines etc.',
  address: 'Hajin Sonawari, Opposite Bus Stand, Hajin, Bandipora, Jammu and Kashmir — 193501',
  /** Prefix for bill numbers, e.g. UE-0001. */
  billPrefix: 'UE',
}

/**
 * The shop signs in with a username, but Firebase Auth only understands email
 * addresses — so the username below is swapped for `email` before the request goes
 * out. Nobody has to remember the email.
 *
 * `email` MUST be the exact address the Firebase Auth user was created with
 * (Authentication -> Users). Keeping it a real inbox you can open is what makes the
 * "Forgot password?" link work.
 *
 * No password lives here. Firebase checks that, and this file is readable by anyone
 * who opens the site.
 */
export const LOGIN = {
  username: 'umerenterprises',
  email: 'haqasrar264@gmail.com', // <- paste the Firebase Auth account's email here
}
