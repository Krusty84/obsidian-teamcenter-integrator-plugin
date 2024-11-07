import {addIcon, Plugin} from 'obsidian';

import TcAPI from './src/tcAPI';
import {MainWindow} from "./src/mainWindow";
import { DEFAULT_SETTINGS, TeamcenterIntegratorSettingTab} from 'src/settings'
import {tcIcon} from "./src/constants";

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
		addIcon("tcIcon", tcIcon);
		this.addRibbonIcon("tcIcon", 'Go to the Teamcenter', async () => {
			new MainWindow(this.app, this.settings).open();
		});
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

