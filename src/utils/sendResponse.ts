import { Response } from "express";
import config from "../config";
import { verifyToken } from "./tokenGenerate";
import { customerAuctionResponse } from "./customerAuctionResponse";

// Public catalog routes are also used by the admin app, so verify optional
// credentials here before including private fields in their responses.
const canViewReserve = (res: Response): boolean => {
  if (res.req.user?.role === "admin") return true;
  const token = res.req.headers.authorization?.split(" ")[1];
  if (!token) return false;
  try {
    return verifyToken(token, config.JWT_SECRET as string).role === "admin";
  } catch {
    return false;
  }
};

type TMeta = {
  limit: number;
  page: number;
  total: number;
  totalPage: number;
};

type TResponse<T> = {
  statusCode: number;
  success: boolean;
  message?: string;
  data?: T;
  meta?: TMeta;
  links?: Record<string, string>;
};

const sendResponse = <T>(res: Response, data: TResponse<T>) => {
  const response = {
    success: data.success,
    message: data.message,
    statusCode: data.statusCode,
    data: data.data,
    meta: data?.meta,
    _links: data?.links,
  };
  res.status(data.statusCode).json(
    canViewReserve(res) ? response : customerAuctionResponse(response),
  );
};

export default sendResponse;
