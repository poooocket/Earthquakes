<script>
    import { materialLineGapSize } from "three/tsl";

    export let minMag;
    export let maxMag;

    function generateLegendGradient(minMag, maxMag) {
        const steps = 20;
        const stops = [];

        for (let i = 4; i <= steps; i++) {
            const ratio = i / steps;

            // 映射到 Three.js 的 HSL hue
            const normalized = ratio; // 0~1
            const hue = normalized * 330;

            const hsl = `hsl(${hue}, 90%, 50%)`;
            stops.push(`${hsl} ${ratio * 100}%`);
        }

        return `linear-gradient(to right, ${stops.join(", ")})`;
    }

    $: gradient = generateLegendGradient(minMag, maxMag);
</script>

<div>
    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 4px;">
        <span>震级 {minMag}</span>
        <span>震级 {maxMag}</span>
    </div>
    <div class="legend" style="background: {gradient}; margin-top: 4px;"></div>
</div>


<style>
.legend {
    width: 100%;
    height: 12px;
    border-radius: 8px;
}
</style>