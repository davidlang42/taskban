const LIST_PREFIX = "(";
const LIST_SUFFIX = ")";

// client call
function getAllTasks(boardId) {
  return getAllTasksInternal(boardId, true); // updates prerequisites if enabled
}

function getAllTasksInternal(boardId, updatePrerequisitesIfEnabled) {
  var board = {id: boardId};
  loadBoardProperties(board);
  if (updatePrerequisitesIfEnabled && board.properties.enable_prerequisites) {
    runPrerequisiteUpdatesForBoard(boardId, false); // does nothing if already locked
  }
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
function getManyTasks(boardId, taskIds) {
  var tasks = [];
  for(const task of getAllTasksInternal(boardId, false)) { // does not update prerequisites
    if (taskIds.includes(task.id))
      tasks.push(task);
  }
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
function moveTask(boardId, taskId, listName, afterTaskId) {
  var task = Tasks.Tasks.get(boardId, taskId);
  if(!task) throw new Error("Task not found: " + taskId);
  if(task.deleted) throw new Error("Task has been deleted: " + taskId);
  extractListFromName(task); //remove the old list name
  return updateTask(boardId, {
    id:taskId,
    title:task.title,
    list:listName
  }, afterTaskId);
}

function updateTask(boardId,changes,afterTaskId) {
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
    if (afterTaskId)
      task = Tasks.Tasks.move(boardId, changes.id, {previous: afterTaskId}); //FUTURE {parent:}
  } else {
    task = Tasks.Tasks.insert(changes, boardId, {previous: afterTaskId}); //FUTURE {parent:}
  }
  if (board.properties.enable_prerequisites) {
    if (changes.status == "completed") { // might affect any task on this board
      var updated_tasks = runPrerequisiteUpdatesForBoard(boardId, false); // does nothing if already locked
      if (updated_tasks && updated_tasks.length) {
        updated_tasks.push(task);
        for (const t of updated_tasks) {
          processTask(t, board);
        }
        return updated_tasks;
      }
    } else if (!changes.deleted && 'notes' in changes) { // could only affect this task
      var updated_task = runPrerequisiteUpdatesForTask(boardId, task);
      if (updated_task) task = updated_task;
    }
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

// client call
function removeDueDatesCompleted(boardId, taskIds) {
  // only those which are listed (those that were visible)
  for(const taskId of taskIds) {
    Tasks.Tasks.patch({id: taskId, due: null}, boardId, taskId);
  }
}

// client call, add-on call
function clearCompletedTasksOnAllBoards() {
  var boards = listBoards();
  for (const board of boards) {
    var result = {};
    var taskIds = [];
    do {
      result = Tasks.Tasks.list(board.id, {showHidden: true, maxResults: 100, pageToken: result.nextPageToken});
      if(!result || !result.items || !result.items.length) break;
      for(const t of result.items) {
        if (t.completed && t.status == "completed") taskIds.push(t.id);
      }
    } while (result.nextPageToken);
    clearCompletedTasks(board.id, taskIds);
  }
}

// client call, add-on call
function removeCompletedTasksDueDatesOnAllBoards() {
  var boards = listBoards();
  for (const board of boards) {
    var result = {};
    var taskIds = [];
    do {
      result = Tasks.Tasks.list(board.id, {showHidden: true, maxResults: 100, pageToken: result.nextPageToken});
      if(!result || !result.items || !result.items.length) break;
      for(const t of result.items) {
        if (t.completed && t.status == "completed") taskIds.push(t.id);
      }
    } while (result.nextPageToken);
    removeDueDatesCompleted(board.id, taskIds);
  }
}

// client call
function sortTasks(boardId, taskIds, sortMethod) {
  // only those which are listed (those that were visible)
  var tasks = getManyTasks(boardId, taskIds);
  var currentOrderIds = tasks.sort((a,b) => compare(a.position, b.position)).map((t) => t.id); // mutates 'tasks' order
  var newOrderIds = runSortMethod(tasks, sortMethod).map((t) => t.id); // mutates 'tasks' order
  var previousId = null;
  var mustMove = false;
  for (var i=0; i<newOrderIds.length; i++) {
    if (mustMove || newOrderIds[i] != currentOrderIds[i]) {
      mustMove = true;
      Tasks.Tasks.move(boardId, newOrderIds[i], {previous: previousId});
    }
    previousId = newOrderIds[i];
  }
}

function runSortMethod(tasks, sortMethod) {
  if (sortMethod == 'title') {
    tasks.sort((a,b) => compare(a.title, b.title));
  } else if (sortMethod == 'due') {
    tasks = tasks.filter((t) => t.due);
    tasks.sort((a,b) => compare(a.due, b.due));
  } else if (sortMethod == 'numeric') {
    for (const task of tasks)
      task.numericPrefix = extractNumericPrefix(task.title);
    tasks = tasks.filter((t) => !isNaN(t.numericPrefix));
    tasks.sort((a,b) => compareFallback(a.numericPrefix, b.numericPrefix, a.title, b.title))
  } else if (sortMethod == 'recent') {
    tasks.sort((a,b) => compare(b.updated, a.updated));
  } else {
    throw "Invalid sort method: " + sortMethod;
  }
  return tasks;
}

function extractNumericPrefix(title) {
  return parseFloat(title.split(" ")[0].replace(/[^0-9\.]/gi, ''));
}