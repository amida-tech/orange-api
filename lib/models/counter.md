# counter.js
- This model is used exclusively by the `increment_plugin.js` helper to save and retrieve IDs in a sequence
- The counters collection in the DB consists is populated by documents of this model-type
## Schema
- `slug: { type: String, require: true }`
- `count: { type: Number, default: 0 }`

## Methods
- `statics.nextInSeq`
	- Uses mongo's `findAndModify` (async) to find or create a counter document in the `counters` collection with the provided `slug`. In this `findAndModify` call the count is also incremented by 1. 
	- Note: both `new` and `upsert` are set to true so the query will return the newly modified document and insert the document if it does not exist