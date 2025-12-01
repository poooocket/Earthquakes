<script>
    import BaseModal from './BaseModal.svelte';

    // 接收视频路径和关闭函数
    let { videoSrc, onClose } = $props();

</script>

<BaseModal {onClose} title="每日地震节奏">
    <video controls autoplay loop class="rhythm-video">
        <source src={videoSrc} type="video/mp4">
        您的浏览器不支持视频播放。
    </video>
</BaseModal>

<style>
    /* 仅保留视频播放器特有的样式 */
    .rhythm-video {
        width: auto;
        max-width: 100%;
        height: auto;
        max-height: 70vh;
        display: block;
        border-radius: 4px;
        background: black;
    }
    
    /* 确保 BaseModal 的样式覆盖 VideoPlayer 原有的 header 相关样式 */
    /* 移除之前的 .modal-backdrop, .modal-content, .close-button 等通用样式 */
</style>