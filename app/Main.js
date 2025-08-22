const TITLE_SUFFIX = " :: TaskBan"; // also in app.html
const TRUNCATE_NOTES_LENGTH = 150;
const ESSENTIAL_NOTES_DELIMETER = "///";
const SHOW_DETAILS_THRESHOLD = 5;

const INTERNAL_URL = ScriptApp.getService().getUrl();

// This url will fail if a user is not logged in and has authorised TaskBan (or is using Safari)
const EXTERNAL_URL = "https://taskban.davidlang.net/app.html"; // also in app.html, appsscript.json

function doGet(e) {
  // NOTE: redirect parameter is only used in production for dealing with logging in when in a frame
  if (e.parameter.redirect === "") return redirect(EXTERNAL_URL); // short circuit for speed
  const boards = listBoards();
  var boardName = e.parameter.board || e.parameter.b || e.parameter.redirect;
  var graphList = e.parameters.graph || e.parameters.g;
  if (boardName) {
    if (boardName.startsWith("/")) boardName = boardName.substring(1);
    const board = findBoard(boardName, boards);
    if (board) {
      if (e.parameter.redirect)
        return redirect(EXTERNAL_URL + "?b=" + board.title.replace(/ /g,"-"));
      else if (graphList)
        return uiGraph(board, graphList);
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

function uiGraph(board, graphList) {
  // calc graph
  const all_tasks = getAllTasks(board.id);
  let show_tasks;
  let page_title;
  let heading;
  const warnings = [];
  if (graphList.length == 1 && !graphList[0]) {
    show_tasks = all_tasks;
    page_title = "Graph of "+board.title;
    heading = "Dependency graph of "+board.title;
  } else {
    show_tasks = [];
    for (const id_or_name of graphList) {
      var task = findTask(id_or_name, all_tasks);
      if (task)
        show_tasks.push(task);
      else
        warnings.push("Could not find task: " + id_or_name);
    }
    page_title = "Sub-graph (" + show_tasks.length + ") of "+board.title;
    heading = "Partial dependency graph of "+board.title;
  }
  const graph = graphTasks(board.id, show_tasks, all_tasks);
  // show UI
  const html = HtmlService.createTemplateFromFile("UI_graph");
  html.heading = heading;
  html.graph = graph;
  html.warnings = warnings;
  return html.evaluate().setTitle(page_title+TITLE_SUFFIX).addMetaTag("viewport", "width=200, initial-scale=1.25").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}