import { Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject, BehaviorSubject } from 'rxjs';
import { PodStatusUpdate, PodLogEntry } from '../models/pod';

@Injectable({
  providedIn: 'root'
})
export class PodHubService implements OnDestroy {
  private hubConnection: signalR.HubConnection | null = null;
  private readonly hubUrl = 'http://localhost:5260/hubs/pod';

  // Status updates
  private statusUpdateSubject = new Subject<PodStatusUpdate>();
  public statusUpdate$ = this.statusUpdateSubject.asObservable();

  // Log stream
  private logSubject = new Subject<PodLogEntry>();
  public log$ = this.logSubject.asObservable();

  // Connection state
  private connectionStateSubject = new BehaviorSubject<boolean>(false);
  public connectionState$ = this.connectionStateSubject.asObservable();

  constructor() {
    this.initializeConnection();
  }

  private initializeConnection(): void {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.registerHandlers();
    this.startConnection();
  }

  private registerHandlers(): void {
    if (!this.hubConnection) return;

    // Pod status updates
    this.hubConnection.on('PodStatusChanged', (update: PodStatusUpdate) => {
      console.log('Pod status changed:', update);
      this.statusUpdateSubject.next(update);
    });

    // Pod logs
    this.hubConnection.on('PodLog', (podName: string, log: PodLogEntry) => {
      this.logSubject.next({ ...log, message: `[${podName}] ${log.message}` });
    });

    // Connection events
    this.hubConnection.onreconnecting(() => {
      console.log('SignalR reconnecting...');
      this.connectionStateSubject.next(false);
    });

    this.hubConnection.onreconnected(() => {
      console.log('SignalR reconnected');
      this.connectionStateSubject.next(true);
    });

    this.hubConnection.onclose(() => {
      console.log('SignalR connection closed');
      this.connectionStateSubject.next(false);
    });
  }

  private async startConnection(): Promise<void> {
    if (!this.hubConnection) return;

    try {
      await this.hubConnection.start();
      console.log('SignalR connected to PodHub');
      this.connectionStateSubject.next(true);
    } catch (err) {
      console.error('SignalR connection error:', err);
      this.connectionStateSubject.next(false);
      // Retry after 5 seconds
      setTimeout(() => this.startConnection(), 5000);
    }
  }

  // Subscribe to pod status updates
  async subscribeToPodStatus(podName: string): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      await this.hubConnection.invoke('SubscribeToPod', podName);
    }
  }

  // Unsubscribe from pod status updates
  async unsubscribeFromPodStatus(podName: string): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      await this.hubConnection.invoke('UnsubscribeFromPod', podName);
    }
  }

  // Start streaming logs for a pod
  async startLogStream(podName: string): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      await this.hubConnection.invoke('StartLogStream', podName);
    }
  }

  // Stop streaming logs for a pod
  async stopLogStream(podName: string): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      await this.hubConnection.invoke('StopLogStream', podName);
    }
  }

  ngOnDestroy(): void {
    if (this.hubConnection) {
      this.hubConnection.stop();
    }
  }
}
