export function wpAuthHeader() {
  const token = process.env.WP_AUTH; // base64("user:app_password")
  if (!token) throw new Error("WP_AUTH missing in env");
  return { Authorization: `Basic ${token}` };
}

export const WP_URL = process.env.WP_URL!;
