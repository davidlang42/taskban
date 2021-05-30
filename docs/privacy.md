# Privacy Policy

## Summary
All data is stored entirely on Google’s servers, within the Google Apps Scripts platform. Task data is stored in Google Tasks directly, and a small amount of metadata is stored in the Google Apps Script Properties Service. Both of these storage mechanisms are private to your google account, and TaskBan (and its developers) have absolutely no access to this, so your data stays private (in line with your Google Account’s data retention policy).

## Plain english

The data which is used by TaskBan is listed, and described below.
* Google Tasks - TaskBan gets the names of your task lists, which is uses as the name of your TaskBan boards. It then retreives the tasks you have on that task list, so that it can show these as cards on your TaskBan board. TaskBan gives you the ability to edit these tasks, so the write permission for Google Tasks is requires to save your changes. TaskBan will never delete tasks without your permission, and does not change/rename/add/remove your task lists at any time.
* Timezone/Locale - TaskBan checks your local timezone, so that it can figure out what time and date it is in your location. This is used to provide a daily summary, which defaults to today. It is also required so that modification of due dates and times can be saved back to Google Tasks correctly.
* Calendar Addon - TaskBan contains an add-on which can be used in the sidebar of your Google Calendar. The add-on is very simple, containing links to each of your TaskBan boards which can open in a window. It also contains a clear button to clear completed tasks, which can be very helpful from Google Calendar. It does not access your calendar entries in any way.
* Gmail Addon - Similarly to the Calendar Addon, you can be shown an Add-on in the side bar of your gmail email. This runs the same add-on as google calendar, and once again does not access your emails in any way.

## Technical details

The scopes which are required by TaskBan are listed, and described below.
* [https://www.googleapis.com/auth/tasks](https://www.googleapis.com/auth/tasks) - This provides access to your Google Tasks, so they can shown in TaskBan and your changes can be saved.
* [https://www.googleapis.com/auth/script.locale](https://www.googleapis.com/auth/script.locale) - This provides your local timezone, so that modifications to the due date of Tasks can be saved correctly.
* [https://www.googleapis.com/auth/calendar.addons.execute](https://www.googleapis.com/auth/calendar.addons.execute) - This allows the TaskBan add-on to run in the sidebar of Google Calendar, but provides no access to your calendar data.
* [https://www.googleapis.com/auth/gmail.addons.execute](https://www.googleapis.com/auth/gmail.addons.execute) - This allows the TaskBan add-on to run in the sidebar of Gmail, but provides no access to your emails.

Back to [home page](home.md).