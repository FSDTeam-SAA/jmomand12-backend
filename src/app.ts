import cookieParser from "cookie-parser";
import express, { Application } from "express";
import { openApiDocument } from "./docs/openapi";
import globalErrorHandler from "./middleware/globalErrorHandler";
import notFound from "./middleware/notFound";

import { applySecurity } from "./middleware/security";
import router from "./router";

const app: Application = express();

// The production API is served behind one reverse-proxy hop (Nginx). Trust it
// so middleware such as express-rate-limit can safely use X-Forwarded-For.
app.set("trust proxy", 1);

app.use(express.static("public"));

app.use(cookieParser());

applySecurity(app);

app.get("/openapi.json", (_req, res) => {
  res.json(openApiDocument);
});

app.use("/api-docs", async (req, res, next) => {
  try {
    const { apiReference } = await import("@scalar/express-api-reference");
    return (apiReference({
      spec: {
        content: openApiDocument,
      },
      theme: "purple",
      metaData: {
        title: "Discount Deals DMV API Reference",
        description: "Interactive API documentation for Discount Deals DMV Platform",
      },
      showSidebar: true,
      hideModels: false,
      defaultHttpClient: {
        targetKey: "javascript",
        clientKey: "fetch",
      },
    }) as any)(req, res, next);
  } catch (error) {
    next(error);
  }
});

app.use("/api/v1", router);

app.get("/", (_req, res) => {
  res.send("Hey there! Welcome to Discount Deals DMV API's.");
});

app.use(notFound);
app.use(globalErrorHandler);

export default app;
