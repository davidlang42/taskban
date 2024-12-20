const LIST_PREFIX = "(";
const LIST_SUFFIX = ")";

// client call
function getAllTasks(boardId) {
  var board = {id: boardId};
  loadBoardProperties(board);
  if (board.properties.enable_prerequisites) { // update prerequisites if enabled
    runPrerequisiteUpdatesForBoard(boardId, false); // does nothing if already locked
  }
  var tasksById = getUnprocessedTasksById(boardId);
  var tasks = [];
  for (const id in tasksById) {
    var task = tasksById[id];
    processTask(task, board, tasksById[task.parent]);
    tasks.push(task);
  }
  return tasks;
}

function getUnprocessedTasksById(boardId) {
  var result = {};
  var tasksById = {};
  do {
    result = Tasks.Tasks.list(boardId, {showHidden: true, maxResults: 100, pageToken: result.nextPageToken});
    if(!result || !result.items || !result.items.length) break;
    for(const t of result.items) {
      tasksById[t.id] = t;
    }
  } while (result.nextPageToken);
  return tasksById;
}

// client call
function getManyTasks(boardId, taskIds) {
  var board = {id: boardId};
  loadBoardProperties(board);
  var tasksById = getUnprocessedTasksById(boardId);
  var tasks = [];
  for(const id of taskIds) {
    const task = tasksById[id];
    processTask(task, board, tasksById[task.parent]);
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
    maxResults: 100,//TODO why limit this?
    dueMax: formatDateTasks(dMax)
  };
  if (dMin > new Date()) request.dueMin = formatDateTasks(dMin);
  var boards = listBoards();
  var tasks = [];
  for(const board of boards) {
    //TODO shouldn't we reset the pageToken? request.pageToken = null;
    loadBoardProperties(board);
    do {
      const result = Tasks.Tasks.list(board.id, request);
      if(!result || !result.items || !result.items.length) break;
      for(const t of result.items) {
        processTask(t, board); // doesn't provide parent, so position will be wrong, but this shouldn't matter here
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
function getAnyDueDate(after_date_string) {
  const dAfter = new Date(Date.parse(after_date_string));
  removeTime(dAfter);
  var request = {
    showCompleted: false,
    maxResults: 1,
    dueMin: formatDateTasks(dAfter)
  };
  var boards = listBoards();
  for(const board of boards) {
    loadBoardProperties(board);
    const result = Tasks.Tasks.list(board.id, request);
    if(!result || !result.items || !result.items.length) continue;
    return formatDateForm(result.items[0].due);
  }
  return "";
}

// client call
function getTask(boardId, taskId) {
  var board = {id: boardId};
  loadBoardProperties(board);
  var tasksById = getUnprocessedTasksById(boardId);
  var main = tasksById[taskId];
  if (!main) throw new Error("Task not found: " + taskId);
  processTask(main, board, tasksById[main.parent]);
  main.subtasks = [];
  for(const id in tasksById) {
    const task = tasksById[id];
    if (task.parent == taskId) {
      processTask(task, board, main);
      main.subtasks.push(task);
    }
  }
  main.subtasks.sort(function(a,b) {
      if (a.position > b.position) return 1;
      if (a.position < b.position) return -1;
      return 0;
  });
  return main;
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

function processTask(task, board, parent) {
  const listName = extractListFromName(task);
  task.list = includesIgnoreCase(board.properties.lists, listName);
  //WRONG LIST DIALOG: if (!task.list) task.list = listName; // to be handled by Wrong List dialog
  if (task.completed) task.list = board.properties.list_exit;
  if (!task.list) task.list = board.properties.list_entry;
  if (!task.notes) task.notes = "";
  if (parent) task.position = parent.position + "_" + task.position;
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
    list:listName,
    parent:task.parent
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
      changes.completed = formatDateTasks(new Date());
    } else {
      changes.list = includesIgnoreCase(board.properties.lists, changes.list); // to get correct case for list name
      if(changes.list!=board.properties.list_entry) addListToName(changes, changes.list); // when todo, dont label. it looks nicer
      changes.status = "needsAction";
      changes.completed = null;
    }
  }
  var updated_tasks_by_id = {};
  if (changes.added_subtasks && !changes.deleted) {
    var last_id = null;
    for (const add_title of changes.added_subtasks) {
      var new_task = Tasks.Tasks.insert({ title: add_title }, boardId, {previous: last_id, parent: changes.id});
      updated_tasks_by_id[new_task.id] = new_task;
      last_id = new_task.id;
    }
  }
  if (changes.unlinked_subtasks) { // must happen before main task, because that might delete everything
    var last_id = changes.id;
    for (const unlink_id of changes.unlinked_subtasks) {
      var unlinked_task = Tasks.Tasks.move(boardId, unlink_id, {previous: last_id, parent: null});
      updated_tasks_by_id[unlinked_task.id] = unlinked_task;
      last_id = unlinked_task.id;
    }
  }
  if (changes.deleted_subtasks) {
    for (const delete_id of changes.deleted_subtasks) {
      var deleted_task = Tasks.Tasks.patch({ deleted: true }, boardId, delete_id);
      updated_tasks_by_id[deleted_task.id] = deleted_task;
    }
  }
  var main_task;
  if (changes.id) {
    main_task = Tasks.Tasks.patch(changes, boardId, changes.id);
    var parent_has_changed = main_task.parent && changes.parent && main_task.parent != changes.parent || !!main_task.parent != !!changes.parent;
    if (!changes.deleted && (afterTaskId || parent_has_changed)) {
      try {
        main_task = Tasks.Tasks.move(boardId, changes.id, {previous: afterTaskId, parent: changes.parent});
      } catch (e) {
        if (e.message.includes("Invalid task id")) {
          // we tried to move a task after a task which is not its sibling
          // google has saved the other changes, so its safe to re-get the task and continue
          main_task = Tasks.Tasks.get(boardId, changes.id); // need to refresh because parent might have changed
        } else {
          throw e;
        }
      }
    }
  } else {
    main_task = Tasks.Tasks.insert(changes, boardId, {previous: afterTaskId, parent: changes.parent});
  }
  updated_tasks_by_id[main_task.id] = main_task;
  if (board.properties.enable_prerequisites) {
    if (changes.status == "completed") { // might affect any task on this board
      var newly_updated_tasks = runPrerequisiteUpdatesForBoard(boardId, false); // does nothing if already locked
      if (newly_updated_tasks && newly_updated_tasks.length) {
        for (const t of newly_updated_tasks) {
          updated_tasks_by_id[t.id] = t; // might update things we've already changed
        }
      }
    } else if (!changes.deleted && 'notes' in changes) { // could only affect this task
      var newly_updated_task = runPrerequisiteUpdatesForTask(boardId, main_task);
      if (newly_updated_task) {
        updated_tasks_by_id[newly_updated_task.id] = newly_updated_task; // might update things we've already changed
      }
    }
  }
  var updated_tasks = [];
  var cache_by_id = { ...updated_tasks_by_id }; // shallow copy
  for (const id in updated_tasks_by_id) {
    var task = updated_tasks_by_id[id];
    var parent = null;
    if (task.parent) {
      parent = cache_by_id[task.parent];
      if (!parent) {
        parent = Tasks.Tasks.get(boardId, task.parent);
        cache_by_id[task.parent] = parent;
      }
    }
    processTask(task, board, parent);
    updated_tasks.push(task);
  }
  if (updated_tasks.length == 1) {
    return updated_tasks[0];
  } else {
    return updated_tasks;
  }
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
  if (tasks.some((t) => t.parent)) {
    // if this feature is wanted in the future, the tasks will first need to be grouped by parent, then each group sorted separately
    throw new Error("Sorting subtasks is not supported, click '↳' to hide them then try again.");
  }
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