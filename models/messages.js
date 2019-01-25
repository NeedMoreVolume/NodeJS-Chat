let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let messageSchema = new Schema({
  username: String,
  timestamp: Date,
  message: String
});

module.exports = mongoose.model('Message', messageSchema);
