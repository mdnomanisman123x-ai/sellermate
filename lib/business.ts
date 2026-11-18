import type { BusinessType } from "./types";

/** Dashboard and menu adapt to the business type. */
export const BUSINESS_TYPES: { id: BusinessType; tracksInventory: boolean }[] = [
  { id: "online_seller", tracksInventory: true },
  { id: "retail", tracksInventory: true },
  { id: "wholesale", tracksInventory: true },
  { id: "manufacturer", tracksInventory: true },
  { id: "service", tracksInventory: false },
  { id: "freelancer", tracksInventory: false },
];

export function tracksInventory(type: BusinessType): boolean {
  return BUSINESS_TYPES.find((b) => b.id === type)?.tracksInventory ?? true;
}

export const COUNTRIES: { code: string; currency: string }[] = [
  { code: "BD", currency: "BDT" },
  { code: "IN", currency: "INR" },
  { code: "PK", currency: "PKR" },
  { code: "NP", currency: "NPR" },
  { code: "LK", currency: "LKR" },
  { code: "MY", currency: "MYR" },
  { code: "SG", currency: "SGD" },
  { code: "AE", currency: "AED" },
  { code: "SA", currency: "SAR" },
  { code: "US", currency: "USD" },
  { code: "GB", currency: "GBP" },
  { code: "CA", currency: "CAD" },
  { code: "AU", currency: "AUD" },
  { code: "EU", currency: "EUR" },
];

export const CURRENCIES = ["BDT", "USD", "EUR", "GBP", "INR", "PKR", "NPR", "LKR", "MYR", "SGD", "AED", "SAR", "CAD", "AUD"];

export const EXPENSE_CATEGORIES = ["salary", "rent", "utilities", "shipping", "packaging", "marketing", "tax", "other"];
export const INCOME_CATEGORIES = ["other_income"];

export const SIZES = ["micro", "small", "medium"] as const;
