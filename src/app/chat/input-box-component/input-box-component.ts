import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ManagerAiService } from '../../services/ai-chat-service';

declare var webkitSpeechRecognition: any;

@Component({
  standalone: true,
  selector: 'app-input-box',
  imports: [CommonModule, FormsModule],
  templateUrl: './input-box-component.html',
  styleUrls: ['./input-box-component.scss']
})
export class InputBoxComponent implements OnDestroy {

  message = '';
  loading = false;
  listening = false;
  private recognition: any;

  constructor(private ai: ManagerAiService) {
    this.initSpeechRecognition();
  }

  private initSpeechRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      this.message = transcript.trim();
    };

    this.recognition.onerror = () => this.listening = false;
    this.recognition.onend = () => this.listening = false;
  }

  toggleListening() {
    if (!this.recognition || this.loading) return;

    this.listening ? this.recognition.stop() : this.recognition.start();
    this.listening = !this.listening;
  }

  send() {
    if (!this.message.trim() || this.loading) return;

    const userMessage = this.message.trim();
    this.message = '';

    if (this.listening) {
      this.recognition.stop();
      this.listening = false;
    }

    this.ai.send(userMessage);
  }

  ngOnDestroy() {
    this.recognition?.stop();
  }
}
