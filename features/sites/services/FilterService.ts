/**
 * Filter Service Implementation
 */

import { Site } from '@/lib/contracts/types/site';
import { FilterOptions, SortOrder } from '@/lib/contracts/types/filter';
import { IFilterService } from '@/lib/contracts/interfaces/filter-service';

class FilterService implements IFilterService {
  filterSites(
    sites: Site[],
    filters: FilterOptions,
    userPreferences: {
      favoriteSites: string[];
      hiddenSites: string[];
    }
  ): Site[] {
    let filtered = [...sites];

    // 筛选：隐藏的站点
    if (!filters.showHidden) {
      filtered = filtered.filter(
        (site) => !userPreferences.hiddenSites.includes(site.id)
      );
    }

    // 筛选：仅收藏
    if (filters.showOnlyFavorites) {
      filtered = filtered.filter((site) =>
        userPreferences.favoriteSites.includes(site.id)
      );
    }

    // 筛选：按标签
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter((site) =>
        filters.tags!.some((tagId) => site.tags.includes(tagId))
      );
    }

    // 筛选：按登记等级
    if (
      filters.registrationLimit !== undefined &&
      filters.registrationLimit !== 'all'
    ) {
      filtered = filtered.filter(
        (site) => site.registrationLimit === filters.registrationLimit
      );
    }

    // 筛选：按特性
    if (filters.feature && filters.feature !== 'all') {
      switch (filters.feature) {
        case 'ldc':
          filtered = filtered.filter((site) => site.supportsLdc);
          break;
        case 'translation':
          filtered = filtered.filter((site) => site.supportsImmersiveTranslation);
          break;
        case 'checkin':
          filtered = filtered.filter((site) => site.supportsCheckin);
          break;
      }
    }

    // 搜索：关键词
    if (filters.searchKeyword) {
      const keyword = filters.searchKeyword.toLowerCase();
      filtered = filtered.filter(
        (site) =>
          site.name.toLowerCase().includes(keyword) ||
          site.apiBaseUrl.toLowerCase().includes(keyword) ||
          (site.description?.toLowerCase().includes(keyword) ?? false)
      );
    }

    return filtered;
  }

  sortSites(
    sites: Site[],
    order: SortOrder,
    favoriteSites: string[]
  ): Site[] {
    const sorted = [...sites];

    switch (order) {
      case 'smart':
        // 智能排序：收藏优先 > 名称排序
        sorted.sort((a, b) => {
          const favoriteDiff =
            Number(favoriteSites.includes(b.id)) -
            Number(favoriteSites.includes(a.id));
          if (favoriteDiff !== 0) return favoriteDiff;
          return a.name.localeCompare(b.name);
        });
        break;

      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;

      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }

    return sorted;
  }
}

export const filterService = new FilterService();
