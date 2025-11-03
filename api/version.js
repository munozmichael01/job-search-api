// Version check endpoint to verify deployment
// Force function re-upload: 2025-11-03-21:45
export default async function handler(req, res) {
  return res.status(200).json({
    version: "2025-11-03-21:45",
    commit: "34b28ca",
    timestamp: new Date().toISOString(),
    message: "If you see this, the new code is deployed",
    features: [
      "ES/CA normalization in valid_cities",
      "Metadata without valid_cities array",
      "NIVEL 0.5 with proper logging"
    ]
  });
}
