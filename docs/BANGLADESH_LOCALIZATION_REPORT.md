# Bangladesh Localization Report

## Owner decision
**English and Bangla UI support are approved for the MVP.** Both languages must be usable throughout the player-facing site and administrator interface.

## Language implementation requirements
- Provide an explicit English/Bangla language switcher.
- Default language is English under approved ADR-015; Bangla remains a full required locale with equal coverage for core UI/admin states.
- Use UTF-8 throughout database, API, web UI, emails where applicable, and content storage.
- Use translation keys and separately maintained language resource files.
- Have Bangla translations reviewed by a fluent speaker; do not rely on unreviewed machine translations for critical instructions or legal text.
- Verify Bangla font glyph coverage, shaping, line height, punctuation, numerals, mixed-script strings and fallback behavior.
- Test search and sorting with Bangla titles and tags.
- Ensure card titles, buttons, validation errors, empty states and navigation do not clip or overflow.
- Store language preference locally only if persistence is needed; this must not create a persistent visitor identity.
- Allow localized game metadata where supplied; define fallback rules before schema implementation.

## Bangladesh-specific considerations
- Timezone: store timestamps in UTC; display Asia/Dhaka where appropriate.
- BDT formatting is not required for the MVP because payments/pricing are out of scope.
- Do not collect phone numbers unless a feature requires them.
- Email deliverability and provider support for intended sender must be verified.
- Payment providers and local regulatory obligations are out of MVP and require separate research if introduced.
- Privacy, consumer, copyright and electronic communication obligations require current qualified legal review.

## Acceptance tests
- Switch English ↔ Bangla without losing the current browse/search context.
- Every core navigation and form state has both translations.
- Bangla text renders correctly on supported desktop and mobile browsers.
- Bangla search returns expected results for supported fields.
- No clipped labels or broken mixed-script layout at supported widths.
- Keyboard and screen-reader users can operate the language switcher.

This report is not legal advice.
