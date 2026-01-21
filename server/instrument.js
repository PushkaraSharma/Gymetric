import * as Sentry from "@sentry/node"
Sentry.init({
  dsn: "https://c89bd47553ec1fb6681efb02a233a63e@o4510748209840128.ingest.us.sentry.io/4510748211544064",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});