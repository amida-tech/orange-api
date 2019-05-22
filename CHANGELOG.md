# Changelog

## [1.9.0] -- 2019-05-21
### Added
- Environment variable `EMAIL_VERIFICATION_INIT_PAGE_URL`. See README for details.

### Removed
- NPI implementation. The NPI library was broken, and the functionality was removed to make the automated tests work.

### Changed
- HTTP status code is defaulted to 500 for errors that do not specify status codes.
- Users of scope `admin` can now see patients.

### Fixed
- Mongo SSL config.

## [Prior to 1.9.0]

### Added
- Mock data generation script.

### Changed
- Environment variable `ACCESS_CONTROL_ALLOW_ORIGIN` is now an array of strings, rather than a string of comma-separated values.
- Running the test suite will no longer drop your non-testing database.
- Medication scheduling fixes.
- Fixed crash when fetching notes.
- Restrict help desk search/access to patient-type accounts.
