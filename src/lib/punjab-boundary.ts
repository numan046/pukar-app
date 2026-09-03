// Simplified Punjab (Pakistan) boundary polygon
// Used to restrict citizen complaint location to Punjab only
export const PUNJAB_BOUNDARY: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Punjab" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            // Southern border (Bahawalpur/Rahim Yar Khan area)
            [70.05, 28.00],
            [70.50, 27.80],
            [71.00, 27.85],
            [71.50, 28.00],
            [72.00, 28.10],
            [72.50, 28.30],
            [73.00, 28.60],
            [73.50, 28.90],
            [73.80, 29.10],
            // Southeast (India border, going north)
            [74.00, 29.50],
            [74.30, 30.00],
            [74.50, 30.40],
            [74.70, 30.80],
            [75.00, 31.20],
            [75.20, 31.60],
            [75.35, 32.00],
            [75.30, 32.40],
            // Northeast (Lahore/Sialkot area)
            [75.10, 32.80],
            [74.90, 33.10],
            [74.60, 33.40],
            [74.30, 33.60],
            [74.00, 33.80],
            // Northern border (Kashmir foothills)
            [73.60, 33.90],
            [73.20, 33.80],
            [72.80, 33.60],
            [72.40, 33.40],
            [72.00, 33.20],
            [71.60, 33.00],
            // Northwest (Potohar plateau)
            [71.20, 32.80],
            [70.90, 32.50],
            [70.60, 32.10],
            [70.40, 31.70],
            [70.20, 31.30],
            // Western border (going south)
            [70.00, 30.80],
            [69.80, 30.30],
            [69.70, 29.80],
            [69.80, 29.30],
            [69.90, 28.80],
            [70.00, 28.40],
            [70.05, 28.00], // close ring
          ],
        ],
      },
    },
  ],
};

// Bounds for restricting map view to Punjab region
export const PUNJAB_BOUNDS: L.LatLngBoundsExpression = [
  [27.5, 69.5], // southwest
  [34.2, 75.8], // northeast
];
