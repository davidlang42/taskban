// Future tasks/issues on github: https://github.com/davidlang42/taskban

const TITLE_SUFFIX = " :: TaskBan";
const TRUNCATE_NOTES_LENGTH = 150;
const ESSENTIAL_NOTES_DELIMETER = "///";
const SHOW_DETAILS_THRESHOLD = 5;

// This url will fail if a user is not logged in and has authorised TaskBan
const INTERNAL_URL = "https://taskban.davidlang.net/frame.html"; // URL also hardcoded in appsscript.json

function doGet(e) {
  var redirectBoard = e.parameter.redirect;
  if (redirectBoard === "") return redirect(INTERNAL_URL);
  if (redirectBoard) return redirect(INTERNAL_URL + "?b=" + redirectBoard);
  var boardName = e.parameter.board;
  if (!boardName) boardName = e.parameter.b;
  const boards = listBoards();
  if (boardName) {
    if (boardName.startsWith("/")) boardName = boardName.substring(1);
    const board = findBoard(boardName, boards);
    if (board) return uiBoard(board, boards);
  }
  return uiList(new Date(), boards);
}

function uiBoard(board, boards) {
  const html = HtmlService.createTemplateFromFile("UI_board");
  html.board = board;
  html.boards = boards;
  return html.evaluate().setTitle(board.title+TITLE_SUFFIX).addMetaTag("viewport", "width=device-width, initial-scale=1").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function uiList(initial_date, boards) {
  const html = HtmlService.createTemplateFromFile("UI_list");
  html.initial_date = initial_date;
  html.boards = boards;
  return html.evaluate().setTitle("Summary"+TITLE_SUFFIX).addMetaTag("viewport", "width=200, initial-scale=1.25").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}