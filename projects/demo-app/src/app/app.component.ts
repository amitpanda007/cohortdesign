import { Component, ViewChild, signal, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CohortDesignerComponent,
  CohortDesignFlow,
  PROTOCOL_TEMPLATES,
  ProtocolTemplate
} from 'ngx-cohort-designer';

export interface MasterCohortItem {
  name: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, CohortDesignerComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  @ViewChild(CohortDesignerComponent) designer!: CohortDesignerComponent;

  ngAfterViewInit() {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('panel') === 'open') {
        const sec = params.get('section') as 'cohorts' | 'dependencies' | null;
        setTimeout(() => this.designer?.openOverview(sec || undefined), 250);
      }
    }
  }

  readonly templates = PROTOCOL_TEMPLATES;
  activeProtocol: CohortDesignFlow = PROTOCOL_TEMPLATES[0].flow;
  currentTemplateId = 'sequential_cohorts';

  // Live updated flow
  latestFlow = signal<CohortDesignFlow>(this.activeProtocol);

  showJsonModal = false;
  showCohortModal = false;
  toastMessage = '';
  toastVisible = false;
  private toastTimer: any;

  // Master Study Cohorts List (Names only)
  readonly masterCohortList: MasterCohortItem[] = [
    { name: 'Cohort 1 - Starting Dose (10mg)' },
    { name: 'Cohort 2 - Escalation Level 1 (25mg)' },
    { name: 'Cohort 3 - Escalation Level 2 (50mg)' },
    { name: 'Cohort 4 - Escalation Level 3 (100mg)' },
    { name: 'Expansion Cohort - Safety & Tolerability (60mg)' },
    { name: 'Expansion Cohort - Pharmacokinetics (PK/PD)' },
    { name: 'Pediatric Sub-Study Cohort' }
  ];

  selectedCohortNames = new Set<string>();
  customCohortName = '';

  onFlowChanged(flow: CohortDesignFlow) {
    this.latestFlow.set(flow);
  }

  // --- Select Cohort Modal Workflows ---

  openCohortSelectModal() {
    this.selectedCohortNames.clear();
    this.customCohortName = '';
    this.showCohortModal = true;
  }

  closeCohortSelectModal() {
    this.showCohortModal = false;
  }

  toggleCohortSelection(name: string) {
    if (this.selectedCohortNames.has(name)) {
      this.selectedCohortNames.delete(name);
    } else {
      this.selectedCohortNames.add(name);
    }
  }

  isCohortOnCanvas(name: string): boolean {
    const nodes = this.latestFlow().nodes || [];
    return nodes.some(
      n => n.type === 'cohort' && (n as any).name?.toLowerCase().trim() === name.toLowerCase().trim()
    );
  }

  confirmAddSelectedCohorts() {
    if (!this.designer) return;
    const names = Array.from(this.selectedCohortNames);
    const count = names.length;

    for (const name of names) {
      this.designer.addCohortByName(name);
    }

    this.selectedCohortNames.clear();
    this.showCohortModal = false;
    this.showToast(`Added ${count} cohort${count > 1 ? 's' : ''} to canvas!`);
  }

  addCustomCohortDirectly() {
    const trimmed = this.customCohortName.trim();
    if (!trimmed || !this.designer) return;
    this.designer.addCohortByName(trimmed);
    this.customCohortName = '';
    this.showCohortModal = false;
    this.showToast(`Added "${trimmed}" to canvas!`);
  }

  /**
   * Save button in host application:
   * Calls designer.saveData() to gather all cohort & dependency data.
   */
  onSaveClicked() {
    if (this.designer) {
      const data = this.designer.saveData();
      this.latestFlow.set(data);
      console.log('Saved Cohort Design Data:', data);
      this.showToast(`Saved ${data.nodes.length} blocks (${data.connections.length} connections) successfully!`);
    }
  }

  loadTemplate(tpl: ProtocolTemplate) {
    this.currentTemplateId = tpl.id;
    this.activeProtocol = JSON.parse(JSON.stringify(tpl.flow));
    if (this.designer) {
      this.designer.loadData(this.activeProtocol);
    }
    this.showToast(`Loaded ${tpl.name}`);
  }

  loadBlankSlate() {
    this.currentTemplateId = 'blank';
    this.activeProtocol = { nodes: [], connections: [] };
    if (this.designer) {
      this.designer.clear();
    }
    this.showToast('Cleared canvas for custom design');
  }

  openJsonModal() {
    if (this.designer) {
      this.latestFlow.set(this.designer.getData());
    }
    this.showJsonModal = true;
  }

  closeJsonModal() {
    this.showJsonModal = false;
  }

  get jsonExportString(): string {
    return JSON.stringify(this.latestFlow(), null, 2);
  }

  copyJsonToClipboard() {
    navigator.clipboard.writeText(this.jsonExportString).then(() => {
      this.showToast('Copied JSON to clipboard');
    });
  }

  showToast(message: string) {
    this.toastMessage = message;
    this.toastVisible = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastVisible = false;
    }, 3000);
  }
}
