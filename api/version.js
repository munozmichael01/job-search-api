// Version check endpoint to verify deployment
// CRITICAL FIX: Increased nearby cities search from 10 to 25 (Barcelona was at position 18)
export default async function handler(req, res) {
  return res.status(200).json({
    version: "2025-11-04-09:35",
    commit: "TBD",
    timestamp: new Date().toISOString(),
    message: "If you see this, the new code is deployed",
    features: [
      "ES/CA normalization in valid_cities",
      "Metadata without valid_cities array",
      "NIVEL 0.5 with proper logging"
    ]
  });
}
