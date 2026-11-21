import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
    },
    {
        path: 'dashboard',
        loadComponent: () =>
            import('./pages/dashboard/dashboard')
                .then((m) => m.Dashboard)

    },
    {
        path: 'settings',
        loadComponent: () =>
            import('./pages/settings/settings')
                .then((m) => m.Settings)
    }
];
