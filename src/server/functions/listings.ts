import { createServerFn } from "@tanstack/react-start/server";

// Types for property listings
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
}

export interface SearchParams {
  location: string;
  lat?: number;
  lng?: number;
  radius?: number; // in miles
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  propertyType?: "sale" | "rent" | "all";
}

export interface SearchResult {
  properties: Property[];
  totalCount: number;
  center: { lat: number; lng: number };
}

// Server function to search properties
// This will be called from the client and executed on the server
export const searchProperties = createServerFn({ method: "GET" })
  .validator((params: SearchParams) => params)
  .handler(async ({ data: params }) => {
    // For now, return mock data
    // TODO: Replace with actual RapidAPI Zillow call
    
    const mockProperties: Property[] = [
      {
        id: "1",
        address: "123 Main St, Austin, TX 78701",
        streetAddress: "123 Main St",
        city: "Austin",
        state: "TX",
        zipcode: "78701",
        price: 450000,
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1800,
        propertyType: "sale",
        lat: 30.2672,
        lng: -97.7431,
        zestimate: 455000,
        rentZestimate: 2200,
        yearBuilt: 2005,
        homeType: "Single Family",
        daysOnMarket: 14,
      },
      {
        id: "2",
        address: "456 Oak Ave, Austin, TX 78702",
        streetAddress: "456 Oak Ave",
        city: "Austin",
        state: "TX",
        zipcode: "78702",
        price: 2100,
        bedrooms: 2,
        bathrooms: 1,
        sqft: 950,
        propertyType: "rent",
        lat: 30.2749,
        lng: -97.7404,
        yearBuilt: 2018,
        homeType: "Apartment",
      },
      {
        id: "3",
        address: "789 Congress Ave, Austin, TX 78701",
        streetAddress: "789 Congress Ave",
        city: "Austin",
        state: "TX",
        zipcode: "78701",
        price: 625000,
        bedrooms: 4,
        bathrooms: 3,
        sqft: 2400,
        propertyType: "sale",
        lat: 30.2747,
        lng: -97.7443,
        zestimate: 630000,
        rentZestimate: 3100,
        yearBuilt: 2010,
        homeType: "Single Family",
        daysOnMarket: 7,
      },
      {
        id: "4",
        address: "321 Lamar Blvd, Austin, TX 78703",
        streetAddress: "321 Lamar Blvd",
        city: "Austin",
        state: "TX",
        zipcode: "78703",
        price: 1850,
        bedrooms: 1,
        bathrooms: 1,
        sqft: 720,
        propertyType: "rent",
        lat: 30.2621,
        lng: -97.7538,
        yearBuilt: 2020,
        homeType: "Condo",
      },
      {
        id: "5",
        address: "555 E 6th St, Austin, TX 78701",
        streetAddress: "555 E 6th St",
        city: "Austin",
        state: "TX",
        zipcode: "78701",
        price: 525000,
        bedrooms: 2,
        bathrooms: 2,
        sqft: 1200,
        propertyType: "sale",
        lat: 30.2676,
        lng: -97.7372,
        zestimate: 530000,
        rentZestimate: 2600,
        yearBuilt: 2015,
        homeType: "Condo",
        daysOnMarket: 21,
      },
    ];

    // Filter by property type if specified
    let filtered = mockProperties;
    if (params.propertyType && params.propertyType !== "all") {
      filtered = filtered.filter((p) => p.propertyType === params.propertyType);
    }

    // Filter by price range
    if (params.minPrice) {
      filtered = filtered.filter((p) => p.price >= params.minPrice!);
    }
    if (params.maxPrice) {
      filtered = filtered.filter((p) => p.price <= params.maxPrice!);
    }

    // Filter by bedrooms
    if (params.bedrooms) {
      filtered = filtered.filter((p) => p.bedrooms >= params.bedrooms!);
    }

    return {
      properties: filtered,
      totalCount: filtered.length,
      center: { lat: 30.2672, lng: -97.7431 },
    } satisfies SearchResult;
  });

// Server function to get property details
export const getPropertyDetails = createServerFn({ method: "GET" })
  .validator((params: { propertyId: string }) => params)
  .handler(async ({ data: { propertyId } }) => {
    // TODO: Replace with actual API call
    // For now, return mock data
    
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
      description: "Beautiful 3 bedroom home in downtown Austin. Recently renovated with modern finishes.",
      photos: [
        "https://example.com/photo1.jpg",
        "https://example.com/photo2.jpg",
      ],
    };
  });
