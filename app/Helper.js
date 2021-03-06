function include(filename,objects) {
  if(objects) {
    var html = HtmlService.createTemplateFromFile(filename);
    for(var obj in objects) {
      html[obj] = objects[obj];
    }
    return html.evaluate().getContent();
  } else {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  }
}

function redirect(url) {
  var html = "<h2 style='font-family: sans-serif;'><a href='" + url + "' target='_top'>Login successul, click here to launch TaskBan</a></h2><script>window.open('"+url+"','_top');</script>";
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getFaviconUrl() {
  var id = "1U1KdkZsBgRuh3SOFMSrJszNy0aiKHZmH";
  var file = DriveApp.getFileById(id);
  Logger.log(file.getDownloadUrl());
}

function includesIgnoreCase(array, item) {
  for(const value of array) {
    if(value.toLowerCase()==item.toLowerCase()) return value;
  }
  return null;
}

function formatDateForm(date_string) {
  if(!date_string) return "";
  var d = new Date(date_string);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function formatDateTasks(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss'Z'");
}

function removeTime(dt) {
  dt.setHours(0);
  dt.setMinutes(0);
  dt.setSeconds(0);
  dt.setMilliseconds(0);
}

function compare(x,y) {
  if (x > y)
    return 1;
  else if (x < y)
    return -1;
  else
    return 0;
}

function compareFallback(x,y,x2,y2) {
  if (x > y)
    return 1;
  else if (x < y)
    return -1;
  else if (x2 > y2)
    return 1;
  else if (x2 < y2)
    return -1;
  else
    return 0;
}