// Simplified Pakistan boundary polygon (GeoJSON)
// Used to restrict complaint map view to Pakistan only
export const PAKISTAN_BOUNDARY: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Pakistan" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            // Southern coast — Arabian Sea (west to east)
            [61.78, 25.12],
            [62.30, 25.07],
            [63.10, 25.05],
            [63.70, 25.30],
            [64.20, 25.35],
            [64.80, 25.30],
            [65.50, 25.35],
            [66.00, 25.10],
            [66.60, 24.95],
            [67.00, 24.87],
            [67.50, 24.85],
            [67.90, 25.05],
            // Karachi coast eastward
            [68.20, 25.15],
            [68.60, 25.40],
            [68.85, 25.60],
            [69.10, 25.80],
            // Sindh-Rajasthan border (southeast)
            [69.30, 26.20],
            [69.40, 26.60],
            [69.50, 27.00],
            [69.60, 27.40],
            [70.00, 27.90],
            // Punjab east (towards India border)
            [70.50, 28.40],
            [71.00, 29.00],
            [71.50, 29.60],
            [72.00, 30.20],
            [72.50, 30.80],
            [73.00, 31.20],
            [73.50, 31.60],
            [74.00, 31.80],
            [74.35, 32.15],
            // Northeast — Kashmir area
            [74.80, 32.60],
            [75.20, 33.10],
            [75.50, 33.60],
            [76.00, 34.20],
            [76.50, 34.80],
            [77.00, 35.30],
            [77.30, 35.60],
            [77.80, 36.00],
            [78.00, 36.50],
            // Northern border — China/Afghanistan (westward)
            [77.50, 37.00],
            [76.80, 37.20],
            [76.00, 37.00],
            [75.20, 37.20],
            [74.50, 37.50],
            [73.80, 37.80],
            [73.00, 38.00],
            [72.30, 37.60],
            [71.60, 37.20],
            [71.10, 36.80],
            [70.60, 36.30],
            // NWFP — Afghan border (southward)
            [70.20, 35.80],
            [69.80, 35.30],
            [69.40, 34.80],
            [69.10, 34.30],
            [68.70, 33.80],
            [68.20, 33.30],
            [67.80, 32.80],
            [67.40, 32.20],
            [67.10, 31.60],
            [66.80, 31.10],
            // Balochistan west (southward towards Iran border)
            [66.50, 30.50],
            [66.30, 30.00],
            [66.00, 29.50],
            [65.60, 29.10],
            [65.20, 28.60],
            [64.80, 28.10],
            [64.30, 27.60],
            [63.80, 27.10],
            [63.30, 26.60],
            [62.80, 26.10],
            [62.30, 25.60],
            [61.78, 25.12], // close ring
          ],
        ],
      },
    },
  ],
};

// Bounds for restricting map view to Pakistan region (tight fit)
export const PAKISTAN_BOUNDS: L.LatLngBoundsExpression = [
  [23.0, 60.5], // southwest
  [37.5, 78.5], // northeast
];
