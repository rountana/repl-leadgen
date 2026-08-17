import { Router } from "express";

const router = Router();

/**
 * GET /geocode?address=<string>
 *
 * Geocodes a free-form address string using the Nominatim OpenStreetMap API
 * (free, no key required). Returns { lat, lng } on success.
 *
 * No auth required — the endpoint only forwards a user-supplied address string
 * to a public service and returns public coordinates.
 */
router.get("/geocode", async (req, res): Promise<void> => {
  const address = req.query.address as string | undefined;

  if (!address || address.trim() === "") {
    res.status(400).json({ error: "Missing required query parameter: address" });
    return;
  }

  const params = new URLSearchParams({
    q: address.trim(),
    format: "json",
    limit: "1",
  });

  const nominatimUrl = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

  const response = await fetch(nominatimUrl, {
    headers: {
      // Nominatim requires a descriptive User-Agent per their usage policy.
      "User-Agent": "HVCG-FbIntegration/1.0 (contact@hvcg.app)",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    res
      .status(502)
      .json({ error: `Geocoding service returned ${response.status}` });
    return;
  }

  const results = (await response.json()) as Array<{ lat: string; lon: string }>;

  if (!results || results.length === 0) {
    res.status(404).json({ error: "Address not found. Please check the business location in your profile." });
    return;
  }

  const { lat, lon } = results[0];
  res.json({ lat: parseFloat(lat), lng: parseFloat(lon) });
});

export default router;
