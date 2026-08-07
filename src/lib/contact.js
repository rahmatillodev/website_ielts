/**
 * The brand's public contact details.
 *
 * These used to be read out of the `system_settings` row, which meant each
 * surface showed whatever that row happened to hold at the time — a support
 * email in one place, a channel handle in another, and (on the writing export)
 * the appearance settings object, which has no contact fields at all. They are
 * fixed brand facts rather than per-environment configuration, so they live
 * here and every surface renders the same three lines.
 *
 * There is deliberately no email: the platform is contacted through Telegram.
 */
export const CONTACT = {
  /** Handle without the @, for building t.me links. */
  telegramUsername: "officeedu",
  /** Display form, with the @. */
  telegram: "@officeedu",
  phone: "+998 91 202 10 02",
  instagram: "edu_kokand",
};

export default CONTACT;
