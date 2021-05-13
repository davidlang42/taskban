function getBoard(boardName) {
  var boards = listBoards();
  return findBoard(boardName,boards);
}

function findBoard(boardName,boards) {
  var matchName = boardName.toLowerCase().replace(/ /g,"-");
  for(var i=0; i<boards.length; i++) {
    if (boards[i].title.toLowerCase().replace(/ /g,"-")==matchName) {
      const board = boards[i];
      loadBoardProperties(board);
      return board;
    }
  }
  return null;
}

function listBoards() {
  // loads taskList resources only, not additional properties (which should only be required if displaying that board)
  return Tasks.Tasklists.list({ maxResults: 100 }).items; // this only returns the first 100 lists but that should be fine
}

function loadBoardProperties(board) {
  // load existing
  var p = PropertiesService.getUserProperties();
  var obj = JSON.parse(p.getProperty(board.id));
  // set default if missing
  if(!obj) obj = defaultBoardProperties();
  // validate
  if(!obj.lists || obj.lists.length == 0) obj.lists = ["Todo","Done"];
  if(obj.lists.length == 1) obj.lists.push("Done");
  if(!obj.links) obj.links = [];
  if(!obj.list_entry) obj.list_entry = obj.lists[0];
  if(!obj.list_exit) obj.list_exit = obj.lists[obj.lists.length-1];
  // add to board
  board["properties"] = obj;
}

function defaultBoardProperties() {
  return {
    lists: ["Todo","In progress","Done"]
    // fit_columns: false
    // list_entry: "Todo"
    // list_exit: "Done"
    // links: []
  };
}

function storeBoardProperties(board) {
  if(!board.properties) return;
  var p = PropertiesService.getUserProperties();
  p.setProperty(board.id, JSON.stringify(board.properties));
}

function deleteBoardProperties(board) {
  var p = PropertiesService.getUserProperties();
  p.deleteProperty(board.id);
}

// client call
function saveBoardSettings(tasklistId,lists,list_entry,list_exit,links,fit_columns) {
  if (!lists || !lists.length || lists.length < 2) return "There must be at least 2 lists.";
  if (!list_entry) return "Entry list not set.";
  if (!list_exit) return "Exit list not set.";
  var dummyBoard = {id: tasklistId};
  loadBoardProperties(dummyBoard);
  dummyBoard.properties.lists = lists;
  dummyBoard.properties.list_entry = list_entry;
  dummyBoard.properties.list_exit = list_exit;
  dummyBoard.properties.links = links;
  dummyBoard.properties.fit_columns = fit_columns;
  storeBoardProperties(dummyBoard);
  return "Board settings saved. The page will now refresh.";
}

// client call
function resetBoardSettings(tasklistId) {
  var dummyBoard = {id: tasklistId};
  deleteBoardProperties(dummyBoard);
  return "Board settings reset. The page will now refresh.";
}

// client call
function addNewBoard(boardName) {
  boardName = boardName.trim();
  if(!boardName) throw new Error("Board name cannot be blank.");
  const existing_board = findBoard(boardName, listBoards());
  if (existing_board) throw new Error("Board '"+boardName+"' already exists.");
  var board = Tasks.newTaskList();
  board.title = boardName;
  return Tasks.Tasklists.insert(board);;
}