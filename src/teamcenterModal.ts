// TeamcenterModal.ts

import { App,Modal, Setting } from 'obsidian';
import TeamcenterApi from './teamcenterApi';
import {RevisionRule} from "./teamcenterApi";
//import {TeamcenterIntegratorPluginSettings} from 'src/settings'
import { TeamcenterIntegratorPluginSettings } from 'main';
export class TeamcenterModal extends Modal {
    //settings: TeamcenterIntegratorPluginSettings;
    teamcenterApi: TeamcenterApi;
    private revisionRules: RevisionRule[] = [];
    private selectedRevisionRuleUid: string | null = null;
    private selectedRevisionRule: string | null = null;
    private itemId = "";
    private settings: TeamcenterIntegratorPluginSettings;
    constructor(app: App,settings: TeamcenterIntegratorPluginSettings) {
        super(app);
        this.settings = settings;
    }

    async onOpen() {
        const {contentEl} = this;
        this.teamcenterApi = new TeamcenterApi(this.settings);
        contentEl.createEl('h2', {text: 'Teamcenter Query'});

        // Dropdown for Revision Rule
        let dropdownEventAttached = false;

        new Setting(contentEl)
            .setName('Revision Rule')
            .addDropdown(dropdown => {
                dropdown.addOption('', 'Select a revision rule');

                if (!dropdownEventAttached) {
                    dropdownEventAttached = true;

                    dropdown.selectEl.addEventListener('mousedown', async (event) => {
                        if (this.revisionRules.length === 0) {
                            event.preventDefault(); // Prevent the dropdown from opening

                            //dropdown.clearOptions();
                            dropdown.addOption('', 'Loading...');
                            dropdown.setValue('');
                            dropdown.selectEl.disabled = true;

                            try {
                                this.revisionRules = await this.teamcenterApi.loadRevisionRule();

                                //dropdown.clearOptions();
                                dropdown.addOption('', 'Select a revision rule');

                                for (const rule of this.revisionRules) {
                                    dropdown.addOption(rule.uid, rule.name);
                                }

                                dropdown.selectEl.disabled = false;

                                // Open the dropdown after loading
                                dropdown.selectEl.click();

                            } catch (error) {
                                console.error('Failed to load revision rules:', error);
                                //dropdown.clearOptions();
                                dropdown.addOption('', 'Failed to load revision rules');
                                dropdown.setValue('');
                                dropdown.selectEl.disabled = false;
                            }
                        }
                    });
                }

                dropdown.onChange(value => {
                    this.selectedRevisionRuleUid = value;
                });
            });

        // Text field for Item ID
        new Setting(contentEl)
            .setName('Item ID')
            .addText(text => {
                text.setPlaceholder('Enter Item ID')
                    .onChange(value => {
                        this.itemId = value;
                    });
            });

        // Submit button
        new Setting(contentEl)
            .addButton(button => {
                button.setButtonText('Submit')
                    .setCta()
                    .onClick(async () => {
                        await this.teamcenterApi.login();
                       // this.submit();
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
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    submit() {
        // Handle the form submission
        console.log('Selected Revision Rule:', this.selectedRevisionRule);
        console.log('Item ID:', this.itemId);

        // Perform any actions with the data here

        this.close();
    }

}
