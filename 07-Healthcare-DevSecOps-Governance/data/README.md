# Governed healthcare datasets

Only approved datasets belong under this directory. Raw data is ignored by Git.

- `synthea/`: synthetic FHIR R4 bundles.
- `bidmc/`: locally downloaded PhysioNet BIDMC CSV files; retain attribution.
- `tcia/`: approved TCIA DICOM collections; record collection DOI and license.
- `mimic/`: controlled MIMIC-IV data. Keep empty unless credentialing, training,
  a signed DUA, and an internal approval reference are complete.

Never commit clinical or research records to source control.
