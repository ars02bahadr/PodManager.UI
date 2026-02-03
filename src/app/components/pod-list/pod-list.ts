import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PodService } from '../../services/pod.service';
import { PodHubService } from '../../services/pod-hub.service';
import { Pod, CreatePodRequest, UpdatePodRequest, PodTemplate, POD_TEMPLATES, PodLogEntry } from '../../models/pod';
import { TerminalComponent } from '../terminal/terminal';
import { FileManagerComponent } from '../file-manager/file-manager';

@Component({
  selector: 'app-pod-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TerminalComponent, FileManagerComponent],
  templateUrl: './pod-list.html',
  styleUrls: ['./pod-list.css']
})
export class PodListComponent implements OnInit, OnDestroy {
  pods: Pod[] = [];
  loading = false;

  // Templates
  templates: PodTemplate[] = POD_TEMPLATES;
  selectedTemplate: PodTemplate = POD_TEMPLATES[0];

  // Modal state
  showModal = false;
  modalMode: 'create' | 'edit' = 'create';
  editingPodName: string | null = null;

  // Form data
  formData: CreatePodRequest = {
    name: '',
    image: 'ubuntu:22.04',
    jupyterPort: 8888
  };

  // Terminal
  selectedPod: string | null = null;

  // Logs Modal
  showLogsModal = false;
  logsPodName: string | null = null;
  podLogs: string[] = [];
  logsLoading = false;

  // Files Modal
  showFilesModal = false;
  filesPodName: string | null = null;

  // SignalR connection state
  isConnected = false;

  // Subscriptions
  private subscriptions: Subscription[] = [];

  constructor(
    private podService: PodService,
    private podHubService: PodHubService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadPods();
    this.setupSignalR();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private setupSignalR(): void {
    // Connection state
    const connSub = this.podHubService.connectionState$.subscribe(connected => {
      this.isConnected = connected;
      this.cdr.detectChanges();
    });
    this.subscriptions.push(connSub);

    // Status updates
    const statusSub = this.podHubService.statusUpdate$.subscribe(update => {
      const pod = this.pods.find(p => p.name === update.podName);
      if (pod) {
        pod.status = update.status;
        if (update.podIP) pod.podIP = update.podIP;
        if (update.nodePort) pod.nodePort = update.nodePort;
        this.cdr.detectChanges();
      }
    });
    this.subscriptions.push(statusSub);

    // Log stream
    const logSub = this.podHubService.log$.subscribe(log => {
      if (this.showLogsModal) {
        this.podLogs.push(`[${log.timestamp}] ${log.message}`);
        this.cdr.detectChanges();
        // Auto-scroll handled in template
      }
    });
    this.subscriptions.push(logSub);
  }

  loadPods(): void {
    this.loading = true;
    this.cdr.detectChanges();

    this.podService.getPods().subscribe({
      next: (pods) => {
        this.pods = pods;
        this.loading = false;
        // Subscribe to all pods for status updates
        pods.forEach(pod => {
          this.podHubService.subscribeToPodStatus(pod.name);
        });
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Pod listesi alınamadı:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Template selection
  onTemplateChange(templateId: string): void {
    const template = this.templates.find(t => t.id === templateId);
    if (template) {
      this.selectedTemplate = template;
      this.formData.image = template.image;
      this.formData.jupyterPort = template.defaultPort;
    }
  }

  // Modal methods
  openCreateModal(): void {
    this.modalMode = 'create';
    this.editingPodName = null;
    this.selectedTemplate = POD_TEMPLATES[0];
    this.formData = {
      name: '',
      image: this.selectedTemplate.image,
      jupyterPort: this.selectedTemplate.defaultPort
    };
    this.showModal = true;
    this.cdr.detectChanges();
  }


  closeModal(): void {
    this.showModal = false;
    this.editingPodName = null;
    this.formError = null;
    this.isSubmitting = false;
    this.cdr.detectChanges();
  }

  // Form validation
  formError: string | null = null;
  isSubmitting = false;

  submitForm(): void {
    console.log('submitForm called', this.modalMode, this.formData);
    this.formError = null;

    if (this.modalMode === 'create') {
      this.createPod();
    }
  }

  createPod(): void {
    console.log('createPod called', this.formData);

    if (!this.formData.name?.trim()) {
      this.formError = 'Pod adı zorunludur';
      this.cdr.detectChanges();
      return;
    }

    if (!this.formData.image?.trim()) {
      this.formError = 'Image zorunludur';
      this.cdr.detectChanges();
      return;
    }

    this.isSubmitting = true;
    this.cdr.detectChanges();

    this.podService.createPod(this.formData).subscribe({
      next: (pod) => {
        console.log('Pod created:', pod);
        this.pods.push(pod);
        this.podHubService.subscribeToPodStatus(pod.name);
        this.isSubmitting = false;
        this.closeModal();
      },
      error: (err) => {
        console.error('Pod oluşturulamadı:', err);
        this.formError = err.error?.message || 'Pod oluşturulamadı';
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  updatePod(): void {
    if (!this.editingPodName) return;

    const updateRequest: UpdatePodRequest = {
      image: this.formData.image,
      jupyterPort: this.formData.jupyterPort
    };

    this.podService.updatePod(this.editingPodName, updateRequest).subscribe({
      next: (updatedPod) => {
        const index = this.pods.findIndex(p => p.name === this.editingPodName);
        if (index !== -1) {
          this.pods[index] = updatedPod;
        }
        this.closeModal();
      },
      error: (err) => {
        console.error('Pod güncellenemedi:', err);
      }
    });
  }

  deletePod(name: string): void {
    if (!confirm(`${name} pod'unu silmek istediğinize emin misiniz?`)) return;

    this.podService.deletePod(name).subscribe({
      next: () => {
        this.podHubService.unsubscribeFromPodStatus(name);
        this.pods = this.pods.filter(p => p.name !== name);
        if (this.selectedPod === name) {
          this.selectedPod = null;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Pod silinemedi:', err);
      }
    });
  }

  // Terminal
  openTerminal(podName: string): void {
    this.selectedPod = podName;
    this.cdr.detectChanges();
  }

  closeTerminal(): void {
    this.selectedPod = null;
    this.cdr.detectChanges();
  }

  // Jupyter - yeni sekmede aç (iframe X-Frame-Options engeli nedeniyle)
  openJupyter(pod: Pod): void {
    const port = pod.nodePort || pod.ports?.['jupyter'] || 8888;
    const url = `http://localhost:${port}`;
    window.open(url, '_blank');
  }

  // Logs
  openLogs(podName: string): void {
    this.logsPodName = podName;
    this.podLogs = [];
    this.logsLoading = true;
    this.showLogsModal = true;
    this.cdr.detectChanges();

    // Fetch initial logs
    this.podService.getPodLogs(podName).subscribe({
      next: (logs) => {
        this.podLogs = logs;
        this.logsLoading = false;
        this.cdr.detectChanges();
        // Start live stream
        this.podHubService.startLogStream(podName);
      },
      error: (err) => {
        console.error('Loglar alınamadı:', err);
        this.logsLoading = false;
        this.podLogs = ['Log alınamadı: ' + err.message];
        this.cdr.detectChanges();
      }
    });
  }

  closeLogs(): void {
    if (this.logsPodName) {
      this.podHubService.stopLogStream(this.logsPodName);
    }
    this.showLogsModal = false;
    this.logsPodName = null;
    this.podLogs = [];
    this.cdr.detectChanges();
  }

  openFiles(podName: string): void {
    this.filesPodName = podName;
    this.showFilesModal = true;
    this.cdr.detectChanges();
  }

  closeFiles(): void {
    this.showFilesModal = false;
    this.filesPodName = null;
    this.cdr.detectChanges();
  }

  refreshPods(): void {
    this.loadPods();
  }

  // Helper methods
  getStatusClass(status: string): string {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'running') return 'running';
    if (statusLower === 'pending' || statusLower === 'containercreating') return 'pending';
    if (statusLower === 'failed' || statusLower === 'error' || statusLower === 'crashloopbackoff') return 'failed';
    return 'unknown';
  }

  isJupyterPod(pod: Pod): boolean {
    return pod.image?.includes('jupyter') || false;
  }
}
