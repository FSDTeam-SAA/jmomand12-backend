import compression from "compression";
import cors from "cors";
import express, { Application } from "express";
import helmet from "helmet";
import hpp from "hpp";
import config from "../config";

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    const allowed = config.cors.allowedOrigins;
    if (allowed.includes('*') || allowed.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Range'],
  exposedHeaders: ['Content-Range', 'X-Total-Count'],
};


export const applySecurity = (app: Application) => {
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: true,
    }),
  );
  app.use(helmet.frameguard({ action: "deny" }));
  app.use(helmet.noSniff());

  app.use(cors(corsOptions));

  //! When you want to allow specific query parameters to be duplicated in the query string, you can use the whitelist option.
  app.use(
    hpp({
      whitelist: [],
    }),
  );
  app.use(compression());

  app.use(
    express.json({
      limit: "100kb",
      verify: (req: any, res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: "100kb" }));
};
