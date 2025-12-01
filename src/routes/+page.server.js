import pbData from '$lib/data/plate_boundaries.json?url';
import faultsData from '$lib/data/gem_active_faults_harmonized.geojson?url';

export async function load({ fetch }) {

    // 地震数据
    const url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson";
    const res = await fetch(url);
    if (!res.ok) {
        console.error("Failed to fetch USGS data");
        return { earthquakes: [] };
    }
    const data = await res.json();

    const earthquakes = data.features.map((feature) => {
        const props = feature.properties;
        const coords = feature.geometry.coordinates; // [lon, lat, depth]

        return {
            id: feature.id,
            magnitude: props.mag,
            place: props.place,
            time: props.time,
            latitude: coords[1],
            longitude: coords[0],
            depth: coords[2],
        };
    });


    // // 板块边界
    // const pbPath = path.resolve('src/lib/data/plate_boundaries.json');
    // const pb = JSON.parse(fs.readFileSync(pbPath));

    // // 全球断层
    // const gafPath = path.resolve('src/lib/data/gem_active_faults_harmonized.geojson');
    // const faults = JSON.parse(fs.readFileSync(gafPath));

    return {
        earthquakes,
        pb: pbData.features,
        faults: faultsData.features,
    };
}
