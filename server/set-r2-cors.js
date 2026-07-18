/**
 * set-r2-cors.js
 * Run this ONCE to configure CORS on your Cloudflare R2 bucket.
 * Usage: node set-r2-cors.js
 */

require('dotenv').config();
const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const corsConfig = {
  Bucket: process.env.R2_BUCKET_NAME || 'talentforce-resumes',
  CORSConfiguration: {
    CORSRules: [
      {
        AllowedOrigins: [
          'https://xstudio.blog',
          'https://www.xstudio.blog',
          'http://localhost:5173',
          'http://localhost:3000',
        ],
        AllowedMethods: ['PUT', 'GET', 'HEAD', 'DELETE'],
        AllowedHeaders: ['*'],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3600,
      },
    ],
  },
};

async function main() {
  try {
    console.log('⏳ Setting CORS policy on R2 bucket...');
    await s3Client.send(new PutBucketCorsCommand(corsConfig));
    console.log('✅ SUCCESS! CORS policy applied to Cloudflare R2 bucket.');
    console.log('   Allowed origins:');
    corsConfig.CORSConfiguration.CORSRules[0].AllowedOrigins.forEach(o =>
      console.log(`   - ${o}`)
    );
  } catch (err) {
    console.error('❌ FAILED to set CORS policy:', err.message);
    if (err.Code === 'InvalidAccessKeyId') {
      console.error('   → Check your R2_ACCESS_KEY_ID in .env');
    } else if (err.Code === 'SignatureDoesNotMatch') {
      console.error('   → Check your R2_SECRET_ACCESS_KEY in .env');
    }
  }
}

main();
