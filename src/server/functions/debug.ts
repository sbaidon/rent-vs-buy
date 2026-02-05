/// <reference path="../../../worker-configuration.d.ts" />
import { createServerFn } from "@tanstack/react-start";

// Debug endpoint to test API configuration
export const debugApi = createServerFn({ method: "GET" })
  .handler(async (): Promise<{ 
    hasApiKey: boolean; 
    envSources: Record<string, boolean>;
    testResult?: string;
    error?: string;
  }> => {
    // Test env sources
    let cfEnv: string | undefined;
    try {
      const { env } = await import("cloudflare:workers") as { env: Env };
      cfEnv = env?.RAPIDAPI_KEY;
    } catch {
      // cloudflare:workers not available
    }
    const processEnv = process.env.RAPIDAPI_KEY;
    
    const apiKey = cfEnv || processEnv;
    
    const envSources = {
      cfEnv: !!cfEnv,
      processEnv: !!processEnv,
    };
    
    let testResult: string | undefined;
    let error: string | undefined;
    
    if (apiKey) {
      try {
        const response = await fetch("https://realty-in-us.p.rapidapi.com/properties/v3/list", {
          method: "POST",
          headers: {
            "X-RapidAPI-Key": apiKey,
            "X-RapidAPI-Host": "realty-in-us.p.rapidapi.com",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            limit: 5,
            offset: 0,
            status: ["for_sale"],
            city: "Aliso Viejo",
            state_code: "CA",
          }),
        });
        
        const data = await response.json();
        testResult = `Status: ${response.status}, Count: ${data?.data?.home_search?.count ?? 'N/A'}`;
      } catch (e) {
        error = String(e);
      }
    }
    
    return {
      hasApiKey: !!apiKey,
      envSources,
      testResult,
      error,
    };
  });
