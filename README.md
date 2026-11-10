# ngx-cohort-designer

> A user-controlled, interactive **Clinical Trial Cohort Designer** Angular component library for designing clinical study arms, cohorts, safety delays, and dependencies.

[![Angular](https://img.shields.io/badge/Angular-18%2B%20%7C%2019%2B-dd0031.svg)](https://angular.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Features

- 🟦 **Minimal Cohort Blocks**:
  - Displays only the **Cohort Name** (rendered in the user-selected color, default `#000000` black) and defined randomized subjects ($N=X$).
  - **Clinical Parameters**:
    - **Cohort Level**: Radio button selection (`Worldwide` or `Country`).
    - **Randomization Target**: Target number of randomized subjects ($N$).
    - **Target Last Subject Randomized**: Target cutoff date for last randomized patient ($YYYY-MM-DD$).
    - **Screening Period**: Protocol screening window duration in days.
  - **External "Select Cohort" Integration**: Add cohorts via a dedicated external button and modal dialog displaying available study cohorts with checkboxes.
  - **Hover Tooltip**: Displays the full cohort title and subject count on mouse hover.
  - **Drag-to-Resize Sides**: Click and drag any side (left, right, bottom, or corner) directly on the canvas to make the card wider or taller ($140\text{px} - 700\text{px}$ width, $44\text{px} - 260\text{px}$ height). Ports dynamically adjust with zero lag.
- 🟢 **Minimal Dependency & Delay Blocks**:
  - Small circular nodes ($46\text{px} \times 46\text{px}$) with standard unified clinical delay/clock icon and minimal delay days badge (`14d`). Defaults to clean black (`#000000`).
  - Added by clicking the standalone **+ Add Dependency** button.
  - **Clinical Delay Parameters**:
    - **Preceding Cohort(s)**: Interactive checkbox list of cohorts on the canvas that precede this dependency gate.
    - **Event Gate**: Radio selection between **Number of Subjects** (with required subject count) and **Enrollment Complete**.
    - **Dependent Cohort(s)**: Interactive checkbox list of cohorts on the canvas that depend on this gate.
    - **Minimal Delay**: Delay window in days.
- ⚡ **Pure Horizontal Left & Right Connections**:
  - Strictly **Left (Input)** and **Right (Output)** connector ports.
  - **Clinical Validation Rules**:
    - **No direct Cohort-to-Cohort connections**: A dependency/delay gate is strictly required between cohorts ($\text{Cohort} \rightarrow \text{Dependency} \rightarrow \text{Cohort}$).
    - **No circular dependencies**: Directed graph cycle detection prevents loops automatically.
    - **Clean Drag-Cancel**: Releasing an arrow on empty canvas resets and removes the wire immediately.
- 🎛️ **Expandable Right-Hand Panel**:
  - **Leftward Expansion**: Expanding the panel naturally shrinks the canvas viewport space for comfortable simultaneous batch editing.
  - **All Blocks View with Left-to-Right Sequencing**: Displays cards strictly in the sequence they appear on the canvas from left to right (`a.x - b.x`).
  - **Section Switcher**: Clean segmented toggle to switch between `Cohorts (X)` and `Dependencies (Y)`.
  - **Single Section Details View**: Automatically opens when clicking any cohort or dependency on the canvas. Clean header button allows instant return to All Blocks.
- 💾 **Programmatic Save API**:
  - Exposes `saveData(): CohortDesignFlow` to gather all cohort parameters, custom dimensions, delay rules, and connection flows in a clean JSON format.

---

## How to Add to a Different Angular Project

### Step 1: Install the Package

#### Option A: From Local `.tgz` Archive (Recommended for local/offline projects)
Copy `ngx-cohort-designer-0.1.0.tgz` to your target Angular project root, then run:
```bash
npm install ./ngx-cohort-designer-0.1.0.tgz
```

#### Option B: From NPM Registry (when published)
```bash
npm install ngx-cohort-designer
```

---

### Step 2: Import the Component

`ngx-cohort-designer` is a standalone component, compatible with **Angular 18 and Angular 19+**.

#### In a Standalone Component (Modern Angular):
```typescript
import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  CohortDesignerComponent, 
  CohortDesignFlow,
  PROTOCOL_TEMPLATES 
} from 'ngx-cohort-designer';

@Component({
  selector: 'app-study-designer',
  standalone: true,
  imports: [CommonModule, CohortDesignerComponent],
  templateUrl: './study-designer.component.html',
  styleUrls: ['./study-designer.component.scss']
})
export class StudyDesignerComponent {
  // Reference to call public methods like saveData()
  @ViewChild('designer') designer!: CohortDesignerComponent;

  // Initialize with blank canvas or pre-built sample protocol
  protocolFlow: CohortDesignFlow = {
    nodes: [],
    connections: []
  };

  // Live change listener
  onFlowChange(flow: CohortDesignFlow) {
    console.log('Flow updated on canvas:', flow);
  }

  // Save method to gather all cohort data
  saveProtocol() {
    const savedData: CohortDesignFlow = this.designer.saveData();
    console.log('Saved protocol data ready for backend/EDC:', savedData);

    // Send to your backend API:
    // this.http.post('/api/clinical-protocols', savedData).subscribe();
  }
}
```

#### In an NgModule-based Project (Classic Angular):
```typescript
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CohortDesignerComponent } from 'ngx-cohort-designer';
import { MyStudyComponent } from './my-study.component';

@NgModule({
  declarations: [MyStudyComponent],
  imports: [
    BrowserModule,
    CohortDesignerComponent // Standalone component can be imported directly into NgModule
  ]
})
export class MyStudyModule {}
```

---

### Step 3: Add to HTML Template

Ensure the parent container has an explicit height (e.g. `100vh` or `600px`):

```html
<div class="study-editor-container">
  <!-- Host App Header with Save Action -->
  <div class="editor-header">
    <h2>Clinical Study Arm & Cohort Designer</h2>
    <button type="button" class="btn-save" (click)="saveProtocol()">
      Save Protocol Design
    </button>
  </div>

  <!-- Cohort Designer Component -->
  <div class="designer-canvas-wrapper">
    <lib-cohort-designer
      #designer
      [flowData]="protocolFlow"
      [readonly]="false"
      (flowChange)="onFlowChange($event)"
    ></lib-cohort-designer>
  </div>
</div>
```

---

### Step 4: Component Styles

In your component SCSS (`study-designer.component.scss`):

```scss
.study-editor-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  box-sizing: border-box;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #0f172a;
  }

  .btn-save {
    padding: 8px 16px;
    background: #0284c7;
    color: #ffffff;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover {
      background: #0369a1;
    }
  }
}

.designer-canvas-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
}
```

---

## How to Make Changes & Generate Updated Library

This section explains how to modify the library code, test your changes locally, and generate a new distributable package.

### 1. Project Directory Structure

```
cohortdesign/
├── projects/
│   ├── ngx-cohort-designer/             # The library source code
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   ├── components/
│   │   │   │   │   ├── cohort-node/     # Cohort card, side-resize handles, tooltip
│   │   │   │   │   ├── dependency-node/ # Delay gate node, icon display
│   │   │   │   │   ├── toolbar/         # Add Cohort and Add Delay buttons
│   │   │   │   │   └── inspector-panel/ # Right-side drawer & batch editing forms
│   │   │   │   ├── constants/           # Icons and sample protocols
│   │   │   │   ├── models/              # TypeScript interfaces (CohortNode, FlowNode, etc.)
│   │   │   │   ├── services/            # State management, port geometry, cycle detection
│   │   │   │   ├── ngx-cohort-designer.component.ts   # Canvas viewport container
│   │   │   │   ├── ngx-cohort-designer.component.html
│   │   │   │   └── ngx-cohort-designer.component.scss
│   │   │   └── public-api.ts            # Public exports exposed to external consumers
│   │   ├── package.json                 # Library version and dependencies
│   │   └── ng-package.json              # ng-packagr configuration
│   └── demo-app/                        # Host application used for development testing
├── dist/                                # Build output directory (generated on build)
└── package.json                         # Workspace scripts and dev tooling
```

---

### 2. Making Code Changes

- **To modify Cohort cards** (e.g. styling, resize behavior, tooltip):
  Edit `projects/ngx-cohort-designer/src/lib/components/cohort-node/`.
- **To modify Delay / Dependency nodes** (e.g. icon sizes, delay pills):
  Edit `projects/ngx-cohort-designer/src/lib/components/dependency-node/`.
- **To modify the Right-Hand Drawer** (e.g. headers, inputs, card fields):
  Edit `projects/ngx-cohort-designer/src/lib/components/inspector-panel/`.
- **To modify Canvas & Wires** (e.g. drag connections, bezier math, cycle rules):
  Edit `projects/ngx-cohort-designer/src/lib/services/cohort-designer.service.ts` and `ngx-cohort-designer.component.ts`.
- **To export new models or functions**:
  Add them to `projects/ngx-cohort-designer/src/public-api.ts`.

---

### 3. Testing Changes Locally

#### A. Interactive Live Development Server
Run the local host demo app with automatic live reload on code changes:
```bash
npm start
```
Open [http://localhost:4200](http://localhost:4200) in your browser to interactively test changes on the canvas and right-hand panel.

#### B. Running Automated Unit Tests
Run the Karma test suite in headless Chrome:
```bash
npx ng test ngx-cohort-designer --watch=false --browsers=ChromeHeadless
```
To run tests in watch mode during development:
```bash
npx ng test ngx-cohort-designer
```

---

### 4. Compiling the Library

To compile the library via `ng-packagr` without creating an archive:
```bash
npm run build:lib
```
The compiled Angular package output is written to:
`dist/ngx-cohort-designer/`

---

### 5. Generating the Updated `.tgz` Package

To compile the library and bundle it into a distributable `.tgz` npm package archive:
```bash
npm run pack:lib
```

This runs `ng build ngx-cohort-designer` and executes `npm pack` inside `dist/ngx-cohort-designer`, generating:
`dist/ngx-cohort-designer/ngx-cohort-designer-0.1.0.tgz`

To copy the updated package to your workspace root:

**Windows (PowerShell):**
```powershell
Copy-Item dist/ngx-cohort-designer/ngx-cohort-designer-0.1.0.tgz -Destination . -Force
```

**macOS / Linux (Bash):**
```bash
cp dist/ngx-cohort-designer/ngx-cohort-designer-0.1.0.tgz .
```

---

### 6. Bumping the Library Version

When publishing or releasing an update, update the version in `projects/ngx-cohort-designer/package.json`:
```json
{
  "name": "ngx-cohort-designer",
  "version": "0.2.0"
}
```
Then run:
```bash
npm run pack:lib
```
This generates `ngx-cohort-designer-0.2.0.tgz`.

---

### 7. Applying the Updated Library to Your Project

In the external Angular project where you use the library:

```bash
# Force reinstall to clear npm cache of local tarball
npm install --force ./ngx-cohort-designer-0.1.0.tgz
```

Restart your application dev server (`ng serve`), and your updated component will be active!

---

## Component API Reference

### Component Selector
`<lib-cohort-designer>`

### Inputs

| Input | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `[flowData]` | `CohortDesignFlow` | `undefined` | Initial protocol design flow data to load onto canvas. |
| `[readonly]` | `boolean` | `false` | When true, disables block additions, side resizing, deletions, and wire dragging. |
| `[customIcons]`| `IconOption[]` | `[]` | Optional extra SVG icons to append to the clinical delay icon picker gallery. |

### Outputs

| Output | Event Payload | Description |
| :--- | :--- | :--- |
| `(flowChange)` | `CohortDesignFlow` | Emitted whenever any block, dimension, position, wire, or parameter is modified. |
| `(save)` | `CohortDesignFlow` | Emitted whenever `designer.saveData()` is called. |
| `(nodeSelected)` | `FlowNode \| null` | Emitted when a node is selected or deselected. |
| `(connectionSelected)` | `Connection \| null` | Emitted when a connection wire is clicked or deselected. |

### Public Methods (Callable via `@ViewChild`)

```typescript
// Gathers all cohort data, custom card dimensions, parameters, dependencies, and connections
const flow: CohortDesignFlow = this.designer.saveData();

// Retrieves the current live flow state without triggering save event
const flow: CohortDesignFlow = this.designer.getData();

// Loads an existing protocol design definition
this.designer.loadData(existingFlow);

// Clears the canvas
this.designer.clear();

// Programmatically adds a new cohort block at coordinates (x, y)
this.designer.addCohort(x, y);

// Programmatically adds a new dependency block at coordinates (x, y)
this.designer.addDependency(x, y, 'clock');
```

---

## Data Schema (`CohortDesignFlow`)

The JSON structure exported by `saveData()`:

```json
{
  "nodes": [
    {
      "id": "cohort-1712345000-101",
      "type": "cohort",
      "name": "Cohort A (Control)",
      "subjects": 60,
      "color": "#000000",
      "width": 180,
      "height": 50,
      "description": "Standard of care baseline arm",
      "x": 100,
      "y": 140
    },
    {
      "id": "dep-1712345000-202",
      "type": "dependency",
      "name": "Safety Review",
      "days": 14,
      "icon": "clock",
      "color": "#0d9488",
      "description": "Safety evaluation before escalation",
      "x": 380,
      "y": 142
    },
    {
      "id": "cohort-1712345000-303",
      "type": "cohort",
      "name": "Cohort B (Escalation)",
      "subjects": 40,
      "color": "#0284c7",
      "width": 220,
      "height": 50,
      "description": "50mg dose escalation arm",
      "x": 520,
      "y": 140
    }
  ],
  "connections": [
    {
      "id": "conn-1712345000-404",
      "fromNodeId": "cohort-1712345000-101",
      "fromPort": "right",
      "toNodeId": "dep-1712345000-202",
      "toPort": "left",
      "color": "#0284c7"
    },
    {
      "id": "conn-1712345000-505",
      "fromNodeId": "dep-1712345000-202",
      "fromPort": "right",
      "toNodeId": "cohort-1712345000-303",
      "toPort": "left",
      "color": "#0284c7"
    }
  ]
}
```

---

## License

MIT &copy; Clinical Trial Application Team
