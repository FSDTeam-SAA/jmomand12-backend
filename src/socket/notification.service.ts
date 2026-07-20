
import { Server } from "socket.io";
import mongoose from "mongoose";
import Notification from "../modules/notification/notification.model";

let io: Server | null = null;

export const initNotificationSocket = (socketIO: Server) => {
  io = socketIO;
};

export const emitAuctionBidUpdate = (auctionId: string, payload: Record<string, unknown>) => {
  if (!io) return;

  io.to(`auction:${auctionId}`).emit("auction:bid-updated", payload);
};

export const emitAuctionStatusUpdate = (auctionId: string, payload: Record<string, unknown>) => {
  if (!io) return;

  io.to(`auction:${auctionId}`).emit("auction:status-updated", payload);
};

export const createNotification = async ({
  to,
  message,
  type,
  id,
}: {
  to: mongoose.Types.ObjectId;
  message: string;
  type: string;
  id: mongoose.Types.ObjectId;
}) => {
  const notification = await Notification.create({
    to,
    message,
    type,
    id,
  });

  // Emit live notification
  if (io) {
    io.to(to.toString()).emit("newNotification", notification);
  }

  return notification;
};
