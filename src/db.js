const mongoose = require('mongoose');
require('dotenv').config()

mongoose.connect(process.env.MONGO, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});