# TaskBan
A kanban-style view of your Google Tasks.

The tasks are only stored in Google Tasks, no duplication/syncing takes place. Because of this it is a single user experience.
There is a small amount of metadata stored in the Google Apps Script Properties Service, but this is also per user.

Hosted directly on Google Apps Script, free for anyone to use: https://taskban.davidlang.net
(with optional static html iframe hosted on GitHub Pages to make the url look nice)

It can also be accessed via the Google Workspace Add-On: https://workspace.google.com/marketplace/app/taskban/674749721550

But by all means, [buy me a coffee](https://ko-fi.com/davidlang42).

## Set up local repo
* Clone git repo: `git clone https://github.com/davidlang42/taskban.git`
* Install [clasp](https://developers.google.com/apps-script/guides/clasp): `npm install @google/clasp -g`
* Login to clasp: `clasp login`
* Enter app directory: `cd app`
* Connect apps script project: `clasp clone [scriptId]`

## Deploying changes
### Use bash script
* Run from the root of the repo: `./deploy.sh`
  * Warning: This will overwrite any changes made directly on google apps scripts, but they will still exist in a reverted commit labelled 'possible lost changes'
### Execute manually
* Enter app directory: `cd app`
* Pull changes to local git repo: `git pull`
* Push changes to apps scripts: `clasp push`
  * Warning: This will overwrite any changes made directly on google apps scripts
* Find existing deployment: `clasp deployments`
  * Returns deployment id: `- AKfycbxSDJouDbOKVTQ3cnnGaJaLW5EbR86YRTwCX-PJb7Mvua9egDM @58 - Test via Clasp`
* Create version & update existing deployment: `clasp deploy -i [deploymentId] -d "[description]"`

## Hardcoded details
The app url is hardcoded in the following places:
* Main.js `const INTERNAL_URL`
* appsscript.json `addOns.common.universalActions.openLink`
* frame.html `const EXTERNAL_URL`
* Main.js `const EXTERNAL_URL`
* frame.html `const APP_SCRIPT_URL`
* index.html `const APP_SCRIPT_URL`

## Future features:
* Task versions
* Task pre-requisites
* Scrolling summary page
* Snap scroll to list
* Subtask support
* Progressive Web App
* Markdown formatting
* Wrong list dialog (for tasks with a list that doesn't exist)
