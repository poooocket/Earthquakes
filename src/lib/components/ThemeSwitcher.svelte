<script>
    import { theme } from "$lib/stores/theme.js";

    function toggle() {
        theme.update(t => t === "dark" ? "light" : "dark");
    }
</script>

<link
  href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined"
  rel="stylesheet"
/>

<button on:click={toggle}>
    {#if $theme === 'dark'}
        <span class="material-symbols-outlined">light_mode</span>
    {:else}
        <span class="material-symbols-outlined">dark_mode</span>
    {/if}
</button>

<style>
    button {
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        border: none;
        text-align:left;
        transition: all 0.1s;
        background-color: var(--btn-bg);
        color: var(--btn-color);
    }
    button:hover {
        opacity: 0.7;
    }
    .material-symbols-outlined {
    font-size: 20px;
    line-height: 1;
}
</style>