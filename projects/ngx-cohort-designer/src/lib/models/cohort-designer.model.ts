export type PortPosition = 'left' | 'right';

export interface BaseNode {
  id: string;
  type: 'cohort' | 'dependency';
  x: number;
  y: number;
}

export interface CohortNode extends BaseNode {
  type: 'cohort';
  name: string;        // e.g., "Cohort A"
  subjects?: number;   // Defined number of randomized subjects (N)
  cohortLevel?: 'Country' | 'Worldwide'; // Radio: Country or Worldwide (default: Worldwide)
  randomizationTarget?: number;          // Target number of randomized subjects
  targetLastSubjectRandomized?: string;  // Target Last Subject Randomized (e.g. YYYY-MM-DD)
  screeningPeriod?: number;              // Screening Period in days
  color?: string;      // Optional legacy color code
  description?: string;// Description log / notes
  width?: number;      // Custom card width (drag to resize sides)
  height?: number;     // Custom card height (drag to resize sides)
  isExpanded?: boolean;// Legacy expand flag
}

export interface DependencyNode extends BaseNode {
  type: 'dependency';
  name: string;        // e.g., "Washout / Delay"
  days: number;        // Minimal number of days / delay in days
  event?: 'Number of Subjects' | 'Enrollment Complete'; // Event gate radio selection
  eventSubjectCount?: number; // Required subjects count when event is 'Number of Subjects'
  precedingCohortIds?: string[]; // Preceding cohort IDs
  dependentCohortIds?: string[]; // Dependent cohort IDs
  icon: string;        // Replaceable icon (default 'clock')
  customSvg?: string;  // Optional custom SVG icon
  color?: string;
  description?: string;
}

export type FlowNode = CohortNode | DependencyNode;

export interface Connection {
  id: string;
  fromNodeId: string;
  fromPort: PortPosition;
  toNodeId: string;
  toPort: PortPosition;
  label?: string;
  color?: string;
}

export interface CohortDesignFlow {
  version?: string;
  nodes: FlowNode[];
  connections: Connection[];
}

export interface IconOption {
  id: string;
  name: string;
  svgPath: string;
  viewBox?: string;
}

export interface ActiveConnectingState {
  fromNodeId: string;
  fromPort: PortPosition;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface CanvasViewTransform {
  zoom: number;
  panX: number;
  panY: number;
}
