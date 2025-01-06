const TITLE_SUFFIX = " :: TaskBan"; // also in app.html
const TRUNCATE_NOTES_LENGTH = 150;
const ESSENTIAL_NOTES_DELIMETER = "///";
const SHOW_DETAILS_THRESHOLD = 5;

const INTERNAL_URL = ScriptApp.getService().getUrl(); // also in app.html, index.html

// This url will fail if a user is not logged in and has authorised TaskBan (or is using Safari)
const EXTERNAL_URL = "https://taskban.davidlang.net/app.html"; // also in app.html, appsscript.json

function doGet(e) {
  // NOTE: redirect parameter is only used in production for dealing with logging in when in a frame
  if (e.parameter.redirect === "") return redirect(EXTERNAL_URL); // short circuit for speed
  const boards = listBoards();
  var boardName = e.parameter.board || e.parameter.b || e.parameter.redirect;
  if (boardName) {
    if (boardName.startsWith("/")) boardName = boardName.substring(1);
    const board = findBoard(boardName, boards);
    if (board) {
      if (e.parameter.redirect)
        return redirect(EXTERNAL_URL + "?b=" + board.title.replace(/ /g,"-"));
      else
        return uiBoard(board, boards, e.parameter.filter, e.parameter.edit, e.parameter.add);
    }
  }
  if (e.parameter.redirect)
    return redirect(EXTERNAL_URL);
  else
    return uiList(new Date(), boards, e.parameter.filter);
}

function uiBoard(board, boards, initial_filter, initial_edit, initial_add) {
  const html = HtmlService.createTemplateFromFile("UI_board");
  html.board = board;
  html.boards = boards;
  html.initial_filter = initial_filter;
  html.initial_edit = initial_edit;
  html.initial_add = initial_add;
  return html.evaluate().setTitle(board.title+TITLE_SUFFIX).addMetaTag("viewport", "width=device-width, initial-scale=1").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function uiList(initial_date, boards, initial_filter) {
  const html = HtmlService.createTemplateFromFile("UI_list");
  html.initial_date = initial_date;
  html.initial_filter = initial_filter;
  html.boards = boards;
  return html.evaluate().setTitle("Summary"+TITLE_SUFFIX).addMetaTag("viewport", "width=200, initial-scale=1.25").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}