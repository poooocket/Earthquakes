<script>
    import BaseModal from './BaseModal.svelte'; 

    // 接收关闭函数
    let { onClose } = $props();
</script>

<BaseModal {onClose} title="地球脉动" maxWidth="550px">
    <div class="intro-content">
        <p>地球脉动是一个三维地震可视化系统，通过球体场景动态呈现地震事件、板块边界与俯冲带结构。将震级、深度与时间序列转化为易读的视觉语言，让地震的节奏、聚集性，以及它们与地球构造之间的关系被“看到”。本项目由蔡克梅设计与开发。</p>
        <p>数据来源：</p>
        <ul>
            <li>
                地震事件：
                <a href="https://earthquake.usgs.gov/earthquakes/search/" target="_blank" rel="noopener noreferrer">
                    USGS Earthquake Catalog
                </a>
            </li>
            <li>
                活动断层：
                <a href="https://github.com/GEMScienceTools/gem-global-active-faults" target="_blank" rel="noopener noreferrer">
                    GEM Global Active Faults
                </a>
            </li>
            <li>
                俯冲带与板块边界：
                <a href="https://github.com/fraxen/tectonicplates/blob/master/GeoJSON/PB2002_boundaries.json" target="_blank" rel="noopener noreferrer">
                    PB2002_boundaries
                </a>
            </li>
        </ul>
    </div>
</BaseModal>

<style>
    .intro-content {
        max-height: 70vh;
        overflow-y: auto;
        max-width: 400px;
    }
    .intro-content ul {
        list-style-type: disc;
        margin-left: 20px;
        padding-left: 0;
        font-size: 14px;
    }

    .intro-content p {
        line-height: 1.4;
        font-size: 14px;
    }

    .intro-content a {
        color: white; /* 设置文字颜色为白色 */
        text-decoration: underline; /* 设置默认显示下划线 */
        transition: color 0.2s, opacity 0.2s; /* 添加过渡效果 */
    }
</style>