import { defineStore } from 'pinia'
import { ref } from 'vue'

export type PageType = 'list' | 'statistics' | 'settings'

export const usePageStore = defineStore('page', () => {
    const currentPage = ref<PageType>('list')

    const setCurrentPage = (page: PageType) => {
        currentPage.value = page
    }

    return {
        currentPage,
        setCurrentPage
    }
})