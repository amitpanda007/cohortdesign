import { CohortDesignFlow } from '../models/cohort-designer.model';

export interface ProtocolTemplate {
  id: string;
  name: string;
  description: string;
  flow: CohortDesignFlow;
}

export const PROTOCOL_TEMPLATES: ProtocolTemplate[] = [
  {
    id: 'sequential_cohorts',
    name: 'Sequential Cohort Design',
    description: 'Sequential dose escalation cohorts with inter-cohort safety delay.',
    flow: {
      version: '1.0.0',
      nodes: [
        {
          id: 'coh-1',
          type: 'cohort',
          x: 60,
          y: 180,
          name: 'Cohort A',
          subjects: 6,
          description: 'Initial starting dose cohort.'
        },
        {
          id: 'dep-1',
          type: 'dependency',
          x: 280,
          y: 184,
          name: 'Safety Delay',
          days: 14,
          icon: 'clock'
        },
        {
          id: 'coh-2',
          type: 'cohort',
          x: 420,
          y: 180,
          name: 'Cohort B',
          subjects: 12,
          description: 'Dose escalation level 2.'
        },
        {
          id: 'dep-2',
          type: 'dependency',
          x: 640,
          y: 184,
          name: 'Follow-up Delay',
          days: 28,
          icon: 'clock'
        },
        {
          id: 'coh-3',
          type: 'cohort',
          x: 780,
          y: 180,
          name: 'Expansion Cohort',
          subjects: 30,
          description: 'Expansion cohort for biomarker validation.'
        }
      ],
      connections: [
        {
          id: 'conn-1',
          fromNodeId: 'coh-1',
          fromPort: 'right',
          toNodeId: 'dep-1',
          toPort: 'left'
        },
        {
          id: 'conn-2',
          fromNodeId: 'dep-1',
          fromPort: 'right',
          toNodeId: 'coh-2',
          toPort: 'left'
        },
        {
          id: 'conn-3',
          fromNodeId: 'coh-2',
          fromPort: 'right',
          toNodeId: 'dep-2',
          toPort: 'left'
        },
        {
          id: 'conn-4',
          fromNodeId: 'dep-2',
          fromPort: 'right',
          toNodeId: 'coh-3',
          toPort: 'left'
        }
      ]
    }
  },
  {
    id: 'parallel_randomized',
    name: 'Parallel Randomized Arms',
    description: 'Screening into 1:1 randomized allocation with washout delay.',
    flow: {
      version: '1.0.0',
      nodes: [
        {
          id: 'coh-screen',
          type: 'cohort',
          x: 60,
          y: 200,
          name: 'Screening',
          subjects: 50,
          description: 'Baseline randomized subjects pool.'
        },
        {
          id: 'dep-rand',
          type: 'dependency',
          x: 280,
          y: 204,
          name: 'Randomization',
          days: 7,
          icon: 'clock'
        },
        {
          id: 'coh-arm1',
          type: 'cohort',
          x: 420,
          y: 120,
          name: 'Treatment Arm A',
          subjects: 25
        },
        {
          id: 'coh-arm2',
          type: 'cohort',
          x: 420,
          y: 280,
          name: 'Control Arm B',
          subjects: 25
        }
      ],
      connections: [
        {
          id: 'conn-r1',
          fromNodeId: 'coh-screen',
          fromPort: 'right',
          toNodeId: 'dep-rand',
          toPort: 'left'
        },
        {
          id: 'conn-r2',
          fromNodeId: 'dep-rand',
          fromPort: 'right',
          toNodeId: 'coh-arm1',
          toPort: 'left'
        },
        {
          id: 'conn-r3',
          fromNodeId: 'dep-rand',
          fromPort: 'right',
          toNodeId: 'coh-arm2',
          toPort: 'left'
        }
      ]
    }
  }
];
