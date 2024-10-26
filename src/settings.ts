// settings.ts

import { App, PluginSettingTab, Setting } from 'obsidian';
import type TeamcenterIntegratorPlugin from 'main';

export interface TeamcenterIntegratorPluginSettings {
    tcUrl: string;
    tcUrlWebTierPort: string;
    tcWebTierAppName:string;
    userName: string;
    userPassword: string;
}

export const DEFAULT_SETTINGS: TeamcenterIntegratorPluginSettings = {
    tcUrl: '',
    tcUrlWebTierPort: '7001',
    tcWebTierAppName:'tc',
    userName: '',
    userPassword: ''
};

// Settings tab for the plugin
export class TeamcenterIntegratorSettingTab extends PluginSettingTab {
    plugin: TeamcenterIntegratorPlugin;

    constructor(app: App, plugin: TeamcenterIntegratorPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Teamcenter Integration Settings' });

        new Setting(containerEl)
            .setName('TC_URL')
            .setDesc('Base URL of your Teamcenter server.')
            .addText(text => text
                .setPlaceholder('Enter TC_URL')
                .setValue(this.plugin.settings.tcUrl)
                .onChange(async (value) => {
                    this.plugin.settings.tcUrl = value.trim();
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('TCURL_WEBTIER_APP_NAME')
            .setDesc('Web tier application name (typically: tc).')
            .addText(text => text
                .setPlaceholder('Enter TCURL_WEBTIER_APP_NAME')
                .setValue(this.plugin.settings.tcWebTierAppName)
                .onChange(async (value) => {
                    this.plugin.settings.tcWebTierAppName = value.trim();
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('TCURL_WEBTIER_PORT')
            .setDesc('Web tier port of your Teamcenter server (typically: 7001).')
            .addText(text => text
                .setPlaceholder('Enter TCURL_WEBTIER_PORT')
                .setValue(this.plugin.settings.tcUrlWebTierPort)
                .onChange(async (value) => {
                    this.plugin.settings.tcUrlWebTierPort = value.trim();
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('User Name')
            .setDesc('Your Teamcenter username.')
            .addText(text => text
                .setPlaceholder('Enter your username')
                .setValue(this.plugin.settings.userName)
                .onChange(async (value) => {
                    this.plugin.settings.userName = value.trim();
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Password')
            .setDesc('Your Teamcenter password.')
            .addText(text => text
                .setPlaceholder('Enter your password')
                .setValue(this.plugin.settings.userPassword)
                .onChange(async (value) => {
                    this.plugin.settings.userPassword = value.trim();
                    await this.plugin.saveSettings();
                }));
    }
}