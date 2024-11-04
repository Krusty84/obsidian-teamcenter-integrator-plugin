// settings.ts

import {App, DropdownComponent, PluginSettingTab, Setting, TextComponent} from 'obsidian';
import type TeamcenterIntegratorPlugin from 'main';
import TeamcenterApi, {RevisionRule} from './teamcenterApi';

export interface TeamcenterIntegratorPluginSettings {
    tcUrl: string;
    tcUrlWebTierPort: string;
    tcWebTierAppName: string;
    tcAWCUrl:string; //localhost:3000/#/com.siemens.splm.clientfx.tcui.xrt.showObject?uid=wfhZwhTFppgr6D
    userName: string;
    userPassword: string;
    selectedRevisionRuleUid:string;
    selectedRevisionRuleName:string;
}

export const DEFAULT_SETTINGS: TeamcenterIntegratorPluginSettings = {
    tcUrl: '',
    tcUrlWebTierPort: '7001',
    tcWebTierAppName: 'tc',
    tcAWCUrl:'',
    userName: '',
    userPassword: '',
    selectedRevisionRuleUid:'',
    selectedRevisionRuleName:'',
};

// Settings tab for the plugin
export class TeamcenterIntegratorSettingTab extends PluginSettingTab {
    plugin: TeamcenterIntegratorPlugin;
    private revisionRules: RevisionRule[] = [];
    private selectedRevisionRuleUid: string | null = null;
    private selectedRevisionRule: string | null = null;

    constructor(app: App, plugin: TeamcenterIntegratorPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        let revisionRuleControl:DropdownComponent;
        // Dropdown for Revision Rule
        let dropdownEventAttached = false;
        const {containerEl} = this;
        const teamcenterApi = new TeamcenterApi(DEFAULT_SETTINGS);
        containerEl.empty();

        containerEl.createEl('h2', {text: 'Teamcenter Integration Settings'});

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
            .setName('AWC_URL')
            .setDesc('The full path to AWC, like http://awcsrv.qqq.com:3000/')
            .addText(text => text
                .setPlaceholder('Enter AWC path')
                .setValue(this.plugin.settings.tcAWCUrl)
                .onChange(async (value) => {
                    this.plugin.settings.tcAWCUrl = value.trim();
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
            .addText(text => {
                text.setPlaceholder('Enter your password')
                    .setDisabled(true)
                    .setValue(this.plugin.settings.userPassword)
                    .onChange(async (value) => {
                        this.plugin.settings.userPassword = value.trim();
                        await this.plugin.saveSettings();
                    });
            });


        new Setting(containerEl)
            .addButton(button => {
                button.setButtonText('Check Teamcenter login/password')
                    .setCta()
                    .onClick(async () => {
                        try {
                            await teamcenterApi.login(this.plugin.settings.tcUrl,
                                this.plugin.settings.tcUrlWebTierPort, this.plugin.settings.tcWebTierAppName, this.plugin.settings.userName, this.plugin.settings.userPassword).then(loginResult => {
                                console.log("loginResult: " + loginResult);
                                if (loginResult!=="500") {
                                    revisionRuleControl.setDisabled(false);
                                }
                            });
                        } catch (error) {
                            revisionRuleControl.setDisabled(true);
                        }
                    });
            });


        new Setting(containerEl)
            .setName('Revision Rule')
            .addDropdown(dropdown => {
                // Store a reference to the dropdown component
                revisionRuleControl = dropdown;
                if(this.plugin.settings.selectedRevisionRuleName){
                    dropdown.addOption(this.plugin.settings.selectedRevisionRuleUid, this.plugin.settings.selectedRevisionRuleName);
                }else{
                    // Add a default option
                    dropdown.addOption('', 'Select a revision rule');
                }
                // Disable the dropdown initially
                dropdown.setDisabled(true);

                // Check if revision rules are already loaded (e.g., from previous sessions)
                if (this.revisionRules && this.revisionRules.length > 0) {
                    // Populate the dropdown with existing revision rules
                    populateDropdownWithRevisionRules(dropdown, this.revisionRules);

                    // Set the selected value if one exists
                    if (this.plugin.settings.selectedRevisionRuleUid) {
                        dropdown.setValue(this.plugin.settings.selectedRevisionRuleUid);
                    }
                    // Enable the dropdown
                    dropdown.setDisabled(false);
                } else {
                    // Attach the event listener only once
                    if (!dropdownEventAttached) {
                        dropdownEventAttached = true;

                        dropdown.selectEl.addEventListener('mousedown', async (event) => {
                            if (!this.revisionRules || this.revisionRules.length === 0) {
                                event.preventDefault(); // Prevent the dropdown from opening

                                // Show 'Loading...' message
                                dropdown.addOption('', 'Loading...');
                                dropdown.setValue('');
                                dropdown.selectEl.disabled = true;

                                try {
                                    // Load revision rules
                                    this.revisionRules = await teamcenterApi.loadRevisionRule(
                                        this.plugin.settings.tcUrl,
                                        this.plugin.settings.tcUrlWebTierPort,
                                        this.plugin.settings.tcWebTierAppName
                                    );

                                    // Populate the dropdown with loaded revision rules
                                    populateDropdownWithRevisionRules(dropdown, this.revisionRules);

                                    // Enable the dropdown
                                    dropdown.selectEl.disabled = false;

                                    // Open the dropdown after loading
                                    dropdown.selectEl.click();

                                    // Set the selected value if one exists
                                    if (this.plugin.settings.selectedRevisionRuleUid) {
                                        dropdown.setValue(this.plugin.settings.selectedRevisionRuleUid);
                                    }
                                } catch (error) {
                                    console.error('Failed to load revision rules:', error);

                                    // Show error message
                                    dropdown.addOption('', 'Failed to load revision rules');
                                    dropdown.setValue('');
                                    dropdown.selectEl.disabled = false;
                                }
                            }
                        });
                    }
                }

                // Handle the dropdown value change
                dropdown.onChange(async value => {
                    // Save the UID
                    this.plugin.settings.selectedRevisionRuleUid = value;

                    // Find the corresponding display name
                    const selectedRule = this.revisionRules.find(rule => rule.uid === value);
                    this.plugin.settings.selectedRevisionRuleName = selectedRule ? selectedRule.name : '';

                    // Save settings
                    await this.plugin.saveSettings();
                });
            });

// Helper function to populate the dropdown with revision rules
        function populateDropdownWithRevisionRules(dropdown: DropdownComponent, revisionRules: any[]) {
            // Clear existing options
            dropdown.selectEl.innerHTML = '';

            // Add default option
            dropdown.addOption('', 'Select a revision rule');

            // Add revision rule options
            for (const rule of revisionRules) {
                dropdown.addOption(rule.uid, rule.name);
            }
        }
    }
}