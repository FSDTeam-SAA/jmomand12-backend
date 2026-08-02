import Auction from '../auction/auction.model';
import Invoice from '../invoice/invoice.model';
import { PickupAppointment } from '../pickup/pickup.model';
import Product from '../product/product.model';

const dateFilter = (query: Record<string, unknown>) => {
  const filter: Record<string, unknown> = {};
  const createdAt: Record<string, Date> = {};

  if (query.startDate) {
    createdAt.$gte = new Date(query.startDate as string);
  }

  if (query.endDate) {
    createdAt.$lte = new Date(query.endDate as string);
  }

  if (Object.keys(createdAt).length) {
    filter.createdAt = createdAt;
  }

  return filter;
};

const dateFilterForField = (query: Record<string, unknown>, field: string) => {
  const filter: Record<string, unknown> = {};
  const range: Record<string, Date> = {};

  if (query.startDate) {
    range.$gte = new Date(query.startDate as string);
  }

  if (query.endDate) {
    range.$lte = new Date(query.endDate as string);
  }

  if (Object.keys(range).length) {
    filter[field] = range;
  }

  return filter;
};

const getPeriodFromQuery = (query: Record<string, unknown>) => {
  const raw = String(query.period || 'week').toLowerCase();
  return raw === 'month' || raw === 'monthly' ? 'month' : 'week';
};

const getWeekRanges = () => {
  const today = new Date();
  const day = today.getDay();
  const offset = -((day + 1) % 7);
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + offset);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const getYearRanges = () => {
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0);
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getQueryRange = (query: Record<string, unknown>, period: 'week' | 'month') => {
  if (!query.startDate && !query.endDate) {
    return period === 'month' ? getYearRanges() : getWeekRanges();
  }

  const start = query.startDate
    ? new Date(query.startDate as string)
    : period === 'month'
      ? getYearRanges().start
      : getWeekRanges().start;
  const end = query.endDate ? new Date(query.endDate as string) : new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

// const buildChartDateFilter = (query: Record<string, unknown>, period: 'week' | 'month') => {
//   const filter = dateFilterForField(query, 'paidAt');

//   if (!query.startDate && !query.endDate) {
//     const range = period === 'month' ? getYearRanges() : getWeekRanges();
//     filter.paidAt = { $gte: range.start, $lte: range.end };
//   }

//   return filter;
// };

const getRevenueChart = async (query: Record<string, unknown>) => {
  const period = getPeriodFromQuery(query);
  const filter = buildChartDateFilter(query, period);
  filter.status = 'paid';

  const range = getQueryRange(query, period);

  if (period === 'month') {
    const labels = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const rawData = await Invoice.aggregate([
      { $match: filter },
      {
        $group: {
          // Convert paidAt to Date in case it is stored as a string
          _id: { $month: { $toDate: '$paidAt' } },
          totalRevenue: { $sum: '$totalAmount' }, // Switched to totalAmount (or keep $amount if raw net revenue is intended)
        },
      },
    ]);

    const data = labels.map((_, index) => {
      const monthEntry = rawData.find((item) => item._id === index + 1);
      return monthEntry?.totalRevenue || 0;
    });

    return {
      period,
      range: { start: range.start.toISOString(), end: range.end.toISOString() },
      labels,
      data,
      totalRevenue: Number(data.reduce((sum, value) => sum + value, 0).toFixed(2)),
    };
  }

  const labels = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const rawData = await Invoice.aggregate([
    { $match: filter },
    {
      $project: {
        totalAmount: 1,
        // $dayOfWeek returns 1 (Sun) - 7 (Sat)
        dayOfWeek: { $dayOfWeek: { $toDate: '$paidAt' } },
      },
    },
    {
      $group: {
        _id: '$dayOfWeek',
        totalRevenue: { $sum: '$totalAmount' },
      },
    },
  ]);

  // MongoDB $dayOfWeek: 1 = Sun, 2 = Mon, 3 = Tue, 4 = Wed, 5 = Thu, 6 = Fri, 7 = Sat
  // Your labels order: Sat (7), Sun (1), Mon (2), Tue (3), Wed (4), Thu (5), Fri (6)
  const dayOrder = [7, 1, 2, 3, 4, 5, 6];
  const data = dayOrder.map((dayValue) => {
    const dayEntry = rawData.find((item) => item._id === dayValue);
    return dayEntry?.totalRevenue || 0;
  });

  return {
    period,
    range: { start: range.start.toISOString(), end: range.end.toISOString() },
    labels,
    data,
    totalRevenue: Number(data.reduce((sum, value) => sum + value, 0).toFixed(2)),
  };
};

const buildChartDateFilter = (query: Record<string, unknown>, period: 'week' | 'month') => {
  const filter: Record<string, any> = dateFilterForField(query, 'paidAt') || {};

  if (!query.startDate && !query.endDate) {
    const range = period === 'month' ? getYearRanges() : getWeekRanges();
    // If paidAt in DB is stored as string, convert range bounds to String/ISO
    // Otherwise keep as standard Date objects.
    filter.paidAt = {
      $gte: range.start.toISOString(),
      $lte: range.end.toISOString(),
    };
  }

  return filter;
};

const getRevenueSummary = async (query: Record<string, unknown>) => {
  const filter = {
    ...dateFilterForField(query, 'paidAt'),
    status: 'paid',
  };

  const [summary] = await Invoice.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        paidInvoices: { $sum: 1 },
        averageOrderValue: { $avg: '$amount' },
      },
    },
  ]);

  return {
    totalRevenue: summary?.totalRevenue || 0,
    paidInvoices: summary?.paidInvoices || 0,
    averageOrderValue: summary?.averageOrderValue || 0,
  };
};

const getAuctionSummary = async (query: Record<string, unknown>) => {
  const filter = dateFilter(query);

  const [summary] = await Auction.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalWinningBids: { $sum: '$highestBid.amount' },
      },
    },
  ]);

  const byStatus = await Auction.aggregate([
    { $match: filter },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  return {
    totalWinningBids: summary?.totalWinningBids || 0,
    byStatus,
  };
};

const getPickupSummary = async (query: Record<string, unknown>) => {
  const filter = dateFilter(query);

  const byStatus = await PickupAppointment.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$status',
        appointments: { $sum: 1 },
        items: { $sum: { $size: '$products' } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return { byStatus };
};

const getInventorySummary = async () => {
  return Product.aggregate([
    {
      $group: {
        _id: '$inventoryStatus',
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

const reportService = {
  getRevenueSummary,
  getRevenueChart,
  getAuctionSummary,
  getPickupSummary,
  getInventorySummary,
};

export default reportService;
