import geopandas as gpd

# 1) Load data you downloaded from data.syr.gov
parcels = gpd.read_file("Syracuse_Parcel_Map_(2024_Q4).geojson")      # or .shp
districts = gpd.read_file("Syracuse_Common_Council_Boundaries_(2023).geojson")  # or .shp

# 2) Ensure both layers share a CRS
if parcels.crs != districts.crs:
    districts = districts.to_crs(parcels.crs)

# 3) Use a projected CRS for accurate centroids
projected_crs = "EPSG:2262"  # NAD83 / New York Central (ftUS)
parcels_projected = parcels.to_crs(projected_crs)
districts_projected = districts.to_crs(projected_crs)

# 4) Make a point per parcel for district lookup (centroid is typical)
parcels_pts = parcels_projected.copy()
parcels_pts["geometry"] = parcels_projected.geometry.centroid

# 4) Spatial join: parcels -> council district polygon
# 5) Spatial join: parcels -> council district polygon
joined = gpd.sjoin(
    parcels_pts,
    districts_projected[["DIST_ID", "geometry"]],   # DIST_ID is shown on the portal table view
    how="left",
    predicate="within"
)

# 6) Select and rename output fields
out = joined.rename(columns={
    "ADDRESSNUM": "street_number",
    "ADDRESSNAM": "street_name",
    "DIST_ID": "council_district",
    "CITY_WARD": "ward"
})[["street_number", "street_name", "council_district", "ward"]]

# 7) Basic cleanup
out = out.dropna(subset=["street_number", "street_name"])
out["street_number"] = out["street_number"].astype(str).str.strip()
out["street_name"] = out["street_name"].astype(str).str.strip()

# 8) Export CSV
out.to_csv("syracuse_addresses_with_council_district_and_ward.csv", index=False)
print("Wrote", len(out), "rows")
