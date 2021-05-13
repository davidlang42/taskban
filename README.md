# TaskBan
A kanban-style view of your Google Tasks.

The tasks are only stored in Google Tasks, no duplication/syncing takes place. Because of this it is a single user experience.
There is a small amount of metadata stored in the Google Apps Script Properties Service, but this is also per user.

Hosted directly on Google Apps Script, free for anyone to use: https://taskban.davidlang.net
But by all means, buy me a coffee. <a href='https://ko-fi.com/K3K21PCIK' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://cdn.ko-fi.com/cdn/kofi2.png?v=2' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>

## Set up local repo
* Clone git repo: `git clone https://github.com/davidlang42/taskban.git`
* Install [clasp](https://developers.google.com/apps-script/guides/clasp): `npm install @google/clasp -g`
* Login to clasp: `clasp login`
* Connect apps script project: `clasp clone [scriptId]`

## Publishing changes
* Pull changes to local git repo: `git pull`
* Push changes to apps scripts: `clasp push`
* Find existing deployment: `clasp deployments`
  * Returns deployment id: `AKfycbxSDJouDbOKVTQ3cnnGaJaLW5EbR86YRTwCX-PJb7Mvua9egDM @58 - Test via Clasp`
* Create version & update existing deployment: `clasp deploy -i [deploymentId] -d "[description]"`

## Hardcoded details
The sidebar add-on (for Gmail, Calendar, etc) contains links to the main TaskBan app, therefore the deployed url is hardcoded in the following places:
* Add-on.js `const PROD_URL`
* appsscript.json `addOns.common.universalActions.openLink`
