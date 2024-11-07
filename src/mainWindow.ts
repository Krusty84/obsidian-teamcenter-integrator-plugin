// MainWindow.ts

import {App, Modal, Notice, Setting} from 'obsidian';
import TcAPI, {BOMNode} from './tcAPI';
import {TeamcenterIntegratorPluginSettings} from 'src/settings'
import {generateBOMHtml, syncBOM} from "./bomUtils";

export class MainWindow extends Modal {
    tcAPI: TcAPI;
    private itemId = "";
    private revId = "";
    private settings: TeamcenterIntegratorPluginSettings;
    private contentContainer: HTMLElement;
    private bomTree: BOMNode;
    constructor(app: App,settings: TeamcenterIntegratorPluginSettings) {
        super(app);
        this.settings = settings;
    }

    async onOpen() {
        const {contentEl,modalEl} = this;
        modalEl.addClass('teamcenter-modal-window');
        this.tcAPI = new TcAPI(this.settings);
        contentEl.empty();
        // Create a wrapper for the entire modal content
        const wrapper = contentEl.createDiv({ cls: 'modal-window-wrapper' });
        // Create the fixed header container for inputs
        const headerContainer = wrapper.createDiv({ cls: 'header-container' });
        headerContainer.createEl('h2', { text: 'Teamcenter integrator' });
        headerContainer.createEl('h6', { text: 'The revision rule used: ' + this.settings.selectedRevisionRuleName});

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
            .setName('Revision ID (revision containing BOM)')
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
                        const { itemUid} = await this.tcAPI.getItemUIDfromID(this.itemId,this.revId);
                        await this.tcAPI.closeExistsBOMWindows();
                        const { bomLineUid } = await this.tcAPI.createBOMWindow(itemUid);
                        this.bomTree = await this.tcAPI.openBOM(bomLineUid);
                        this.displayBOM(this.bomTree);
                        //Teamcenter Dance Finish
                    });
            }).addButton(button => {
            button.setButtonText('Sync TC->Notes')
                .onClick(async () => {
                    if (!this.bomTree) {
                        new Notice('Please load a BOM before syncing.');
                        return;
                    }
                    await syncBOM(this.bomTree, this.settings);
                })
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
        headerRow.createEl('th', { text: 'Rev ID' });
        headerRow.createEl('th', { text: 'Name' });
        headerRow.createEl('th', { text: 'Desc' });
        headerRow.createEl('th', { text: 'Type' });
        headerRow.createEl('th', { text: 'Owner' });
        headerRow.createEl('th', { text: 'Last Mod' });

        // Create the table body
        const tbody = table.createEl('tbody');

        // Generate and append the BOM rows
        //const bomHtml = this.generateBOMHtml(bomTree);
        tbody.innerHTML = generateBOMHtml(bomTree);

        // Add event listeners
        this.addEventListeners(collapsibleSection);
    }

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

}
