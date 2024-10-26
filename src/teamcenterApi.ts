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

export default class TeamcenterApi {
    private settings: TeamcenterIntegratorPluginSettings;
    private jsessionId: string | null = null;

    constructor(settings: TeamcenterIntegratorPluginSettings) {
        this.settings = settings;
    }

    updateSettings(settings: TeamcenterIntegratorPluginSettings) {
        this.settings = settings;
    }

    async login(): Promise<void> {
        this.jsessionId='';
        const url = `${this.settings.tcUrl}:${this.settings.tcUrlWebTierPort}/${this.settings.tcWebTierAppName}/JsonRestServices/Core-2011-06-Session/login`;

        const payload = {
            header: {
                state: {},
                policy: {}
            },
            body: {
                credentials: {
                    user: this.settings.userName,
                    password: this.settings.userPassword,
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
                    } else {
                        console.error('JSESSIONID not found in Set-Cookie header.');
                    }
                } else {
                    console.error('Set-Cookie header not found in response.');
                }
            } else {
                console.error('Login failed. Status:', response.status, 'Response:', response.text);
            }
        } catch (error) {
            console.error('An error occurred during login:', error);
        }
    }

    async loadRevisionRule(): Promise<RevisionRule[]> {
        if (!this.jsessionId) {
            console.error('Not logged in. Please login first.');
            throw new Error('Not logged in');
        }

        const url = `${this.settings.tcUrl}:${this.settings.tcUrlWebTierPort}/tc/JsonRestServices/Cad-2007-01-StructureManagement/getRevisionRules`;

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

    // Future methods will use this.jsessionId for authenticated requests
}
