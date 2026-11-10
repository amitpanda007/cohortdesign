import { Injectable, signal, computed } from '@angular/core';
import {
  FlowNode,
  CohortNode,
  DependencyNode,
  Connection,
  CohortDesignFlow,
  PortPosition,
  ActiveConnectingState,
  CanvasViewTransform
} from '../models/cohort-designer.model';

export const COHORT_WIDTH = 180;
export const COHORT_EXPANDED_WIDTH = 280;
export const COHORT_HEIGHT = 50;
export const COHORT_EXPANDED_HEIGHT = 54;
export const DEPENDENCY_WIDTH = 46;
export const DEPENDENCY_HEIGHT = 46;

@Injectable({
  providedIn: 'root'
})
export class CohortDesignerService {
  readonly nodes = signal<FlowNode[]>([]);
  readonly connections = signal<Connection[]>([]);
  readonly selectedNodeId = signal<string | null>(null);
  readonly selectedConnectionId = signal<string | null>(null);
  readonly activeConnecting = signal<ActiveConnectingState | null>(null);
  readonly transform = signal<CanvasViewTransform>({ zoom: 1, panX: 0, panY: 0 });
  readonly hoveredPort = signal<{ nodeId: string; port: PortPosition } | null>(null);

  // Right sidebar panel state
  readonly isRightPanelOpen = signal<boolean>(false);
  readonly rightPanelTab = signal<'overview' | 'details'>('overview');
  readonly allBlocksSection = signal<'cohorts' | 'dependencies'>('cohorts');

  // Only expand section when multiple blocks exist in overview mode
  readonly hasMultipleBlocks = computed(() => {
    if (this.rightPanelTab() === 'details') return false;
    if (this.allBlocksSection() === 'cohorts') {
      return this.cohortNodes().length > 1;
    } else {
      return this.dependencyNodes().length > 1;
    }
  });

  readonly selectedNode = computed(() => {
    const id = this.selectedNodeId();
    if (!id) return null;
    return this.nodes().find(n => n.id === id) || null;
  });

  readonly selectedConnection = computed(() => {
    const id = this.selectedConnectionId();
    if (!id) return null;
    return this.connections().find(c => c.id === id) || null;
  });

  // Sorted in sequence from left to right as displayed on the canvas
  readonly cohortNodes = computed(() => {
    return (this.nodes().filter(n => n.type === 'cohort') as CohortNode[])
      .slice()
      .sort((a, b) => a.x - b.x || a.y - b.y);
  });

  readonly dependencyNodes = computed(() => {
    return (this.nodes().filter(n => n.type === 'dependency') as DependencyNode[])
      .slice()
      .sort((a, b) => a.x - b.x || a.y - b.y);
  });

  // Calculate coordinates for Left (in) and Right (out) ports taking custom width/height into account
  getPortCoordinates(nodeId: string, port: PortPosition): { x: number; y: number } {
    const node = this.nodes().find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };

    const isCohort = node.type === 'cohort';
    const cNode = isCohort ? (node as CohortNode) : null;
    const isExpanded = isCohort && !!cNode?.isExpanded;

    const width = isCohort
      ? (cNode?.width || (isExpanded ? COHORT_EXPANDED_WIDTH : COHORT_WIDTH))
      : DEPENDENCY_WIDTH;
    const height = isCohort
      ? (cNode?.height || (isExpanded ? COHORT_EXPANDED_HEIGHT : COHORT_HEIGHT))
      : DEPENDENCY_HEIGHT;

    if (port === 'left') {
      return { x: node.x, y: node.y + height / 2 };
    } else {
      return { x: node.x + width, y: node.y + height / 2 };
    }
  }

  calculateBezierPath(x1: number, y1: number, fromPort: PortPosition, x2: number, y2: number, toPort: PortPosition): string {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    // Smooth horizontal tangents that scale gracefully with horizontal distance and vertical separation
    const offset = Math.max(45, Math.min(130, dx * 0.5 + Math.min(dy * 0.15, 45)));

    const cx1 = fromPort === 'right' ? x1 + offset : x1 - offset;
    const cy1 = y1;
    const cx2 = toPort === 'left' ? x2 - offset : x2 + offset;
    const cy2 = y2;

    return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
  }

  // --- Graph Traversal & Cycle Detection ---

  /**
   * Check if a directed path already exists from startNodeId to targetNodeId.
   */
  hasPath(startNodeId: string, targetNodeId: string): boolean {
    if (startNodeId === targetNodeId) return true;
    const visited = new Set<string>();
    const queue = [startNodeId];
    visited.add(startNodeId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === targetNodeId) return true;

      const downstream = this.connections()
        .filter(c => c.fromNodeId === current)
        .map(c => c.toNodeId);

      for (const next of downstream) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
    return false;
  }

  /**
   * Validate if toNodeId is an allowable target for the active connection.
   * Rules:
   * 1. Cannot connect Cohort directly to Cohort (must have a dependency in between).
   * 2. Cannot connect Dependency directly to Dependency.
   * 3. Cannot connect a node to itself.
   * 4. Cannot create circular dependencies (cycles).
   */
  isValidTarget(toNodeId: string): boolean {
    const active = this.activeConnecting();
    if (!active) return false;
    if (active.fromNodeId === toNodeId) return false;

    const fromNode = this.nodes().find(n => n.id === active.fromNodeId);
    const toNode = this.nodes().find(n => n.id === toNodeId);
    if (!fromNode || !toNode) return false;

    // Rule 1: No direct Cohort-to-Cohort connection
    if (fromNode.type === 'cohort' && toNode.type === 'cohort') {
      return false;
    }

    // Rule 2: No direct Dependency-to-Dependency connection
    if (fromNode.type === 'dependency' && toNode.type === 'dependency') {
      return false;
    }

    // Rule 3: No circular dependencies (cycles)
    // If a path already exists from toNodeId to active.fromNodeId, adding this edge would create a cycle!
    if (this.hasPath(toNodeId, active.fromNodeId)) {
      return false;
    }

    return true;
  }

  // --- Adding Nodes ---

  addCohort(nameOrX?: string | number, subjectsOrY?: number, customData?: Partial<CohortNode>): CohortNode {
    const cohorts = this.cohortNodes();
    const letter = String.fromCharCode(65 + (cohorts.length % 26)); // A, B, C...
    const { panX, panY, zoom } = this.transform();

    let name = `Cohort ${letter}`;
    let subjects = 0;
    let spawnX: number;
    let spawnY: number;

    if (typeof nameOrX === 'string') {
      name = nameOrX;
      const targetVal = customData?.randomizationTarget ?? customData?.subjects;
      subjects = typeof subjectsOrY === 'number' ? subjectsOrY : (targetVal ?? 0);
      spawnX = customData?.x !== undefined ? customData.x : (-panX + 80 + (cohorts.length * 60)) / zoom;
      spawnY = customData?.y !== undefined ? customData.y : (-panY + 180 + (cohorts.length * 30)) / zoom;
    } else {
      spawnX = nameOrX !== undefined ? nameOrX : (-panX + 200 + (cohorts.length * 40)) / zoom;
      spawnY = subjectsOrY !== undefined ? subjectsOrY : (-panY + 180 + (cohorts.length * 30)) / zoom;
      name = customData?.name || `Cohort ${letter}`;
      const targetVal = customData?.randomizationTarget ?? customData?.subjects;
      subjects = customData?.subjects !== undefined ? customData.subjects : (targetVal ?? 0);
    }

    const newCohort: CohortNode = {
      id: customData?.id || `cohort-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: 'cohort',
      x: Math.round(spawnX),
      y: Math.round(spawnY),
      name: customData?.name || name,
      subjects: subjects,
      cohortLevel: customData?.cohortLevel || 'Worldwide',
      randomizationTarget: customData?.randomizationTarget, // Undefined by default
      targetLastSubjectRandomized: customData?.targetLastSubjectRandomized || '',
      screeningPeriod: customData?.screeningPeriod, // Undefined by default
      color: customData?.color || '#000000', // Default back to black color
      description: customData?.description || '',
      width: customData?.width,
      height: customData?.height,
      isExpanded: false
    };

    this.nodes.update(nodes => [...nodes, newCohort]);
    this.allBlocksSection.set('cohorts');
    this.selectNode(newCohort.id);
    return newCohort;
  }

  addCohortByName(name: string, data?: Partial<CohortNode>): CohortNode {
    return this.addCohort(name, data?.subjects, data);
  }

  addCohorts(items: (string | Partial<CohortNode>)[]): CohortNode[] {
    const created: CohortNode[] = [];
    for (const item of items) {
      if (typeof item === 'string') {
        created.push(this.addCohortByName(item));
      } else {
        created.push(this.addCohort(item.x, item.y, item));
      }
    }
    return created;
  }

  toggleCohortExpand(nodeId: string) {
    const node = this.nodes().find(n => n.id === nodeId);
    if (!node || node.type !== 'cohort') return;
    const current = !!(node as CohortNode).isExpanded;
    this.updateNodeData(nodeId, { isExpanded: !current });
  }

  updateNodeDimensions(id: string, width: number, height: number, x?: number, y?: number) {
    this.nodes.update(nodes =>
      nodes.map(node => {
        if (node.id === id && node.type === 'cohort') {
          const updated: CohortNode = {
            ...(node as CohortNode),
            width,
            height
          };
          if (x !== undefined) updated.x = x;
          if (y !== undefined) updated.y = y;
          return updated;
        }
        return node;
      })
    );
  }

  resetCohortDimensions(id: string) {
    this.nodes.update(nodes =>
      nodes.map(node => {
        if (node.id === id && node.type === 'cohort') {
          const { width, height, ...rest } = node as CohortNode;
          return {
            ...rest,
            width: COHORT_WIDTH,
            height: COHORT_HEIGHT,
            isExpanded: false
          } as CohortNode;
        }
        return node;
      })
    );
  }

  addDependency(x?: number, y?: number, customDataOrIcon?: Partial<DependencyNode> | string): DependencyNode {
    const deps = this.dependencyNodes();
    const count = deps.length + 1;
    const customData = typeof customDataOrIcon === 'object' ? customDataOrIcon : undefined;
    const icon = typeof customDataOrIcon === 'string' ? customDataOrIcon : (customData?.icon || 'clock');
    const { panX, panY, zoom } = this.transform();

    const spawnX = x !== undefined ? x : (-panX + 380 + (deps.length * 40)) / zoom;
    const spawnY = y !== undefined ? y : (-panY + 182 + (deps.length * 30)) / zoom;

    const newDep: DependencyNode = {
      id: customData?.id || `dep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: 'dependency',
      x: Math.round(spawnX),
      y: Math.round(spawnY),
      name: customData?.name || `Delay ${count}`,
      days: customData?.days ?? 14, // Minimal number of days / delay
      event: customData?.event || 'Number of Subjects',
      eventSubjectCount: customData?.eventSubjectCount ?? 6,
      precedingCohortIds: customData?.precedingCohortIds || [],
      dependentCohortIds: customData?.dependentCohortIds || [],
      icon: icon,
      color: customData?.color || '#000000', // Default dependency color to black
      description: customData?.description || ''
    };

    this.nodes.update(nodes => [...nodes, newDep]);
    this.allBlocksSection.set('dependencies');
    this.selectNode(newDep.id);
    return newDep;
  }

  // --- Preceding & Dependent Cohorts Wiring ---

  addConnection(fromNodeId: string, fromPort: PortPosition, toNodeId: string, toPort: PortPosition, label?: string): boolean {
    const fromNode = this.nodes().find(n => n.id === fromNodeId);
    const toNode = this.nodes().find(n => n.id === toNodeId);
    if (!fromNode || !toNode) return false;

    // Rule 1: No direct Cohort-to-Cohort
    if (fromNode.type === 'cohort' && toNode.type === 'cohort') return false;
    // Rule 2: No direct Dependency-to-Dependency
    if (fromNode.type === 'dependency' && toNode.type === 'dependency') return false;
    // Rule 3: Cycle detection
    if (this.hasPath(toNodeId, fromNodeId)) return false;

    const exists = this.connections().some(c => c.fromNodeId === fromNodeId && c.toNodeId === toNodeId);
    if (exists) return false;

    const newConn: Connection = {
      id: `conn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      fromNodeId,
      fromPort,
      toNodeId,
      toPort,
      label,
      color: '#000000'
    };
    this.connections.update(conns => [...conns, newConn]);
    return true;
  }

  isCohortPreceding(dependencyId: string, cohortId: string): boolean {
    return this.connections().some(c => c.fromNodeId === cohortId && c.toNodeId === dependencyId);
  }

  togglePrecedingCohort(dependencyId: string, cohortId: string) {
    const existing = this.connections().find(c => c.fromNodeId === cohortId && c.toNodeId === dependencyId);
    if (existing) {
      this.deleteConnection(existing.id);
    } else {
      this.addConnection(cohortId, 'right', dependencyId, 'left');
    }
  }

  isCohortDependent(dependencyId: string, cohortId: string): boolean {
    return this.connections().some(c => c.fromNodeId === dependencyId && c.toNodeId === cohortId);
  }

  toggleDependentCohort(dependencyId: string, cohortId: string) {
    const existing = this.connections().find(c => c.fromNodeId === dependencyId && c.toNodeId === cohortId);
    if (existing) {
      this.deleteConnection(existing.id);
    } else {
      this.addConnection(dependencyId, 'right', cohortId, 'left');
    }
  }

  updateNodePosition(id: string, x: number, y: number) {
    this.nodes.update(nodes =>
      nodes.map(node => (node.id === id ? { ...node, x, y } : node))
    );
  }

  updateNodeData(id: string, updates: Partial<FlowNode>) {
    this.nodes.update(nodes =>
      nodes.map(node => {
        if (node.id === id) {
          return { ...node, ...updates } as FlowNode;
        }
        return node;
      })
    );
  }

  deleteNode(id: string) {
    this.connections.update(conns =>
      conns.filter(c => c.fromNodeId !== id && c.toNodeId !== id)
    );
    this.nodes.update(nodes => nodes.filter(n => n.id !== id));
    if (this.selectedNodeId() === id) {
      this.selectedNodeId.set(null);
      this.rightPanelTab.set('overview');
    }
  }

  // --- Connecting Interaction (Left / Right only) ---

  startConnection(nodeId: string, port: PortPosition, canvasX: number, canvasY: number) {
    const coords = this.getPortCoordinates(nodeId, port);
    this.activeConnecting.set({
      fromNodeId: nodeId,
      fromPort: port,
      startX: coords.x,
      startY: coords.y,
      currentX: canvasX,
      currentY: canvasY
    });
    this.selectedConnectionId.set(null);
  }

  updateConnectingPosition(canvasX: number, canvasY: number) {
    const current = this.activeConnecting();
    if (!current) return;
    this.activeConnecting.set({
      ...current,
      currentX: canvasX,
      currentY: canvasY
    });
  }

  completeConnection(toNodeId: string, toPort: PortPosition): boolean {
    const active = this.activeConnecting();
    if (!active) return false;

    // Check validation: No Cohort-to-Cohort, no cycles, no self-loops
    if (!this.isValidTarget(toNodeId)) {
      this.cancelConnection();
      return false;
    }

    // Check if an identical connection already exists
    const exists = this.connections().some(
      c =>
        c.fromNodeId === active.fromNodeId &&
        c.fromPort === active.fromPort &&
        c.toNodeId === toNodeId &&
        c.toPort === toPort
    );

    if (exists) {
      this.cancelConnection();
      return false;
    }

    const newConnection: Connection = {
      id: `conn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      fromNodeId: active.fromNodeId,
      fromPort: active.fromPort,
      toNodeId: toNodeId,
      toPort: toPort,
      color: '#000000'
    };

    this.connections.update(conns => [...conns, newConnection]);
    this.activeConnecting.set(null);
    this.selectedConnectionId.set(newConnection.id);
    return true;
  }

  cancelConnection() {
    this.activeConnecting.set(null);
  }

  deleteConnection(id: string) {
    this.connections.update(conns => conns.filter(c => c.id !== id));
    if (this.selectedConnectionId() === id) {
      this.selectedConnectionId.set(null);
      this.rightPanelTab.set('overview');
    }
  }

  updateConnection(id: string, updates: Partial<Connection>) {
    this.connections.update(conns =>
      conns.map(c => (c.id === id ? { ...c, ...updates } : c))
    );
  }

  // --- Selection & Panel Tabs ---

  selectNode(id: string | null) {
    this.selectedNodeId.set(id);
    this.selectedConnectionId.set(null);
    if (id) {
      this.isRightPanelOpen.set(true);
      this.rightPanelTab.set('details');
    }
  }

  selectConnection(id: string | null) {
    this.selectedConnectionId.set(id);
    this.selectedNodeId.set(null);
    if (id) {
      this.isRightPanelOpen.set(true);
      this.rightPanelTab.set('details');
    }
  }

  openOverviewPanel() {
    this.isRightPanelOpen.set(true);
    this.rightPanelTab.set('overview');
    this.selectedNodeId.set(null);
    this.selectedConnectionId.set(null);
  }

  setAllBlocksSection(section: 'cohorts' | 'dependencies') {
    this.allBlocksSection.set(section);
  }

  toggleRightPanel() {
    const nextState = !this.isRightPanelOpen();
    this.isRightPanelOpen.set(nextState);
    if (nextState) {
      this.rightPanelTab.set('overview');
    }
  }

  clearSelection() {
    this.selectedNodeId.set(null);
    this.selectedConnectionId.set(null);
  }

  // --- Canvas Navigation ---

  setTransform(zoom: number, panX: number, panY: number) {
    this.transform.set({
      zoom: Math.min(2.5, Math.max(0.25, zoom)),
      panX,
      panY
    });
  }

  zoomBy(delta: number) {
    const current = this.transform();
    const newZoom = Math.min(2.5, Math.max(0.3, current.zoom + delta));
    this.transform.set({
      ...current,
      zoom: newZoom
    });
  }

  resetView() {
    this.transform.set({ zoom: 1, panX: 0, panY: 0 });
  }

  // --- Data Access & Save Method ---

  getData(): CohortDesignFlow {
    return {
      version: '1.0.0',
      nodes: this.nodes(),
      connections: this.connections()
    };
  }

  save(): CohortDesignFlow {
    return this.getData();
  }

  loadFlow(flow: CohortDesignFlow) {
    this.nodes.set(flow.nodes || []);
    this.connections.set(flow.connections || []);
    this.clearSelection();
  }

  clearAll() {
    this.nodes.set([]);
    this.connections.set([]);
    this.clearSelection();
  }
}
