import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Vercel Serverless Function types
type VercelRequest = {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  body: string | Buffer;
};

type VercelResponse = {
  statusCode?: number;
  data?: any;
  status: (code: number) => VercelResponse;
  json: (data: any) => VercelResponse;
  send: (data: string) => VercelResponse;
};

// Helpers to mock req/res
function createMockReq(body: Buffer, headers: Record<string, string>): VercelRequest {
  return {
    method: 'POST',
    headers: headers as any,
    body: body,
  };
}

function createMockRes(): VercelResponse {
  const res: any = {};
  res.statusCode = 200;
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.data = data;
    return res;
  };
  res.send = (data: string) => {
    res.data = data;
    return res;
  };
  return res;
}

function setEnv() {
  process.env.OD_URL = 'https://example.odoo.com';
  process.env.OD_DB_NAME = 'db';
  process.env.OD_API_KEY = 'key';
  process.env.ST_WEBHOOK_SECRET = 'whsec';
  process.env.STRIPE_SECRET_KEY = 'sk_test';
  process.env.SUPABASE_URL = 'https://supabase.example';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'supakey';
}

// Mock Stripe module - must be before importing handler
const mockConstructEvent = vi.fn();
const mockSessionsList = vi.fn().mockResolvedValue({ data: [] });
const mockSessionsRetrieve = vi.fn();

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => {
      return {
        webhooks: {
          constructEvent: mockConstructEvent,
        },
        checkout: {
          sessions: {
            list: mockSessionsList,
            retrieve: mockSessionsRetrieve,
          },
        },
      };
    }),
  };
});

// Import handler after mocking Stripe
import handler from './stripe-webhook-odoo';

function mockStripe(eventFactory: () => any) {
  mockConstructEvent.mockImplementation((_raw: any, _sig: any, _secret: any) => {
    try {
      return eventFactory();
    } catch (err) {
      throw err;
    }
  });
}

function mockFetchWith(options: {
  partnerExists?: boolean;
  orderExists?: boolean;
  supabaseStatus?: number;
  capture?: { calls: any[] };
  uid?: number;
}) {
  const {
    partnerExists = false,
    orderExists = false,
    supabaseStatus = 201,
    capture,
    uid = 999,
  } = options;
  let partnerSearched = false;
  let orderSearched = false;

  global.fetch = vi.fn().mockImplementation(async (url: any, init: any) => {
    // Capture calls
    if (capture) {
      capture.calls.push({ url, init });
    }
    // Supabase insert
    if (String(url).includes('/rest/v1/booking')) {
      return new Response(JSON.stringify({}), { status: supabaseStatus });
    }

    const body = JSON.parse(init.body);
    const [db, maybeUid, maybePassword, model, method] = body.params.args || [];
    if (!db || !model || !method) {
      return new Response(JSON.stringify({ error: { message: 'bad args' } }), { status: 400 });
    }

    // Common login
    if (body.params.service === 'common' && method === 'login') {
      return new Response(JSON.stringify({ result: uid }), { status: 200 });
    }

    if (model === 'res.partner' && method === 'search') {
      partnerSearched = true;
      return new Response(JSON.stringify({ result: partnerExists ? [42] : [] }), { status: 200 });
    }
    if (model === 'res.partner' && method === 'create') {
      return new Response(JSON.stringify({ result: 42 }), { status: 200 });
    }
    if (model === 'res.partner' && method === 'write') {
      return new Response(JSON.stringify({ result: true }), { status: 200 });
    }

    if (model === 'sale.order' && method === 'search') {
      orderSearched = true;
      return new Response(JSON.stringify({ result: orderExists ? [77] : [] }), { status: 200 });
    }
    if (model === 'sale.order' && method === 'create') {
      return new Response(JSON.stringify({ result: 77 }), { status: 200 });
    }
    if (model === 'sale.order' && method === 'write') {
      return new Response(JSON.stringify({ result: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ result: true }), { status: 200 });
  }) as any;

  return {
    get partnerSearched() {
      return partnerSearched;
    },
    get orderSearched() {
      return orderSearched;
    },
  };
}

describe('stripe-webhook-odoo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles payment_intent.succeeded and returns success', async () => {
    setEnv();
    mockStripe(() => ({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_123',
          currency: 'eur',
          metadata: {
            email: 'test@example.com',
            product_name: 'Test Prod',
            product_type: 'experience',
            guests: '2',
          },
        },
      },
    }));
    mockFetchWith({});

    const raw = Buffer.from('fake-body');
    const req = createMockReq(raw, { 'stripe-signature': 'sig' });
    const res = createMockRes();

    await handler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.data?.success).toBe(true);
    expect(res.data?.orderId).toBe(77);
  });

  it('ignores non payment_intent.succeeded events', async () => {
    setEnv();
    mockStripe(() => ({ type: 'charge.refunded' }));
    mockFetchWith({});

    const raw = Buffer.from('body');
    const req = createMockReq(raw, { 'stripe-signature': 'sig' });
    const res = createMockRes();

    await handler(req as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.data?.ignored).toBe(true);
  });

  it('is idempotent: if order exists, it updates instead of creating', async () => {
    setEnv();
    mockStripe(() => ({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_dup', currency: 'eur', metadata: {} } },
    }));
    const capture: { calls: any[] } = { calls: [] };
    mockFetchWith({ orderExists: true, capture });

    const raw = Buffer.from('fake-body');
    const req = createMockReq(raw, { 'stripe-signature': 'sig' });
    const res = createMockRes();

    await handler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    const writeCall = capture.calls.find(
      (c) => typeof c.init?.body === 'string' && c.init.body.includes('"sale.order"') && c.init.body.includes('"write"'),
    );
    expect(writeCall).toBeDefined();
  });

  it('continues when Supabase insert fails (resilience)', async () => {
    setEnv();
    mockStripe(() => ({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_supabase_fail', currency: 'eur', metadata: {} } },
    }));
    mockFetchWith({ supabaseStatus: 500 });

    const raw = Buffer.from('body');
    const req = createMockReq(raw, { 'stripe-signature': 'sig' });
    const res = createMockRes();

    await handler(req as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.data?.success).toBe(true);
  });

  it('works with missing metadata (uses defaults)', async () => {
    setEnv();
    mockStripe(() => ({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_missing_meta', currency: 'usd', metadata: {} } },
    }));
    mockFetchWith({});

    const raw = Buffer.from('body');
    const req = createMockReq(raw, { 'stripe-signature': 'sig' });
    const res = createMockRes();

    await handler(req as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.data?.success).toBe(true);
  });

  it('returns 400 on invalid signature', async () => {
    setEnv();
    // Make constructEvent throw
    mockStripe(() => {
      throw new Error('bad sig');
    });
    const raw = Buffer.from('body');
    const req = createMockReq(raw, { 'stripe-signature': 'sig' });
    const res = createMockRes();

    await handler(req as any, res as any);
    expect(res.statusCode).toBe(400);
  });

  it('processes 10 events successfully (batch simulation)', async () => {
    setEnv();
    let counter = 0;
    mockStripe(() => {
      counter += 1;
      return {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: `pi_batch_${counter}`,
            currency: 'eur',
            metadata: { email: `user${counter}@example.com`, product_name: 'Prod', guests: '1' },
          },
        },
      };
    });
    mockFetchWith({});

    for (let i = 0; i < 10; i++) {
      const raw = Buffer.from(`body-${i}`);
      const req = createMockReq(raw, { 'stripe-signature': 'sig' });
      const res = createMockRes();
      await handler(req as any, res as any);
      expect(res.statusCode).toBe(200);
      expect(res.data?.success).toBe(true);
    }
  });
});

