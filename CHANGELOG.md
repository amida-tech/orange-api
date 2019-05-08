# Changelog

## [Unreleased]
- HTTP status code is defaulted to 500 for errors that do not specify status codes.

### Added
- Mock data generation script.

### Changed
- Environment variable `ACCESS_CONTROL_ALLOW_ORIGIN` is now an array of strings, rather than a string of comma-separated values.
- Running the test suite will no longer drop your non-testing database.
- Medication scheduling fixes.
- Fixed crash when fetching notes.
- Restrict help desk search/access to patient-type accounts.
