const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const jwt = require('jsonwebtoken');
const { Types } = require('mongoose');

function load(relativePath, dependencies = {}) {
  const { outputText } = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } },
  );
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)((id) => {
    if (id in dependencies) return dependencies[id];
    if (!id.startsWith('.')) return require(id);
    return {};
  }, module, module.exports);
  return module.exports;
}
const privacy = load('src/utils/customerAuctionResponse.ts');
const secret = 'reserve-privacy-test-secret';
const sendResponse = load('src/utils/sendResponse.ts', {
  '../config': { JWT_SECRET: secret },
  './tokenGenerate': { verifyToken: (token, key) => jwt.verify(token, key) },
  './customerAuctionResponse': privacy,
}).default;

for (const [name, token, visible] of [
  ['guest', undefined, false],
  ['customer', jwt.sign({ role: 'user' }, secret), false],
  ['admin', jwt.sign({ role: 'admin' }, secret), true],
  ['forged admin', jwt.sign({ role: 'admin' }, 'wrong-secret'), false],
  ['expired admin', jwt.sign({ role: 'admin' }, secret, { expiresIn: -1 }), false],
]) {
  test(`${name} receives the appropriate reserve visibility without changing status or cached data`, () => {
    const id = new Types.ObjectId();
    const ended = new Date('2026-01-01T00:00:00Z');
    const data = {
      status: 'ended', reservePrice: 500,
      products: [{ _id: id, reservePrice: 500, isReserveMet: false, auctionProductStatus: 'unsold' }],
      auctionProducts: [{ status: 'sold', soldPrice: 600, reservePrice: 500, highestBid: { amount: 600 } }],
      endsAt: ended,
      notification: { message: 'Auction ended without a sale: Reserve price not met - System highest bidder' },
    };
    const original = JSON.stringify(data);
    let result;
    const res = {
      req: { headers: token ? { authorization: `Bearer ${token}` } : {} },
      status() { return this; },
      json(value) { result = JSON.parse(JSON.stringify(value)); },
    };
    sendResponse(res, { statusCode: 200, success: true, data });
    assert.equal('reservePrice' in result.data, visible);
    assert.equal('reservePrice' in result.data.products[0], visible);
    assert.equal('isReserveMet' in result.data.products[0], visible);
    assert.equal('reservePrice' in result.data.auctionProducts[0], visible);
    assert.equal(result.data.products[0].auctionProductStatus, 'unsold');
    assert.equal(result.data.auctionProducts[0].status, 'sold');
    assert.equal(result.data.auctionProducts[0].soldPrice, 600);
    assert.equal(result.data.products[0]._id, String(id));
    assert.equal(result.data.endsAt, ended.toISOString());
    assert.equal(/reserve/i.test(result.data.notification.message), visible);
    assert.equal(JSON.stringify(data), original);
  });
}

test('customer serialization strips reserve fields from Mongoose-style toJSON output', () => {
  const result = privacy.customerAuctionResponse({ data: {
    toJSON: () => ({ reservePrice: 500, productId: { reservePrice: 500 }, status: 'unsold' }),
  } });
  assert.deepEqual(result, { data: { productId: {}, status: 'unsold' } });
});

for (const scenario of [
  { amount: 400, system: false, expected: 'unsold' },
  { amount: 500, system: true, expected: 'unsold' },
  { amount: 500, system: false, expected: 'sold' },
  { amount: 600, system: false, expected: 'sold' },
  { amount: 600, system: false, paymentFails: true, expected: 'payment_failed' },
]) {
  test(`closing bid ${scenario.amount}, system=${scenario.system}, paymentFails=${!!scenario.paymentFails} keeps ${scenario.expected}`, async () => {
    const notifications = [];
    const user = {
      _id: new Types.ObjectId(), isSystemUser: scenario.system,
      hasDefaultPaymentMethod: true, defaultPaymentMethodId: 'pm_test', stripeCustomerId: 'cus_test',
    };
    const product = { _id: new Types.ObjectId(), reservePrice: 500, title: 'Table', inventoryId: 'INV-1' };
    const lot = {
      _id: new Types.ObjectId(), auctionId: new Types.ObjectId(), productId: product._id,
      status: 'active', reservePrice: 500,
      highestBid: { amount: scenario.amount, bidder: user._id }, async save() {},
    };
    const selectable = (value) => ({ select: async () => value, then: (resolve) => resolve(value) });
    const cron = load('src/cron/services/auction-cron.service.ts', {
      '../../logger': { info() {}, warn() {}, error() {} },
      '../../modules/product/product.model': {
        findById: () => selectable(product), findByIdAndUpdate: async () => {},
      },
      '../../modules/user/user.model': { User: { findById: async () => user } },
      '../../modules/bid/bid.model': { distinct: async () => [user._id] },
      '../../modules/auction/auction.model': { findById: () => selectable({}) },
      '../../modules/settings/settings.model': { findOneAndUpdate: async () => ({}) },
      '../../modules/invoice/invoice.utils': { calculateAuctionInvoiceCharges: () => ({
        totalAmount: scenario.amount, subtotal: scenario.amount,
        buyerPremiumAmount: 0, salesTaxAmount: 0, creditCardFeeAmount: 0,
      }) },
      '../../modules/payment/payment.service': {
        chargeSavedPaymentMethod: async () => {
          if (scenario.paymentFails) throw new Error('Payment failed');
          return { id: 'pi_test' };
        },
        createPaymentRetry: async () => {},
      },
      '../../modules/invoice/invoice.service': {
        createPaidInvoice: async () => ({ _id: new Types.ObjectId() }),
        createFailedPaymentInvoice: async () => {},
      },
      '../../socket/notification.service': { createNotification: async (value) => notifications.push(value) },
      '../../queues/winner-email.producer': { enqueueWinnerEmailNotification: async () => {} },
    }).default;
    await cron.processAuctionProduct(lot);
    assert.equal(lot.status, scenario.expected);
    assert.ok(notifications.length > 0);
    assert.ok(notifications.every((value) => !/reserve/i.test(value.message)));
    if (scenario.expected === 'sold') {
      assert.equal(lot.paymentStatus, 'paid');
      assert.equal(lot.soldPrice, scenario.amount);
    }
  });
}
