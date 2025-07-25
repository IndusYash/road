document.getElementById('findRoadBtn').addEventListener('click', findRoadInfo);

const loadingDiv = document.getElementById('loading');
const latitudeSpan = document.getElementById('latitude');
const longitudeSpan = document.getElementById('longitude');
const addressSpan = document.getElementById('address');
const roadNameSpan = document.getElementById('roadName');
const osmHighwayTypeSpan = document.getElementById('osmHighwayType');
const indianRoadTypeSpan = document.getElementById('indianRoadType');
const govtStatusSpan = document.getElementById('govtStatus');
const govtContentPre = document.getElementById('govtContent');
const manualSearchQuerySpan = document.getElementById('manualSearchQuery');
const aiStatusSpan = document.getElementById('aiStatus');

async function findRoadInfo() {
    loadingDiv.style.display = 'block';
    resetInfoDisplays();

    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser. Please use a modern browser.');
        loadingDiv.style.display = 'none';
        return;
    }

    try {
        // 1. Get user's current position
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        });

        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        latitudeSpan.textContent = lat.toFixed(6);
        longitudeSpan.textContent = lon.toFixed(6);

        // 2. Use Nominatim (OpenStreetMap) for reverse geocoding
        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1&extratags=1&accept-language=en`;

        const response = await fetch(nominatimUrl, {
            headers: {
                // IMPORTANT: Provide a unique User-Agent to identify your app
                // This helps Nominatim identify your usage and avoid blocks.
                'User-Agent': 'FreeRoadInfoFinderWebsite/1.0 (your_unique_app_name@example.com)'
            }
        });

        const data = await response.json();

        if (response.ok && data && data.display_name) {
            addressSpan.textContent = data.display_name;
            const roadName = data.address.road || data.address.footway || data.address.path || 'Unknown Road';
            roadNameSpan.textContent = roadName;

            const osmHighwayType = data.extratags && data.extratags.highway ? data.extratags.highway : 'N/A';
            osmHighwayTypeSpan.textContent = osmHighwayType;

            const indianRoadType = inferIndianRoadType(data);
            indianRoadTypeSpan.textContent = indianRoadType;

            console.log("Nominatim Full Data:", data); // Inspect this in your browser console!

            // Now, proceed to fetch government data using our backend proxy
            fetchGovernmentData(roadName, indianRoadType, lat, lon, data.address);

            // Update manual search query hint
            manualSearchQuerySpan.textContent = `"${roadName} India" OR "${indianRoadType} road status ${data.address.city || data.address.town || data.address.village || ''} ${data.address.state || ''}"`;

        } else {
            addressSpan.textContent = `Error: ${data.error || 'Could not reverse geocode location.'}`;
            roadNameSpan.textContent = 'N/A';
            osmHighwayTypeSpan.textContent = 'N/A';
            indianRoadTypeSpan.textContent = 'N/A';
            govtStatusSpan.textContent = 'Road could not be identified for government data search.';
            aiStatusSpan.textContent = 'Cannot perform advanced searches without road name.';
        }

    } catch (error) {
        console.error('Error:', error);
        if (error.code === error.PERMISSION_DENIED) {
            alert('Location access denied. Please enable location services for this website.');
        } else if (error.code === error.TIMEOUT) {
            alert('Location request timed out. Please try again.');
        } else {
            alert('Error getting location or road info: ' + error.message);
        }
        addressSpan.textContent = 'Error during lookup.';
        roadNameSpan.textContent = 'Error during lookup.';
        osmHighwayTypeSpan.textContent = 'Error.';
        indianRoadTypeSpan.textContent = 'Error.';
        govtStatusSpan.textContent = 'Error during road identification.';
        aiStatusSpan.textContent = 'Error during road identification.';
    } finally {
        loadingDiv.style.display = 'none';
    }
}

function resetInfoDisplays() {
    latitudeSpan.textContent = 'N/A';
    longitudeSpan.textContent = 'N/A';
    addressSpan.textContent = 'N/A';
    roadNameSpan.textContent = 'N/A';
    osmHighwayTypeSpan.textContent = 'N/A';
    indianRoadTypeSpan.textContent = 'N/A';
    govtStatusSpan.textContent = 'Fetching data from data.gov.in...';
    govtContentPre.textContent = '';
    manualSearchQuerySpan.textContent = 'N/A';
    aiStatusSpan.textContent = 'AI integration (e.g., for summarization) requires a paid LLM API. This feature is not available in the free tier.';
}

/**
 * Tries to infer Indian road type (NH, SH, Grameen Sadak) from Nominatim data.
 * This is a heuristic and might not be 100% accurate.
 * @param {object} nominatimData The full JSON response from Nominatim.
 * @returns {string} Inferred Indian road type.
 */
function inferIndianRoadType(nominatimData) {
    const roadName = nominatimData.address.road || '';
    const highwayType = nominatimData.extratags && nominatimData.extratags.highway;
    const ref = nominatimData.extratags && nominatimData.extratags.ref;

    // Check for explicit NH/SH references in name or ref tag
    if (roadName.match(/National Highway \d+|NH-\d+|NH\d+/i) || (ref && ref.match(/NH\d+/i))) {
        return `National Highway (${roadName || ref})`;
    }
    if (roadName.match(/State Highway \d+|SH-\d+|SH\d+/i) || (ref && ref.match(/SH\d+/i))) {
        return `State Highway (${roadName || ref})`;
    }

    // Heuristic based on OSM highway types
    if (highwayType) {
        switch (highwayType) {
            case 'motorway':
            case 'trunk': // Often used for National Highways
            case 'primary': // Can be National or Major State Highways
                return `Major Highway (${highwayType})`;
            case 'secondary': // Often used for State Highways or Major District Roads
            case 'tertiary': // Often used for District Roads
                return `District/State Road (${highwayType})`;
            case 'unclassified': // Very common for rural roads, can also be local urban roads
            case 'residential':
            case 'service':
            case 'track':
            case 'path':
            case 'footway':
            case 'pedestrian':
                return `Local/Rural Road (${highwayType})`;
            default:
                return `Unknown (${highwayType})`;
        }
    }

    // If no specific highway type or explicit name, check if it's a known rural area
    if (nominatimData.address.village || nominatimData.address.hamlet || nominatimData.address.farm) {
        return 'Likely Rural Road';
    }

    return 'Could not infer';
}

// --- Phase 2: Fetch Government Data (REQUIRES BACKEND PROXY) ---
async function fetchGovernmentData(roadName, indianRoadType, lat, lon, addressComponents) {
    govtStatusSpan.textContent = `Searching data.gov.in records for "${roadName}" (${indianRoadType})...`;
    govtContentPre.textContent = 'This data will be fetched via a free backend proxy (e.g., Vercel Function). Setting this up is our next major step!';

    // **IMPORTANT: This URL will point to YOUR backend function.**
    // Example: const backendProxyUrl = '/api/gov-data-proxy';
    // You will send the identified road info to your backend.
    const backendProxyUrl = 'http://localhost:3000/api/gov-data-proxy'; // Placeholder for local testing with a dummy backend

    try {
        const response = await fetch(backendProxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ roadName, indianRoadType, lat, lon, addressComponents })
        });

        if (!response.ok) {
            throw new Error(`Backend proxy error: ${response.statusText}`);
        }

        const data = await response.json();
        govtStatusSpan.textContent = 'Government data fetched successfully (via proxy)!';
        govtContentPre.textContent = JSON.stringify(data, null, 2);

    } catch (error) {
        console.error('Error fetching government data via proxy:', error);
        govtStatusSpan.textContent = 'Failed to fetch government data via proxy. (Error: ' + error.message + ')';
        govtContentPre.textContent = 'Please ensure your backend proxy is running and correctly configured.';
    }
}