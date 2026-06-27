import { BetaAnalyticsDataClient } from "@google-analytics/data";

type ServiceAccountJson = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

function getServiceAccountFromEnv(): ServiceAccountJson {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;

  if (!encoded) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 env variable.");
  }

  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const json = JSON.parse(decoded) as ServiceAccountJson;

  if (!json.client_email || !json.private_key) {
    throw new Error("Invalid Google service account JSON.");
  }

  return json;
}

export function getGa4Client() {
  const credentials = getServiceAccountFromEnv();

  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
  });
}

export function getTemplateGa4PropertyId() {
  const propertyId = process.env.GA4_TEMPLATE_PROPERTY_ID;

  if (!propertyId) {
    throw new Error("Missing GA4_TEMPLATE_PROPERTY_ID env variable.");
  }

  return propertyId;
}