import { Routes } from '@angular/router';
import { SearchPageComponent } from './pages/search-page/search-page.component';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { ListFoodPageComponent } from './pages/list-food-page/list-food-page.component';
import { DetailFoodPageComponent } from './pages/detail-food-page/detail-food-page.component';

export const routes: Routes = [
    {
        path: '',
        component: HomePageComponent
    },
    {
        path: 'search',
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
