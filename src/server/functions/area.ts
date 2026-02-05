/// <reference types="node" />
import { createServerFn } from "@tanstack/react-start";

// HUD Fair Market Rents (FMR) - FREE government API
// Documentation: https://www.huduser.gov/portal/dataset/fmr-api.html
export interface FairMarketRent {
  year: number;
  stateCode: string;
  countyName: string;
  metroName?: string;
  efficiency: number; // Studio
  oneBedroom: number;
  twoBedroom: number;
  threeBedroom: number;
  fourBedroom: number;
}

// Simple cache for HUD data
const hudCache = new Map<string, { data: FairMarketRent; timestamp: number }>();
const HUD_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours (FMR data updates annually)

// Get Fair Market Rents from HUD
export const getFairMarketRents = createServerFn({ method: "GET" })
  .inputValidator((params: { stateCode: string; year?: number }) => params)
  .handler(async ({ data }) => {
    const { stateCode, year = new Date().getFullYear() } = data;
    const cacheKey = `fmr:${stateCode}:${year}`;
    
    // Check cache
    const cached = hudCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < HUD_CACHE_TTL) {
      return cached.data;
    }

    try {
      // HUD FMR API endpoint
      const url = `https://www.huduser.gov/hudapi/public/fmr/statedata/${stateCode}?year=${year}`;
      
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${process.env.HUD_API_TOKEN || ""}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HUD API error: ${response.status}`);
      }

      const result = await response.json();
      
      // HUD API returns data in a specific format, parse it
      // The actual structure depends on the API version
      const fmrData: FairMarketRent = {
        year,
        stateCode,
        countyName: result.data?.county_name || "Unknown",
        metroName: result.data?.metro_name,
        efficiency: result.data?.Efficiency || result.data?.fmr_0 || 900,
        oneBedroom: result.data?.["One-Bedroom"] || result.data?.fmr_1 || 1000,
        twoBedroom: result.data?.["Two-Bedroom"] || result.data?.fmr_2 || 1200,
        threeBedroom: result.data?.["Three-Bedroom"] || result.data?.fmr_3 || 1500,
        fourBedroom: result.data?.["Four-Bedroom"] || result.data?.fmr_4 || 1800,
      };

      hudCache.set(cacheKey, { data: fmrData, timestamp: Date.now() });
      return fmrData;
    } catch (error) {
      console.error("Error fetching HUD FMR data:", error);
      
      // Return estimated fallback data based on national averages
      // These should be updated periodically
      const fallbackFMR: FairMarketRent = {
        year,
        stateCode,
        countyName: "National Average (Fallback)",
        efficiency: 1100,
        oneBedroom: 1250,
        twoBedroom: 1500,
        threeBedroom: 1900,
        fourBedroom: 2300,
      };
      
      return fallbackFMR;
    }
  });

// Get FMR by ZIP code (more specific)
export const getFairMarketRentsByZip = createServerFn({ method: "GET" })
  .inputValidator((params: { zipcode: string; year?: number }) => params)
  .handler(async ({ data }) => {
    const { zipcode, year = new Date().getFullYear() } = data;
    const cacheKey = `fmr:zip:${zipcode}:${year}`;
    
    const cached = hudCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < HUD_CACHE_TTL) {
      return cached.data;
    }

    try {
      const url = `https://www.huduser.gov/hudapi/public/fmr/data/${zipcode}?year=${year}`;
      
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${process.env.HUD_API_TOKEN || ""}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HUD API error: ${response.status}`);
      }

      const result = await response.json();
      
      const fmrData: FairMarketRent = {
        year,
        stateCode: result.data?.state_code || "",
        countyName: result.data?.county_name || "Unknown",
        metroName: result.data?.metro_name || result.data?.area_name,
        efficiency: result.data?.Efficiency || result.data?.basicdata?.Efficiency || 900,
        oneBedroom: result.data?.["One-Bedroom"] || result.data?.basicdata?.["One-Bedroom"] || 1000,
        twoBedroom: result.data?.["Two-Bedroom"] || result.data?.basicdata?.["Two-Bedroom"] || 1200,
        threeBedroom: result.data?.["Three-Bedroom"] || result.data?.basicdata?.["Three-Bedroom"] || 1500,
        fourBedroom: result.data?.["Four-Bedroom"] || result.data?.basicdata?.["Four-Bedroom"] || 1800,
      };

      hudCache.set(cacheKey, { data: fmrData, timestamp: Date.now() });
      return fmrData;
    } catch (error) {
      console.error("Error fetching HUD FMR data by ZIP:", error);
      
      // Fallback
      return {
        year,
        stateCode: "",
        countyName: "Unknown (Fallback)",
        efficiency: 1100,
        oneBedroom: 1250,
        twoBedroom: 1500,
        threeBedroom: 1900,
        fourBedroom: 2300,
      } satisfies FairMarketRent;
    }
  });

// Types for area analysis
export interface AreaStats {
  medianHomePrice: number;
  medianRent: number;
  priceToRentRatio: number;
  homeValueChange1Year: number;
  rentChange1Year: number;
  daysOnMarket: number;
  inventoryCount: number;
}

export interface WalkScores {
  walkScore: number;
  walkDescription: string;
  transitScore?: number;
  transitDescription?: string;
  bikeScore?: number;
  bikeDescription?: string;
}

export interface SchoolInfo {
  name: string;
  rating: number; // 1-10
  distance: number; // miles
  type: "elementary" | "middle" | "high";
}

export interface AreaAnalysis {
  location: {
    city: string;
    state: string;
    zipcode?: string;
    neighborhood?: string;
  };
  stats: AreaStats;
  walkScores?: WalkScores;
  schools?: SchoolInfo[];
  summary: string;
  buyVsRentRecommendation: "buy" | "rent" | "neutral";
  recommendationReason: string;
}

// Server function to get area analysis
export const getAreaAnalysis = createServerFn({ method: "GET" })
  .inputValidator((params: { lat: number; lng: number; address?: string }) => params)
  .handler(async ({ data: _params }) => {
    // TODO: Replace with actual API calls to:
    // - Walk Score API
    // - Zillow Neighborhood Data
    // - GreatSchools API
    // - Census data
    
    // For now, return mock data for Austin, TX
    const analysis: AreaAnalysis = {
      location: {
        city: "Austin",
        state: "TX",
        zipcode: "78701",
        neighborhood: "Downtown",
      },
      stats: {
        medianHomePrice: 485000,
        medianRent: 1850,
        priceToRentRatio: 21.8,
        homeValueChange1Year: 3.2, // percent
        rentChange1Year: 4.5, // percent
        daysOnMarket: 45,
        inventoryCount: 1250,
      },
      walkScores: {
        walkScore: 72,
        walkDescription: "Very Walkable",
        transitScore: 45,
        transitDescription: "Some Transit",
        bikeScore: 68,
        bikeDescription: "Bikeable",
      },
      schools: [
        {
          name: "Austin Elementary",
          rating: 8,
          distance: 0.5,
          type: "elementary",
        },
        {
          name: "Travis Middle School",
          rating: 7,
          distance: 1.2,
          type: "middle",
        },
        {
          name: "Austin High School",
          rating: 8,
          distance: 2.1,
          type: "high",
        },
      ],
      summary: generateSummary({
        medianHomePrice: 485000,
        medianRent: 1850,
        priceToRentRatio: 21.8,
        homeValueChange1Year: 3.2,
      }),
      buyVsRentRecommendation: getRecommendation(21.8),
      recommendationReason: getRecommendationReason(21.8, 3.2),
    };

    return analysis;
  });

// Helper function to generate a summary
function generateSummary(stats: {
  medianHomePrice: number;
  medianRent: number;
  priceToRentRatio: number;
  homeValueChange1Year: number;
}): string {
  const { medianHomePrice, medianRent, priceToRentRatio, homeValueChange1Year } = stats;
  
  let summary = `The median home price in this area is $${medianHomePrice.toLocaleString()}, `;
  summary += `with typical rents around $${medianRent.toLocaleString()}/month. `;
  
  if (priceToRentRatio > 20) {
    summary += `The price-to-rent ratio of ${priceToRentRatio.toFixed(1)} suggests renting may be more cost-effective in the short term. `;
  } else if (priceToRentRatio < 15) {
    summary += `The price-to-rent ratio of ${priceToRentRatio.toFixed(1)} suggests buying could be advantageous. `;
  } else {
    summary += `The price-to-rent ratio of ${priceToRentRatio.toFixed(1)} is moderate. `;
  }
  
  if (homeValueChange1Year > 0) {
    summary += `Home values have increased ${homeValueChange1Year.toFixed(1)}% over the past year.`;
  } else {
    summary += `Home values have decreased ${Math.abs(homeValueChange1Year).toFixed(1)}% over the past year.`;
  }
  
  return summary;
}

// Helper function to get buy/rent recommendation based on price-to-rent ratio
function getRecommendation(priceToRentRatio: number): "buy" | "rent" | "neutral" {
  // General rule of thumb:
  // < 15: Buying is favored
  // 15-20: Neutral
  // > 20: Renting is favored
  if (priceToRentRatio < 15) return "buy";
  if (priceToRentRatio > 20) return "rent";
  return "neutral";
}

// Helper function to explain the recommendation
function getRecommendationReason(priceToRentRatio: number, _homeValueChange: number): string {
  const recommendation = getRecommendation(priceToRentRatio);
  
  if (recommendation === "buy") {
    return `With a price-to-rent ratio of ${priceToRentRatio.toFixed(1)}, buying appears favorable. The lower ratio means the cost of owning is relatively affordable compared to renting.`;
  } else if (recommendation === "rent") {
    return `With a price-to-rent ratio of ${priceToRentRatio.toFixed(1)}, renting may be more cost-effective, especially for shorter stays. The higher ratio indicates homes are expensive relative to rental prices.`;
  } else {
    return `The price-to-rent ratio of ${priceToRentRatio.toFixed(1)} suggests neither option has a clear advantage. Consider your personal circumstances, how long you plan to stay, and current mortgage rates.`;
  }
}

// Server function to geocode an address
export const geocodeAddress = createServerFn({ method: "GET" })
  .inputValidator((params: { address: string }) => params)
  .handler(async ({ data }) => {
    const { address } = data;
    // TODO: Use a geocoding API (Google Maps, Mapbox, or free alternatives)
    // For now, return mock data for Austin
    
    // Simple mock - in reality, this would call a geocoding API
    if (address.toLowerCase().includes("austin")) {
      return {
        lat: 30.2672,
        lng: -97.7431,
        formattedAddress: "Austin, TX, USA",
        city: "Austin",
        state: "TX",
        zipcode: "78701",
      };
    }
    
    // Default to Austin for demo
    return {
      lat: 30.2672,
      lng: -97.7431,
      formattedAddress: address,
      city: "Austin",
      state: "TX",
      zipcode: "78701",
    };
  });
