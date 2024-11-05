import {BOMNode} from "./tcAPI";
import {Notice, TFile} from "obsidian";

export function generateBOMHtml(bomNode: BOMNode, parentUid: string | null = null, depth: number = 0): string {
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
        //childrenHtml += this.generateBOMHtml(child, bomNode.uid, depth + 1);
        childrenHtml += generateBOMHtml(child, bomNode.uid, depth + 1);
    }

    return rowHtml + childrenHtml;
}

export function generateAttributesSection(bomNode: BOMNode): string {
    // Use the attributes from settings or default
    /*const attributesToInclude = this.settings.attributesToInclude || [*/
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
}

export function updateNoteContent(existingContent: string, newAttributesSection: string): string {
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
}


export async function syncBOMNode(bomNode: BOMNode, parentFolderPath: string) {
    const vault = this.app.vault;

    // Create the folder for the current BOM node
    const folderName = `${bomNode.attributes['item_id']}_${bomNode.attributes['object_name']}`;
    const sanitizedFolderName =sanitizeFileName(folderName);
    const currentFolderPath = `${parentFolderPath}/${sanitizedFolderName}`;

    // Check if the folder exists
    let currentFolder = vault.getAbstractFileByPath(currentFolderPath);
    if (!currentFolder) {
        await vault.createFolder(currentFolderPath);
    }

    // Create the note inside the current folder
    const noteName = `${bomNode.attributes['item_id']}/${bomNode.attributes['item_revision_id']}_${bomNode.attributes['object_name']}.md`;
    const sanitizedNoteName =sanitizeFileName(noteName);
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
}

export async function syncBOM(isLoadBom:any) {
    // Ensure that a BOM has been loaded
    if (/*!this.bomTree*/!isLoadBom) {
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
        //await this.syncBOMNode(this.bomTree, teamcenterBOMFolder);
        await syncBOMNode(this.bomTree, teamcenterBOMFolder);
        new Notice('BOM synchronized successfully.');
    } catch (error) {
        console.error('Error during BOM synchronization:', error);
        new Notice('Failed to synchronize BOM. Check console for details.');
    }
}

export function sanitizeFileName(name: string): string {
    // Replace invalid characters with underscores
    return name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_');
}