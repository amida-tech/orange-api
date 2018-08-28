# helpers docs
## increment_plugin.js
- This helper is used to autoincrement ids
- It takes in an existing `mongoose` schema and an options object
- The plugin then adds a required `_id` field to the schema with type: `Number` 
	- Note: This integer `_id` is in addition to the object id that gets added to any MongoDB document
- Defines a method `getId` on the schema which calls `nextInSeq` from `counter` and returns the next ID in the sequence from the existing `counter` document or creates a new `counter` document in the `counters` collection
- This is then fed to middleware via `pre` for validation

## fuzzy_plugin.js
- Used to fuzzy match on fields