const developmentJwtSecret = "development-secret";
const developmentAdminPassword = "lovefarm-admin";

function requiredInProduction(name: "JWT_SECRET" | "ADMIN_PASSWORD", fallback: string) {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${name} is required in production`);
  }
  return fallback;
}

export function getJwtSecret() {
  return requiredInProduction("JWT_SECRET", developmentJwtSecret);
}

export function getAdminPassword() {
  return requiredInProduction("ADMIN_PASSWORD", developmentAdminPassword);
}

export function validateProductionEnv() {
  getJwtSecret();
  getAdminPassword();
}
