import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '@services/toast.service';

@Component({
  selector: 'rc-toast-outlet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toast-outlet.component.html',
  styleUrl: './toast-outlet.component.scss',
})
export class ToastOutletComponent {
  protected readonly toasts = inject(ToastService);
}
