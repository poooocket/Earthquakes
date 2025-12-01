import pbDataUrl from '$lib/data/plate_boundaries.json?url';
import faultsDataUrl from '$lib/data/gem_active_faults_harmonized.geojson?url';

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


    // 2. 🚨 关键修改：通过 fetch API 获取本地文件内容 🚨
    const [pbRes, faultsRes] = await Promise.all([
        fetch(pbDataUrl),
        fetch(faultsDataUrl)
    ]);
    
    // 检查响应是否成功
    if (!pbRes.ok || !faultsRes.ok) {
        // 在这里抛出错误有助于调试
        console.error("Failed to fetch local assets (PB or Faults)"); 
        throw new Error("Failed to load map data assets."); 
    }

    const pbData = await pbRes.json();
    const faultsData = await faultsRes.json();
    return {
        earthquakes,
        pb: pbData.features,
        faults: faultsData.features,
    };
}
