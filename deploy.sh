#!/bin/bash
set -e # fail script if any command fails
output_prefix="### "
description="$1"
if [ ! -f "./app/.clasp.json" ]
then
    echo "Must be run from the root directory (containing ./app/.clasp.json)"
    exit 1
fi
if [ "$description" == "" ]
then
    echo "Please specify a description."
    exit 1
fi
if [ "$(git status --porcelain)" != "" ];
then
    echo "${output_prefix}Commiting local changes..."
    git add .
    git commit -m "$description - local changes"
    echo "${output_prefix}...done"
fi
echo "${output_prefix}Pulling from git..."
git pull
echo "${output_prefix}...done"
cd app
echo "${output_prefix}Pulling from apps scripts..."
clasp pull
echo "${output_prefix}...done"
if [ "$(git status --porcelain)" != "" ];
then
    echo "${output_prefix}Saving apps script changes..."
    git add .
    git commit -m "$description - POSSIBLE LOST CHANGES"
    git revert HEAD -m "Revert: $description - POSSIBLE LOST CHANGES"
    echo "${output_prefix}...done"
fi
echo "${output_prefix}Pushing to apps scripts..."
clasp push
echo "${output_prefix}...done"
echo "${output_prefix}Getting last deployment id..."
last_deployment=(`clasp deployments | tail -1`)
echo "${last_deployment[@]}"
deployment_id="${last_deployment[1]}"
echo "id: $deployment_id"
echo "${output_prefix}...done"
echo "${output_prefix}Updating deployment..."
clasp deploy -i "$deployment_id" -d "$description"
echo "${output_prefix}...COMPLETE"
cd ..