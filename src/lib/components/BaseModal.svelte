<script>
    import { quintOut } from 'svelte/easing';
    import { fly, fade } from 'svelte/transition';

    // 使用 $props() 接收属性 (与你的 VideoPlayer 组件保持一致)
    let { onClose, title = "弹窗标题" } = $props();

    // 确保在 ESC 键按下时也能关闭
    function handleKeydown(event) {
        if (event.key === 'Escape') {
            onClose();
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<div 
    class="modal-backdrop" 
    on:click={onClose}
    transition:fade
>
    <div 
        class="modal-content" 
        on:click|stopPropagation
        transition:fly="{{ y: -50, duration: 300, easing: quintOut }}"
    >
        <div class="modal-header">
            <button class="close-button" on:click={onClose} aria-label="关闭">
                <span class="material-symbols-outlined">close</span>
            </button>
            <h2>{title}</h2>
        </div>
  
        <slot />
        
    </div>
</div>

<style>
    /* 1. 遮罩层样式 (保持与 VideoPlayer 一致) */
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    /* 2. 内容容器样式 */
    .modal-content {
        background: var(--modal-content-bg, #111);
        color: var(--modal-content-color, white);
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.7);
        max-width: 90vw;
        max-height: fit-content;;
        position: relative;
        
    }

    /* 3. 头部和关闭按钮样式 */
    .modal-header {
        /* 确保标题和关闭按钮在同一行 */
        display: flex; 
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px; /* 添加间距，将标题和内容分离 */
    }
    
    .close-button {
        position: absolute;
        right: 16px;
        background: none;
        border: none;
        color: white; /* 默认颜色 */
        font-size: 24px;
        cursor: pointer;
        line-height: 1;
        padding: 0; /* 移除内边距，让悬停效果更自然 */
    }

    .close-button .material-symbols-outlined {
        font-size: 24px; /* 调大图标尺寸以适应绝对定位 */
        transition: transform 0.2s, color 0.2s;
        display: block;
    }
    
    .close-button:hover {
        opacity: 0.7;
    }

    /* 标题样式 */
    h2 {
        margin: 0;
    }
    
    .material-symbols-outlined {
        font-size: 20px;
    }

</style>