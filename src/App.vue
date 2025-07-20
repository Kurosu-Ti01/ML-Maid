<template>
  <el-container>
    <!-- <el-header>ML-Maid</el-header> -->
    <el-container>
      <el-aside>
        <SideBarNav/>
      </el-aside>
      <el-main>
        <el-splitter>
          <el-splitter-panel size="25%" min="10%" max="40%">
            <SideBarGameList/>
          </el-splitter-panel>
          <el-splitter-panel>
            <MainAeraGameInfo/>
          </el-splitter-panel>
        </el-splitter>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
  import SideBarGameList from './components/SideBarGameList.vue';
  import SideBarNav from './components/SideBarNav.vue';
  import MainAeraGameInfo from './components/MainAeraGameInfo.vue';

</script>

<style scoped>
  :global(html), :global(body) {
    width: 100vw;
    height: 100vh;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
  :global(#app) {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }
  .el-container {
    width: 100vw;
    height: 100vh;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }
  .el-header {
    background: #F2F6FC;
    color: #4080ff;
    font-size: 1.5rem;
    font-weight: bold;
    letter-spacing: 2px;
    display: flex;
    align-items: center;
    height: 50px;
    border-radius: 4px 4px 4px 0;
    border-bottom: 1px solid #dcdfe6;
  }
  .el-aside {
    background: #F2F6FC;
    color: #333;
    font-size: 1.1rem;
    /* padding-bottom: 50px + 24px */
    /* 50px is el-header which become Custom Title Bar */
    padding: 24px 12px 74px 12px;
    width: 60px !important;
    display: flex;
    box-sizing: border-box;
    border-radius: 0 0 0 4px;
    border-right: 1px solid #dcdfe6;
  }
  .el-main {
    background: #FAFAFA;
    color: #333;
    font-size: 1.1rem;
    border-radius: 0 0 4px 0;
    padding: 0;
  }
</style>