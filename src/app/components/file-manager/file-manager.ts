import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpEventType } from '@angular/common/http';
import { PodService } from '../../services/pod.service';
import { FileInfo, UploadResponse } from '../../models/file';
import { FileSizePipe } from './file-size.pipe';

@Component({
  selector: 'app-file-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, FileSizePipe],
  templateUrl: './file-manager.html',
  styleUrls: ['./file-manager.css']
})
export class FileManagerComponent implements OnInit {
  @Input({ required: true }) podName!: string;

  selectedFile: File | null = null;
  uploadPath = '/';
  uploading = false;
  uploadProgress = 0;

  downloadPath = '';
  downloading = false;

  files: FileInfo[] = [];
  currentPath = '/';
  loadingFiles = false;

  statusMessage: string | null = null;
  statusKind: 'success' | 'error' | 'info' | null = null;

  constructor(private podService: PodService) {}

  ngOnInit(): void {
    this.loadFiles();
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files && input.files.length > 0 ? input.files[0] : null;
  }

  upload(): void {
    if (!this.selectedFile || this.uploading) return;

    this.uploading = true;
    this.uploadProgress = 0;
    this.setStatus('Dosya yükleniyor...', 'info');

    this.podService.uploadFile(this.podName, this.selectedFile, this.uploadPath).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          const total = event.total || this.selectedFile?.size || 0;
          this.uploadProgress = total ? Math.round((event.loaded / total) * 100) : 0;
        }
        if (event.type === HttpEventType.Response) {
          const body = event.body as UploadResponse | null;
          if (body?.success) {
            this.setStatus(`Yükleme tamamlandı: ${body.filePath ?? ''}`, 'success');
            this.selectedFile = null;
            this.loadFiles();
          } else {
            this.setStatus(body?.error || 'Yükleme başarısız.', 'error');
          }
          this.uploading = false;
        }
      },
      error: (err) => {
        this.uploading = false;
        this.setStatus(err?.error?.error || 'Yükleme başarısız.', 'error');
      }
    });
  }

  download(): void {
    if (!this.downloadPath || this.downloading) return;
    this.downloading = true;
    this.setStatus('Dosya indiriliyor...', 'info');

    this.podService.downloadFile(this.podName, this.downloadPath).subscribe({
      next: (blob) => {
        const fileName = this.extractFileName(this.downloadPath);
        this.triggerDownload(blob, fileName);
        this.downloading = false;
        this.setStatus('Dosya indirildi.', 'success');
      },
      error: (err) => {
        this.downloading = false;
        this.setStatus(err?.error || 'Dosya indirilemedi.', 'error');
      }
    });
  }

  loadFiles(): void {
    if (this.loadingFiles) return;
    this.loadingFiles = true;
    this.setStatus(null, null);

    this.podService.listFiles(this.podName, this.currentPath).subscribe({
      next: (files) => {
        this.files = files;
        this.loadingFiles = false;
      },
      error: (err) => {
        this.loadingFiles = false;
        this.setStatus(err?.error || 'Dosya listesi alınamadı.', 'error');
      }
    });
  }

  openFolder(file: FileInfo): void {
    if (!file.isDirectory) return;
    const nextPath = this.currentPath.endsWith('/') ? this.currentPath : `${this.currentPath}/`;
    this.currentPath = `${nextPath}${file.name}/`;
    this.loadFiles();
  }

  goUp(): void {
    if (this.currentPath === '/') return;
    const trimmed = this.currentPath.endsWith('/') ? this.currentPath.slice(0, -1) : this.currentPath;
    const lastSlash = trimmed.lastIndexOf('/');
    this.currentPath = lastSlash <= 0 ? '/' : trimmed.slice(0, lastSlash + 1);
    this.loadFiles();
  }

  downloadFile(file: FileInfo): void {
    if (file.isDirectory) return;
    const basePath = this.currentPath.endsWith('/') ? this.currentPath : `${this.currentPath}/`;
    const fullPath = `${basePath}${file.name}`;
    this.downloadPath = fullPath;
    this.download();
  }

  private triggerDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private extractFileName(path: string): string {
    const trimmed = path.endsWith('/') ? path.slice(0, -1) : path;
    const index = trimmed.lastIndexOf('/');
    return index >= 0 ? trimmed.slice(index + 1) : trimmed;
  }

  private setStatus(message: string | null, kind: 'success' | 'error' | 'info' | null): void {
    this.statusMessage = message;
    this.statusKind = kind;
  }
}
