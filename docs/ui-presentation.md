# Content presentation

The remaining Sow Water views follow the recovery plan's existing typography,
palette and 8/16/24/32 px spacing scale. Content cards use explicit opt-in classes;
map containers, layers, controls and satellite workspaces retain their styles.

- Keep related data and explanations close. Separate tasks with consistent gaps.
- Use consistent type sizes for facts, tabular numerals for quantities, and labels
  above controls. Grid layouts follow the available width rather than a fixed
  number of columns; long translations and enlarged text can wrap.
- Keep controls at least 44 px high (48 px for data entry), without fixed heights.
- Use semantic theme tokens and retain keyboard focus indicators.
- Align guide actions, programme counters and record form fields by role.
- Group source metadata and retain all scientific qualifications and references.

Farm registration reuses the selected SIRI parcel's `shape_area` in square metres,
divided by 10,000. A positive finite area replaces manual total-area entry. When
the area is missing or invalid, manual entry remains available. Existing validation
and storage formats are retained; the value is saved at confirmation without display
rounding. Previously saved profiles and recovery plans are not migrated. No extra
parcel request is introduced. Crop/forage area and farm management remain declared
information because the parcel boundary does not determine them.

User-facing Spanish uses “saturación de suelos”, with “soil saturation” in English.
Internal pore-space units, thresholds and environmental calculations remain unchanged.
