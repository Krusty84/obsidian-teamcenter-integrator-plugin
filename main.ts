import { Notice, Plugin,normalizePath } from 'obsidian';

// Remember to rename these classes and interfaces!

import TeamcenterApi from './src/teamcenterApi';
import {TeamcenterModal} from "./src/teamcenterModal";
import { DEFAULT_SETTINGS, TeamcenterIntegratorSettingTab} from 'src/settings'

export interface TeamcenterIntegratorPluginSettings {
	tcUrl: string;
	tcUrlWebTierPort: string;
	tcWebTierAppName:string;
	tcAWCUrl:string;
	userName: string;
	userPassword: string;
	selectedRevisionRuleName:string;
	selectedRevisionRuleUid:string;
}


export default class TeamcenterIntegratorPlugin extends Plugin {
	settings: TeamcenterIntegratorPluginSettings;
	teamcenterApi: TeamcenterApi;
	async onload() {
		await this.loadSettings();

		// Initialize Teamcenter API with settings
		//this.teamcenterApi = new TeamcenterApi(this.settings);

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', async (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
			/*await this.buildHierarchy();*/

			new TeamcenterModal(this.app, this.settings).open();

		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		/*const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');*/

		// This adds a simple command that can be triggered anywhere (Ctrl+P)
/*		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});*/

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new TeamcenterIntegratorSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// Update Teamcenter API settings
		//this.teamcenterApi.updateSettings(this.settings);
	}

	async buildHierarchy() {
		const folders = [
			'FolderA',
			'FolderA/FolderB',
			'FolderA/FolderB/FolderC'
		];

		for (const folder of folders) {
			await this.createFolderIfNotExists(folder);
		}

		const notes = [
			{
				path: 'FolderA/NoteA.md',
				data: {
					'Name': 'Note A',
					'Description': 'Description for Note A',
					'Owner': 'Alice',
					'Date': '2023-10-14'
				}
			},
			{
				path: 'FolderA/FolderB/NoteB.md',
				data: {
					'Name': 'Note B',
					'Description': 'Description for Note B',
					'Owner': 'Bob',
					'Date': '2023-10-15'
				}
			}
		];

		for (const note of notes) {
			const content = this.generateTable(note.data);
			await this.createNoteIfNotExists(note.path, content);
		}
	}

	async createFolderIfNotExists(folderPath: string) {
		folderPath = normalizePath(folderPath);
		if (!this.app.vault.getAbstractFileByPath(folderPath)) {
			await this.app.vault.createFolder(folderPath);
		}
	}

	async createNoteIfNotExists(notePath: string, content: string) {
		notePath = normalizePath(notePath);
		if (!this.app.vault.getAbstractFileByPath(notePath)) {
			await this.app.vault.create(notePath, content);
		}
	}

	generateTable(data: { [key: string]: string }): string {
		const headers = '| Field       | Value                |\n|-------------|----------------------|\n';
		let rows = '';
		for (const key in data) {
			rows += `| ${key}        | ${data[key]}          |\n`;
		}
		return headers + rows;
	}
}

