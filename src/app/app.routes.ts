import { Routes } from '@angular/router';
import {PodListComponent} from './components/pod-list/pod-list';

export const routes: Routes = [
  { path: '', component: PodListComponent },
  { path: '**', redirectTo: '' }
];
