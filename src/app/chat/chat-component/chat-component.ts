import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar-component/sidebar-component';
import { ChatWindowComponent } from '../chat-window-component/chat-window-component';
import { InputBoxComponent } from '../input-box-component/input-box-component';

@Component({
  standalone: true,
  selector: 'app-chat',
  imports: [
    CommonModule,
    SidebarComponent,
    ChatWindowComponent,
    InputBoxComponent
  ],
  templateUrl: './chat-component.html',
  styleUrls: ['./chat-component.scss']
})
export class ChatComponent {
  isSidebarOpen = signal(false);

  openSidebar() {
    this.isSidebarOpen.set(true);
  }

  closeSidebar() {
    this.isSidebarOpen.set(false);
  }
}
