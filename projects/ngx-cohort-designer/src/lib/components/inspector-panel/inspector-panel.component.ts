import { Component, Input, Output, EventEmitter, inject, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  FlowNode,
  CohortNode,
  DependencyNode,
  Connection,
  IconOption
} from '../../models/cohort-designer.model';
import { CohortDesignerService } from '../../services/cohort-designer.service';
import { CLINICAL_ICONS } from '../../constants/clinical-icons';

@Component({
  selector: 'lib-inspector-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inspector-panel.component.html',
  styleUrls: ['./inspector-panel.component.scss']
})
export class InspectorPanelComponent {
  readonly service = inject(CohortDesignerService);
  private sanitizer = inject(DomSanitizer);

  @Input() node: FlowNode | null = null;
  @Input() connection: Connection | null = null;
  @Input() customIcons: IconOption[] = [];
  @Input() readonly = false;

  @Output() close = new EventEmitter<void>();

  readonly activeTab = this.service.rightPanelTab;
  readonly cohorts = this.service.cohortNodes;
  readonly dependencies = this.service.dependencyNodes;
  readonly allBlocksSection = this.service.allBlocksSection;

  readonly totalRandomizedSubjects = computed(() => {
    return this.cohorts().reduce((sum, c) => sum + (c.subjects || 0), 0);
  });

  get allIcons(): IconOption[] {
    return [...this.customIcons, ...CLINICAL_ICONS];
  }

  get isCohort(): boolean {
    return this.node?.type === 'cohort';
  }

  get isDependency(): boolean {
    return this.node?.type === 'dependency';
  }

  get cohortNode(): CohortNode {
    return this.node as CohortNode;
  }

  get dependencyNode(): DependencyNode {
    return this.node as DependencyNode;
  }

  getSafeIcon(icon: IconOption): SafeHtml {
    const svg = `<svg viewBox="${icon.viewBox || '0 0 24 24'}" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">${icon.svgPath}</svg>`;
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  getSafeIconById(_iconId?: string): SafeHtml {
    const svg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14" stroke-linecap="round"/></svg>`;
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  setTab(tab: 'overview' | 'details') {
    this.service.rightPanelTab.set(tab);
  }

  setAllBlocksSection(section: 'cohorts' | 'dependencies') {
    this.service.setAllBlocksSection(section);
  }

  @ViewChild('cohortsScroll') cohortsScrollRef?: ElementRef<HTMLElement>;
  @ViewChild('depsScroll') depsScrollRef?: ElementRef<HTMLElement>;

  // --- Simultaneous Batch Editing Handlers ---

  scrollCohorts(delta: number) {
    if (this.cohortsScrollRef?.nativeElement) {
      this.cohortsScrollRef.nativeElement.scrollBy({ left: delta, behavior: 'smooth' });
    }
  }

  scrollDependencies(delta: number) {
    if (this.depsScrollRef?.nativeElement) {
      this.depsScrollRef.nativeElement.scrollBy({ left: delta, behavior: 'smooth' });
    }
  }

  onHorizontalWheel(event: WheelEvent, container: HTMLElement) {
    if (container && event.deltaY !== 0 && container.scrollWidth > container.clientWidth) {
      container.scrollLeft += event.deltaY;
      event.preventDefault();
    }
  }

  onCohortChange(cohort: CohortNode) {
    if (cohort.randomizationTarget !== undefined && cohort.randomizationTarget !== null && `${cohort.randomizationTarget}` !== '') {
      cohort.subjects = Number(cohort.randomizationTarget);
    }
    this.service.updateNodeData(cohort.id, cohort);
  }

  onCohortTargetChange(cohort: CohortNode) {
    if (cohort.randomizationTarget !== undefined && cohort.randomizationTarget !== null && `${cohort.randomizationTarget}` !== '') {
      cohort.subjects = Number(cohort.randomizationTarget);
    } else {
      cohort.subjects = 0;
      cohort.randomizationTarget = undefined;
    }
    this.service.updateNodeData(cohort.id, cohort);
  }

  onCohortScreeningChange(cohort: CohortNode) {
    if (cohort.screeningPeriod !== undefined && cohort.screeningPeriod !== null && `${cohort.screeningPeriod}` === '') {
      cohort.screeningPeriod = undefined;
    }
    this.service.updateNodeData(cohort.id, cohort);
  }

  onCohortDetailsTargetChange() {
    if (this.cohortNode) {
      if (this.cohortNode.randomizationTarget !== undefined && this.cohortNode.randomizationTarget !== null && `${this.cohortNode.randomizationTarget}` !== '') {
        this.cohortNode.subjects = Number(this.cohortNode.randomizationTarget);
      } else {
        this.cohortNode.subjects = 0;
        this.cohortNode.randomizationTarget = undefined;
      }
      this.onFieldChange();
    }
  }

  onCohortDetailsScreeningChange() {
    if (this.cohortNode) {
      if (this.cohortNode.screeningPeriod !== undefined && this.cohortNode.screeningPeriod !== null && `${this.cohortNode.screeningPeriod}` === '') {
        this.cohortNode.screeningPeriod = undefined;
      }
      this.onFieldChange();
    }
  }

  getPrecedingCohorts(dependencyId: string): CohortNode[] {
    return this.cohorts().filter(c => this.service.isCohortPreceding(dependencyId, c.id));
  }

  getDependentCohorts(dependencyId: string): CohortNode[] {
    return this.cohorts().filter(c => this.service.isCohortDependent(dependencyId, c.id));
  }

  toggleCohortExpand(cohort: CohortNode) {
    cohort.isExpanded = !cohort.isExpanded;
    this.service.updateNodeData(cohort.id, cohort);
  }

  resetCohortDimensions(id: string) {
    this.service.resetCohortDimensions(id);
  }

  onDimensionChange() {
    if (this.node && this.node.type === 'cohort') {
      const c = this.node as CohortNode;
      const w = Math.max(140, Math.min(700, c.width || 180));
      const h = Math.max(44, Math.min(260, c.height || 50));
      this.service.updateNodeDimensions(c.id, w, h);
    }
  }

  deleteCohort(id: string) {
    this.service.deleteNode(id);
  }

  onDependencyChange(dep: DependencyNode) {
    this.service.updateNodeData(dep.id, dep);
  }

  setDependencyIcon(dep: DependencyNode, iconId: string) {
    dep.icon = iconId;
    this.service.updateNodeData(dep.id, dep);
  }

  deleteDependency(id: string) {
    this.service.deleteNode(id);
  }

  // --- Add Cohort Modal (User has to provide Randomization Target & Screening Period) ---
  showAddCohortModal = false;
  newCohortName = '';
  newCohortLevel: 'Worldwide' | 'Country' = 'Worldwide';
  newCohortTarget: number | null = null;
  newCohortScreening: number | null = null;
  newCohortTargetDate = '';

  openAddCohortModal() {
    const cohorts = this.cohorts();
    const letter = String.fromCharCode(65 + (cohorts.length % 26));
    this.newCohortName = `Cohort ${letter}`;
    this.newCohortLevel = 'Worldwide';
    this.newCohortTarget = null;
    this.newCohortScreening = null;
    this.newCohortTargetDate = '';
    this.showAddCohortModal = true;
  }

  closeAddCohortModal() {
    this.showAddCohortModal = false;
  }

  isAddCohortValid(): boolean {
    return !!(
      this.newCohortName.trim() &&
      this.newCohortTarget !== null &&
      this.newCohortTarget !== undefined &&
      this.newCohortTarget > 0 &&
      this.newCohortScreening !== null &&
      this.newCohortScreening !== undefined &&
      this.newCohortScreening >= 0
    );
  }

  confirmAddNewCohort() {
    if (!this.isAddCohortValid()) return;
    this.service.addCohort(this.newCohortName.trim(), this.newCohortTarget!, {
      name: this.newCohortName.trim(),
      cohortLevel: this.newCohortLevel,
      subjects: this.newCohortTarget!,
      randomizationTarget: this.newCohortTarget!,
      screeningPeriod: this.newCohortScreening!,
      targetLastSubjectRandomized: this.newCohortTargetDate || ''
    });
    this.showAddCohortModal = false;
    setTimeout(() => {
      this.scrollCohorts(9999);
    }, 60);
  }

  addNewCohort() {
    this.openAddCohortModal();
  }

  addNewDependency() {
    this.service.addDependency();
  }

  // --- Selected Single Node Handlers ---

  onFieldChange() {
    if (this.node) {
      this.service.updateNodeData(this.node.id, this.node);
    }
  }

  onConnectionFieldChange() {
    if (this.connection) {
      this.service.updateConnection(this.connection.id, this.connection);
    }
  }

  selectIcon(iconId: string) {
    if (this.dependencyNode) {
      this.dependencyNode.icon = iconId;
      this.onFieldChange();
    }
  }

  getNodeName(nodeId: string): string {
    const node = this.service.nodes().find(n => n.id === nodeId);
    return node ? (node.name || 'Unnamed') : 'Unknown';
  }

  deleteCurrentNode() {
    if (this.node) {
      this.service.deleteNode(this.node.id);
    }
  }

  deleteCurrentConnection() {
    if (this.connection) {
      this.service.deleteConnection(this.connection.id);
    }
  }
}
