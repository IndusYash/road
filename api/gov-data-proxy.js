// api/gov-data-proxy.js

// IMPORTANT: NEVER hardcode your API key directly in client-side JS or public repos.
// Use environment variables for Vercel.
const DATA_GOV_IN_API_KEY = process.env.DATA_GOV_IN_API_KEY;

module.exports = async (req, res) => {
    // Ensure this function only accepts POST requests for security
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    // Parse the request body (sent from your frontend script.js)
    const { roadName, indianRoadType, lat, lon, addressComponents } = req.body;

    if (!DATA_GOV_IN_API_KEY) {
        console.error("DATA_GOV_IN_API_KEY is not set!");
        return res.status(500).json({ error: 'Server configuration error: API key missing.' });
    }

    // --- Logic to Query data.gov.in ---
    // This is the challenging part: data.gov.in has many datasets.
    // You'll need to find the specific dataset(s) relevant to road information
    // (e.g., road length, accident data, PMGSY progress).
    // For now, let's use a placeholder/example for searching.

    let govtData = {};
    let searchKeywords = [];

    // Try to construct search terms based on identified road type and name
    if (indianRoadType.includes('National Highway')) {
        const nhMatch = roadName.match(/NH\s*(\d+)/i);
        if (nhMatch && nhMatch[1]) {
            searchKeywords.push(`national highway ${nhMatch[1]} India`);
        }
        searchKeywords.push("national highways india length");
        searchKeywords.push("road accidents national highway");
    } else if (indianRoadType.includes('State Highway')) {
        const shMatch = roadName.match(/SH\s*(\d+)/i);
        if (shMatch && shMatch[1]) {
            searchKeywords.push(`state highway ${shMatch[1]} india`);
        }
        searchKeywords.push("state highways india length");
        searchKeywords.push("road accidents state highway");
    } else if (indianRoadType.includes('Rural Road') || indianRoadType.includes('Local')) {
        // For rural roads, we need to use district/state information
        const district = addressComponents.district;
        const state = addressComponents.state;
        if (district && state) {
            searchKeywords.push(`PMGSY progress ${district} ${state}`);
            searchKeywords.push(`rural roads india ${district} ${state}`);
        }
        searchKeywords.push("rural road length india");
    } else {
         searchKeywords.push(`${roadName} road infrastructure India`);
    }

    searchKeywords.push("Ministry of Road Transport and Highways data"); // General search

    let fetchedGovtRecords = [];

    // **IMPORTANT: You need to find the actual data.gov.in API endpoints!**
    // This is a placeholder demonstrating how you *would* call data.gov.in.
    // You'll need to browse data.gov.in, find specific datasets (e.g., "National Highway Length"),
    // click on their "API" tab, and use the exact endpoint and parameters they provide.

    for (const keyword of searchKeywords) {
        // Example: A hypothetical data.gov.in API for general search
        // In reality, data.gov.in APIs are usually for specific datasets.
        // You'd be calling multiple specific dataset APIs here based on your logic.
        const dummyApiUrl = `https://api.data.gov.in/resource/some_id?api-key=${DATA_GOV_IN_API_KEY}&filters[keywords]=${encodeURIComponent(keyword)}`;

        // For demonstration, let's simulate a response
        if (keyword.includes("national highway length")) {
            fetchedGovtRecords.push({
                source: "data.gov.in (Simulated NH Length)",
                query: keyword,
                data: `Total National Highway length in India (as of 2024): 146,145 km.`,
                details: `(Actual data would be fetched from: https://data.gov.in/resource/length-national-highways-india)`
            });
        } else if (keyword.includes("PMGSY progress")) {
             fetchedGovtRecords.push({
                source: "data.gov.in (Simulated PMGSY Progress)",
                query: keyword,
                data: `PMGSY roads completed in ${addressComponents.district || 'this district'} (simulated): 250 km.`,
                details: `(Actual data would be fetched from relevant PMGSY API on data.gov.in)`
            });
        } else if (keyword.includes("road accidents")) {
             fetchedGovtRecords.push({
                source: "data.gov.in (Simulated Road Accidents)",
                query: keyword,
                data: `Road accidents on National Highways (simulated, latest year): 1.5 lakh accidents.`,
                details: `(Actual data would be fetched from: https://data.gov.in/resource/year-wise-road-accidents-india-type-road-category)`
            });
        } else {
            fetchedGovtRecords.push({
                source: "data.gov.in (Simulated General Search)",
                query: keyword,
                data: "No direct specific dataset found for this exact query on data.gov.in (simulated).",
                details: "(You would replace this with actual API calls to data.gov.in datasets)"
            });
        }

        // In a real scenario, you'd add a delay here for sequential calls to avoid hammering APIs
        // await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Send the compiled data back to the frontend
    res.status(200).json({
        status: 'success',
        roadName,
        indianRoadType,
        addressComponents,
        governmentData: fetchedGovtRecords,
        message: 'Government data fetched (simulated - replace with real API calls!)'
    });

};
