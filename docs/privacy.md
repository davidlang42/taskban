# Privacy Policy
All data is stored entirely on Google’s servers, within the Google Apps Scripts platform. Task data is stored in Google Tasks directly, and a small amount of metadata is stored in the Google Apps Script Properties Service. Both of these storage mechanisms are private to your google account, and TaskBan (and its developers) have absolutely no access to this, so your data stays private (in line with your Google Account’s data retention policy).

The scopes which are required by TaskBan are listed, and described below.
* [https://www.googleapis.com/auth/tasks](https://www.googleapis.com/auth/tasks) - This provides access to your Google Tasks, so they can shown in TaskBan and your changes can be saved.
* [https://www.googleapis.com/auth/script.locale](https://www.googleapis.com/auth/script.locale) - This provides your local timezone, so that modifications to the due date of Tasks can be saved correctly.
* [https://www.googleapis.com/auth/calendar.addons.execute](https://www.googleapis.com/auth/calendar.addons.execute) - This allows the TaskBan add-on to run in the sidebar of Google Calendar, but provides no access to your calendar data.
* [https://www.googleapis.com/auth/gmail.addons.execute](https://www.googleapis.com/auth/gmail.addons.execute) - This allows the TaskBan add-on to run in the sidebar of Gmail, but provides no access to your emails.