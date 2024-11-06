import { Notice, Plugin,normalizePath } from 'obsidian';

// Remember to rename these classes and interfaces!

import TcAPI from './src/tcAPI';
import {MainWindow} from "./src/mainWindow";
import { DEFAULT_SETTINGS, TeamcenterIntegratorSettingTab} from 'src/settings'

export interface TeamcenterIntegratorPluginSettings {
	tcUrl: string;
	tcUrlWebTierPort: string;
	tcWebTierAppName:string;
	tcAWCUrl:string;
	tcAWCUrlPort:string,
	userName: string;
	userPassword: string;
	selectedRevisionRuleName:string;
	selectedRevisionRuleUid:string;
}


export default class TeamcenterIntegratorPlugin extends Plugin {
	settings: TeamcenterIntegratorPluginSettings;
	teamcenterApi: TcAPI;
	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', async (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
			/*await this.buildHierarchy();*/

			new MainWindow(this.app, this.settings).open();

		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

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
	}

}

