<template>
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
</template>

<script setup lang="ts">
  import SideBarNav from '@/components/SideBarNav.vue';
  import SideBarGameList from '@/components/SideBarGameList.vue';
  import MainAeraGameInfo from '@/components/MainAeraGameInfo.vue';
</script>

<style scoped>
.el-container {
  width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.el-aside {
  background: #F2F6FC;
  padding: 12px;
  border-right: 1px solid #d6d9dc;
  width: 50px;
}

.el-main {
  padding: 0;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background-color: #ffffff;
}
</style>
