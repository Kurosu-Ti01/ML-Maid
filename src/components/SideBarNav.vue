<template>
  <div class="sidebar-nav">
    <div class="top-buttons">
      <button class="icon-btn">
        <img src="/icons/list.svg" alt="icon" />
      </button>
      <button class="icon-btn">
        <img src="/icons/pie-chart.svg" alt="icon" />
      </button>
    </div>
    <div class="bottom-button">
      <button class="icon-btn">
        <img src="/icons/settings.svg" alt="icon" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">

</script>

<style scoped>
  .sidebar-nav {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    box-sizing: border-box;
  }
  .top-buttons {
    display: flex;
    flex-direction: column;
    gap: 20px;
    align-items: center;
  }
  .bottom-button {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .icon-btn {
    width: 40px;
    height: 40px;
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    transition: background 0.2s;
  }
  .icon-btn:hover {
    background: #72aaff;
  }
  .icon-btn img {
    width: 28px;
    height: 28px;
    object-fit: contain;
  }
</style>