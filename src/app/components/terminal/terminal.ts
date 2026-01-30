import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import * as signalR from '@microsoft/signalr';

@Component({
  selector: 'app-terminal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './terminal.html',
  styleUrls: ['./terminal.css']
})
export class TerminalComponent implements OnInit, OnDestroy {
  @Input() podName: string = '';
  @ViewChild('terminalContainer', { static: true }) terminalContainer!: ElementRef;

  private terminal!: Terminal;
  private fitAddon!: FitAddon;
  private connection!: signalR.HubConnection;
  private commandBuffer: string = '';

  ngOnInit(): void {
    this.initTerminal();
    this.connectToHub();
  }

  ngOnDestroy(): void {
    this.terminal?.dispose();
    this.connection?.stop();
  }

  private initTerminal(): void {
    this.terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#ffffff',
        cursor: '#ffffff'
      }
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.open(this.terminalContainer.nativeElement);
    this.fitAddon.fit();

    this.terminal.writeln('🚀 Pod Terminal');
    this.terminal.writeln('Connecting to ' + this.podName + '...');
    this.terminal.writeln('');

    this.terminal.onData((data) => {
      this.handleInput(data);
    });

    window.addEventListener('resize', () => {
      this.fitAddon.fit();
    });
  }

  private connectToHub(): void {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5260/terminal')
      .withAutomaticReconnect()
      .build();

    this.connection.on('Output', (output: string) => {
      const lines = output.split('\n');
      lines.forEach((line, index) => {
        this.terminal.write(line);
        if (index < lines.length - 1) {
          this.terminal.write('\r\n');
        }
      });
      // En alta scroll
      this.terminal.scrollToBottom();
    });

    this.connection.on('Connected', (message: string) => {
      this.terminal.writeln(message);
      this.terminal.write('$ ');
    });

    this.connection.on('Error', (error: string) => {
      this.terminal.writeln('\r\n❌ Error: ' + error);
    });

    this.connection.start()
      .then(() => {
        this.terminal.writeln('✅ Connected to server');
        this.terminal.write('$ ');
      })
      .catch(err => {
        this.terminal.writeln('❌ Connection failed: ' + err);
      });
  }

  private handleInput(data: string): void {
    if (data === '\r') {
      this.terminal.writeln('');
      if (this.commandBuffer.trim()) {
        this.sendCommand(this.commandBuffer);
      } else {
        this.terminal.write('$ ');
      }
      this.commandBuffer = '';
    } else if (data === '\u007F') {
      if (this.commandBuffer.length > 0) {
        this.commandBuffer = this.commandBuffer.slice(0, -1);
        this.terminal.write('\b \b');
      }
    } else {
      this.commandBuffer += data;
      this.terminal.write(data);
    }
  }

  private sendCommand(command: string): void {
    console.log('=== sendCommand çağrıldı ===');
    console.log('Command:', command);
    console.log('PodName:', this.podName);
    console.log('Connection state:', this.connection.state);

    if (this.connection.state === signalR.HubConnectionState.Connected) {
      console.log('Invoke başlıyor...');
      this.connection.invoke('sendCommand', this.podName, command)
        .then(() => {
          console.log('Invoke başarılı');
          setTimeout(() => this.terminal.write('$ '), 100);
        })
        .catch(err => {
          console.error('Invoke hatası:', err);
          this.terminal.writeln('❌ Error: ' + err);
          this.terminal.write('$ ');
        });
    } else {
      console.log('Bağlı değil!');
    }
  }
}
