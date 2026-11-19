import crypto from 'crypto';

export function normalizeKenyanMsisdn(phone: string): string | null {
  const cleaned = String(phone || '').replace(/[\s\-()]/g, '');
  if (/^\+?254(7|1)\d{8}$/.test(cleaned)) {
    return cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;
  }
  if (/^(07|01)\d{8}$/.test(cleaned)) {
    return `254${cleaned.slice(1)}`;
  }
  return null;
}

export function generateSandboxReceiptCode(prefix: string = 'SGK'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = prefix;
  const randomBytes = crypto.randomBytes(7);
  for (let i = 0; i < 7; i++) {
    code += chars.charAt(randomBytes[i] % chars.length);
  }
  return code;
}

export function hasLiveDarajaConfig(): boolean {
  return Boolean(
    process.env.MPESA_CONSUMER_KEY &&
      process.env.MPESA_CONSUMER_SECRET &&
      process.env.MPESA_SHORTCODE &&
      process.env.MPESA_PASSKEY
  );
}

function getDarajaTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
}

export async function initiateDarajaStkPush(params: {
  msisdn: string;
  amountKes: number;
  purpose: string;
  itemName: string;
}): Promise<{
  mode: 'LIVE_DARAJA' | 'SANDBOX';
  merchantRequestId: string;
  checkoutRequestId: string;
  responseCode: string;
  customerMessage: string;
  receiptPreview?: string;
}> {
  if (!hasLiveDarajaConfig()) {
    const now = Date.now();
    const randSuffix = crypto.randomBytes(3).toString('hex');
    return {
      mode: 'SANDBOX',
      merchantRequestId: `29115-34620561-${now}`,
      checkoutRequestId: `ws_CO_${now}_${randSuffix}`,
      responseCode: '0',
      customerMessage: 'Success. Request accepted for processing (Sandbox)',
      receiptPreview: generateSandboxReceiptCode('SGK'),
    };
  }

  const baseUrl =
    process.env.MPESA_ENV === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

  const authHeader = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');

  const tokenRes = await fetch(
    `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${authHeader}` },
    }
  );
  if (!tokenRes.ok) {
    throw new Error(`Daraja OAuth failed with status ${tokenRes.status}`);
  }
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    throw new Error('Daraja OAuth did not return an access token');
  }

  const timestamp = getDarajaTimestamp();
  const shortcode = process.env.MPESA_SHORTCODE!;
  const passkey = process.env.MPESA_PASSKEY!;
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
  const callbackUrl =
    process.env.MPESA_CALLBACK_URL || 'https://www.pendo.website/api/mpesa/callback';

  const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.max(1, Math.round(params.amountKes)),
      PartyA: params.msisdn,
      PartyB: shortcode,
      PhoneNumber: params.msisdn,
      CallBackURL: callbackUrl,
      AccountReference: 'PENDO_KE',
      TransactionDesc: params.itemName.slice(0, 40),
    }),
  });

  const stkData = (await stkRes.json().catch(() => ({}))) as {
    MerchantRequestID?: string;
    CheckoutRequestID?: string;
    ResponseCode?: string;
    CustomerMessage?: string;
    errorMessage?: string;
  };

  if (!stkRes.ok || !stkData.CheckoutRequestID) {
    throw new Error(stkData.errorMessage || 'Safaricom Daraja STK Push rejected');
  }

  return {
    mode: 'LIVE_DARAJA',
    merchantRequestId: stkData.MerchantRequestID || `29115-${Date.now()}`,
    checkoutRequestId: stkData.CheckoutRequestID,
    responseCode: stkData.ResponseCode || '0',
    customerMessage: stkData.CustomerMessage || 'Success. Request accepted for processing',
  };
}

export function parseDarajaCallbackPayload(body: any): {
  checkoutRequestId: string | null;
  resultCode: number;
  resultDesc: string;
  receiptNumber: string | null;
} {
  const stkCallback = body?.Body?.stkCallback || body?.stkCallback || body || {};
  const checkoutRequestId = stkCallback.CheckoutRequestID || stkCallback.checkoutRequestId || null;
  const resultCode = Number(stkCallback.ResultCode ?? stkCallback.resultCode ?? 0);
  const resultDesc = String(stkCallback.ResultDesc || stkCallback.resultDesc || 'Processed');

  let receiptNumber: string | null =
    stkCallback.MpesaReceiptNumber || stkCallback.receiptNumber || null;

  const items = stkCallback.CallbackMetadata?.Item;
  if (Array.isArray(items)) {
    const receiptItem = items.find((i: any) => i?.Name === 'MpesaReceiptNumber');
    if (receiptItem?.Value) {
      receiptNumber = String(receiptItem.Value);
    }
  }

  return {
    checkoutRequestId,
    resultCode,
    resultDesc,
    receiptNumber,
  };
}
