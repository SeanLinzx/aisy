import { createHash, createHmac } from 'crypto';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

function getSigningKey(secretKey: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmacSha256(secretKey, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  return hmacSha256(kService, 'request');
}

export interface VolcSignedRequestHeaders {
  authorization: string;
  'x-date': string;
  'x-content-sha256': string;
  'content-type': string;
  host: string;
}

/** Volcengine OpenAPI v4 signature (imagination / music APIs). */
export function signVolcengineOpenApiRequest(input: {
  accessKey: string;
  secretKey: string;
  method: string;
  path: string;
  query: string;
  body: string;
  region?: string;
  service?: string;
  host?: string;
}): VolcSignedRequestHeaders {
  const region = input.region || 'cn-beijing';
  const service = input.service || 'imagination';
  const host = input.host || 'open.volcengineapi.com';
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(input.body);

  const canonicalHeaders =
    `content-type:application/json\n` +
    `host:${host}\n` +
    `x-content-sha256:${payloadHash}\n` +
    `x-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-content-sha256;x-date';
  const canonicalRequest = [
    input.method.toUpperCase(),
    input.path,
    input.query,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/request`;
  const stringToSign = ['HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n');
  const signingKey = getSigningKey(input.secretKey, dateStamp, region, service);
  const signature = hmacSha256(signingKey, stringToSign).toString('hex');
  const authorization =
    `HMAC-SHA256 Credential=${input.accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    authorization,
    'x-date': amzDate,
    'x-content-sha256': payloadHash,
    'content-type': 'application/json',
    host,
  };
}
