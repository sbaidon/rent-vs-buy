/// <reference types="node" />
/// <reference path="../../../worker-configuration.d.ts" />
import { createServerFn } from "@tanstack/react-start";
import {
  searchProperties as searchPropertiesApi,
  getPropertyDetail as getPropertyDetailApi,
} from "../../api/generated";
import type { PropertyListing, SearchRequest } from "../../api/generated";

// =============================================================================
// App-level types (what we expose to the frontend)
// =============================================================================

export interface Property {
  id: string;
  address: string;
  streetAddress: string;
  city: string;
  state: string;
  zipcode: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  propertyType: "sale" | "rent";
  lat: number;
  lng: number;
  imageUrl?: string;
  zestimate?: number;
  rentZestimate?: number;
  lotSize?: number;
  yearBuilt?: number;
  homeType?: string;
  daysOnMarket?: number;
  // Status flags
  isPending?: boolean;
  isContingent?: boolean;
  isNewListing?: boolean;
  isForeclosure?: boolean;
  isPriceReduced?: boolean;
}

export interface SearchParams {
  location: string;
  lat?: number;
  lng?: number;
  radius?: number;
  minPrice?: number;
  maxPrice?: number;
  bedsMin?: number;
  bedsMax?: number;
  bathsMin?: number;
  sqftMin?: number;
  sqftMax?: number;
  propertyTypes?: string[];
  propertyType?: "sale" | "rent" | "all";
}

export interface SearchResult {
  properties: Property[];
  totalCount: number;
  center: { lat: number; lng: number };
}

// =============================================================================
// API Configuration
// =============================================================================

// Server-side only: Read API key from environment
// This runs on the server (Cloudflare Worker / Node.js), never exposed to client
// Use async version to properly import from cloudflare:workers
async function getApiKeyAsync(): Promise<string | undefined> {
  try {
    // Import cloudflare:workers which provides env bindings in both dev and production
    const { env } = await import("cloudflare:workers") as { env: Env };
    if (env?.RAPIDAPI_KEY) {
      return env.RAPIDAPI_KEY;
    }
  } catch (e) {
    // cloudflare:workers not available (e.g., in Node.js)
    console.warn("[getApiKeyAsync] cloudflare:workers not available:", e);
  }
  
  // Fallback to process.env (Node.js environments)
  if (process.env.RAPIDAPI_KEY) {
    return process.env.RAPIDAPI_KEY;
  }
  
  console.warn("[getApiKeyAsync] No API key found in any environment");
  return undefined;
}



// Headers for API requests - passed per-request to ensure env is loaded
async function getApiHeaders(): Promise<Record<string, string> | undefined> {
  const key = await getApiKeyAsync();
  if (!key) return undefined;
  return {
    "X-RapidAPI-Key": key,
    "X-RapidAPI-Host": "realty-in-us.p.rapidapi.com",
  };
}

// =============================================================================
// Rate limiting and error handling
// =============================================================================

// Track rate limit state
let rateLimitedUntil: number | null = null;
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 3;
const ERROR_BACKOFF_MS = 60 * 1000; // 1 minute backoff after consecutive errors

function isRateLimited(): boolean {
  if (rateLimitedUntil && Date.now() < rateLimitedUntil) {
    console.log(`[RateLimit] Still rate limited for ${Math.ceil((rateLimitedUntil - Date.now()) / 1000)}s`);
    return true;
  }
  // Reset if backoff period has passed
  if (rateLimitedUntil && Date.now() >= rateLimitedUntil) {
    rateLimitedUntil = null;
    consecutiveErrors = 0;
  }
  if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
    // Set an explicit backoff so the next check can clear it
    rateLimitedUntil = Date.now() + ERROR_BACKOFF_MS;
    console.log(`[RateLimit] Too many consecutive errors, backing off`);
    return true;
  }
  return false;
}

function handleApiError(error: unknown, statusCode?: number): void {
  consecutiveErrors++;
  
  // RapidAPI returns 429 for rate limits
  if (statusCode === 429) {
    // Back off for 60 seconds on rate limit
    rateLimitedUntil = Date.now() + 60 * 1000;
    console.warn(`[RateLimit] Rate limited by API, backing off for 60s`);
  } else if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
    // Back off after too many errors
    rateLimitedUntil = Date.now() + ERROR_BACKOFF_MS;
    console.warn(`[RateLimit] Too many errors (${consecutiveErrors}), backing off for 60s`);
  }
  
  console.error("[API Error]", error);
}

function handleApiSuccess(): void {
  consecutiveErrors = 0;
  rateLimitedUntil = null;
}

// =============================================================================
// Caching layer
// =============================================================================

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes - property data doesn't change frequently

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    console.log(`[Cache HIT] ${key}`);
    return entry.data as T;
  }
  if (entry) {
    console.log(`[Cache EXPIRED] ${key}`);
    cache.delete(key);
  }
  return null;
}

function setCache(key: string, data: unknown): void {
  console.log(`[Cache SET] ${key}`);
  cache.set(key, { data, timestamp: Date.now() });
}

// Generate a stable cache key from search params
function generateCacheKey(type: "sale" | "rent", params: SearchParams): string {
  const parts = [
    type,
    params.location,
    params.minPrice ?? "",
    params.maxPrice ?? "",
    params.bedsMin ?? "",
    params.bedsMax ?? "",
    params.bathsMin ?? "",
    params.sqftMin ?? "",
    params.sqftMax ?? "",
    (params.propertyTypes ?? []).sort().join(","),
  ];
  return parts.join(":");
}

// =============================================================================
// Transform API response to app types
// =============================================================================

function transformListing(
  listing: PropertyListing,
  type: "sale" | "rent"
): Property {
  const address = listing.location?.address;
  const desc = listing.description;

  return {
    id: listing.property_id || listing.listing_id || "",
    address: `${address?.line || ""}, ${address?.city || ""}, ${address?.state_code || ""} ${address?.postal_code || ""}`.trim(),
    streetAddress: address?.line || "",
    city: address?.city || "",
    state: address?.state_code || "",
    zipcode: address?.postal_code || "",
    price: listing.list_price || 0,
    bedrooms: desc?.beds || 0,
    bathrooms: desc?.baths || 0,
    sqft: desc?.sqft || 0,
    propertyType: type,
    lat: address?.coordinate?.lat || 0,
    lng: address?.coordinate?.lon || 0,
    imageUrl: listing.primary_photo?.href,
    lotSize: desc?.lot_sqft,
    yearBuilt: desc?.year_built,
    homeType: desc?.type,
    daysOnMarket: listing.list_date
      ? Math.floor(
          (Date.now() - new Date(listing.list_date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : undefined,
    // Status flags
    isPending: listing.flags?.is_pending || false,
    isContingent: listing.flags?.is_contingent || false,
    isNewListing: listing.flags?.is_new_listing || false,
    isForeclosure: listing.flags?.is_foreclosure || false,
    isPriceReduced: listing.flags?.is_price_reduced || false,
  };
}

// =============================================================================
// API search functions using typed client
// =============================================================================

// US state code mapping for common state names/abbreviations
const STATE_CODES: Record<string, string> = {
  "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR", "california": "CA",
  "colorado": "CO", "connecticut": "CT", "delaware": "DE", "florida": "FL", "georgia": "GA",
  "hawaii": "HI", "idaho": "ID", "illinois": "IL", "indiana": "IN", "iowa": "IA",
  "kansas": "KS", "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
  "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS", "missouri": "MO",
  "montana": "MT", "nebraska": "NE", "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", "ohio": "OH",
  "oklahoma": "OK", "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT", "vermont": "VT",
  "virginia": "VA", "washington": "WA", "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY",
  "district of columbia": "DC",
};

function normalizeStateCode(state: string): string | undefined {
  const cleaned = state.trim().toLowerCase();
  
  // Already a valid 2-letter state code
  if (cleaned.length === 2 && Object.values(STATE_CODES).includes(cleaned.toUpperCase())) {
    return cleaned.toUpperCase();
  }
  
  // Full state name
  if (STATE_CODES[cleaned]) {
    return STATE_CODES[cleaned];
  }
  
  return undefined;
}

function parseLocation(location: string): Pick<SearchRequest, "city" | "state_code" | "postal_code"> {
  // Handle ZIP code
  const zipMatch = location.match(/\b(\d{5})\b/);
  if (zipMatch) {
    return { postal_code: zipMatch[1] };
  }
  
  const parts = location.split(",").map(p => p.trim());
  const cityPart = parts[0];
  
  // Try to find a valid state code in any of the parts
  for (let i = 1; i < parts.length; i++) {
    const stateCode = normalizeStateCode(parts[i]);
    if (stateCode) {
      return { city: cityPart, state_code: stateCode };
    }
  }
  
  // If we have "City, Something" but Something isn't a state, 
  // it might be a county - try to extract state from further parts
  if (parts.length >= 2) {
    // Common pattern: "City, County, State" or "City, County, State, USA"
    for (const part of parts.slice(1)) {
      const stateCode = normalizeStateCode(part);
      if (stateCode) {
        return { city: cityPart, state_code: stateCode };
      }
    }
    
    // Fallback: use second part as-is if it looks like a state abbreviation
    const secondPart = parts[1].toUpperCase();
    if (secondPart.length === 2 && /^[A-Z]{2}$/.test(secondPart)) {
      return { city: cityPart, state_code: secondPart };
    }
  }
  
  // Ultimate fallback
  console.warn(`[parseLocation] Could not parse location: "${location}", using Austin, TX`);
  return { city: cityPart || "Austin", state_code: "TX" };
}

async function searchForSale(params: SearchParams): Promise<Property[]> {
  const apiKey = await getApiKeyAsync();
  if (!apiKey) {
    console.warn("RAPIDAPI_KEY not set, using mock data");
    return [];
  }

  // Check rate limit before making request
  if (isRateLimited()) {
    console.log("[searchForSale] Rate limited, returning empty");
    return [];
  }

  const cacheKey = generateCacheKey("sale", params);
  const cached = getCached<Property[]>(cacheKey);
  if (cached) return cached;

  try {
    const locationParams = parseLocation(params.location);
    console.log("[searchForSale] Parsed location:", locationParams, "from:", params.location);
    
    const body: SearchRequest = {
      limit: 50,
      offset: 0,
      status: ["for_sale"],
      sort: { direction: "desc", field: "list_date" },
      ...locationParams,
      ...(params.minPrice && { list_price_min: params.minPrice }),
      ...(params.maxPrice && { list_price_max: params.maxPrice }),
      ...(params.bedsMin && { beds_min: params.bedsMin }),
      ...(params.bedsMax && { beds_max: params.bedsMax }),
      ...(params.bathsMin && { baths_min: params.bathsMin }),
      ...(params.sqftMin && { sqft_min: params.sqftMin }),
      ...(params.sqftMax && { sqft_max: params.sqftMax }),
      ...(params.propertyTypes?.length && { type: params.propertyTypes as SearchRequest["type"] }),
    };

    console.log("[searchForSale] Making API request with body:", JSON.stringify(body));
    
    const headers = await getApiHeaders();
    const { data, error, response } = await searchPropertiesApi({ 
      body,
      headers,
    });

    console.log("[searchForSale] API response status:", response?.status);
    
    if (error) {
      console.error("[searchForSale] API error:", error);
      handleApiError(error, response?.status);
      return [];
    }

    handleApiSuccess();
    const rawResults = data?.data?.home_search?.results || [];
    console.log("[searchForSale] Raw results count:", rawResults.length);
    
    const properties = rawResults
      .map((listing) => transformListing(listing, "sale"))
      .filter((p) => p.lat && p.lng);

    console.log(`[searchForSale] Found ${properties.length} properties (after filtering for coords)`);
    setCache(cacheKey, properties);
    return properties;
  } catch (error) {
    handleApiError(error);
    return [];
  }
}

async function searchForRent(params: SearchParams): Promise<Property[]> {
  const apiKey = await getApiKeyAsync();
  if (!apiKey) {
    console.warn("RAPIDAPI_KEY not set, using mock data");
    return [];
  }

  // Check rate limit before making request
  if (isRateLimited()) {
    console.log("[searchForRent] Rate limited, returning empty");
    return [];
  }

  const cacheKey = generateCacheKey("rent", params);
  const cached = getCached<Property[]>(cacheKey);
  if (cached) return cached;

  try {
    const locationParams = parseLocation(params.location);
    console.log("[searchForRent] Parsed location:", locationParams, "from:", params.location);
    
    const body: SearchRequest = {
      limit: 50,
      offset: 0,
      status: ["for_rent"],
      sort: { direction: "desc", field: "list_date" },
      ...locationParams,
      ...(params.minPrice && { list_price_min: params.minPrice }),
      ...(params.maxPrice && { list_price_max: params.maxPrice }),
      ...(params.bedsMin && { beds_min: params.bedsMin }),
      ...(params.bedsMax && { beds_max: params.bedsMax }),
      ...(params.bathsMin && { baths_min: params.bathsMin }),
      ...(params.sqftMin && { sqft_min: params.sqftMin }),
      ...(params.sqftMax && { sqft_max: params.sqftMax }),
      ...(params.propertyTypes?.length && { type: params.propertyTypes as SearchRequest["type"] }),
    };

    const headers = await getApiHeaders();
    const { data, error, response } = await searchPropertiesApi({ 
      body,
      headers,
    });

    if (error) {
      handleApiError(error, response?.status);
      return [];
    }

    handleApiSuccess();
    const properties = (data?.data?.home_search?.results || [])
      .map((listing) => transformListing(listing, "rent"))
      .filter((p) => p.lat && p.lng);

    console.log(`[searchForRent] Found ${properties.length} properties`);
    setCache(cacheKey, properties);
    return properties;
  } catch (error) {
    handleApiError(error);
    return [];
  }
}

// =============================================================================
// Mock data fallback
// =============================================================================

// Partial property for mock data generation
type MockPropertyInput = {
  id: string;
  streetAddress: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  lat: number;
  lng: number;
  rentZestimate?: number;
  yearBuilt: number;
  homeType: string;
};

// Generate mock properties for development
function generateMockProperties(): Property[] {
  const saleProperties: MockPropertyInput[] = [
    { id: "s1", streetAddress: "123 Main St", price: 450000, bedrooms: 3, bathrooms: 2, sqft: 1800, lat: 30.2672, lng: -97.7431, rentZestimate: 2200, yearBuilt: 2005, homeType: "Single Family" },
    { id: "s2", streetAddress: "789 Congress Ave", price: 625000, bedrooms: 4, bathrooms: 3, sqft: 2400, lat: 30.2747, lng: -97.7443, rentZestimate: 3100, yearBuilt: 2010, homeType: "Single Family" },
    { id: "s3", streetAddress: "555 E 6th St", price: 525000, bedrooms: 2, bathrooms: 2, sqft: 1200, lat: 30.2676, lng: -97.7372, rentZestimate: 2600, yearBuilt: 2015, homeType: "Condo" },
    { id: "s4", streetAddress: "900 W 5th St", price: 785000, bedrooms: 4, bathrooms: 3, sqft: 2800, lat: 30.2712, lng: -97.7521, rentZestimate: 3800, yearBuilt: 2018, homeType: "Single Family" },
    { id: "s5", streetAddress: "201 Lavaca St", price: 395000, bedrooms: 2, bathrooms: 2, sqft: 1100, lat: 30.2658, lng: -97.7468, rentZestimate: 2100, yearBuilt: 2012, homeType: "Condo" },
    { id: "s6", streetAddress: "1501 Barton Springs Rd", price: 550000, bedrooms: 3, bathrooms: 2, sqft: 1650, lat: 30.2598, lng: -97.7612, rentZestimate: 2700, yearBuilt: 2008, homeType: "Townhome" },
    { id: "s7", streetAddress: "2100 S Lamar Blvd", price: 420000, bedrooms: 3, bathrooms: 2, sqft: 1500, lat: 30.2521, lng: -97.7654, rentZestimate: 2300, yearBuilt: 2000, homeType: "Single Family" },
    { id: "s8", streetAddress: "800 Brazos St", price: 890000, bedrooms: 3, bathrooms: 3, sqft: 2200, lat: 30.2701, lng: -97.7412, rentZestimate: 4200, yearBuilt: 2020, homeType: "Condo" },
    { id: "s9", streetAddress: "1200 Guadalupe St", price: 365000, bedrooms: 1, bathrooms: 1, sqft: 850, lat: 30.2789, lng: -97.7432, rentZestimate: 1900, yearBuilt: 2016, homeType: "Condo" },
    { id: "s10", streetAddress: "3500 Red River St", price: 475000, bedrooms: 3, bathrooms: 2, sqft: 1700, lat: 30.2856, lng: -97.7321, rentZestimate: 2400, yearBuilt: 2007, homeType: "Single Family" },
    { id: "s11", streetAddress: "700 E Dean Keeton St", price: 680000, bedrooms: 4, bathrooms: 3, sqft: 2500, lat: 30.2891, lng: -97.7356, rentZestimate: 3300, yearBuilt: 2014, homeType: "Single Family" },
    { id: "s12", streetAddress: "1800 S Congress Ave", price: 595000, bedrooms: 3, bathrooms: 2, sqft: 1900, lat: 30.2432, lng: -97.7489, rentZestimate: 2900, yearBuilt: 2011, homeType: "Townhome" },
  ];

  const rentProperties: MockPropertyInput[] = [
    { id: "r1", streetAddress: "456 Oak Ave", price: 2100, bedrooms: 2, bathrooms: 1, sqft: 950, lat: 30.2749, lng: -97.7404, yearBuilt: 2018, homeType: "Apartment" },
    { id: "r2", streetAddress: "321 Lamar Blvd", price: 1850, bedrooms: 1, bathrooms: 1, sqft: 720, lat: 30.2621, lng: -97.7538, yearBuilt: 2020, homeType: "Condo" },
    { id: "r3", streetAddress: "1000 E 11th St", price: 2450, bedrooms: 2, bathrooms: 2, sqft: 1100, lat: 30.2723, lng: -97.7298, yearBuilt: 2019, homeType: "Apartment" },
    { id: "r4", streetAddress: "500 W 2nd St", price: 3200, bedrooms: 2, bathrooms: 2, sqft: 1350, lat: 30.2654, lng: -97.7498, yearBuilt: 2021, homeType: "Condo" },
    { id: "r5", streetAddress: "2200 S 1st St", price: 1650, bedrooms: 1, bathrooms: 1, sqft: 680, lat: 30.2489, lng: -97.7532, yearBuilt: 2015, homeType: "Apartment" },
    { id: "r6", streetAddress: "1400 E Cesar Chavez St", price: 2800, bedrooms: 3, bathrooms: 2, sqft: 1400, lat: 30.2578, lng: -97.7312, yearBuilt: 2017, homeType: "Townhome" },
    { id: "r7", streetAddress: "600 Congress Ave", price: 3500, bedrooms: 2, bathrooms: 2, sqft: 1500, lat: 30.2687, lng: -97.7443, yearBuilt: 2022, homeType: "Condo" },
    { id: "r8", streetAddress: "1900 E Riverside Dr", price: 1450, bedrooms: 1, bathrooms: 1, sqft: 620, lat: 30.2398, lng: -97.7289, yearBuilt: 2010, homeType: "Apartment" },
    { id: "r9", streetAddress: "3200 Duval St", price: 2200, bedrooms: 2, bathrooms: 1, sqft: 980, lat: 30.2934, lng: -97.7267, yearBuilt: 2014, homeType: "Duplex" },
    { id: "r10", streetAddress: "400 W 35th St", price: 2950, bedrooms: 3, bathrooms: 2, sqft: 1550, lat: 30.3012, lng: -97.7456, yearBuilt: 2016, homeType: "Townhome" },
    { id: "r11", streetAddress: "1100 S Mopac Expy", price: 1750, bedrooms: 1, bathrooms: 1, sqft: 750, lat: 30.2567, lng: -97.7789, yearBuilt: 2018, homeType: "Apartment" },
    { id: "r12", streetAddress: "2500 Lake Austin Blvd", price: 4200, bedrooms: 3, bathrooms: 2, sqft: 1800, lat: 30.2789, lng: -97.7698, yearBuilt: 2020, homeType: "Condo" },
  ];

  return [
    ...saleProperties.map((p): Property => ({
      id: p.id,
      streetAddress: p.streetAddress,
      address: `${p.streetAddress}, Austin, TX 78701`,
      city: "Austin",
      state: "TX",
      zipcode: "78701",
      price: p.price,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      sqft: p.sqft,
      lat: p.lat,
      lng: p.lng,
      propertyType: "sale",
      zestimate: Math.round(p.price * 1.02),
      rentZestimate: p.rentZestimate,
      yearBuilt: p.yearBuilt,
      homeType: p.homeType,
      daysOnMarket: Math.floor(Math.random() * 30) + 1,
    })),
    ...rentProperties.map((p): Property => ({
      id: p.id,
      streetAddress: p.streetAddress,
      address: `${p.streetAddress}, Austin, TX 78701`,
      city: "Austin",
      state: "TX",
      zipcode: "78701",
      price: p.price,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      sqft: p.sqft,
      lat: p.lat,
      lng: p.lng,
      propertyType: "rent",
      yearBuilt: p.yearBuilt,
      homeType: p.homeType,
    })),
  ];
}

const MOCK_PROPERTIES: Property[] = generateMockProperties();

// =============================================================================
// Server functions (TanStack Start)
// =============================================================================

export const searchProperties = createServerFn({ method: "GET" })
  .inputValidator((params: SearchParams) => params)
  .handler(async ({ data }): Promise<SearchResult> => {
    const params = data;
    let properties: Property[] = [];

    console.log("[searchProperties] Called with:", {
      location: params.location,
      propertyType: params.propertyType,
      lat: params.lat,
      lng: params.lng,
    });

    const apiKey = await getApiKeyAsync();
    console.log("[searchProperties] API key present:", !!apiKey, apiKey ? `(${apiKey.substring(0, 8)}...)` : "");

    // Try to fetch from Realtor.com API using typed client
    if (apiKey) {
      try {
        if (params.propertyType === "sale") {
          properties = await searchForSale(params);
        } else if (params.propertyType === "rent") {
          properties = await searchForRent(params);
        } else {
          // Fetch both for "all" — run sequentially to avoid
          // hitting the RapidAPI rate limit with parallel requests
          const saleProps = await searchForSale(params);
          const rentProps = await searchForRent(params);
          properties = [...saleProps, ...rentProps];
        }
        console.log("[searchProperties] API returned:", properties.length, "properties");
      } catch (error) {
        console.error("[searchProperties] Error fetching from API:", error);
      }
    } else {
      console.log("[searchProperties] No API key, will use mock data");
    }

    // Fall back to mock data if API didn't return results
    if (properties.length === 0) {
      console.log("[searchProperties] Using mock data (API key not set or no results)");
      properties = [...MOCK_PROPERTIES];

      if (params.propertyType && params.propertyType !== "all") {
        properties = properties.filter((p) => p.propertyType === params.propertyType);
      }
    }

    // Deduplicate properties by ID (API sometimes returns duplicates)
    const seen = new Set<string>();
    properties = properties.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    // Apply additional filters
    if (params.minPrice) {
      properties = properties.filter((p) => p.price >= params.minPrice!);
    }
    if (params.maxPrice) {
      properties = properties.filter((p) => p.price <= params.maxPrice!);
    }
    if (params.bedsMin) {
      properties = properties.filter((p) => p.bedrooms >= params.bedsMin!);
    }
    if (params.bathsMin) {
      properties = properties.filter((p) => p.bathrooms >= params.bathsMin!);
    }
    if (params.sqftMin) {
      properties = properties.filter((p) => p.sqft >= params.sqftMin!);
    }
    if (params.sqftMax) {
      properties = properties.filter((p) => p.sqft <= params.sqftMax!);
    }

    // Calculate center from properties or use provided lat/lng
    const center =
      properties.length > 0
        ? {
            lat: properties.reduce((sum, p) => sum + p.lat, 0) / properties.length,
            lng: properties.reduce((sum, p) => sum + p.lng, 0) / properties.length,
          }
        : { lat: params.lat || 30.2672, lng: params.lng || -97.7431 };

    return {
      properties,
      totalCount: properties.length,
      center,
    };
  });

export const getPropertyDetails = createServerFn({ method: "GET" })
  .inputValidator((params: { propertyId: string }) => params)
  .handler(async ({ data }) => {
    const { propertyId } = data;

    const apiKey = await getApiKeyAsync();
    if (!apiKey) {
      // Return mock data
      return {
        id: propertyId,
        address: "123 Main St, Austin, TX 78701",
        streetAddress: "123 Main St",
        city: "Austin",
        state: "TX",
        zipcode: "78701",
        price: 450000,
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1800,
        propertyType: "sale" as const,
        lat: 30.2672,
        lng: -97.7431,
        zestimate: 455000,
        rentZestimate: 2200,
        yearBuilt: 2005,
        homeType: "Single Family",
        daysOnMarket: 14,
        description: "Beautiful 3 bedroom home in downtown Austin.",
        photos: [],
      };
    }

    try {
      const headers = await getApiHeaders();
      const { data: response, error } = await getPropertyDetailApi({
        body: { property_id: propertyId },
        headers,
      });

      if (error || !response?.data?.home) {
        throw new Error("Property not found");
      }

      const listing = response.data.home;
      const property = transformListing(listing, listing.status === "for_rent" ? "rent" : "sale");

      return {
        ...property,
        description: listing.description?.text || "",
        photos: listing.photos?.map((p) => p.href).filter(Boolean) as string[] || [],
      };
    } catch (error) {
      console.error("Error fetching property details:", error);
      throw error;
    }
  });
