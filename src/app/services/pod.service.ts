import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Pod, CreatePodRequest, UpdatePodRequest } from '../models/pod';

@Injectable({
  providedIn: 'root'
})
export class PodService {
  private apiUrl = 'http://localhost:5260/api/pods'; // Port'u kontrol et!

  constructor(private http: HttpClient) {}

  getPods(): Observable<Pod[]> {
    return this.http.get<Pod[]>(this.apiUrl);
  }

  getPod(name: string): Observable<Pod> {
    return this.http.get<Pod>(`${this.apiUrl}/${name}`);
  }

  createPod(request: CreatePodRequest): Observable<Pod> {
    return this.http.post<Pod>(this.apiUrl, request);
  }

  updatePod(name: string, request: UpdatePodRequest): Observable<Pod> {
    return this.http.put<Pod>(`${this.apiUrl}/${name}`, request);
  }

  deletePod(name: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${name}`);
  }

  getPodLogs(name: string): Observable<string[]> {
    return this.http.get(`${this.apiUrl}/${name}/logs`, { responseType: 'text' }).pipe(
      map(text => text.split('\n').filter(line => line.trim() !== ''))
    );
  }
}
