// MainWindow.ts

import {App, Modal, Notice, Setting, TFile} from 'obsidian';
import TcAPI, { BOMNode} from './tcAPI';
import {TeamcenterIntegratorPluginSettings} from 'src/settings'
import {generateBOMHtml, syncBOM} from "./bomUtils";
export class MainWindow extends Modal {
    //settings: TeamcenterIntegratorPluginSettings;
    tcAPI: TcAPI;
    private itemId = "";
    private revId = "";
    private settings: TeamcenterIntegratorPluginSettings;
    private contentContainer: HTMLElement;
    private bomTree: BOMNode | null = null;
    constructor(app: App,settings: TeamcenterIntegratorPluginSettings) {
        super(app);
        this.settings = settings;
    }

    async onOpen() {
        const {contentEl,modalEl} = this;
        modalEl.addClass('teamcenter-modal');
        this.tcAPI = new TcAPI(this.settings);
        contentEl.empty();
        // Create a wrapper for the entire modal content
        const wrapper = contentEl.createDiv({ cls: 'modal-wrapper' });
        // Create the fixed header container for inputs
        const headerContainer = wrapper.createDiv({ cls: 'header-container' });
        headerContainer.createEl('h2', { text: 'Teamcenter Query' });

        // Text field for Item ID
        new Setting(headerContainer)
            .setName('Item ID')
            .addText(text => {
                text.setPlaceholder('Enter Item ID')
                    .onChange(value => {
                        this.itemId = value;
                    });
            });

        new Setting(headerContainer)
            .setName('Revision ID')
            .addText(text => {
                text.setPlaceholder('Enter Revision ID')
                    .onChange(value => {
                        this.revId = value;
                    });
            });

        new Setting(headerContainer)
            .addButton(button => {
                button.setButtonText('Search')
                    .setCta()
                    .onClick(async () => {
                        //Teamcenter Dance Start
                        await this.tcAPI.login();
                        const { itemUid, itemRevUid } = await this.tcAPI.getItemUIDfromID(this.itemId,this.revId);
                        const { bomLineUid } = await this.tcAPI.createBOMWindow(itemUid);
                        this.bomTree = await this.tcAPI.openBOM(bomLineUid);
                        this.displayBOM(this.bomTree);
                        //Teamcenter Dance Finish
                    });
            });
        new Setting(headerContainer)
            .addButton(button => {
                button.setButtonText('Sync')
                    .onClick(async () => {
                        await syncBOM(this.bomTree);
                    });
            });
        // Cancel button
        new Setting(headerContainer)
            .addButton(button => {
                button.setButtonText('Cancel')
                    .onClick(() => {
                        this.close();
                    });
            });

        this.contentContainer = wrapper.createDiv({ cls: 'content-container' });

        // If a BOM has already been displayed, show it
        if (this.bomTree) {
            this.displayBOM(this.bomTree);
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    displayBOM(bomTree: BOMNode) {
        const container = this.contentContainer;
        // Clear previous BOM content
        container.empty();
        // Create the collapsible section using <details> and <summary>
        const collapsibleSection = container.createEl('details', { cls: 'bom-collapsible' });
        collapsibleSection.createEl('summary', { text: 'Open BOM Structure' });
        // Create a table inside the collapsible section
        const table = collapsibleSection.createEl('table', { cls: 'bom-table' });
        // Create the table header
        const thead = table.createEl('thead');
        const headerRow = thead.createEl('tr');
        headerRow.createEl('th', { text: 'Item ID' });
        headerRow.createEl('th', { text: 'Revision ID' });
        headerRow.createEl('th', { text: 'Name' });
        headerRow.createEl('th', { text: 'Desc' });
        headerRow.createEl('th', { text: 'Type' });
        headerRow.createEl('th', { text: 'Owner' });
        headerRow.createEl('th', { text: 'Last Mod Date' });

        // Create the table body
        const tbody = table.createEl('tbody');

        // Generate and append the BOM rows
       // const bomHtml = this.generateBOMHtml(bomTree);
        const bomHtml = generateBOMHtml(bomTree);
        tbody.innerHTML = bomHtml;

        // Add event listeners
        this.addEventListeners(collapsibleSection);
    }

    /*generateBOMHtml(bomNode: BOMNode, parentUid: string | null = null, depth: number = 0): string {
        const rowId = `row-${bomNode.uid.replace(/[^a-zA-Z0-9]/g, '')}`;
        const parentRowId = parentUid ? `row-${parentUid.replace(/[^a-zA-Z0-9]/g, '')}` : null;
        const hasChildren = bomNode.children.length > 0;

        const depthClass = `depth-${depth}`; // Assign a class based on depth

        // Use Unicode triangles for expand/collapse icons
        const toggleIcon = hasChildren ? `<span class="toggle-icon">▶</span>` : '';

        // Build the row HTML
        let rowHtml = `<tr id="${rowId}" data-depth="${depth}"${parentRowId ? ` data-parent="${parentRowId}"` : ''} class="bom-row ${depthClass}">
      <td>
        ${toggleIcon}
        ${bomNode.attributes['item_id'] || 'N/A'}
      </td>
      <td>${bomNode.attributes['item_revision_id'] || 'N/A'}</td>
      <td>${bomNode.attributes['object_name'] || 'N/A'}</td>
      <td>${bomNode.attributes['object_desc'] || 'N/A'}</td>
      <td>${bomNode.attributes['object_type'] || 'N/A'}</td>
      <td>${bomNode.attributes['owning_user'] || 'N/A'}</td>
      <td>${bomNode.attributes['last_mod_date'] || 'N/A'}</td>
    </tr>`;

        // Recursively build child rows
        let childrenHtml = '';
        for (const child of bomNode.children) {
            childrenHtml += this.generateBOMHtml(child, bomNode.uid, depth + 1);
        }

        return rowHtml + childrenHtml;
    }*/

    addEventListeners(container: HTMLElement) {
        const rows = container.querySelectorAll('.bom-row');

        rows.forEach(row => {
            const toggleIcon = row.querySelector('.toggle-icon') as HTMLElement;
            const rowId = row.id;

            if (toggleIcon) {
                toggleIcon.addEventListener('click', (event) => {
                    event.stopPropagation(); // Prevent row click event

                    const iconElement = event.currentTarget as HTMLElement;
                    const isExpanded = iconElement.getAttribute('data-expanded') === 'true';

                    // Update the icon and data-expanded attribute
                    if (isExpanded) {
                        iconElement.textContent = '▶'; // Collapsed state
                        iconElement.setAttribute('data-expanded', 'false');
                    } else {
                        iconElement.textContent = '▼'; // Expanded state
                        iconElement.setAttribute('data-expanded', 'true');
                    }

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
                const toggleIcon = row.querySelector('.toggle-icon') as HTMLElement;
                if (toggleIcon) {
                    toggleIcon.textContent = '▶'; // Set to collapsed state
                    toggleIcon.setAttribute('data-expanded', 'false');
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
/*    sanitizeFileName(name: string): string {
        // Replace invalid characters with underscores
        return name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_');
    }*/

/*    generateAttributesSection(bomNode: BOMNode): string {
        // Use the attributes from settings or default
        /!*const attributesToInclude = this.settings.attributesToInclude || [*!/
        const attributesToInclude =  [
            { internalName: 'item_id', displayName: 'Item ID' },
            { internalName: 'item_revision_id', displayName: 'Revision ID' },
            { internalName: 'object_name', displayName: 'Name' },
            { internalName: 'object_desc', displayName: 'Description' },
            { internalName: 'owning_user', displayName: 'Owner' },
            { internalName: 'last_mod_date', displayName: 'Last Modified' },
        ];

        // Build the table content
        let tableContent = `| Attribute | Value |\n|---|---|\n`;
        for (const attr of attributesToInclude) {
            const value = bomNode.attributes[attr.internalName] || 'N/A';
            tableContent += `| ${attr.displayName} | ${value} |\n`;
        }

        // Build the URL using tcUrl from settings and UID from bomNode
        const tcUrl = this.settings.tcAWCUrl || '';
        const itemRevUid = bomNode.itemRevUid;
        const teamcenterUrl = `${tcUrl}#/com.siemens.splm.clientfx.tcui.xrt.showObject?uid=${itemRevUid}`;

        // Add the URL below the table
        const urlContent = `\n[Open in Teamcenter](${teamcenterUrl})\n`;

        // Wrap the table with markers
        return `<!-- START ATTRIBUTES -->\n${tableContent}${urlContent}<!-- END ATTRIBUTES -->\n`;
    }*/
/*    updateNoteContent(existingContent: string, newAttributesSection: string): string {
        const startMarker = '<!-- START ATTRIBUTES -->';
        const endMarker = '<!-- END ATTRIBUTES -->';

        const startIndex = existingContent.indexOf(startMarker);
        const endIndex = existingContent.indexOf(endMarker);

        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            // Replace the existing attributes section
            const beforeAttributes = existingContent.substring(0, startIndex);
            const afterAttributes = existingContent.substring(endIndex + endMarker.length);
            return `${beforeAttributes}${newAttributesSection}${afterAttributes}`;
        } else {
            // Markers not found; insert attributes at the beginning
            return `${newAttributesSection}\n\n${existingContent}`;
        }
    }*/


  /*  async syncBOMNode(bomNode: BOMNode, parentFolderPath: string) {
        const vault = this.app.vault;

        // Create the folder for the current BOM node
        const folderName = `${bomNode.attributes['item_id']}_${bomNode.attributes['object_name']}`;
        const sanitizedFolderName = this.sanitizeFileName(folderName);
        const currentFolderPath = `${parentFolderPath}/${sanitizedFolderName}`;

        // Check if the folder exists
        let currentFolder = vault.getAbstractFileByPath(currentFolderPath);
        if (!currentFolder) {
            await vault.createFolder(currentFolderPath);
        }

        // Create the note inside the current folder
        const noteName = `${bomNode.attributes['item_id']}/${bomNode.attributes['item_revision_id']}_${bomNode.attributes['object_name']}.md`;
        const sanitizedNoteName = this.sanitizeFileName(noteName);
        const notePath = `${currentFolderPath}/${sanitizedNoteName}`;

        // Generate the attributes section
        //const attributesSection = this.generateAttributesSection(bomNode);
        const attributesSection = generateAttributesSection(bomNode);

        // Check if the note exists
        let existingNote = vault.getAbstractFileByPath(notePath);
        if (existingNote && existingNote instanceof TFile) {
            // Read the existing note content
            const existingContent = await vault.read(existingNote);

            // Replace or insert the attributes section
            //const updatedContent = this.updateNoteContent(existingContent, attributesSection);
            const updatedContent = updateNoteContent(existingContent, attributesSection);

            // Update the note with the new content
            await vault.modify(existingNote, updatedContent);
        } else {
            // Note doesn't exist; create a new note with attributes and a placeholder for manual content
            const noteContent = `${attributesSection}\n\n# Notes\n\n*Add your notes here.*\n`;
            await vault.create(notePath, noteContent);
        }

        // Recursively process child BOM nodes
        for (const childNode of bomNode.children) {
            await this.syncBOMNode(childNode, currentFolderPath);
        }
    }*/

   /* async syncBOM() {
        // Ensure that a BOM has been loaded
        if (!this.bomTree) {
            new Notice('Please load a BOM before syncing.');
            return;
        }

        const vault = this.app.vault;
        const teamcenterBOMFolder = 'Teamcenter BOMs';

        // Check if "Teamcenter BOMs" folder exists
        let teamcenterFolder = vault.getAbstractFileByPath(teamcenterBOMFolder);
        if (!teamcenterFolder) {
            await vault.createFolder(teamcenterBOMFolder);
        }

        // Start synchronization
        try {
            await this.syncBOMNode(this.bomTree, teamcenterBOMFolder);
            new Notice('BOM synchronized successfully.');
        } catch (error) {
            console.error('Error during BOM synchronization:', error);
            new Notice('Failed to synchronize BOM. Check console for details.');
        }
    }*/

}
