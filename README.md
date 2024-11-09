# Teamcenter Integrator Plugin: highlighting word occurrences

### ATTENTION! READ BEFORE!
Please note that to use this plugin, you must have access to the Teamcenter system from Siemens Digital Industries Software.  
As the plugin author, I assume you are familiar with Teamcenter, its purpose, how data is stored in it, and so on.

### Features
- While working in Obsidian.md, you can access Teamcenter to find the BOM you need.
Once found, you can import the BOM into Obsidian.md’s storage as a notebook structure. 
- Why do this? To make necessary notes related to BOM elements in a knowledge base format and link 
BOM elements to any other knowledge within your Obsidian.md.

  
- The BOM is imported with each item as a folder and each item revision as a note within that folder.

- Each note has a customizable and synchronized attribute section, along with a direct link to Teamcenter.

- In the settings, you can set Teamcenter-specific parameters (such as webtier name, AWC URL/port, etc.) and, importantly, 
specify the rule used for loading BOM item revisions.

 

#### Installing the plugin (NOT PUBLISHED YET, AND NO GUARANTEE BE PUBLISHED)
- Open Obsidian settings
- Go to Community Plugins
- Select Browse and search for Teamcenter Integrator
- Install the plugin
- Look through "Installed plugins" and enable Teamcenter Integrator (toggle)


#### Manually installing the plugin (USE THIS WAY)
- Copy over `main.js`, `manifest.json` and `styles.css` to your vault `/path/to/your/vault/.obsidian/plugins/obsidian-teamcenter-integrator-plugin/`.
- Enable plugins in Obsidian settings
- Enable Teamcenter Integrator in the Community Plugins tab

#### License
[MIT](https://choosealicense.com/licenses/mit/)

#### Author
[Alexey Sedoykin](https://www.linkedin.com/in/sedoykin/)