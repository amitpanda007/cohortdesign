import { Component, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DependencyNode, PortPosition, IconOption } from '../../models/cohort-designer.model';
import { CohortDesignerService } from '../../services/cohort-designer.service';
import { CLINICAL_ICONS } from '../../constants/clinical-icons';

@Component({
  selector: 'lib-dependency-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dependency-node.component.html',
  styleUrls: ['./dependency-node.component.scss']
})
export class DependencyNodeComponent {
  private service = inject(CohortDesignerService);
  private sanitizer = inject(DomSanitizer);

  @Input({ required: true }) node!: DependencyNode;
  @Input() isSelected = false;
  @Input() readonly = false;
  @Input() customIcons: IconOption[] = [];

  @Output() selectNode = new EventEmitter<string>();
  @Output() portClick = new EventEmitter<{ nodeId: string; port: PortPosition; event: MouseEvent }>();
  @Output() portMouseUp = new EventEmitter<{ nodeId: string; port: PortPosition; event: MouseEvent }>();
  @Output() deleteNode = new EventEmitter<string>();

  readonly activeConnecting = this.service.activeConnecting;
  readonly isConnectingActive = computed(() => !!this.activeConnecting());
  readonly isSourceOfConnection = computed(() => this.activeConnecting()?.fromNodeId === this.node.id);
  isHovered = false;

  // Validate whether this dependency is an allowed connection target (no dep-to-dep, no circular dependency)
  readonly isValidConnectionTarget = computed(() => {
    return this.service.isValidTarget(this.node.id);
  });

  readonly ports: PortPosition[] = ['left', 'right'];

  readonly iconSvg = computed<SafeHtml>(() => {
    if (this.node.customSvg) {
      return this.sanitizer.bypassSecurityTrustHtml(this.node.customSvg);
    }

    const svg = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14" stroke-linecap="round"/></svg>`;
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  });

  onNodeClick(event: MouseEvent) {
    event.stopPropagation();
    this.selectNode.emit(this.node.id);
  }

  onPortMouseDown(port: PortPosition, event: MouseEvent) {
    event.stopPropagation();
    this.portClick.emit({ nodeId: this.node.id, port, event });
  }

  onPortMouseUp(port: PortPosition, event: MouseEvent) {
    event.stopPropagation();
    this.portMouseUp.emit({ nodeId: this.node.id, port, event });
  }

  onPortMouseEnter(port: PortPosition) {
    this.service.hoveredPort.set({ nodeId: this.node.id, port });
  }

  onPortMouseLeave() {
    this.service.hoveredPort.set(null);
  }
}
