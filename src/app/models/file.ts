export interface FileInfo {
  name: string;
  size: number;
  isDirectory: boolean;
  modifiedAt: string | null;
}

export interface UploadResponse {
  success: boolean;
  filePath?: string;
  error?: string;
}
