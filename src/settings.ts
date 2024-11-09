// settings.ts

import {App, DropdownComponent, PluginSettingTab, Setting, TextComponent} from 'obsidian';
import type TeamcenterIntegratorPlugin from 'main';
import TcAPI, {RevisionRule} from './tcAPI';
import {AttributeConfig} from "./type";

export interface TeamcenterIntegratorPluginSettings {
    tcUrl: string;
    tcUrlWebTierPort: string;
    tcWebTierAppName: string;
    tcAWCUrl:string;
    tcAWCUrlPort:string;
    userName: string;
    userPassword: string;
    selectedRevisionRuleUid:string;
    selectedRevisionRuleName:string;
    attributesToInclude: AttributeConfig[];
}

export const DEFAULT_SETTINGS: TeamcenterIntegratorPluginSettings = {
    tcUrl: '',
    tcUrlWebTierPort: '7001',
    tcWebTierAppName: 'tc',
    tcAWCUrl:'',
    tcAWCUrlPort:'3000',
    userName: '',
    userPassword: '',
    selectedRevisionRuleUid:'',
    selectedRevisionRuleName:'',
    attributesToInclude: [
        { internalName: 'item_id', displayName: 'Item ID' },
        { internalName: 'item_revision_id', displayName: 'Revision ID' },
        { internalName: 'object_name', displayName: 'Name' },
        { internalName: 'object_desc', displayName: 'Description' },
        { internalName: 'owning_user', displayName: 'Owner' },
        { internalName: 'last_mod_date', displayName: 'Last Modified' },
    ],
};

// Settings tab for the plugin
export class TeamcenterIntegratorSettingTab extends PluginSettingTab {
    plugin: TeamcenterIntegratorPlugin;
    private revisionRules: RevisionRule[] = [];

    constructor(app: App, plugin: TeamcenterIntegratorPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        let revisionRuleControl:DropdownComponent;
        // Dropdown for Revision Rule
        let dropdownEventAttached = false;
        const {containerEl} = this;
        const teamcenterApi = new TcAPI(DEFAULT_SETTINGS);
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
            .setDesc('Base URL of your AWC server.')
            .addText(text => text
                .setPlaceholder('Enter AWC_URL')
                .setValue(this.plugin.settings.tcAWCUrl)
                .onChange(async (value) => {
                    this.plugin.settings.tcAWCUrl = value.trim();
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('AWCURL_PORT')
            .setDesc('Connection port of your AWC server (typically: 3000).')
            .addText(text => text
                .setPlaceholder('Enter AWCURL_PORT')
                .setValue(this.plugin.settings.tcAWCUrlPort)
                .onChange(async (value) => {
                    this.plugin.settings.tcAWCUrlPort = value.trim();
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

        // Attributes Configuration
        containerEl.createEl('h3', { text: 'Attributes Configuration' });

        const attributesContainer = containerEl.createDiv();

        const refreshAttributesList = () => {
            attributesContainer.empty();

            this.plugin.settings.attributesToInclude.forEach((attr, index) => {
                const attrSetting = new Setting(attributesContainer)
                    .addText(text => text
                        .setPlaceholder('Internal Name')
                        .setValue(attr.internalName)
                        .onChange(async (value) => {
                            this.plugin.settings.attributesToInclude[index].internalName = value;
                            await this.plugin.saveSettings();
                        }))
                    .addText(text => text
                        .setPlaceholder('Display Name')
                        .setValue(attr.displayName)
                        .onChange(async (value) => {
                            this.plugin.settings.attributesToInclude[index].displayName = value;
                            await this.plugin.saveSettings();
                        }))
                    .addExtraButton(cb => {
                        cb.setIcon('up-chevron-glyph')
                            .setTooltip('Move Up')
                            .onClick(async () => {
                                if (index > 0) {
                                    const temp = this.plugin.settings.attributesToInclude[index - 1];
                                    this.plugin.settings.attributesToInclude[index - 1] = attr;
                                    this.plugin.settings.attributesToInclude[index] = temp;
                                    await this.plugin.saveSettings();
                                    refreshAttributesList();
                                }
                            });
                    })
                    .addExtraButton(cb => {
                        cb.setIcon('down-chevron-glyph')
                            .setTooltip('Move Down')
                            .onClick(async () => {
                                if (index < this.plugin.settings.attributesToInclude.length - 1) {
                                    const temp = this.plugin.settings.attributesToInclude[index + 1];
                                    this.plugin.settings.attributesToInclude[index + 1] = attr;
                                    this.plugin.settings.attributesToInclude[index] = temp;
                                    await this.plugin.saveSettings();
                                    refreshAttributesList();
                                }
                            });
                    })
                    .addExtraButton(cb => {
                        cb.setIcon('cross')
                            .setTooltip('Remove')
                            .onClick(async () => {
                                this.plugin.settings.attributesToInclude.splice(index, 1);
                                await this.plugin.saveSettings();
                                refreshAttributesList();
                            });
                    });
            });

            // Add Attribute Button
            new Setting(attributesContainer)
                .addButton(button => {
                    button.setButtonText('Add Attribute')
                        .setCta()
                        .onClick(async () => {
                            this.plugin.settings.attributesToInclude.push({ internalName: '', displayName: '' });
                            await this.plugin.saveSettings();
                            refreshAttributesList();
                        });
                });
        };

        refreshAttributesList();

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