const LIST_PREFIX = "(";
const LIST_SUFFIX = ")";

// client call
function getAllTasks(boardId) {
  var board = {id: boardId};
  loadBoardProperties(board);
  var result = {};
  var tasks = [];
  do {
    result = Tasks.Tasks.list(boardId, {showHidden: true, maxResults: 100, pageToken: result.nextPageToken});
    if(!result || !result.items || !result.items.length) break;
    for(const t of result.items) {
      processTask(t, board);
      tasks.push(t);
    }
  } while (result.nextPageToken);
  return tasks;
}

// client call
function getTasksByDate(date_string) {
  const dMin = new Date(Date.parse(date_string));
  removeTime(dMin);
  const dMax = new Date(dMin);
  dMax.setDate(dMax.getDate()+1);
  var request = {
    showCompleted: false,
    maxResults: 100,
    dueMax: formatDateTasks(dMax)
  };
  if (dMin > new Date()) request.dueMin = formatDateTasks(dMin);
  var boards = listBoards();
  var tasks = [];
  for(const board of boards) {
    loadBoardProperties(board);
    do {
      const result = Tasks.Tasks.list(board.id, request);
      if(!result || !result.items || !result.items.length) break;
      for(const t of result.items) {
        processTask(t, board);
        t.board = board; // slight hack to allow UI_list to know about the boards
        tasks.push(t);
      }
      request.pageToken = result.nextPageToken;
    } while (request.pageToken);
  }
  return tasks.sort((a,b) => {
    if (a.due < b.due) return -1;
    if (a.due > b.due) return 1;
    if (a.board.title < b.board.title) return -1;
    if (a.board.title > b.board.title) return 1;
    if (a.board.properties.lists.indexOf(a.list) < b.board.properties.lists.indexOf(b.list)) return -1;
    if (a.board.properties.lists.indexOf(a.list) > b.board.properties.lists.indexOf(b.list)) return 1;
    return 0; // don't sort by task title, it doesn't mean anything
  });
}

// client call
function getTask(boardId, taskId) {
  var board = {id: boardId};
  loadBoardProperties(board);
  var task = Tasks.Tasks.get(boardId, taskId);
  processTask(task, board);
  return task;
}

function extractListFromName(task) {
  /* LIST AT START:
  if(!task.title.startsWith(LIST_PREFIX)) return "";
  const end = task.title.indexOf(LIST_SUFFIX);
  if(end < 1) return "";
  const listName = task.title.substring(LIST_PREFIX.length,end);
  task.title = task.title.substring(end+LIST_SUFFIX.length).trim();
  */
  if(!task.title.endsWith(LIST_SUFFIX)) return "";
  var start = task.title.indexOf(LIST_PREFIX);
  if(start < 0) return "";
  while (task.title.indexOf(LIST_PREFIX,start+1) > 0) {
    start = task.title.indexOf(LIST_PREFIX,start+1); // find the last instance of LIST_PREFIX
  }
  const listName = task.title.substring(start+1,task.title.length-LIST_SUFFIX.length);
  task.title = task.title.substring(0,start).trim();
  return listName;
}

function addListToName(task,listName) {
  // assumes existing list has been removed first
  //LIST AT START: task.title = LIST_PREFIX+listName+LIST_SUFFIX+" "+task.title;
  task.title = task.title+" "+LIST_PREFIX+listName+LIST_SUFFIX;
}

function processTask(task, board) {
  const listName = extractListFromName(task);
  task.list = includesIgnoreCase(board.properties.lists, listName);
  //WRONG LIST DIALOG: if (!task.list) task.list = listName; // to be handled by Wrong List dialog
  if (task.completed) task.list = board.properties.list_exit;
  if (!task.list) task.list = board.properties.list_entry;
  if (!task.notes) task.notes = "";
  task.due = formatDateForm(task.due);
}

// client call
function editTask(boardId, changes) {
  return updateTask(boardId, changes);
}
  
// client call
function addTask(boardId, changes) {
  return updateTask(boardId, changes);
}

// client call
function moveTask(boardId, taskId, listName) {
  var task = Tasks.Tasks.get(boardId, taskId);
  if(!task) throw new Error("Task not found: " + taskId);
  if(task.deleted) throw new Error("Task has been deleted: " + taskId);
  extractListFromName(task); //remove the old list name
  return updateTask(boardId, {
    id:taskId,
    title:task.title,
    list:listName
  });
}

function updateTask(boardId,changes) {
  var board = {id: boardId};
  loadBoardProperties(board);
  if(changes.due) changes.due = formatDateTasks(new Date(changes.due));
  if(changes.due == "") changes.due = null;
  if(changes.list) {
    if(changes.list==board.properties.list_exit) {
      // when done, dont label. this is important for recurring tasks
      changes.status = "completed";
      changes.completed = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    } else {
      changes.list = includesIgnoreCase(board.properties.lists, changes.list); // to get correct case for list name
      if(changes.list!=board.properties.list_entry) addListToName(changes, changes.list); // when todo, dont label. it looks nicer
      changes.status = "needsAction";
      changes.completed = null;
    }
  }
  var task;
  if (changes.id) {
    task = Tasks.Tasks.patch(changes, boardId, changes.id);
    //FUTURE task = Tasks.Tasks.move(boardId, taskId, {parent:,previous:});
  } else {
    task = Tasks.Tasks.insert(changes, boardId); //FUTURE ,{parent:,previous:}
  }
  processTask(task, board);
  return task;
}

// client call
function clearCompletedTasks(boardId, taskIds) {
  // only those which are listed (those that were visible)
  for(const taskId of taskIds) {
    Tasks.Tasks.remove(boardId, taskId);
  }
}

// client call, add-on call
function clearCompletedTasksOnAllBoards() {
  var boards = listBoards();
  for (const board of boards) {
    var result = {};
    var tasks = [];
    do {
      result = Tasks.Tasks.list(board.id, {showHidden: true, maxResults: 100, pageToken: result.nextPageToken});
      if(!result || !result.items || !result.items.length) break;
      for(const t of result.items) {
        if (t.completed && t.status == "completed") tasks.push(t);
      }
    } while (result.nextPageToken);
    for(const task of tasks) {
      Tasks.Tasks.remove(board.id, task.id);
    }
  }
}