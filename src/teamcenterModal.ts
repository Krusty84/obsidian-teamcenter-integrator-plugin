// TeamcenterModal.ts

import { App,Modal, Setting } from 'obsidian';
import TeamcenterApi, { BOMNode, RevisionRule} from './teamcenterApi';
//import {TeamcenterIntegratorPluginSettings} from 'src/settings'
import { TeamcenterIntegratorPluginSettings } from 'main';
export class TeamcenterModal extends Modal {
    //settings: TeamcenterIntegratorPluginSettings;
    teamcenterApi: TeamcenterApi;
    private revisionRules: RevisionRule[] = [];
    private selectedRevisionRuleUid: string | null = null;
    private selectedRevisionRule: string | null = null;
    private itemId = "";
    private revId = "";
    private settings: TeamcenterIntegratorPluginSettings;
    private contentContainer: HTMLElement;
    constructor(app: App,settings: TeamcenterIntegratorPluginSettings) {
        super(app);
        this.settings = settings;
    }

    async onOpen() {
        const {contentEl} = this;
        this.teamcenterApi = new TeamcenterApi(this.settings);
        contentEl.empty();
        // Create a wrapper for the entire modal content
        const wrapper = contentEl.createDiv({ cls: 'modal-wrapper' });
        // Create the fixed header container for inputs
        const headerContainer = wrapper.createDiv({ cls: 'header-container' });
        headerContainer.createEl('h2', { text: 'Teamcenter Query' });

        // Text field for Item ID
   /*     new Setting(contentEl)
            .setName('Item ID')
            .addText(text => {
                text.setPlaceholder('Enter Item ID')
                    .onChange(value => {
                        this.itemId = value;
                    });
            });*/

        new Setting(contentEl)
            .setName('Item ID')
            .addText(text => {
                text.setPlaceholder('Enter Item ID')
                    .setValue(this.itemId)
                    .onChange(value => {
                        this.itemId = value;
                    });
            });

        new Setting(contentEl)
            .setName('Revision ID')
            .addText(text => {
                text.setPlaceholder('Enter Revision ID')
                    .onChange(value => {
                        this.revId = value;
                    });
            });

        // Submit button
        new Setting(contentEl)
            .addButton(button => {
                button.setButtonText('Submit')
                    .setCta()
                    .onClick(async () => {
                        await this.teamcenterApi.login();
                        const { itemUid, itemRevUid } = await this.teamcenterApi.getItemUIDfromID(this.itemId,this.revId);
                        const { bomWindowUid, bomLineUid } = await this.teamcenterApi.createBOMWindow(itemUid);
                        const bomTree = await this.teamcenterApi.openBOM(bomLineUid);
                        this.displayBOM(bomTree);
                        console.log(itemUid+"_"+itemRevUid);
                        //this.submit();
                    });
            });

        // Cancel button
        new Setting(contentEl)
            .addButton(button => {
                button.setButtonText('Cancel')
                    .onClick(() => {
                        this.close();
                    });
            });

        this.contentContainer = wrapper.createDiv({ cls: 'content-container' });

        // If a BOM has already been displayed, show it
       /* if (this.bomTree) {
            this.displayBOM(this.bomTree);
        }*/
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    submit() {
        // Handle the form submission
       // console.log('Selected Revision Rule:', this.settings.selectedRevisionRuleUid);
        console.log('Item ID:', this.itemId);
        console.log('Item ID:', this.revId);

        // Perform any actions with the data here

        //this.close();
    }
    /*displayBOM(bomTree: BOMNode) {
        const { contentEl } = this;

        // Clear existing content
        contentEl.empty();

        // Create a container for the BOM
        const container = contentEl.createDiv({ cls: 'bom-container' });

        // Set the header
        container.createEl('h2', { text: `Teamcenter BOM Structure: ${this.itemId}` });

        // Create a table
        const table = container.createEl('table', { cls: 'bom-table' });

        // Create the table header
        const thead = table.createEl('thead');
        const headerRow = thead.createEl('tr');
        headerRow.createEl('th', { text: 'Item ID' });
        headerRow.createEl('th', { text: 'Revision ID' });
        headerRow.createEl('th', { text: 'Name' });
        headerRow.createEl('th', { text: 'Owner' });
        headerRow.createEl('th', { text: 'Last Mod Date' });

        // Create the table body
        const tbody = table.createEl('tbody');

        // Generate and append the BOM rows
        const bomHtml = this.generateBOMHtml(bomTree);
        tbody.innerHTML = bomHtml;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
    .bom-table {
      width: 100%;
      border-collapse: collapse;
    }
    .bom-table th, .bom-table td {
      border: 1px solid #ccc;
      padding: 4px 8px;
      text-align: left;
    }
    .bom-row .toggle-icon {
      cursor: pointer;
      margin-right: 4px;
    }
    .hidden {
      display: none;
    }
    .highlighted {
      background-color: #ffe085;
    }
  `;
        contentEl.appendChild(style);

        // Add event listeners
        this.addEventListeners(container);
    }*/
    displayBOM(bomTree: BOMNode) {
        const container = this.contentContainer;

        // Clear previous BOM content
        container.empty();

        // Create the collapsible section using <details> and <summary>
        const collapsibleSection = container.createEl('details', { cls: 'bom-collapsible' });
        const summary = collapsibleSection.createEl('summary', { text: 'View BOM Structure' });

        // Create a table inside the collapsible section
        const table = collapsibleSection.createEl('table', { cls: 'bom-table' });

        // Create the table header
        const thead = table.createEl('thead');
        const headerRow = thead.createEl('tr');
        headerRow.createEl('th', { text: 'Item ID' });
        headerRow.createEl('th', { text: 'Revision ID' });
        headerRow.createEl('th', { text: 'Name' });
        headerRow.createEl('th', { text: 'Owner' });
        headerRow.createEl('th', { text: 'Last Mod Date' });

        // Create the table body
        const tbody = table.createEl('tbody');

        // Generate and append the BOM rows
        const bomHtml = this.generateBOMHtml(bomTree);
        tbody.innerHTML = bomHtml;

        // Add styles if not already added
        if (!this.contentEl.querySelector('#modal-styles')) {
            const style = document.createElement('style');
            style.id = 'modal-styles';
            style.textContent = `
      /* Styles for the modal */
      .modal-wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .header-container {
        /* Fix the header at the top */
        position: sticky;
        top: 0;
        background-color: var(--background-primary);
        padding-bottom: 1em;
        z-index: 1;
      }

      .content-container {
        /* Allow the content to scroll */
        flex: 1;
        overflow-y: auto;
      }

      /* Existing styles for BOM table and other elements */
      .bom-table {
        width: 100%;
        border-collapse: collapse;
      }
      .bom-table th, .bom-table td {
        border: 1px solid #ccc;
        padding: 4px 8px;
        text-align: left;
      }
      .bom-row .toggle-icon {
        cursor: pointer;
        margin-right: 4px;
      }
      .hidden {
        display: none;
      }
      .highlighted {
        background-color: #ffe085;
      }
      .bom-collapsible summary {
        font-weight: bold;
        cursor: pointer;
        margin-bottom: 8px;
      }
    `;
            this.contentEl.appendChild(style);
        }

        // Add event listeners
        this.addEventListeners(collapsibleSection);
    }




    generateBOMHtml(bomNode: BOMNode, parentUid: string | null = null, depth: number = 0): string {
        const rowId = `row-${bomNode.uid.replace(/[^a-zA-Z0-9]/g, '')}`;
        const parentRowId = parentUid ? `row-${parentUid.replace(/[^a-zA-Z0-9]/g, '')}` : null;
        const hasChildren = bomNode.children.length > 0;

        // Prepare indentation based on depth
        const indent = depth * 20;

        // Build the row HTML
        let rowHtml = `<tr id="${rowId}" data-depth="${depth}"${parentRowId ? ` data-parent="${parentRowId}"` : ''} class="bom-row">
    <td style="padding-left: ${indent}px;">
      ${hasChildren ? `<span class="toggle-icon">[+]</span>` : ''}
      ${bomNode.attributes['item_id'] || 'N/A'}
    </td>
    <td>${bomNode.attributes['item_revision_id'] || 'N/A'}</td>
    <td>${bomNode.attributes['object_name'] || 'N/A'}</td>
    <td>${bomNode.attributes['owning_user'] || 'N/A'}</td>
    <td>${bomNode.attributes['last_mod_date'] || 'N/A'}</td>
  </tr>`;

        // Recursively build child rows
        let childrenHtml = '';
        for (const child of bomNode.children) {
            childrenHtml += this.generateBOMHtml(child, bomNode.uid, depth + 1);
        }

        return rowHtml + childrenHtml;
    }

    addEventListeners(container: HTMLElement) {
        const rows = container.querySelectorAll('.bom-row');

        rows.forEach(row => {
            const toggleIcon = row.querySelector('.toggle-icon');
            const rowId = row.id;
            const depth = parseInt(row.getAttribute('data-depth') || '0');

            if (toggleIcon) {
                toggleIcon.addEventListener('click', (event) => {
                    event.stopPropagation(); // Prevent row click event
                    const isExpanded = toggleIcon.textContent === '[-]';
                    toggleIcon.textContent = isExpanded ? '[+]' : '[-]';

                    // Toggle child rows
                    this.toggleChildRows(rowId, !isExpanded);
                });
            }

            // Row click event for highlighting
            row.addEventListener('click', () => {
                this.highlightRow(row);
            });
        });
    }

    toggleChildRows(parentRowId: string, show: boolean) {
        const childRows = document.querySelectorAll(`.bom-row[data-parent="${parentRowId}"]`);

        childRows.forEach(row => {
            if (show) {
                row.classList.remove('hidden');
            } else {
                row.classList.add('hidden');
            }

            // If hiding, also hide all descendant rows
            if (!show) {
                const toggleIcon = row.querySelector('.toggle-icon');
                if (toggleIcon && toggleIcon.textContent === '[-]') {
                    toggleIcon.textContent = '[+]';
                }
                this.toggleChildRows(row.id, false);
            }
        });
    }

    highlightRow(row: HTMLElement) {
        // Remove highlighting from other rows
        const highlightedRows = document.querySelectorAll('.bom-row.highlighted');
        highlightedRows.forEach(r => r.classList.remove('highlighted'));

        // Add highlighting to the selected row
        row.classList.add('highlighted');
    }

    toggleHighlight(element: HTMLElement) {
        // Remove highlighting from previously selected items
        const highlightedItems = this.contentEl.querySelectorAll('.bom-item.highlighted');
        highlightedItems.forEach(item => item.classList.remove('highlighted'));

        // Add highlighting to the clicked item
        element.classList.add('highlighted');
    }
}
