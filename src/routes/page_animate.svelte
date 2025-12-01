<script>
    import Globe from "$lib/components/Globe.svelte";
    import Legend from "$lib/components/ Legend.svelte";
    import { theme } from "$lib/stores/theme.js";
    import ThemeSwitcher from "$lib/components/ThemeSwitcher.svelte";
    
    export let data;
    let globeRef;


    // let showPB = true;
    let showFaults = true;
    let showSubduction = true;
    let showDepthBars = true;

    // 过滤状态
    let magFilter = "all";        
    let countryFilter = "all";  
    let monthFilter = "all"; 
    let depthFilter = "all"; 

    // --- ✨ 模式控制和动画时间状态 ---
    // let explorationMode = "free"; // 'free' 或 'animated'
    // let animationTimeDisplay = 0; // 用于显示动画当前时间
    // let animationInterval; // 用于存储计时器 ID

    // 动态获取 Globe 内部的动画时间，并更新显示
    // $: if (explorationMode === 'animated') {
    //     // 清除任何旧的计时器，以防万一
    //     clearInterval(animationInterval); 
        
    //     // 每 100ms 从 Globe 实例获取一次当前动画时间
    //     animationInterval = setInterval(() => {
    //         if (globeRef && globeRef.getAnimationTime) {
    //             animationTimeDisplay = globeRef.getAnimationTime();
    //         }
    //     }, 100);
    // } else {
    //     // 切换到 'free' 模式时清除计时器和时间显示
    //     clearInterval(animationInterval);
    //     animationTimeDisplay = 0;
    // }

    // $: formattedTime = animationTimeDisplay > 0 
    //     ? new Date(animationTimeDisplay).toLocaleDateString('en-CA')
    //     : "N/A";

    $: mags = data.earthquakes.map(q => q.magnitude);
    $: minMag = Math.min(...mags);
    $: maxMag = Math.max(...mags);

    // 动态生成可选国家列表
    const countries = Array.from(new Set(
        data.earthquakes.map(q => {
            const parts = q.place.split(",").map(s => s.trim());
            return parts[parts.length-1];
        })
    )).sort();
    
    $: filtered = data.earthquakes.filter(q => {

        // 震级过滤
        if (magFilter !== "all" && q.magnitude < parseFloat(magFilter)) return false;

        // 深度过滤
        if (depthFilter !== "all") {
            if (depthFilter === "shallow" && q.depth >= 70) return false;
            if (depthFilter === "intermediate" && (q.depth < 70 || q.depth > 300)) return false;
            if (depthFilter === "deep" && q.depth <= 300) return false;
        }

        // 国家过滤
        if (countryFilter !== "all") {
            const parts = q.place.split(",").map(s => s.trim());
            const country = parts[parts.length-1];
            if (country !== countryFilter) return false;
        }

        return true;
    });

</script>



<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
<div class="page" class:dark={$theme==='dark'} class:light={$theme==='light'}>
    <div class="sidebar">
        <div class="sidebar-top">
            <h2>Earthquakes</h2>
            <span class="siderbar-text">Past month earthquakes</span>
            
            <div class="filters">
                <Legend minMag={minMag} maxMag={maxMag} />
            </div>
            
            <div class="filters">     
                <label>
                    <select bind:value={magFilter}>
                        <option value="all">All Magnitudes</option>
                        <option value="1">M1+</option>
                        <option value="2">M2+</option>
                        <option value="3">M3+</option>
                        <option value="4">M4+</option>
                        <option value="5">M5+</option>
                        <option value="6">M6+</option>
                        <option value="7">M7+</option>
                    </select>
                </label>

                <label>
                    <select bind:value={depthFilter}>
                        <option value="all">All Depths</option>
                        <option value="shallow">Shallow (&lt;70 km)</option>
                        <option value="intermediate">Intermediate (70–300 km)</option>
                        <option value="deep">Deep (&gt;300 km)</option>
                    </select>
                </label>
            
                <label>
                    <select bind:value={countryFilter}>
                        <option value="all">All Countries</option>
                        {#each countries as c}
                            <option value={c}>{c}</option>
                        {/each}
                    </select>
                </label>
            </div>

            <div class="filters">
        
                <label class="chk">
                    <input type="checkbox" bind:checked={showSubduction}>
                    <span>Subduction</span>
                </label>

                <label class="chk">
                    <input type="checkbox" bind:checked={showFaults}>
                    <span>Faults</span>
                </label>

                <label class="chk">
                    <input type="checkbox" bind:checked={showDepthBars}>
                    <span>Depth</span>
                </label>
                
            </div>

            <!-- <div class="filters mode-switcher">
                <h3>探索模式</h3>
                <label class="chk">
                    <input type="radio" name="mode" value="free" bind:group={explorationMode}>
                    <span>自由探索 (Free)</span>
                </label>
                <label class="chk">
                    <input type="radio" name="mode" value="animated" bind:group={explorationMode}>
                    <span>时间动画 (Animated)</span>
                </label>
            </div> -->
            
        </div>
        <div class="sidebar-bottom">
            
            <ThemeSwitcher />
            <button on:click={() => globeRef?.focusOn(35.8617, 104.1954)}>
            <!-- <button on:click={() => globeRef?.flyAlongRingOfFire()}> -->
             
                <span class="material-symbols-outlined">location_on</span>
            </button>
        </div>
    </div>

    <div class="viz">
        <div class="viewer">
            <Globe 
            bind:this={globeRef} 
            earthquakeData={filtered} 
            pbData={data.pb} 
            faultData={data.faults} 
            showFaults={showFaults}
            showSubduction={showSubduction}
            showDepthBars={showDepthBars}
            theme={$theme}
            />    
        </div>

        <!-- {#if explorationMode === 'animated' && animationTimeDisplay > 0}
            <div class="animated-time-overlay">
                {formattedTime}
            </div>
        {/if} -->

        <div class="caption-text">
            <span>{filtered.length} earthquakes </span>
            <span>
                Data source: 
                <a href="https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php" target="_blank" rel="noopener noreferrer">
                    USGS Earthquake Catalog
                </a>
            </span>
            
        </div>
    </div>

</div>



<style>
    /* 主题样式 */
    .dark {
        --sidebar-bg: black;
        --sidebar-color: #e0e0e0;
        --btn-bg: black;
        --btn-color: #e0e0e0;
        --btn-border: 1px solid #444;
        --btn-hover: #333;
    }

    .light {
        --sidebar-bg: #fff;
        --sidebar-color: #111;
        --btn-bg: #fff;
        --btn-color: #111;
        --btn-border: 1px solid #bbb;
        --btn-hover: #eee;
    }

    :global(body) {
        margin: 0;
        padding: 0;
        min-height: 100vh;
        overflow: hidden;
        font-family: sans-serif;
    }

    .page {
        display: flex;
        height: 100vh;
    }

    /* 左侧控制面板 */
    .sidebar {
        width: 200px;
        display: flex;
        flex-direction: column;
        padding: 16px;
        box-sizing: border-box;
        gap: 16px;
        background-color: var(--sidebar-bg);
        color: var(--sidebar-color);
        transition: background-color 0.3s, color 0.3s;
    }

    .sidebar-top {
    flex: 1; /* 占据上方空间 */
    margin-top: 24px;
    }

    .sidebar-bottom {
        display: flex;
        flex-direction: column;
        gap: 8px; /* 按钮间距 */
    }

    .filters {
        margin-top: 48px;
    }

    .sidebar h2 {
        margin: 0;
        font-size: 24px;
    }

    .sidebar label {
        display: flex;
        flex-direction: column;
        margin-bottom: 12px;
        font-size: 14px;
    }

    .sidebar select, .sidebar button {
        margin-top: 4px;
        padding: 4px 8px;
        font-size: 14px;
    }

    .sidebar button {
        cursor: pointer;
        border-radius: 4px;
        border: none;
        text-align:left;
        background-color: var(--btn-bg);
        color: var(--btn-color);
    }

    .sidebar button:hover {
        background-color: var(--btn-hover);
    }

    .sidebar select {
        background: transparent;               
        color: var(--sidebar-color);           
        border: none;              
        padding: 0;
        font-size: 14px;
        border-radius: 4px;
        outline: none;
        appearance: auto; 
        height: 32px;  
        line-height: 24px;          
    }

    .sidebar select:hover {
        background: var(--btn-hover);                
       
    }

    .siderbar-text {
        font-size: 14px;
        color: var(--sidebar-color);
        opacity: 0.7;
    }

    .chk {
        flex-direction: row !important;
        align-items: center !important;
        gap: 12px;
        cursor: pointer;
        user-select: none;
    }

    .chk input[type="checkbox"] {
        margin: 12px 0;
    }

    
    /* 右侧 Globe */
    .viz {
        flex: 1;
        position: relative;
        display: flex;
        flex-direction: column;
    }
  
    .viewer {
        flex: 1;
        position: relative;
    }

    /* .mode-switcher h3 {
        margin-top: 0;
        margin-bottom: 12px;
        font-size: 16px;
    } */

    /* ... (原有 .viz 样式保持不变) ... */
    
    /* 动画模式下的时间显示样式 */
    /* .animated-time-overlay {
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 8px 15px;
        background: rgba(255, 255, 255, 0.9);
        color: #111;
        border-radius: 4px;
        font-weight: bold;
        z-index: 10;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        text-align: center;
    } */
    
    /* .dark .animated-time-overlay {
        background: rgba(0, 0, 0, 0.8);
        color: white;
    } */

    
</style>

