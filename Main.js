// Future tasks/issues on github: https://github.com/davidlang42/taskban

const DEV_PREFIX = "dev";
const DEV_URL = "https://script.google.com/macros/s/AKfycbywqogvOo3_V_uRdvRpVFHSvgKhGzIibPDUX_wY4o0/dev";
const PROD_URL = "https://script.google.com/macros/s/AKfycbxSDJouDbOKVTQ3cnnGaJaLW5EbR86YRTwCX-PJb7Mvua9egDM/exec"; // also hardcoded in appsscript.json
const TITLE_SUFFIX = " :: TaskBan";
const TRUNCATE_NOTES_LENGTH = 150;
const ESSENTIAL_NOTES_DELIMETER = "///";
const SHOW_DETAILS_THRESHOLD = 5;

function doGet(e) {
  var boardName = e.parameter.board;
  if (boardName) {
    if (boardName.startsWith("/")) boardName = boardName.substring(1);
    if (boardName.startsWith(DEV_PREFIX)) return redirect(DEV_URL + "?board=" + boardName.substring(DEV_PREFIX.length));
  }
  const boards = listBoards();
  if (boardName) {
    const board = findBoard(boardName, boards);
    if (board) return uiBoard(board, boards);
    return redirect(ScriptApp.getService().getUrl());
  }
  return uiList(new Date(), boards);
}

function uiBoard(board, boards) {
  const html = HtmlService.createTemplateFromFile("UI_board");
  html.board = board;
  html.boards = boards;
  html.devMode = (ScriptApp.getService().getUrl()==DEV_URL);
  return html.evaluate().setTitle(board.title+TITLE_SUFFIX).addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function uiList(initial_date, boards) {
  const html = HtmlService.createTemplateFromFile("UI_list");
  html.initial_date = initial_date;
  html.boards = boards;
  return html.evaluate().setTitle("Summary"+TITLE_SUFFIX).addMetaTag("viewport", "width=200, initial-scale=1.25");
}