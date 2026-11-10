import { Component, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CohortNode, PortPosition } from '../../models/cohort-designer.model';
import { CohortDesignerService } from '../../services/cohort-designer.service';

@Component({
  selector: 'lib-cohort-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cohort-node.component.html',
  styleUrls: ['./cohort-node.component.scss']
})
export class CohortNodeComponent {
  private service = inject(CohortDesignerService);

  @Input({ required: true }) node!: CohortNode;
  @Input() isSelected = false;
  @Input() readonly = false;

  @Output() selectNode = new EventEmitter<string>();
  @Output() portClick = new EventEmitter<{ nodeId: string; port: PortPosition; event: MouseEvent }>();
  @Output() portMouseUp = new EventEmitter<{ nodeId: string; port: PortPosition; event: MouseEvent }>();
  @Output() deleteNode = new EventEmitter<string>();
  @Output() resizeStart = new EventEmitter<{ nodeId: string; side: 'right' | 'left' | 'bottom' | 'corner'; event: MouseEvent }>();

  isHovered = false;

  get cardWidth(): number {
    return this.node.width || (this.node.isExpanded ? 280 : 180);
  }

  get cardHeight(): number {
    return this.node.height || (this.node.isExpanded ? 54 : 50);
  }

  get hasRandomizationTarget(): boolean {
    const target = this.node.randomizationTarget ?? (this.node.subjects && this.node.subjects > 0 ? this.node.subjects : undefined);
    return target !== undefined && target !== null && target > 0;
  }

  get randomizationTargetValue(): number | undefined {
    return this.node.randomizationTarget ?? (this.node.subjects && this.node.subjects > 0 ? this.node.subjects : undefined);
  }

  readonly activeConnecting = this.service.activeConnecting;
  readonly isConnectingActive = computed(() => !!this.activeConnecting());
  readonly isSourceOfConnection = computed(() => this.activeConnecting()?.fromNodeId === this.node.id);

  // Validate whether this node is an allowed connection target (no cohort-to-cohort, no circular dependency)
  readonly isValidConnectionTarget = computed(() => {
    return this.service.isValidTarget(this.node.id);
  });

  readonly ports: PortPosition[] = ['left', 'right'];

  onCardClick(event: MouseEvent) {
    event.stopPropagation();
    this.selectNode.emit(this.node.id);
  }

  onResizeMouseDown(side: 'right' | 'left' | 'bottom' | 'corner', event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    this.resizeStart.emit({ nodeId: this.node.id, side, event });
  }

  toggleExpand(event: MouseEvent) {
    event.stopPropagation();
    this.service.toggleCohortExpand(this.node.id);
  }

  onMouseEnter() {
    this.isHovered = true;
  }

  onMouseLeave() {
    this.isHovered = false;
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
