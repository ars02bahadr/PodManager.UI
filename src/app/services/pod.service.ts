import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Pod, CreatePodRequest, UpdatePodRequest } from '../models/pod';
import { FileInfo, UploadResponse } from '../models/file';

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

  uploadFile(podName: string, file: File, path: string): Observable<HttpEvent<UploadResponse>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<UploadResponse>(
      `${this.apiUrl}/${podName}/files/upload?path=${encodeURIComponent(path)}`,
      formData,
      { reportProgress: true, observe: 'events' }
    );
  }

  downloadFile(podName: string, path: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/${podName}/files/download?path=${encodeURIComponent(path)}`,
      { responseType: 'blob' }
    );
  }

  listFiles(podName: string, path: string): Observable<FileInfo[]> {
    return this.http.get<FileInfo[]>(
      `${this.apiUrl}/${podName}/files/list?path=${encodeURIComponent(path)}`
    );
  }
}
