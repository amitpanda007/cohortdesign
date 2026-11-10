import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  ElementRef,
  ViewChild,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CohortDesignFlow,
  FlowNode,
  CohortNode,
  DependencyNode,
  Connection,
  PortPosition,
  IconOption
} from './models/cohort-designer.model';
import { CohortDesignerService } from './services/cohort-designer.service';
import { CohortNodeComponent } from './components/cohort-node/cohort-node.component';
import { DependencyNodeComponent } from './components/dependency-node/dependency-node.component';
import { InspectorPanelComponent } from './components/inspector-panel/inspector-panel.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';

@Component({
  selector: 'ngx-cohort-designer',
  standalone: true,
  imports: [
    CommonModule,
    CohortNodeComponent,
    DependencyNodeComponent,
    InspectorPanelComponent,
    ToolbarComponent
  ],
  templateUrl: './ngx-cohort-designer.component.html',
  styleUrls: ['./ngx-cohort-designer.component.scss']
})
export class CohortDesignerComponent implements OnInit, OnChanges {
  readonly service = inject(CohortDesignerService);

  @Input() flowData?: CohortDesignFlow;
  @Input() readonly = false;
  @Input() customIcons: IconOption[] = [];

  @Output() flowChange = new EventEmitter<CohortDesignFlow>();
  @Output() save = new EventEmitter<CohortDesignFlow>();
  @Output() nodeSelected = new EventEmitter<FlowNode | null>();
  @Output() connectionSelected = new EventEmitter<Connection | null>();

  @ViewChild('canvasContainer', { static: true }) canvasContainer!: ElementRef<HTMLDivElement>;

  readonly nodes = this.service.nodes;
  readonly connections = this.service.connections;
  readonly selectedNode = this.service.selectedNode;
  readonly selectedConnection = this.service.selectedConnection;
  readonly activeConnecting = this.service.activeConnecting;
  readonly transform = this.service.transform;

  // Node Dragging State
  isDraggingNode = false;
  draggedNodeId: string | null = null;
  dragNodeOffset = { x: 0, y: 0 };

  // Node Resizing State (Dragging sides to resize)
  isResizing = false;
  private resizeState: {
    nodeId: string;
    side: 'right' | 'left' | 'bottom' | 'corner';
    startClientX: number;
    startClientY: number;
    initialWidth: number;
    initialHeight: number;
    initialX: number;
    initialY: number;
  } | null = null;

  // Canvas Panning State
  isPanningCanvas = false;
  panStart = { x: 0, y: 0 };
  panInitial = { x: 0, y: 0 };

  ngOnInit() {
    if (this.flowData && this.flowData.nodes) {
      this.service.loadFlow(this.flowData);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['flowData'] && !changes['flowData'].isFirstChange() && this.flowData) {
      this.service.loadFlow(this.flowData);
    }
  }

  // --- Public Pluggable Component API ---

  getData(): CohortDesignFlow {
    return this.service.getData();
  }

  saveData(): CohortDesignFlow {
    const data = this.service.save();
    this.save.emit(data);
    return data;
  }

  loadData(flow: CohortDesignFlow) {
    this.service.loadFlow(flow);
    this.flowChange.emit(this.service.getData());
  }

  clear() {
    this.service.clearAll();
    this.flowChange.emit(this.service.getData());
  }

  addCohort(nameOrX?: string | number, subjectsOrY?: number, data?: Partial<CohortNode>): CohortNode {
    const c = this.service.addCohort(nameOrX, subjectsOrY, data);
    this.flowChange.emit(this.service.getData());
    return c;
  }

  addCohortByName(name: string, data?: Partial<CohortNode>): CohortNode {
    const c = this.service.addCohortByName(name, data);
    this.flowChange.emit(this.service.getData());
    return c;
  }

  addCohorts(items: (string | Partial<CohortNode>)[]): CohortNode[] {
    const res = this.service.addCohorts(items);
    this.flowChange.emit(this.service.getData());
    return res;
  }

  addDependency(x?: number, y?: number, customDataOrIcon?: Partial<DependencyNode> | string): DependencyNode {
    const d = this.service.addDependency(x, y, customDataOrIcon);
    this.flowChange.emit(this.service.getData());
    return d;
  }

  openOverview(section?: 'cohorts' | 'dependencies') {
    this.service.openOverviewPanel();
    if (section) {
      this.service.setAllBlocksSection(section);
    }
  }

  // --- Coordinate Mapping ---

  getCanvasCoordinates(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvasContainer.nativeElement.getBoundingClientRect();
    const { panX, panY, zoom } = this.transform();
    const x = (clientX - rect.left - panX) / zoom;
    const y = (clientY - rect.top - panY) / zoom;
    return { x, y };
  }

  // --- SVG Connection paths ---

  getConnectionPath(conn: Connection): string {
    const fromCoords = this.service.getPortCoordinates(conn.fromNodeId, conn.fromPort);
    const toCoords = this.service.getPortCoordinates(conn.toNodeId, conn.toPort);
    return this.service.calculateBezierPath(
      fromCoords.x,
      fromCoords.y,
      conn.fromPort,
      toCoords.x,
      toCoords.y,
      conn.toPort
    );
  }

  getConnectionMidpoint(conn: Connection): { x: number; y: number } {
    const fromCoords = this.service.getPortCoordinates(conn.fromNodeId, conn.fromPort);
    const toCoords = this.service.getPortCoordinates(conn.toNodeId, conn.toPort);
    return {
      x: (fromCoords.x + toCoords.x) / 2,
      y: (fromCoords.y + toCoords.y) / 2
    };
  }

  getActiveConnectingPath(): string {
    const active = this.activeConnecting();
    if (!active) return '';
    return this.service.calculateBezierPath(
      active.startX,
      active.startY,
      active.fromPort,
      active.currentX,
      active.currentY,
      active.fromPort === 'right' ? 'left' : 'right'
    );
  }

  // --- Node Dragging & Resizing ---

  onCohortResizeStart(data: { nodeId: string; side: 'right' | 'left' | 'bottom' | 'corner'; event: MouseEvent }) {
    if (this.readonly || data.event.button !== 0) return;
    const node = this.nodes().find(n => n.id === data.nodeId) as CohortNode;
    if (!node) return;

    this.isResizing = true;
    this.resizeState = {
      nodeId: data.nodeId,
      side: data.side,
      startClientX: data.event.clientX,
      startClientY: data.event.clientY,
      initialWidth: node.width || (node.isExpanded ? 280 : 180),
      initialHeight: node.height || (node.isExpanded ? 54 : 50),
      initialX: node.x,
      initialY: node.y
    };

    this.service.selectNode(node.id);
    this.nodeSelected.emit(node);
  }

  onNodeMouseDown(node: FlowNode, event: MouseEvent) {
    if (this.readonly || event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (
      target.closest('.port-handle') ||
      target.closest('.resize-handle') ||
      target.closest('button') ||
      target.closest('input')
    ) {
      return;
    }

    this.isDraggingNode = true;
    this.draggedNodeId = node.id;
    this.service.selectNode(node.id);
    this.nodeSelected.emit(node);

    const canvasCoords = this.getCanvasCoordinates(event.clientX, event.clientY);
    this.dragNodeOffset = {
      x: canvasCoords.x - node.x,
      y: canvasCoords.y - node.y
    };

    event.preventDefault();
  }

  // --- Canvas Interaction ---

  onCanvasMouseDown(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const isBackground = 
      target === this.canvasContainer.nativeElement ||
      target.classList.contains('canvas-grid') ||
      target.tagName.toLowerCase() === 'svg';

    if (isBackground) {
      // If user clicks on canvas while drawing an arrow, cancel and reset immediately
      if (this.activeConnecting()) {
        this.service.cancelConnection();
        return;
      }

      this.service.clearSelection();
      this.nodeSelected.emit(null);
      this.connectionSelected.emit(null);

      // Pan canvas
      if (event.button === 0 || event.button === 1) {
        this.isPanningCanvas = true;
        this.panStart = { x: event.clientX, y: event.clientY };
        const currentTransform = this.transform();
        this.panInitial = { x: currentTransform.panX, y: currentTransform.panY };
        event.preventDefault();
      }
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onWindowMouseMove(event: MouseEvent) {
    if (this.resizeState) {
      const { zoom } = this.transform();
      const deltaX = (event.clientX - this.resizeState.startClientX) / zoom;
      const deltaY = (event.clientY - this.resizeState.startClientY) / zoom;
      const MIN_WIDTH = 140;
      const MAX_WIDTH = 700;
      const MIN_HEIGHT = 44;
      const MAX_HEIGHT = 260;

      let newWidth = this.resizeState.initialWidth;
      let newHeight = this.resizeState.initialHeight;
      let newX = this.resizeState.initialX;
      let newY = this.resizeState.initialY;

      if (this.resizeState.side === 'right' || this.resizeState.side === 'corner') {
        newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(this.resizeState.initialWidth + deltaX)));
      } else if (this.resizeState.side === 'left') {
        const rawWidth = Math.round(this.resizeState.initialWidth - deltaX);
        newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, rawWidth));
        newX = Math.round(this.resizeState.initialX + (this.resizeState.initialWidth - newWidth));
      }

      if (this.resizeState.side === 'bottom' || this.resizeState.side === 'corner') {
        newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.round(this.resizeState.initialHeight + deltaY)));
      }

      this.service.updateNodeDimensions(this.resizeState.nodeId, newWidth, newHeight, newX, newY);
      return;
    }

    if (this.isDraggingNode && this.draggedNodeId) {
      const canvasCoords = this.getCanvasCoordinates(event.clientX, event.clientY);
      const newX = Math.round(canvasCoords.x - this.dragNodeOffset.x);
      const newY = Math.round(canvasCoords.y - this.dragNodeOffset.y);
      this.service.updateNodePosition(this.draggedNodeId, newX, newY);
      return;
    }

    if (this.activeConnecting()) {
      const canvasCoords = this.getCanvasCoordinates(event.clientX, event.clientY);
      this.service.updateConnectingPosition(canvasCoords.x, canvasCoords.y);
      return;
    }

    if (this.isPanningCanvas) {
      const deltaX = event.clientX - this.panStart.x;
      const deltaY = event.clientY - this.panStart.y;
      const current = this.transform();
      this.service.setTransform(
        current.zoom,
        this.panInitial.x + deltaX,
        this.panInitial.y + deltaY
      );
    }
  }

  @HostListener('window:mouseup', ['$event'])
  onWindowMouseUp(event: MouseEvent) {
    if (this.resizeState) {
      this.isResizing = false;
      this.resizeState = null;
      this.flowChange.emit(this.service.getData());
    }

    if (this.isDraggingNode) {
      this.isDraggingNode = false;
      this.draggedNodeId = null;
      this.flowChange.emit(this.service.getData());
    }

    if (this.isPanningCanvas) {
      this.isPanningCanvas = false;
    }

    // If user was drawing a wire and released mouse outside a port: RESET AND CANCEL ARROW
    if (this.activeConnecting()) {
      const targetElem = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
      const portEl = targetElem?.closest('.port-handle') as HTMLElement | null;
      if (!portEl) {
        // Left the arrow without dropping on a valid port -> reset back immediately!
        this.service.cancelConnection();
      }
    }
  }

  @HostListener('wheel', ['$event'])
  onCanvasWheel(event: WheelEvent) {
    if (this.canvasContainer.nativeElement.contains(event.target as Node)) {
      event.preventDefault();
      const zoomFactor = event.deltaY < 0 ? 0.08 : -0.08;
      this.service.zoomBy(zoomFactor);
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (this.readonly) return;

    if (event.key === 'Delete' || event.key === 'Backspace') {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
        return;
      }

      if (this.service.selectedNodeId()) {
        this.service.deleteNode(this.service.selectedNodeId()!);
        this.flowChange.emit(this.service.getData());
      } else if (this.service.selectedConnectionId()) {
        this.service.deleteConnection(this.service.selectedConnectionId()!);
        this.flowChange.emit(this.service.getData());
      }
    }

    if (event.key === 'Escape') {
      if (this.activeConnecting()) {
        this.service.cancelConnection();
      } else {
        this.service.clearSelection();
      }
    }
  }

  // --- Port Connection Handlers (Left & Right) ---

  onPortClick(data: { nodeId: string; port: PortPosition; event: MouseEvent }) {
    if (this.readonly) return;

    const active = this.activeConnecting();
    if (!active) {
      const canvasCoords = this.getCanvasCoordinates(data.event.clientX, data.event.clientY);
      this.service.startConnection(data.nodeId, data.port, canvasCoords.x, canvasCoords.y);
    } else {
      const completed = this.service.completeConnection(data.nodeId, data.port);
      if (completed) {
        this.flowChange.emit(this.service.getData());
      }
    }
  }

  onPortMouseUp(data: { nodeId: string; port: PortPosition; event: MouseEvent }) {
    if (this.readonly) return;

    const active = this.activeConnecting();
    if (active && active.fromNodeId !== data.nodeId) {
      const completed = this.service.completeConnection(data.nodeId, data.port);
      if (completed) {
        this.flowChange.emit(this.service.getData());
      }
    }
  }

  onSelectNode(nodeId: string) {
    this.service.selectNode(nodeId);
    this.nodeSelected.emit(this.service.selectedNode());
  }

  onSelectConnection(connId: string, event: MouseEvent) {
    event.stopPropagation();
    this.service.selectConnection(connId);
    this.connectionSelected.emit(this.service.selectedConnection());
  }

  onCloseInspector() {
    this.service.isRightPanelOpen.set(false);
    this.service.clearSelection();
    this.nodeSelected.emit(null);
    this.connectionSelected.emit(null);
  }
}
