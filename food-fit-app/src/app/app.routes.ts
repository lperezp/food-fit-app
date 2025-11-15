import { Routes } from '@angular/router';
import { SearchPageComponent } from './pages/search-page/search-page.component';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { ListFoodPageComponent } from './pages/list-food-page/list-food-page.component';
import { DetailFoodPageComponent } from './pages/detail-food-page/detail-food-page.component';
import { MenuPageComponent } from './pages/menu-page/menu-page.component';
import { FilterFoodPageComponent } from './pages/filter-food-page/filter-food-page.component';

export const routes: Routes = [
    {
        path: '',
        component: HomePageComponent
    },
    {
        path: 'menu',
        component: MenuPageComponent
    },
    {
        path: 'filter-food',
        component: FilterFoodPageComponent
    },
    {
        path: 'search',
        component: SearchPageComponent
    },
    {
        path: 'search/:uuid',
        component: SearchPageComponent
    },
    {
        path: 'list-food',
        component: ListFoodPageComponent
    },
    {
        path: 'detail-food',
        component: DetailFoodPageComponent
    }
];
