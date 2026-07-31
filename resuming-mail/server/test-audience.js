require('dotenv').config();

const mongoose = require('mongoose');
const { resolveAudience } = require('./src/services/segmentService');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const contacts = await resolveAudience('all');

  console.log('========================');
  console.log('TOTAL:', contacts.length);
  console.log(contacts);
  console.log('========================');

  process.exit(0);
})();
