// TeamcenterApi.ts

import { requestUrl, RequestUrlParam, RequestUrlResponse } from 'obsidian';

interface TeamcenterIntegratorPluginSettings {
    tcUrl: string;
    tcUrlWebTierPort: string;
    tcWebTierAppName:string;
    userName: string;
    userPassword: string;
}

export interface RevisionRule {
    uid: string;
    name: string;
}
export interface BOMNode {
    uid: string;
    itemRevUid: string;
    attributes: { [key: string]: string };
    children: BOMNode[];
}

export default class TeamcenterApi {
    private settings: TeamcenterIntegratorPluginSettings;
    public jsessionId: string | null = null;

    constructor(settings: TeamcenterIntegratorPluginSettings) {
        this.settings = settings;
    }

    updateSettings(settings: TeamcenterIntegratorPluginSettings) {
        this.settings = settings;
    }

    // @ts-ignore
    async login(tcUrl=this.settings.tcUrl,tcUrlWebTierPort=this.settings.tcUrlWebTierPort,
                tcWebTierAppName=this.settings.tcWebTierAppName,userName = this.settings.userName, userPassword = this.settings.userPassword): Promise<string | undefined> {
        this.jsessionId='';
        const url = `${tcUrl}:${tcUrlWebTierPort}/${tcWebTierAppName}/JsonRestServices/Core-2011-06-Session/login`;

        const payload = {
            header: {
                state: {},
                policy: {}
            },
            body: {
                credentials: {
                    user: userName,
                    password: userPassword,
                    role: "",
                    descrimator: "",
                    locale: "",
                    group: ""
                }
            }
        };

        const requestOptions: RequestUrlParam = {
            url: url,
            method: 'POST',
            contentType: 'application/json',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json'
            },
            throw: false
        };

        try {
            const response: RequestUrlResponse = await requestUrl(requestOptions);
            if (!response.json.code) {
                const setCookieHeader = response.headers['set-cookie'];
                if (setCookieHeader) {
                    let cookieString = '';

                    if (Array.isArray(setCookieHeader)) {
                        // If setCookieHeader is an array, concatenate all cookies
                        cookieString = setCookieHeader.join('; ');
                    } else {
                        cookieString = setCookieHeader;
                    }

                    const jsessionIdMatch = cookieString.match(/JSESSIONID=([^;]+)/);
                    if (jsessionIdMatch) {
                        this.jsessionId = jsessionIdMatch[1];
                        console.log('Logged in successfully. JSESSIONID:', this.jsessionId);
                        return this.jsessionId;

                    } else {
                        console.error('JSESSIONID not found in Set-Cookie header.');
                    }
                } else {
                    console.error('Set-Cookie header not found in response.');
                }
            } else {
                console.error('Login failed. Status:', response.status, 'Response:', response.text);
                return "500";
            }
        } catch (error) {
            console.error('An error occurred during login:', error);
            return error;
        }
    }

    async loadRevisionRule(tcUrl=this.settings.tcUrl,tcUrlWebTierPort=this.settings.tcUrlWebTierPort,
                           tcWebTierAppName=this.settings.tcWebTierAppName): Promise<RevisionRule[]> {
        if (!this.jsessionId) {
            console.error('Not logged in. Please login first.');
            throw new Error('Not logged in');
        }

        const url = `${tcUrl}:${tcUrlWebTierPort}/${tcWebTierAppName}/JsonRestServices/Cad-2007-01-StructureManagement/getRevisionRules`;

        const payload = {
            "header": {
                "state": {
                    "formatProperties": true,
                    "stateless": true,
                    "unloadObjects": false,
                    "enableServerStateHeaders": true,
                    "locale": "en_US"
                },
                "policy": {
                    "types": [
                        {
                            "name": "RevisionRule",
                            "properties": [
                                {
                                    "name": "object_name"
                                }
                            ]
                        }
                    ]
                }
            }
        };

        const requestOptions: RequestUrlParam = {
            url: url,
            method: 'POST',
            contentType: 'application/json',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `JSESSIONID=${this.jsessionId}`
            },
            throw: false
        };

        try {
            const response: RequestUrlResponse = await requestUrl(requestOptions);

            if (response.status === 200) {
                const data = response.json;

                const revisionRules: RevisionRule[] = [];

                const outputArray = data.output;

                const modelObjects = data.ServiceData?.modelObjects;

                if (!Array.isArray(outputArray) || !modelObjects) {
                    console.error('Unexpected response format');
                    throw new Error('Unexpected response format');
                }

                for (const outputItem of outputArray) {
                    const revRuleUid = outputItem.revRule?.uid;
                    if (revRuleUid && modelObjects[revRuleUid]) {
                        const revRuleObject = modelObjects[revRuleUid];
                        const objectNameProps = revRuleObject.props?.object_name;
                        const uiValues = objectNameProps?.uiValues;
                        const name = uiValues && uiValues[0] ? uiValues[0] : '';

                        if (name) {
                            revisionRules.push({ uid: revRuleUid, name: name });
                        } else {
                            console.warn(`No name found for revision rule with UID ${revRuleUid}`);
                        }
                    } else {
                        console.warn(`Revision rule with UID ${revRuleUid} not found in modelObjects`);
                    }
                }

                return revisionRules;

            } else {
                console.error('Failed to load revision rules. Status:', response.status, 'Response:', response.text);
                throw new Error('Failed to load revision rules');
            }
        } catch (error) {
            console.error('An error occurred while loading revision rules:', error);
            throw error;
        }
    }

    async getItemUIDfromID(itemId: string, itemRevId: string,tcUrl=this.settings.tcUrl,tcUrlWebTierPort=this.settings.tcUrlWebTierPort,
                           tcWebTierAppName=this.settings.tcWebTierAppName): Promise<{ itemUid: string; itemRevUid: string }> {
        if (!this.jsessionId) {
            console.error('Not logged in. Please login first.');
            throw new Error('Not logged in');
        }

        const url = `${tcUrl}:${tcUrlWebTierPort}/${tcWebTierAppName}/JsonRestServices/Core-2007-01-DataManagement/getItemFromId`;

        const payload = {
            header: {
                state: {},
                policy: {}
            },
            body: {
                infos: [
                    {
                        itemId: itemId,
                        revIds: [itemRevId]
                    }
                ],
                nRev: 1,
                pref: {}
            }
        };

        const requestOptions: RequestUrlParam = {
            url: url,
            method: 'POST',
            contentType: 'application/json',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `JSESSIONID=${this.jsessionId}`
            },
            throw: false
        };

        try {
            const response: RequestUrlResponse = await requestUrl(requestOptions);
            console.log("response "+JSON.stringify(response));
            if (response.status === 200) {
                const data = response.json;

                const outputArray = data.output;

                if (!Array.isArray(outputArray) || outputArray.length === 0) {
                    console.error('No output data found in response');
                    throw new Error('No output data found');
                }

                const firstOutput = outputArray[0];

                const itemUid = firstOutput.item?.uid;
                const itemRevUid = firstOutput.itemRevOutput?.[0]?.itemRevision?.uid;

                if (!itemUid || !itemRevUid) {
                    console.error('Item UID or Item Revision UID not found in response');
                    throw new Error('UIDs not found in response');
                }

                return { itemUid, itemRevUid };

            } else {
                console.error('Failed to get item UID from ID. Status:', response.status, 'Response:', response.text);
                throw new Error('Failed to get item UID from ID');
            }
        } catch (error) {
            console.error('An error occurred while getting item UID from ID:', error);
            throw error;
        }
    }

    async createBOMWindow(rootBomItemUid: string,tcUrl=this.settings.tcUrl,tcUrlWebTierPort=this.settings.tcUrlWebTierPort,
                          tcWebTierAppName=this.settings.tcWebTierAppName): Promise<{ bomWindowUid: string; bomLineUid: string }> {
        if (!this.jsessionId) {
            console.error('Not logged in. Please login first.');
            throw new Error('Not logged in');
        }

        const url = `${tcUrl}:${tcUrlWebTierPort}/${tcWebTierAppName}/JsonRestServices/Cad-2007-01-StructureManagement/createBOMWindows`;

        const payload = {
            "header": {
                "state": {
                    "formatProperties": true,
                    "stateless": true,
                    "unloadObjects": false,
                    "enableServerStateHeaders": true,
                    "locale": "en_US"
                },
                "policy": {}
            },
            "body": {
                "info": [
                    {
                        "clientId": "",
                        "item": rootBomItemUid,
                        "revRuleConfigInfo": {
                            "clientId": "",
                            "revRule": "",
                            "props": {
                                "unitNo": -1,
                                "date": "0001-01-01T00:00:00",
                                "today": true,
                                "endItem": "",
                                "endItemRevision": ""
                            }
                        }
                    }
                ]
            }
        };

        const requestOptions: RequestUrlParam = {
            url: url,
            method: 'POST',
            contentType: 'application/json',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `JSESSIONID=${this.jsessionId}`
            },
            throw: false
        };

        try {
            const response: RequestUrlResponse = await requestUrl(requestOptions);

            if (response.status === 200) {
                const data = response.json;

                const outputArray = data.output;

                if (!Array.isArray(outputArray) || outputArray.length === 0) {
                    console.error('No output data found in response');
                    throw new Error('No output data found');
                }

                const firstOutput = outputArray[0];

                const bomWindowUid = firstOutput.bomWindow?.uid;
                const bomLineUid = firstOutput.bomLine?.uid;

                if (!bomWindowUid || !bomLineUid) {
                    console.error('BOM Window UID or BOM Line UID not found in response');
                    throw new Error('UIDs not found in response');
                }

                return { bomWindowUid, bomLineUid };

            } else {
                console.error('Failed to create BOM Window. Status:', response.status, 'Response:', response.text);
                throw new Error('Failed to create BOM Window');
            }
        } catch (error) {
            console.error('An error occurred while creating BOM Window:', error);
            throw error;
        }
    }

    async openBOM(bomLineUid: string, tcUrl=this.settings.tcUrl,tcUrlWebTierPort=this.settings.tcUrlWebTierPort,
                  tcWebTierAppName=this.settings.tcWebTierAppName): Promise<any> {
        if (!this.jsessionId) {
            console.error('Not logged in. Please login first.');
            throw new Error('Not logged in');
        }

        const url = `${tcUrl}:${tcUrlWebTierPort}/${tcWebTierAppName}/JsonRestServices/Cad-2007-01-StructureManagement/expandPSAllLevels`;

        const payload = {
            "header": {
                "state": {
                    "formatProperties": true,
                    "stateless": true,
                    "unloadObjects": false,
                    "enableServerStateHeaders": true,
                    "locale": "en_US"
                },
                "policy": {
                    "types": [
                        {
                            "name": "ItemRevision",
                            "properties": [
                                { "name": "item_id" },
                                { "name": "item_revision_id" },
                                { "name": "object_name" },
                                { "name": "owning_user" },
                                { "name": "last_mod_date" }
                            ]
                        }
                    ]
                }
            },
            "body": {
                "input": {
                    "parentBomLines": [bomLineUid],
                    "excludeFilter": "None"
                },
                "pref": {
                    "expItemRev": false
                }
            }
        };

        const requestOptions: RequestUrlParam = {
            url: url,
            method: 'POST',
            contentType: 'application/json',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `JSESSIONID=${this.jsessionId}`
            },
            throw: false
        };

        try {
            const response: RequestUrlResponse = await requestUrl(requestOptions);

            if (response.status === 200) {
                const data = response.json;
                // Process the raw BOM data into a structured format
                const bomTree = this.processBOMData(bomLineUid, data);
                return bomTree;
            } else {
                console.error('Failed to expand BOM. Status:', response.status, 'Response:', response.text);
                throw new Error('Failed to expand BOM');
            }
        } catch (error) {
            console.error('An error occurred while expanding BOM:', error);
            throw error;
        }
    }

    private processBOMData(rootUid: string, bomData: any): BOMNode | null {
        const output = bomData.output;
        const modelObjects = bomData.ServiceData.modelObjects;

        if (!output || !modelObjects) {
            console.error('Invalid BOM data format');
            return null;
        }

        const parserConfig = {
            attributes: [
                { internalName: 'item_id', displayName: 'Item ID' },
                { internalName: 'item_revision_id', displayName: 'Revision ID' },
                { internalName: 'object_name', displayName: 'Name' },
                { internalName: 'owning_user', displayName: 'Owner' },
                { internalName: 'last_mod_date', displayName: 'Last Mod Date' }
            ],
            prefix: 'BOM Line'
        };

        const buildBOMTree = (currentUID: string, depth: number = 0): BOMNode | null => {
            const currentItem = output.find((item: any) => item.parent.bomLine.uid === currentUID);
            if (!currentItem) {
                return null;
            }

            const itemRevUID = currentItem.parent.itemRevOfBOMLine.uid;
            const currentDetails = modelObjects[itemRevUID];

            const attributes: { [key: string]: string } = {};
            for (const { internalName } of parserConfig.attributes) {
                const value = currentDetails?.props?.[internalName]?.uiValues?.join(', ') || 'N/A';
                attributes[internalName] = value;
            }

            const children: BOMNode[] = [];
            for (const child of currentItem.children) {
                const childNode = buildBOMTree(child.bomLine.uid, depth + 1);
                if (childNode) {
                    children.push(childNode);
                }
            }

            return {
                uid: currentUID,
                itemRevUid: itemRevUID,
                attributes,
                children
            };
        };

        return buildBOMTree(rootUid);
    }
    // Future methods will use this.jsessionId for authenticated requests
}
