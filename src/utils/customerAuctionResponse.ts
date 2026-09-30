/** Remove confidential reserve data from the serialized customer response.
 * JSON serialization preserves Mongoose transforms, ObjectIds, dates, and virtuals.
 * Work on a copy so shared cached objects and admin responses remain unchanged.
 */
export const customerAuctionResponse = (data: unknown): unknown =>
  JSON.parse(JSON.stringify(data, (key, value) => {
    if (key === 'reservePrice' || key === 'isReserveMet') return undefined;
    // Also protect historical bidder notifications already stored in the database.
    if (key === 'message' && typeof value === 'string' &&
        /reserve(?: price)? not met/i.test(value)) {
      return 'Auction ended without a sale.';
    }
    return value;
  }));
