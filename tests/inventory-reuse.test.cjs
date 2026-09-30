const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { Types } = require('mongoose');

// Exercise the actual services with in-memory persistence and no external side effects.
function loadService(relativePath, dependencies) {
  const filename = path.join(__dirname, '..', relativePath);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  const module = { exports: {} };
  const mockedRequire = (id) => {
    if (id in dependencies) return dependencies[id];
    if (!id.startsWith('.')) return require(id);
    return {};
  };
  new Function('require', 'module', 'exports', outputText)(mockedRequire, module, module.exports);
  return module.exports.default;
}

function query(value) {
  return {
    sort() { return this; },
    skip() { return this; },
    limit() { return this; },
    select() { return this; },
    populate() { return this; },
    lean() { return this; },
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
  };
}

const logger = { info() {}, error() {}, warn() {} };

for (const amount of [0, 100]) {
  test(`closing a lot with bid ${amount} preserves inventory and allows reuse without uploads`, async () => {
    const product = {
      _id: new Types.ObjectId(), inventoryId: 'INV-123', title: 'Dining Table',
      description: 'Original description', images: [{ url: 'photo1.jpg', public_id: 'photo1' }],
      reservePrice: 300, type: 'for_auction', inventoryStatus: 'auction_active',
    };
    const originalData = structuredClone({
      description: product.description, images: product.images, reservePrice: product.reservePrice,
    });
    const oldLot = {
      _id: new Types.ObjectId(), auctionId: new Types.ObjectId(), productId: product._id,
      status: 'active', highestBid: { amount }, async save() {},
    };
    const productModel = {
      findById: () => query(product),
      findByIdAndUpdate: async (id, changes) => Object.assign(product, changes),
      find: async () => [product],
      updateMany: async (filter, changes) => Object.assign(product, changes),
    };
    const cron = loadService('src/cron/services/auction-cron.service.ts', {
      '../../logger': logger,
      '../../modules/product/product.model': productModel,
      '../../modules/AuctionProduct/AuctionProduct.model': { find: async () => [oldLot] },
      '../../modules/auction/auction.model': { findByIdAndUpdate: async () => {} },
      '../../modules/bid/bid.model': { distinct: async () => [] },
      '../../socket/notification.service': { emitAuctionStatusUpdate() {} },
    });
    await cron.processAuction({ _id: oldLot.auctionId });
    assert.equal(oldLot.status, 'unsold');
    assert.equal(product.inventoryStatus, 'unsold');

    let newLots;
    const newAuction = {
      _id: new Types.ObjectId(), status: 'active', products: [product],
      async populate() { return this; },
    };
    const auctionService = loadService('src/modules/auction/auction.service.ts', {
      '../product/product.model': productModel,
      '../user/user.model': { User: { findOne: async () => ({}) } },
      '../../utils/product.utils': { generateAuctionId: async () => 'AUCTION-2' },
      './auction.model': { create: async () => newAuction },
      '../AuctionProduct/AuctionProduct.model': {
        distinct: async () => [],
        insertMany: async (lots) => { newLots = lots; },
        find: () => query([]),
      },
    });
    const start = new Date(Date.now() - 60 * 60 * 1000);
    // Service interprets these fields as local time.
    const date = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    const time = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
    await auctionService.createAuction({
      products: [String(product._id)], title: 'Auction #2', startingBid: 10, bidIncrement: 1,
      auctionSchedule: { startDate: date, startTime: time, durationInDays: 2 },
    }, 'admin@example.com');
    assert.equal(newLots.length, 1);
    assert.equal(String(newLots[0].productId), String(product._id));
    assert.equal(newLots[0].reservePrice, 300);
    assert.equal(oldLot.status, 'unsold');
    assert.equal(product.inventoryStatus, 'auction_active');
    assert.deepEqual({ description: product.description, images: product.images, reservePrice: product.reservePrice }, originalData);
  });
}

test('inventory includes every lifecycle status and supports inventory ID search', async () => {
  let filter;
  const products = ['unsold', 'ready_for_pickup', 'completed'].map((inventoryStatus) => ({ inventoryStatus }));
  const service = loadService('src/modules/product/product.service.ts', {
    './product.model': {
      find: (value) => { filter = value; return query(products); },
      countDocuments: async () => products.length,
    },
  });
  const result = await service.getInventoryProducts({ searchTerm: 'INV-123' });
  assert.equal(filter.inventoryStatus, undefined);
  assert.ok(filter.$or.some((clause) => clause.inventoryId?.$regex === 'INV-123'));
  assert.deepEqual(result.data, products);
});

test('auction picker searches inventory IDs and excludes locked items while including unsold inventory', async () => {
  let filter;
  let lockedFilter;
  const lockedId = new Types.ObjectId();
  const service = loadService('src/modules/product/product.service.ts', {
    './product.model': {
      find: (value) => { filter = value; return query([]); },
      countDocuments: async () => 0,
    },
    '../AuctionProduct/AuctionProduct.model': {
      distinct: async (field, value) => { lockedFilter = value; return [lockedId]; },
    },
  });
  await service.getAuctionProducts({ searchTerm: 'INV-123', page: 2 });
  assert.deepEqual(filter.inventoryStatus.$in, ['available', 'unsold']);
  assert.deepEqual(filter._id.$nin, [lockedId]);
  assert.ok(lockedFilter.status.$in.includes('sold'));
  assert.ok(lockedFilter.status.$in.includes('active'));
  assert.ok(filter.$or.some((clause) => clause.inventoryId?.$regex === 'INV-123'));
});
