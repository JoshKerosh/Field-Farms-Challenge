# Recovery plan presentation

The farm summary and priorities use the existing Sow Water fonts, colours and
theme tokens. The presentation follows these rules:

- Group farm details in a semantic description list. Every value has a visible
  label; cadastral parcel, watershed and subwatershed are distinct fields.
- Keep self-reported farm details separate from geographic observations. Retain
  the source and hectare explanation under “About these details”. Keep the local
  storage notice visible below the form.
- Use the shared 8, 16, 24 and 32 px spacing scale. Separate groups with space or
  a single divider instead of giving every value its own card.
- On wide screens, put the summary beside the priorities. At intermediate widths,
  put the summary above the form; on phones, use one column for questions and a
  full-width primary action. Base layout changes on the card's available width
  using container queries, including when a sidebar reduces that width.
- Keep labels above controls and align controls in each row. Use a minimum touch
  height of 48 px without a fixed height, so enlarged text can grow.
- Let long names and parcel identifiers wrap. Use tabular numerals for farm
  quantities, and preserve the page's heading order and keyboard focus styles.
- Provide every new label and explanation in Spanish and English. Use semantic
  colour tokens for both themes; do not add theme-specific hard-coded colours.

This presentation does not change saved farm profiles, plan identities, goals,
satellite observations or the relationship between the plan and Records.
