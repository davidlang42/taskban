# TaskBan
A kanban-style view of your Google Tasks.

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
