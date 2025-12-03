<script>
    import Globe from "$lib/components/Globe.svelte";
    import Legend from "$lib/components/Legend.svelte";
    import { theme } from "$lib/stores/theme.js";
    import ThemeSwitcher from "$lib/components/ThemeSwitcher.svelte";
    import VideoPlayer from '$lib/components/VideoPlayer.svelte';
    import IntroModal from "$lib/components/IntroModal.svelte";
    import videoURL from '$lib/data/earthquake_rhythm.mp4';
    
    export let data;
    let globeRef;


    // let showPB = true;
    let showFaults = true;
    let showSubduction = true;
    let showDepthBars = true;

    // 过滤状态
    let magFilter = "all";        
    let countryFilter = "all";  
    let timeFilter = "30d";
    let depthFilter = "all"; 

    let isSidebarOpen = true;
    let windowWidth = 0;

    // 响应式声明：屏幕宽度小于 768px 时，默认收起
    $: {
        if (windowWidth < 768) {
            isSidebarOpen = false;
        } else {
            isSidebarOpen = true;
        }
    }
    
    function toggleSidebar() {
        isSidebarOpen = !isSidebarOpen;
    }
    
    let showVideoModal = false;
    function toggleVideoModal() {
        showVideoModal = !showVideoModal;
    }

    // 新增状态和函数来控制 IntroModal
    let showIntroModal = false;
    function toggleIntroModal() {
        showIntroModal = !showIntroModal;
    }

    $: mags = data.earthquakes.map(q => q.magnitude);
    $: minMag = Math.min(...mags);
    $: maxMag = Math.max(...mags);

    // 定义时间常数 (毫秒)
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const MS_PER_7DAYS = 7 * MS_PER_DAY;
    const MS_PER_30DAYS = 30 * MS_PER_DAY;

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

        if (timeFilter !== "all") {
            const now = Date.now();
            const earthquakeTime = new Date(q.time).getTime(); // 假设 q.time 是可解析的日期字符串或时间戳
            const timeDifference = now - earthquakeTime; // 时间差 (毫秒)

            if (timeFilter === "1d" && timeDifference > MS_PER_DAY) return false;
            if (timeFilter === "7d" && timeDifference > MS_PER_7DAYS) return false;
            if (timeFilter === "30d" && timeDifference > MS_PER_30DAYS) return false;
        }

        return true;
    });

</script>


<svelte:window bind:innerWidth={windowWidth} />
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
<div class="page" class:dark={$theme==='dark'} class:light={$theme==='light'}>
    
    <div class="floating-header">
        {#if windowWidth < 768}
        <button class="menu-button" on:click={toggleSidebar} aria-expanded={isSidebarOpen}>
            <span class="material-symbols-outlined">
                {isSidebarOpen ? 'close' : 'menu'}
            </span>
        </button>
        {/if}

        <h2 on:click={toggleIntroModal} class="clickable-title">地球脉动</h2>      
    </div>


    <div class="sidebar" class:dark={$theme==='dark'} class:light={$theme==='light'} class:hidden={!isSidebarOpen || windowWidth < 768 && !isSidebarOpen}>
        <div class="sidebar-top">
            
            <div class="filters"> 
                <Legend minMag={minMag} maxMag={maxMag} />
            </div>
            
            <div class="filters"> 
                
                <label>
                    <select bind:value={timeFilter}>
                        <option value="30d">过去 30 天</option>
                        <option value="7d">过去 7 天</option>
                        <option value="1d">过去 1 天</option>
                        
                    </select>
                </label>


                <label>
                    <select bind:value={magFilter}>
                        <option value="all">所有震级</option>
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
                        <option value="all">所有震源深度</option>
                        <option value="shallow">浅源 (&lt;70 km)</option>
                        <option value="intermediate">中源 (70–300 km)</option>
                        <option value="deep">深源 (&gt;300 km)</option>
                    </select>
                </label>
            
                <label>
                    <select bind:value={countryFilter}>
                        <option value="all">所有国家</option>
                        {#each countries as c}
                            <option value={c}>{c}</option>
                        {/each}
                    </select>
                </label>
            </div>

            <div class="filters">
        
                <label class="chk">
                    <input type="checkbox" bind:checked={showSubduction}>
                    <span>俯冲带</span>
                </label>

                <label class="chk">
                    <input type="checkbox" bind:checked={showFaults}>
                    <span>断层</span>
                </label>

                <label class="chk">
                    <input type="checkbox" bind:checked={showDepthBars}>
                    <span>深度条</span>
                </label>
                
            </div>

            
        </div>
        <div class="sidebar-bottom">

            <button on:click={toggleVideoModal}>
                <span class="material-symbols-outlined">earthquake</span>
            </button>
            
            <button on:click={() => globeRef?.focusOn(35.8617, 104.1954)}>
            <!-- <button on:click={() => globeRef?.flyAlongRingOfFire()}> -->
                <span class="material-symbols-outlined">location_on</span>
            </button>

            <ThemeSwitcher />
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

        <div class="caption-text">
            <span>{filtered.length} earthquakes </span>
            
        </div>
    </div>

    {#if showVideoModal}
        <VideoPlayer 
            videoSrc={videoURL}
            onClose={toggleVideoModal} 
        />
    {/if}

    {#if showIntroModal}
        <IntroModal 
            onClose={toggleIntroModal} 
        />
    {/if}

</div>



<style>
    /* 主题样式 */
    .dark {
        --sidebar-bg-float: rgba(0, 0, 0, 0.85); 
        --sidebar-color: #e0e0e0;
        --btn-bg: black;
        --btn-color: #e0e0e0;
        --btn-border: 1px solid #444;
        --btn-hover: #333;
        
    }

    .light {
        --sidebar-bg-float: rgba(255, 255, 255, 0.85);
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
        width: 100vw;
        position: relative;
        overflow: hidden;
    }
    .floating-header {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 20; 
        display: flex;
        align-items: center;
        padding: 48px 8px;
        gap: 8px;
        color: var(--sidebar-color);
        pointer-events: none; 
    }

    /* 恢复标题和按钮的点击事件 */
    .floating-header h2, 
    .floating-header button {
        pointer-events: auto;
    }

    .floating-header h2 {
        margin: 0;
        font-size: 24px;
        font-weight: normal;
        cursor: pointer;
        user-select: none;
        transition: opacity 0.3s;
    }
    .floating-header h2:hover {
        opacity: 0.7;
    }

    /* 菜单按钮样式调整 (不再是 fixed，而是 flex item) */
    .menu-button {
        /* 移除 position: fixed, top, left */
        background: var(--sidebar-bg-float);
        color: var(--sidebar-color);
        border: 1px solid var(--btn-border, #444);
        padding: 8px; /* 稍微缩小一点 */
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .menu-button:hover {
        opacity: 0.8;
    }
    /* 左侧控制面板 */
    .sidebar {
        /* 浮动在 viz 上方 */
        position: fixed; 
        top: 0;
        left: 0;
        width: 220px; /* 稍微加宽一点，让内容更舒适 */
        height: 100vh;
        z-index: 10; /* 浮在地球仪上方 */
        
        /* 使用浮动背景变量 */
        background-color: var(--sidebar-bg-float); 
        color: var(--sidebar-color);
        padding: 16px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 16px;
        /* 添加过渡效果，让收起/展开更平滑 */
        transition: transform 0.3s ease-out, background-color 0.3s, color 0.3s;
        
        /* 确保内容可以滚动，以防过多筛选器溢出 */
        overflow-y: auto;
        padding: 70px 16px 16px 16px;
    }

    .sidebar.hidden {
        transform: translateX(-100%);
    }


    .sidebar-top {
    flex: 1; /* 占据上方空间 */
    }

    .sidebar-bottom {
        display: flex;
        flex-direction: column;
        gap: 8px; /* 按钮间距 */
    }

    .filters {
        margin-top: 48px;
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
        opacity: 0.7;
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
        opacity: 0.7;            
    }

    .chk {
        flex-direction: row !important;
        align-items: center !important;
        gap: 12px;
        cursor: pointer;
        user-select: none;
    }

    .chk:hover {
        opacity: 0.7;
    }

    .chk input[type="checkbox"] {
        margin: 12px 0;
    }

    
    /* 右侧 Globe */
    .viz {
        flex: 1;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
    }
  
    .viewer {
        flex: 1;
        position: relative;
    }
    .caption-text {
        position: absolute;
        bottom: 12px;
        right: 32px;
        font-size: 14px;
        color: var(--sidebar-color);
    }

    @media (min-width: 768px) {
        /* 在大屏上，sidebar 始终可见，但我们不需要设置 width: 200px; 了，因为它已经是 fixed 定位的 250px */
        .sidebar {
            transform: translateX(0) !important; /* 确保大屏时不被隐藏 */
        }
    }
</style>

