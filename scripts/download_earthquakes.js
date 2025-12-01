import fs from 'fs';
import path from 'path';
// import fetch from 'node-fetch'; // 如果 Node >=18 可以直接用全局 fetch

// 配置
const START_YEAR = 2024;
const START_MONTH = 9; // 0 = January
const OUTPUT_DIR = path.resolve('./static/earthquakes');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * 生成从 startYear/startMonth 到当前月份的每月时间段
 */

function getMonthRanges() {

    const END_YEAR_LIMIT = 2024;
    const END_MONTH_LIMIT = 11; 
  
    const ranges = [];
    let year = START_YEAR;
    let month = START_MONTH;
    
    // const now = new Date();
    // while (year < now.getFullYear() || (year === now.getFullYear() && month <= now.getMonth())) {

    while (year < END_YEAR_LIMIT || (year === END_YEAR_LIMIT && month <= END_MONTH_LIMIT)) {
        
        const start = new Date(Date.UTC(year, month, 1));
        const end = new Date(Date.UTC(year, month + 1, 0)); 
        
        ranges.push({
            year,
            month,
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0],
        });

        month++;

        if (month > 11) {
            month = 0;
            year++;
        }
    }
    return ranges;
}

/**
 * 下载单月数据并保存
 */
async function downloadMonth({ start, end, year, month }) {
    const fileName = `${year}-${String(month + 1).padStart(2, '0')}.json`;
    const filePath = path.join(OUTPUT_DIR, fileName);

    // 如果文件已经存在，跳过
    if (fs.existsSync(filePath)) {
        console.log(`Skip ${fileName}, already exists.`);
        return;
    }

    const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${start}&endtime=${end}&orderby=time&limit=20000`;
    console.log(`Fetching ${fileName} from ${url}`);

    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.error(`Failed to fetch ${fileName}: ${res.status}`);
            return;
        }

        const data = await res.json();
        // 只保存事件数组
        const events = data.features.map(f => {
            const props = f.properties;
            const coords = f.geometry.coordinates;
            return {
                id: f.id,
                magnitude: props.mag,
                place: props.place,
                time: props.time,
                latitude: coords[1],
                longitude: coords[0],
                depth: coords[2],
            };
        });

        fs.writeFileSync(filePath, JSON.stringify(events, null, 2), 'utf-8');
        console.log(`Saved ${events.length} events to ${fileName}`);
    } catch (err) {
        console.error(`Error fetching ${fileName}:`, err);
    }
}

/**
 * 主函数
 */
async function main() {
    const months = getMonthRanges();
    for (const month of months) {
        await downloadMonth(month);
        // 为防止请求太快，可加延迟
        await new Promise(r => setTimeout(r, 1000));
    }
}

main();