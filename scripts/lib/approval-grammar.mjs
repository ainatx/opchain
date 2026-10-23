// @ts-check
/**
 * Shared clause grammar for the ow-draft and ow-handoff session graders.
 * These are regression checks of the user's recorded words, not authorization
 * to perform an action. Record-specific item/role checks remain with each grader.
 *
 * The two profiles preserve the approved corpus semantics: draft applies hedges
 * to the whole answer; handoff supports reported client acts, negative choices,
 * past-tense "after" references, and a separate ow-care installation answer.
 * All tokenization and clause evaluation lives here, so fixes have one owner.
 */

/** @typedef {'draft' | 'handoff'} ApprovalProfile */
/** @typedef {'none' | 'client' | 'go-ahead-email'} RelayPolicy */
/** @typedef {(clause: string, sentence: string, clauses: string[], index: number) => boolean} ApprovalPredicate */
/** @typedef {(reason: string) => void} ApprovalReporter */
/** @typedef {{profile: 'draft', verb: (clause: string) => boolean, accept?: ApprovalPredicate, report?: ApprovalReporter, relay?: RelayPolicy, clientWords?: RegExp}} DraftRule */
/** @typedef {{profile: 'handoff', verb: (clause: string) => boolean, accept?: ApprovalPredicate, report?: ApprovalReporter, allowNo?: boolean, drop?: string[], relay?: RelayPolicy, clientWords?: RegExp}} HandoffRule */
/** @typedef {DraftRule | HandoffRule} ApprovalRule */

export const SAID_NO = /\b(?:no|not|never|don't|do not|doesn't|won't|will not|haven't|hasn't|hadn't|isn't|wasn't|didn't|can't|cannot|hold(?: off)?|wait|stop|skip|cancel|refused?|declined?|reject(?:ed)?|withdr[ae]w)\b/i;
export const SAID_LATER = /\b(?:once|if|unless|later|tomorrow|next (?:week|month|time)|will|would|may|might|could|going to|soon|maybe|perhaps|pending|after I|when I)\b/i;
/** Conditions SAID_LATER (a pinned OW-10 rule) does not carry: "when the review is back", "until Friday", "as long as". */
export const LATER_WHEN = /\b(?:when|whenever|until|till|as soon as|as long as)\b/i;
export const SAID_RELAY = /\b(?:says|said|asks|asked|wrote|writes|told me|tells me|note|email|message|text(?:ed)?|liked)\b/i;
export const DOC_RELAY = /\b(?:email|note|message|inbox|file|letter|text)\b[^.;]*\b(?:says|said|states?|shows?|claims?)\b/i;

const SCOPE_NOUNS = String.raw`changes?|edits?|more|other|further|issues?|problems?|objections?|worries|doubts?|logo|quote|matter`;
const SCOPE_END = String.raw`\bnothing (?:else|to (?:change|add|fix|do with)|more)\b|\bno need(?: (?:to|for) \w+)?\b`;
export const DRAFT_SCOPE = new RegExp(String.raw`\bno (?:${SCOPE_NOUNS})\b|${SCOPE_END}|\bno further(?: \w+)?\b|\bnot later\b`, 'gi');
export const HANDOFF_SCOPE = new RegExp(String.raw`\bno (?:${SCOPE_NOUNS}|strings|conditions|catches|caveats|steps|extras?|additional)\b(?: attached| left| needed)?|${SCOPE_END}|\bnot later\b`, 'gi');

const HEDGE_START = String.raw`provided|assuming|as long as|depending on|subject to|supposedly|apparently|allegedly|reportedly|I heard|heard that|I think|I guess|I suppose`;
const HEDGE_END = String.raw`\?\s*(?:no|nope|not)\b|\b(?:readme|sample|note|email|file|document|doc|page|message|memo|text|drive)(?:'s)?\s+(?:\w+\s+)?(?:says?|said|states?|reads?)\b|\bsays:`;
export const DRAFT_HEDGE = new RegExp(String.raw`\b(?:${HEDGE_START}|I'm not sure|not sure|unsure|probably|maybe|perhaps|haven't decided|undecided|no,? wait|hold on|according to)\b|${HEDGE_END}`, 'i');
export const HANDOFF_HEDGE = new RegExp(String.raw`\b(?:${HEDGE_START}|I assume|thinks?|believes?|thought|I'm (?:not )?sure|I am (?:not )?sure|not sure|unsure|probably|presumably|likely|reckons?|seems?|looks like|should be|must have|leaning|hopefully|maybe|perhaps|haven't decided|undecided|no,? wait|hold on|according to)\b|\bstill (?:my|mine|ours|our|the builder's)\b|${HEDGE_END}`, 'i');
const COND_START = /^(?:once|if|unless|when|after|pending|as soon as|provided|not yet|later)\b/i;
const DRAFT_NEG_NEXT = /^(?:not really|no|nope|never mind|on second thought|actually,? no)\b/i;
export const HANDOFF_NEG_NEXT = /^(?:not really|nope|never mind|on second thought|actually,? no|no(?=[,.!]|$))/i;
const HANDOFF_LATER = /\b(?:I'll|we'll|they'll|it'll|she'll|he'll|should|gets?|getting|when|booked|scheduled|planned|planning|for now|this (?:afternoon|evening|week)|by (?:Monday|Tuesday|Wednesday|Thursday|Friday|the end)|on (?:Monday|Tuesday|Wednesday|Thursday|Friday))\b|\b(?:is|are|am) (?!\w+ed\b)\w+ing\b|\bgoes out\b/i;
const HANDOFF_DOC = /\b(?:doc|document|readme|log|sheet|ticket|notes?|wiki|onboarding|handoff doc)\b[^.;]*\b(?:says|said|states?|shows?|claims?|owns?)\b|\baccording to\b|\b(?:the|a) (?:\w+ )?(?:doc|readme|log|ticket|wiki) (?:says|shows|states)\b/i;
export const RELAY_VERB = /\b(?:says|said|told me|tells me|wrote|writes|reckons|thinks|reports?|mentioned|relayed|relays|forwarded|passed (?:on|along)|conveyed)\b/i;
/** "Per the ticket", "as per the doc": someone else's record read out, never the user's own act. */
export const PER_RELAY = /^(?:as )?per\b|\bas per\b/i;
/**
 * A retraction later in the same sentence ("I approve C-1, but wait", "...never mind", "...actually no"). "Wait for" and
 * "hold on to" are not retractions.
 */
export const RETRACT_CLAUSE = /^(?:(?:and|but|then|so|or),?\s+)?(?:wait(?!\s+(?:for|until|till|on)\b)|hold (?:on(?!\s+to\b)|off|up)|hang on|on second thought|then again|never ?mind|scratch that|cancel that|strike that|belay that|ignore (?:that|this)|disregard (?:that|this)|forget (?:it|that)|actually,?\s*(?:no|not|wait|hold|don't|stop|never)|no,? wait)\b/i;
/** A later sentence of the same utterance that takes the approval back ("Hold on.", "Actually, no.", "Scratch that."). */
export const RETRACT_SENTENCE = /^(?:(?:hmm+|um+|uh+|er+|well|oh|ah|sorry|ok(?:ay)?|but|and|so|no),?\s+)*(?:wait(?!\s+(?:for|until|till|on)\b)|hold (?:on(?!\s+to\b)|off|up)|hang on|stop\b(?!\s+(?:here|there|now|work|using)\b)|scratch that|cancel that|strike that|belay that|ignore (?:that|this)|disregard (?:that|this)|forget (?:it|that)|never ?mind|on second thought|actually,?\s*(?:no|not|wait|hold|don't|stop|never|cancel)|then again)/i;

/** @param {string} text */
export const normalizeApproval = (text) => String(text ?? '').replace(/[‘’]/g, "'");
/** @param {string} text */
export const sentencesOf = (text) => String(text).split(/(?<=[.;!?])\s+/).map((x) => x.trim()).filter(Boolean);
/** @param {string} sentence */
export const clausesOf = (sentence) => String(sentence).replace(/[.;!?]+$/, '').split(/,\s+|\s+(?:and|but|then)\s+/).map((x) => x.trim()).filter(Boolean);
/** @param {string} text */
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** @param {unknown} profile @returns {asserts profile is ApprovalProfile} */
function assertProfile(profile) {
  if (profile !== 'draft' && profile !== 'handoff') throw new TypeError(`unknown approval profile: ${String(profile)}`);
}

/** Remove scoped exclusions, not an approval's own decline. @param {string} text @param {ApprovalProfile} profile @param {string[]} [drop] */
export function scopeOut(text, profile, drop = []) {
  assertProfile(profile);
  let value = (profile === 'handoff' ? normalizeApproval(text) : String(text)).replace(profile === 'draft' ? DRAFT_SCOPE : HANDOFF_SCOPE, ' ');
  if (drop.length) value = value.replace(new RegExp(`\\(?\\bnot (?:the )?(?:${drop.map(escape).join('|')})\\b(?: tier| care| help| plan)?\\)?`, 'gi'), ' ');
  return value;
}
/** @param {string} text @param {ApprovalProfile} profile */
export const hedged = (text, profile) => (profile === 'draft' ? DRAFT_HEDGE : HANDOFF_HEDGE).test(scopeOut(text, profile));
/** @param {string} text @param {ApprovalProfile} profile */
export const declined = (text, profile) => SAID_NO.test(scopeOut(text, profile));
/** @param {string} text @param {ApprovalProfile} profile */
export function laterIn(text, profile) {
  assertProfile(profile);
  return SAID_LATER.test(text) || LATER_WHEN.test(text) || (profile === 'handoff' && HANDOFF_LATER.test(text));
}
/** "After the re-check passed" is history in handoff, not a future condition. @param {string} text @param {ApprovalProfile} profile */
export function conditionalStart(text, profile) {
  assertProfile(profile);
  return COND_START.test(text) && !(profile === 'handoff' && /^after\b/i.test(text) && /\b(?:passed|was|were|had|did|ran|finished|completed|checked|went|came|confirmed|ended|closed)\b/i.test(text));
}
/** The email exception only belongs to a reported client go-ahead. @param {string} text @param {RelayPolicy} mode */
export const documentRelay = (text, mode) => HANDOFF_DOC.test(text) || (DOC_RELAY.test(text) && !(mode === 'go-ahead-email' && /\b(?:client|their|they|operations manager|order coordinator|bookkeeper|shop manager)'?s?\s+email\b/i.test(text)));

/**
 * Accept only a matching affirmative clause under a named policy. The caller
 * supplies what the record must name; the grammar owns declines, conditions,
 * hedges, sentence retractions, and handoff's client/own-act relay boundary.
 * Invalid rule shapes throw, so a typo cannot silently select a looser profile.
 * @param {string} text
 * @param {ApprovalRule} rule
 * @returns {boolean}
 */
export function approvedClause(text, rule) {
  assertProfile(rule?.profile);
  if (typeof rule.verb !== 'function' || (rule.accept !== undefined && typeof rule.accept !== 'function') || (rule.report !== undefined && typeof rule.report !== 'function')) throw new TypeError('an approval rule needs predicate functions');
  const handoff = rule.profile === 'handoff';
  if (rule.relay !== undefined && !['none', 'client', 'go-ahead-email'].includes(rule.relay)) throw new TypeError('unknown approval relay policy');
  const allowNo = handoff && rule.allowNo === true;
  const drop = handoff ? rule.drop ?? [] : [];
  const relay = rule.relay ?? (handoff ? 'client' : 'none');
  const clientWords = rule.clientWords ?? /\bclient\b/i;
  const accept = rule.accept ?? (() => true), why = rule.report ?? (() => {});
  const sentences = sentencesOf(text);
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i], clauses = clausesOf(sentence);
    for (let j = 0; j < clauses.length; j++) {
      const clause = clauses[j];
      if (!rule.verb(clause)) continue;
      const scoped = scopeOut(clause, rule.profile, drop);
      if (!allowNo && SAID_NO.test(scoped)) { why('declines or says no'); continue; }
      if (laterIn(handoff ? scoped : clause, rule.profile)) { why('says it for later or on a condition'); continue; }
      const precedingCondition = handoff ? /^(?:if|unless|provided|assuming|once|when|whenever|after)\b/i : /^(?:if|unless|provided|assuming|once|when|whenever)\b/i;
      if (clauses.slice(j + 1).some((x) => conditionalStart(x, rule.profile)) || clauses.slice(0, j).some((x) => precedingCondition.test(x) && (!handoff || conditionalStart(x, rule.profile)))) { why('says it for later or on a condition'); continue; }
      if (clauses.slice(j + 1).some((x) => RETRACT_CLAUSE.test(x)) || sentences.slice(i + 1).some((x) => RETRACT_SENTENCE.test(scopeOut(x, rule.profile).trim()))) { why('declines or says no'); continue; }
      if (clauses.slice(0, j).some((x) => /^(?:wait|hold on|hold off|stop)$/i.test(x)) || (handoff && !allowNo && j > 0 && /^(?:no|nope)$/i.test(clauses[0]))) { why('declines or says no'); continue; }
      const hedgeText = handoff ? (allowNo ? sentence.replace(/\b(?:haven't|hasn't|has not|have not) (?:yet )?decided\b|\bundecided\b/gi, ' ') : sentence) : text;
      if (hedged(hedgeText, rule.profile)) { why('hedges'); continue; }
      const next = sentences[i + 1] ? scopeOut(sentences[i + 1], rule.profile).trim() : '';
      if (next && (handoff ? HANDOFF_NEG_NEXT : DRAFT_NEG_NEXT).test(next) && !(handoff && /\bow-care\b/i.test(next))) { why('declines or says no'); continue; }
      if (handoff && documentRelay(sentence, relay)) { why('reads a document out as the approval'); continue; }
      // Someone else's words or record read out is never the user's own act: a relay verb, "per the ticket", "told me".
      let bad = null;
      for (const item of clauses) {
        if (PER_RELAY.test(item) && !(relay === 'go-ahead-email' && /\b(?:client|their|they|operations manager|order coordinator|bookkeeper|shop manager)'?s?\s+email\b/i.test(item))) bad = "relays someone else's record";
        const match = item.match(RELAY_VERB);
        if (!match) continue;
        if (relay === 'none') bad = "relays someone else's words";
        else if (!clientAttribution(item, match.index, clientWords)) bad = "relays a third party's words";
      }
      if (bad) { why(bad); continue; }
      if (accept(clause, sentence, clauses, j)) return true;
    }
  }
  return false;
}

/** A relay verb is the client's own: the client is its subject ("the client says …") or the attribution that follows a leading verb ("…, says the client owner"). */
const clientAttribution = (item, at, clientWords) => {
  const before = item.slice(0, at);
  return clientWords.test(before) || (before.trim() === '' && clientWords.test(item.slice(at)));
};
/**
 * Does any clause read someone else's words or record out ("Pat says…", "per the ticket", "told me…")? For answers that
 * are not graded clause by clause (a yes to a printed list, a brief): `relay` and `clientWords` as in approvedClause.
 * @param {string} text @param {RelayPolicy} [relay] @param {RegExp} [clientWords]
 */
export function relayedIn(text, relay = 'none', clientWords = /\bclient\b/i) {
  for (const sentence of sentencesOf(text)) for (const item of clausesOf(sentence)) {
    if (PER_RELAY.test(item)) return true;
    const match = item.match(RELAY_VERB);
    if (match && (relay === 'none' || !clientAttribution(item, match.index, clientWords))) return true;
  }
  return false;
}
/** Does a later clause or a later sentence of this one utterance take it back? @param {string} text */
export function retractedIn(text) {
  const sentences = sentencesOf(text);
  return sentences.some((sentence, i) => (i > 0 && RETRACT_SENTENCE.test(sentence)) || clausesOf(sentence).slice(1).some((x) => RETRACT_CLAUSE.test(x)));
}
