"use strict";
var mongoose        = require("mongoose"),
    autoIncrementId = require("./helpers/increment_plugin.js");

/*eslint-disable key-spacing */
// a schema to be nested inside a User representing requests made to/from another
// user
var RequestSchema = module.exports = new mongoose.Schema({
    _id:        { type: Number, required: true },
    email:      { type: String, required: true },
    status:     { type: String, required: true }
});
/*eslint-enable key-spacing */
RequestSchema.plugin(autoIncrementId, { slug: "requestId" }); // auto incrementing IDs

// we don't actually store anything in a top-level Request collection but instead use it
// for construction of Request items to be inserted into user.requests and user.requested
mongoose.model("Request", RequestSchema);
