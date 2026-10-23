const assert = require("node:assert/strict");
const { EasJsonSchema } = require("@expo/eas-json/build/schema");
const eas = require("../eas.json");
const result = EasJsonSchema.validate(eas, { abortEarly: false });
assert.ifError(result.error);
assert.equal(eas.cli.version, require("eas-cli/package.json").version);
console.log("EAS profiles match the pinned CLI schema.");
