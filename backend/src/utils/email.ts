import crypto from 'crypto';

type EmailInput = {
  to: string;
  subject: string;
  text: string;
};

const encoder = new TextEncoder();

function hash(value: string) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

type HmacKey = crypto.BinaryLike | Buffer | Uint8Array;

function hmac(key: HmacKey, value: string) {
  return crypto
    .createHmac('sha256', key as unknown as crypto.BinaryLike)
    .update(value, 'utf8')
    .digest();
}

function getSignatureKey(secretKey: string, dateStamp: string, region: string, service: string) {
  const kDate = hmac(encoder.encode(`AWS4${secretKey}`), dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

function sesConfig() {
  return {
    region: process.env.AWS_REGION || process.env.SES_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    fromEmail: process.env.SES_FROM_EMAIL || '',
  };
}

async function sendSesEmail({to, subject, text}: EmailInput) {
  const {region, accessKeyId, secretAccessKey, fromEmail} = sesConfig();

  if (!accessKeyId || !secretAccessKey || !fromEmail) {
    throw new Error('SES email is not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and SES_FROM_EMAIL.');
  }

  const service = 'ses';
  const host = `email.${region}.amazonaws.com`;
  const endpoint = `https://${host}/v2/email/outbound-emails`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payload = JSON.stringify({
    FromEmailAddress: fromEmail,
    Destination: {
      ToAddresses: [to],
    },
    Content: {
      Simple: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: text,
            Charset: 'UTF-8',
          },
        },
      },
    },
  });
  const canonicalHeaders = [
    'content-type:application/json',
    `host:${host}`,
    `x-amz-date:${amzDate}`,
  ].join('\n');
  const signedHeaders = 'content-type;host;x-amz-date';
  const canonicalRequest = [
    'POST',
    '/v2/email/outbound-emails',
    '',
    `${canonicalHeaders}\n`,
    signedHeaders,
    hash(payload),
  ].join('\n');
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    hash(canonicalRequest),
  ].join('\n');
  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = crypto
    .createHmac('sha256', signingKey as unknown as crypto.BinaryLike)
    .update(stringToSign, 'utf8')
    .digest('hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
      'X-Amz-Date': amzDate,
    },
    body: payload,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('SES send failed', {
      status: response.status,
      region,
      fromEmail,
      toDomain: to.split('@')[1] || '',
      errorBody,
    });
    throw new Error(`SES send failed: ${response.status} ${errorBody}`);
  }

  const responseBody = await response.text();
  console.log('SES send succeeded', {
    status: response.status,
    region,
    fromEmail,
    toDomain: to.split('@')[1] || '',
    responseBody,
  });
}

export async function sendVerificationEmail(email: string, code: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`DEV VERIFICATION CODE for ${email}: ${code}`);
    return;
  }

  await sendSesEmail({
    to: email,
    subject: 'Your Better Budget verification code',
    text: `Your Better Budget verification code is ${code}. This code expires in 15 minutes.`,
  });
}

export async function sendPasswordResetEmail(email: string, code: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Password reset code for ${email}: ${code}`);
    return;
  }

  await sendSesEmail({
    to: email,
    subject: 'Your Better Budget password reset code',
    text: `Your Better Budget password reset code is ${code}. This code expires in 15 minutes.`,
  });
}
