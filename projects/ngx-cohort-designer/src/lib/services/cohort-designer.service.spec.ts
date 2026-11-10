import { TestBed } from '@angular/core/testing';
import { CohortDesignerService, COHORT_WIDTH, COHORT_EXPANDED_WIDTH, COHORT_HEIGHT, DEPENDENCY_WIDTH, DEPENDENCY_HEIGHT } from './cohort-designer.service';

describe('CohortDesignerService', () => {
  let service: CohortDesignerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CohortDesignerService]
    });
    service = TestBed.inject(CohortDesignerService);
  });

  it('should be created with empty initial state', () => {
    expect(service).toBeTruthy();
    expect(service.nodes().length).toBe(0);
    expect(service.connections().length).toBe(0);
    expect(service.selectedNodeId()).toBeNull();
  });

  it('should add a simple cohort block showing name and randomized subjects with black color as default', () => {
    const cohort = service.addCohort(100, 150);
    expect(cohort).toBeTruthy();
    expect(cohort.type).toBe('cohort');
    expect(cohort.x).toBe(100);
    expect(cohort.y).toBe(150);
    expect(cohort.name).toBe('Cohort A');
    expect(cohort.subjects).toBe(0);
    expect(cohort.randomizationTarget).toBeUndefined();
    expect(cohort.screeningPeriod).toBeUndefined();
    expect(cohort.color).toBe('#000000'); // Default back to black color
    expect(service.nodes().length).toBe(1);
    expect(service.selectedNodeId()).toBe(cohort.id);
  });

  it('should add a simple dependency block with minimal days / delay', () => {
    const dep = service.addDependency(300, 200, 'clock');
    expect(dep).toBeTruthy();
    expect(dep.type).toBe('dependency');
    expect(dep.x).toBe(300);
    expect(dep.y).toBe(200);
    expect(dep.icon).toBe('clock');
    expect(dep.days).toBe(14);
    expect(dep.color).toBe('#000000'); // Default dependency color to black
    expect(service.nodes().length).toBe(1);
    expect(service.selectedNodeId()).toBe(dep.id);
  });

  it('should calculate left and right port coordinates correctly', () => {
    const cohort = service.addCohort(100, 100);
    const dep = service.addDependency(400, 200, 'clock');

    // Cohort ports (width: 180, height: 50)
    const cLeft = service.getPortCoordinates(cohort.id, 'left');
    expect(cLeft.x).toBe(100);
    expect(cLeft.y).toBe(100 + COHORT_HEIGHT / 2);

    const cRight = service.getPortCoordinates(cohort.id, 'right');
    expect(cRight.x).toBe(100 + COHORT_WIDTH);
    expect(cRight.y).toBe(100 + COHORT_HEIGHT / 2);

    // Dependency ports (width: 46, height: 46)
    const dLeft = service.getPortCoordinates(dep.id, 'left');
    expect(dLeft.x).toBe(400);
    expect(dLeft.y).toBe(200 + DEPENDENCY_HEIGHT / 2);

    const dRight = service.getPortCoordinates(dep.id, 'right');
    expect(dRight.x).toBe(400 + DEPENDENCY_WIDTH);
    expect(dRight.y).toBe(200 + DEPENDENCY_HEIGHT / 2);
  });

  it('should connect Right port of Cohort to Left port of Dependency', () => {
    const cohort1 = service.addCohort(50, 100);
    const delay = service.addDependency(300, 100, 'clock');
    const cohort2 = service.addCohort(450, 100);

    // Connect Cohort 1 (right) -> Delay (left)
    service.startConnection(cohort1.id, 'right', 230, 125);
    expect(service.activeConnecting()).toBeTruthy();
    const conn1 = service.completeConnection(delay.id, 'left');
    expect(conn1).toBeTrue();
    expect(service.connections().length).toBe(1);

    // Connect Delay (right) -> Cohort 2 (left)
    service.startConnection(delay.id, 'right', 346, 125);
    const conn2 = service.completeConnection(cohort2.id, 'left');
    expect(conn2).toBeTrue();
    expect(service.connections().length).toBe(2);

    const conns = service.connections();
    expect(conns[0].fromNodeId).toBe(cohort1.id);
    expect(conns[0].toNodeId).toBe(delay.id);
    expect(conns[1].fromNodeId).toBe(delay.id);
    expect(conns[1].toNodeId).toBe(cohort2.id);
  });

  it('should prevent direct Cohort-to-Cohort connections', () => {
    const cohort1 = service.addCohort(50, 100);
    const cohort2 = service.addCohort(300, 100);

    service.startConnection(cohort1.id, 'right', 230, 125);
    expect(service.isValidTarget(cohort2.id)).toBeFalse();

    const result = service.completeConnection(cohort2.id, 'left');
    expect(result).toBeFalse();
    expect(service.connections().length).toBe(0);
  });

  it('should prevent direct Dependency-to-Dependency connections', () => {
    const dep1 = service.addDependency(50, 100, 'clock');
    const dep2 = service.addDependency(200, 100, 'calendar');

    service.startConnection(dep1.id, 'right', 96, 123);
    expect(service.isValidTarget(dep2.id)).toBeFalse();

    const result = service.completeConnection(dep2.id, 'left');
    expect(result).toBeFalse();
    expect(service.connections().length).toBe(0);
  });

  it('should detect and prevent circular dependencies', () => {
    const cohort1 = service.addCohort(50, 100);
    const dep1 = service.addDependency(250, 100, 'clock');
    const cohort2 = service.addCohort(400, 100);
    const dep2 = service.addDependency(600, 100, 'calendar');

    // Build flow: Cohort 1 -> Dep 1 -> Cohort 2 -> Dep 2
    service.startConnection(cohort1.id, 'right', 230, 125);
    service.completeConnection(dep1.id, 'left');

    service.startConnection(dep1.id, 'right', 296, 123);
    service.completeConnection(cohort2.id, 'left');

    service.startConnection(cohort2.id, 'right', 580, 125);
    service.completeConnection(dep2.id, 'left');
    expect(service.connections().length).toBe(3);

    // Try to connect Dep 2 back to Cohort 1 (Cycle: C1 -> D1 -> C2 -> D2 -> C1)
    service.startConnection(dep2.id, 'right', 646, 123);
    expect(service.hasPath(cohort1.id, dep2.id)).toBeTrue();
    expect(service.hasPath(dep2.id, cohort1.id)).toBeFalse();
    // Since cohort1 leads to dep2, connecting dep2 -> cohort1 creates a cycle!
    expect(service.isValidTarget(cohort1.id)).toBeFalse();

    const cycleResult = service.completeConnection(cohort1.id, 'left');
    expect(cycleResult).toBeFalse();
    expect(service.connections().length).toBe(3); // Cycle was prevented!
  });

  it('should provide save() and getData() returning all cohort and dependency data', () => {
    const cohort = service.addCohort(100, 100);
    cohort.name = 'Cohort 1';
    cohort.subjects = 30;
    cohort.color = '#e11d48';

    const dep = service.addDependency(350, 100, 'calendar');
    dep.days = 21;

    service.startConnection(cohort.id, 'right', 280, 125);
    service.completeConnection(dep.id, 'left');

    const savedData = service.save();
    expect(savedData.nodes.length).toBe(2);
    expect(savedData.connections.length).toBe(1);

    const savedCohort = savedData.nodes.find(n => n.id === cohort.id) as any;
    expect(savedCohort.name).toBe('Cohort 1');
    expect(savedCohort.subjects).toBe(30);
    expect(savedCohort.color).toBe('#e11d48');

    const savedDep = savedData.nodes.find(n => n.id === dep.id) as any;
    expect(savedDep.days).toBe(21);
  });

  it('should provide overview collections for cohorts and dependencies', () => {
    service.addCohort(50, 100);
    service.addCohort(250, 100);
    service.addDependency(450, 100, 'clock');

    expect(service.cohortNodes().length).toBe(2);
    expect(service.dependencyNodes().length).toBe(1);
  });

  it('should toggle cohort expansion and adjust right port coordinates', () => {
    const cohort = service.addCohort(100, 100);
    expect(cohort.isExpanded).toBeFalse();

    const initialRight = service.getPortCoordinates(cohort.id, 'right');
    expect(initialRight.x).toBe(100 + COHORT_WIDTH);

    service.toggleCohortExpand(cohort.id);
    const updated = service.cohortNodes()[0];
    expect(updated.isExpanded).toBeTrue();

    const expandedRight = service.getPortCoordinates(cohort.id, 'right');
    expect(expandedRight.x).toBe(100 + COHORT_EXPANDED_WIDTH);
  });

  it('should support switching between cohorts and dependencies in the all-blocks overview', () => {
    expect(service.allBlocksSection()).toBe('cohorts');

    service.setAllBlocksSection('dependencies');
    expect(service.allBlocksSection()).toBe('dependencies');

    service.setAllBlocksSection('cohorts');
    expect(service.allBlocksSection()).toBe('cohorts');
  });

  it('should dynamically update cohort dimensions when dragging sides and recalculate port positions', () => {
    const cohort = service.addCohort(100, 100);

    // Initial width 180, height 50
    const initialRight = service.getPortCoordinates(cohort.id, 'right');
    expect(initialRight.x).toBe(280);
    expect(initialRight.y).toBe(125);

    // Resize card width to 320px and height to 70px
    service.updateNodeDimensions(cohort.id, 320, 70);

    const updated = service.cohortNodes()[0];
    expect(updated.width).toBe(320);
    expect(updated.height).toBe(70);

    // Right port should now be at 100 + 320 = 420, centered vertically at 100 + 70/2 = 135
    const resizedRight = service.getPortCoordinates(cohort.id, 'right');
    expect(resizedRight.x).toBe(420);
    expect(resizedRight.y).toBe(135);

    // Reset dimensions back to default
    service.resetCohortDimensions(cohort.id);
    const resetCohort = service.cohortNodes()[0];
    expect(resetCohort.width).toBe(COHORT_WIDTH);
    expect(resetCohort.height).toBe(COHORT_HEIGHT);

    const resetRight = service.getPortCoordinates(cohort.id, 'right');
    expect(resetRight.x).toBe(280);
    expect(resetRight.y).toBe(125);
  });

  it('should sort cohorts and dependencies in sequence from left to right as displayed on canvas', () => {
    // Add nodes in non-sequential order
    const c3 = service.addCohort(600, 100);
    const c1 = service.addCohort(100, 100);
    const c2 = service.addCohort(350, 100);

    const sortedCohorts = service.cohortNodes();
    expect(sortedCohorts[0].id).toBe(c1.id); // x=100 (leftmost)
    expect(sortedCohorts[1].id).toBe(c2.id); // x=350 (middle)
    expect(sortedCohorts[2].id).toBe(c3.id); // x=600 (rightmost)

    // Add dependencies in non-sequential order
    const d2 = service.addDependency(500, 200, 'calendar');
    const d1 = service.addDependency(200, 200, 'clock');

    const sortedDeps = service.dependencyNodes();
    expect(sortedDeps[0].id).toBe(d1.id); // x=200 (leftmost)
    expect(sortedDeps[1].id).toBe(d2.id); // x=500 (rightmost)
  });

  it('should cascade delete connected wires when a node is removed', () => {
    const cohort = service.addCohort(50, 100);
    const dep = service.addDependency(300, 100, 'clock');
    service.startConnection(cohort.id, 'right', 230, 125);
    service.completeConnection(dep.id, 'left');
    expect(service.connections().length).toBe(1);

    service.deleteNode(dep.id);
    expect(service.nodes().length).toBe(1);
    expect(service.connections().length).toBe(0);
  });

  it('should support new cohort parameters: Cohort Level, Randomization Target, Target Last Subject Randomized, Screening Period', () => {
    const cohort = service.addCohortByName('Cohort 1 - Starting Dose (10mg)', {
      cohortLevel: 'Country',
      randomizationTarget: 40,
      targetLastSubjectRandomized: '2027-06-30',
      screeningPeriod: 28
    });

    expect(cohort.name).toBe('Cohort 1 - Starting Dose (10mg)');
    expect(cohort.cohortLevel).toBe('Country');
    expect(cohort.randomizationTarget).toBe(40);
    expect(cohort.subjects).toBe(40);
    expect(cohort.targetLastSubjectRandomized).toBe('2027-06-30');
    expect(cohort.screeningPeriod).toBe(28);
    expect(cohort.color).toBe('#000000');
  });

  it('should not set randomizationTarget or screeningPeriod by default when a new cohort is added', () => {
    const cohort = service.addCohort();

    expect(cohort.randomizationTarget).toBeUndefined();
    expect(cohort.screeningPeriod).toBeUndefined();
    expect(cohort.subjects).toBe(0);
  });

  it('should support dependency options: Preceding Cohorts, Event radio, Dependent Cohorts', () => {
    const c1 = service.addCohortByName('Cohort A');
    const c2 = service.addCohortByName('Cohort B');
    const dep = service.addDependency(300, 100, {
      event: 'Number of Subjects',
      eventSubjectCount: 8
    });

    expect(dep.event).toBe('Number of Subjects');
    expect(dep.eventSubjectCount).toBe(8);

    // Toggle preceding cohort
    service.togglePrecedingCohort(dep.id, c1.id);
    expect(service.isCohortPreceding(dep.id, c1.id)).toBeTrue();
    expect(service.connections().length).toBe(1);

    // Toggle dependent cohort
    service.toggleDependentCohort(dep.id, c2.id);
    expect(service.isCohortDependent(dep.id, c2.id)).toBeTrue();
    expect(service.connections().length).toBe(2);

    // Switch event to Enrollment Complete
    dep.event = 'Enrollment Complete';
    service.updateNodeData(dep.id, dep);
    const updatedDep = service.nodes().find(n => n.id === dep.id) as any;
    expect(updatedDep.event).toBe('Enrollment Complete');
  });
});
