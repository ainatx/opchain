// @ts-check
/**
 * The ow- family's person-name rules, in one place. ow-draft, ow-handoff and ow-vendor-eval import these; none keeps a
 * copy. The rules are regression checks on a text, not a registry of people: they err towards a flag a person can
 * clear (add the name to the key's allow list) over a name that reaches a client deliverable.
 *
 * What counts as a person, beyond the base rules each grader already has (ow-documentation's docPeopleFindings):
 *  - a title and a surname ("Dr. Alvarez", "Mrs. McKenzie"), unless the pair is a brand ("Dr. Martens", "Dr. Pepper");
 *  - a given name and a surname, when what is said of them or what stands before them is a person's (a verb such as
 *    "approved", a cue such as "thanks to") or the given name is a known one; a Gaelic particle (Ní, Ó, Nic) or an
 *    "al-" / "el-" prefix after a given name is itself the sign of a name ("Seán Ó Briain", "Hamid al-Rashid");
 *  - a given name and an O'/Mc/Mac surname, whatever follows ("Brendan McGrath");
 *  - a lone O'/Mc/Mac word only in a person's slot ("ask McAllister"), never a possessive ("McDonald's"), a supplier
 *    ("McAllister Pottery Supply") or a word after "the" ("The McKinsey report").
 */

const PARTICLE = '(?:de|van|der|den|von|da|di|le|la|du|del|ten|ter|bin|al|el|Ó|Ní|Nic|Ua|Mac(?=\\s+\\p{Lu}))';
const SURNAME_START = `(?:O['’]|(?:al|el)-)?\\p{Lu}\\p{Ll}[\\p{L}'’-]*`;
export const FULL_NAME = new RegExp(`(?<![\\p{L}\\p{N}'’-])(\\p{Lu}\\p{Ll}+)\\s+((?:${PARTICLE}\\s+)*${SURNAME_START})`, 'gu');
const PERSON_VERB = new RegExp(`^\\s*(?:,\\s*)?(?:runs|ran|attended|said|says|owns|manages|managed|approved|wrote|writes|leads|led|joined|signs|signed|checks|checked|chose|asked|agreed|decided|works|worked|handles|sends|sent|called|emailed|phoned|answered|replied|replies|responded|confirmed|visited|reviewed|met|owns|founded|presented|thanked)\\b|^\\s+and\\s+\\p{Lu}\\p{Ll}+\\s+(?:${PARTICLE}\\s+)*\\p{Lu}\\p{Ll}+\\s+(?:attended|joined|agreed|met)\\b`, 'u');
/** A second word that makes the pair a business, a team or a role, never a person. */
export const ORG_SECOND = /^(?:Service|Services|Entry|Payable|Receivable|Control|Room|Support|Desk|Department|Team|Operations|Accounts|Sales|Shipping|Returns|Office|Hall|Studio|Shop|Store|Ceramics|Books|Florists|Bindery|Manager|Lead|Director|Coordinator|Supervisor|Officer|Assistant|Administrator|Clerk|Owner|Staff|Gallery|Supply|Museum|Bakery|Ltd|Limited|Inc|Company|Group|Press|Foundation|Institute|Hardware|Dealership)$/;
/**
 * Place, system and team words that are never half of a person's name, whatever verb follows ("Health Check runs
 * weekly", "Shop Floor and Kiln Room attended", "Order Desk replied"): a pair with one of these on either side is not a person.
 */
export const NON_NAME_WORDS = new Set(`Health Check Checks Shop Floor Kiln Room Rooms Order Orders Desk Customer Customers Service Services Support Help Helpdesk Team Teams Office Store Stores Warehouse Front Back Main Stock Report Reports Invoice Invoices Billing Account Accounts Sales Payroll Inventory Hosting Domain Domains Admin Dashboard Portal Care Plan Plans Fix Fixes Window Access Review Reviews Status Uptime Security Data Cloud Online Purchase Purchasing Shipping Returns Kitchen Studio Workshop Yard Depot Site Website Server Servers System Systems Backup Backups Email Mail Inbox Calendar Monthly Weekly Daily Nightly Quarterly Annual Morning Evening Night Line Lines Counter Till Register Reception Lobby Board Committee Panel Project Projects Release Build Deploy Staging Production Test Tests`.split(/\s+/));
/** A title before one of these is a product, not a person ("Dr. Martens", "Dr. Pepper"). */
export const TITLE_BRANDS = /^(?:Martens|Pepper|Scholl|Oetker|Dre|Seuss|Strangelove|Who|Pepper's|Martens's|Scholl's|Oetker's|Dre's)$/;
const TITLE = '(?:Mr|Mrs|Ms|Mx|Dr|Prof|Miss)';
const TITLE_SURNAME = new RegExp(`\\b${TITLE}\\.?\\s+((?:O['’]|Mc|Mac)?\\p{Lu}[\\p{L}'’-]+)`, 'u');
const TITLE_THEN_BRAND = new RegExp(`^${TITLE}\\.?\\s+(?:Martens|Pepper|Scholl|Oetker|Dre|Seuss|Strangelove|Who)\\b`);
/** A lone O'/Mc surname in a person slot ("ask McAllister"), unless it is a possessive ("ask McDonald's") or the start of a name. */
const SLOT_SURNAME = /\b(?:ask|contact|call|email|ring|from|talk to|speak to|thanks to|thank|cc|write to|message|text)\s+((?:O['’]|Mc|Mac)\p{Lu}\p{Ll}+)(?![\p{L}])(?!['’]s)(?!\s+\p{Lu})/u;
const personBefore = (generic) => new RegExp(`(?:\\b(?:ask|contact|call|email|e-mail|ring|thanks to|thank|write to|speak to|talk to|cc${generic ? '|with|by|from|to' : ''})\\s+|\\b${TITLE}\\.?\\s+)$`, 'i');
const PERSON_BEFORE = personBefore(true), PERSON_BEFORE_CUES_ONLY = personBefore(false);
const NOT_FIRST = /^(?:The|This|That|Each|Every|Our|Your|Their|One|State|Version|Order|Orders|Sources|Spring|Summer|Autumn|Winter|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|North|South|East|West|New|Old)$/;
/** An imperative opening a sentence ("Ask Jamal Ortiz …") is not the first half of a name. */
const IMPERATIVE = /(^|[.!?:;]\s+|\(\s*)(Ask|Contact|Call|Email|Ring|Thanks|Thank|Write|Send|Speak|Talk|Cc|Message|Text)\b/g;
/** A sentence-opening word that cannot be a given name before an O'/Mc word. */
const NOT_GIVEN = /^(?:The|This|That|These|Open|Call|Ask|See|Use|Visit|Check|Read|Our|Your|Their|And|But|For|With|From|Run|Set|Add|Edit|Show|Click|Install|Update|Find|Get|Go|Try|Order|Buy|Sample|Shop|Contact|Email|Dear|Hello|Hi|Welcome|Please|Mac)$/;
const GIVEN_SURNAME = /(?<![\p{L}\p{N}'’-])(\p{Lu}\p{Ll}{2,})[ \t]+((?:Mc|Mac|O['’])\p{Lu}\p{Ll}+)(?![\p{L}\p{N}'’-])/gu;
const GAELIC_NAME = /^(?:Ó|Ní|Nic|Ua)\s+\p{Lu}/u;
/** "Mac" as a separate word is a Gaelic surname particle only after a given name ("Ciarán Mac Giolla"), never "Big Mac Meal". */
const GAELIC_MAC = /^Mac\s+\p{Lu}/u;

/** A phone number: an international form ("+44 7700 900456", a 6-digit group allowed) or a national one with a leading 0. 9 to 15 digits. */
export const PHONE = /(?<![\w.-])(?:\+\d{1,3}[ .-]?(?:\(\d{1,4}\)[ .-]?)?\d{1,5}(?:[ .-]\d{2,6}){1,4}|\(?0\d{2,4}\)?[ -]\d{3,4}[ -]?\d{3,4})(?![\w-])/;
/** A person's record number: a customer, client, member, account, passport, patient or policy number written out ("Customer no. 300712"). */
export const PERSONAL_ID = /\b(?:customer|client|member(?:ship)?|account|passport|patient|policy|loyalty)\s+(?:id|number|no\.?|#)\s*[:#]?\s*(?:is\s+)?([A-Z]{0,4}-?\d[\d -]{2,}\d)\b/i;
/** Contact and record details of a person, whatever the grader's base rules (phone digits 9 to 15). @param {string} text @returns {Array<[string, string]>} */
export function personalDataFindings(text) {
  const out = [];
  for (const line of String(text ?? '').split('\n')) {
    const plain = line.replace(/\S+@\S+/g, ' ');
    const ph = plain.match(PHONE);
    if (ph) { const n = ph[0].replace(/\D/g, '').length; if (n >= 9 && n <= 15) out.push(['a phone number', ph[0]]); }
    const id = plain.match(PERSONAL_ID);
    if (id) out.push(["a person's record number", id[0].trim()]);
  }
  return /** @type {Array<[string, string]>} */ (out);
}

/**
 * A given name and an O' or Mc surname ("Brendan McGrath", "Cormac O'Brien"). A lone surname, a hyphenated word
 * ("McGraw-style") and a product or place name after a lowercase word are not a person; a sentence-initial verb or
 * article before the surname is not a given name; a business word after the surname ("McAllister Pottery Supply") makes it a supplier.
 * @param {string} text @param {string | null} [user]
 */
export function givenSurnameNames(text, user = null) {
  const out = [];
  for (const m of String(text).matchAll(GIVEN_SURNAME)) {
    if (NOT_GIVEN.test(m[1]) || m[1] === user) continue;
    const after = String(text).slice(m.index + m[0].length).match(/^\s+(\p{Lu}[\p{L}]*)/u);
    if (after && ORG_SECOND.test(after[1])) continue;
    out.push(`${m[1]} ${m[2]}`);
  }
  return out;
}

/**
 * Build a grader's people finder on its base rules.
 * @param {{ base: (text: string, ctx: any) => Array<[string, string]>, givenNames: Set<string>, months: string[], genericCues?: boolean }} deps
 *   base: the grader's own rules (ow-documentation's docPeopleFindings); givenNames: the family's list; months: month names (never a given name);
 *   genericCues: false when "with", "by", "from" and "to" before a two-word name are not a person's slot (ow-vendor-eval, where vendors are named all day).
 * @returns {(text: string, ctx?: any) => Array<[string, string]>}
 */
export function makePeopleFindings({ base, givenNames, months, genericCues = true }) {
  const before_ = genericCues ? PERSON_BEFORE : PERSON_BEFORE_CUES_ONLY;
  return (text, ctx = {}) => {
    const out = base(text, ctx).filter(([, hit]) => !String(hit).split(/\s+/).slice(1).some((w) => ORG_SECOND.test(w)));
    const known = new Set([ctx.user, ctx.business, ctx.client, ...(ctx.names ?? []), ...(ctx.allow ?? [])].filter(Boolean).map((x) => String(x).toLowerCase()));
    const add = (/** @type {string} */ what, /** @type {string} */ hit) => { if (!out.some(([, h]) => h === hit || h === hit.split(/\s+/)[0])) out.push([what, hit]); };
    for (const raw of String(text ?? '').split('\n')) {
      const line = raw.replace(IMPERATIVE, (_m, a, b) => a + b.toLowerCase());
      for (const m of line.matchAll(FULL_NAME)) {
        const name = `${m[1]} ${m[2]}`;
        const after = line.slice(m.index + m[0].length), before = line.slice(0, m.index);
        if (ORG_SECOND.test(m[2]) || NON_NAME_WORDS.has(m[1]) || NON_NAME_WORDS.has(m[2].split(/\s+/).at(-1))) continue;
        if (TITLE_BRANDS.test(m[1]) && new RegExp(`\\b${TITLE}\\.?\\s+$`).test(before)) continue;
        if ([...known].some((k) => k.includes(name.toLowerCase()) || name.toLowerCase().includes(k))) continue;
        if (months.includes(m[1]) || NOT_FIRST.test(m[1])) continue;
        if (GAELIC_NAME.test(m[2]) || (GAELIC_MAC.test(m[2]) && (givenNames.has(m[1]) || /[áéíóúÁÉÍÓÚ]/.test(m[1]))) || PERSON_VERB.test(after) || before_.test(before) || givenNames.has(m[1])) add("a person's name", name);
      }
      for (const name of givenSurnameNames(line, ctx.user)) if (![...known].some((k) => k.includes(name.toLowerCase()) || name.toLowerCase().includes(k))) add("a person's name (a given name and an O'/Mc surname)", name);
      for (let i = out.length - 1; i >= 0; i--) if (TITLE_THEN_BRAND.test(String(out[i][1]))) out.splice(i, 1);
      const slot = line.match(SLOT_SURNAME);
      if (slot) out.push(["a person's surname", slot[1]]);
      const title = line.match(TITLE_SURNAME);
      if (title && !TITLE_BRANDS.test(title[1].replace(/['’]s$/, '')) && !out.some(([w]) => /title/.test(w))) out.push(["a person's name (a title)", title[0]]);
    }
    for (const [what, hit] of personalDataFindings(text)) if (!out.some(([w, h]) => h === hit || (w === what && what === 'a phone number'))) out.push([what, hit]);
    return out;
  };
}
