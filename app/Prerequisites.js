// Module contains all the code for handling prerequisite (ie. blocking) tasks as "{TASK_NAME}" within the notes text of a task

const PREREQUISITE_PROPERTY_PREFIX = "prerequisites."

function storePrerequisiteState(boardId, state) {
  var p = PropertiesService.getUserProperties();
  p.setProperty(PREREQUISITE_PROPERTY_PREFIX + boardId, JSON.stringify(state));
}

function loadPrerequisiteState(boardId) {
  var p = PropertiesService.getUserProperties();
  var obj = JSON.parse(p.getProperty(PREREQUISITE_PROPERTY_PREFIX + boardId));
  if(!obj) obj = newPrerequisiteState();
  return obj;
}

function clearPrerequisiteStates() {
  var p = PropertiesService.getUserProperties();
  for (const key of p.getKeys()) {
    if (key.startsWith(PREREQUISITE_PROPERTY_PREFIX)) {
      p.deleteProperty(key);
    }
  }
}

function newPrerequisiteState() {
  return { lastUpdated: null, nextDatePrerequisite: null, taskStateById: {} };
}

function newTaskState() {
  return { name: "", completed: false, due: false, prerequisiteNames: [] };
}

const PREREQUISITES_LOCK_PREFIX = "prerequisiteUpdates.";

//TRIGGER: every 5 minutes (could probably handle every 1 min if needed)
function runAllPrerequisiteUpdates() {
  var errors = [];
  var errorBoards = [];
  for (const board of listBoards()) {
    loadBoardProperties(board);
    if (board.properties.enable_prerequisites) {
      try {
        runPrerequisiteUpdatesForBoard(board.id, true); // throws error if already locked
      } catch (err) {
        errors.push(err);
        errorBoards.push(board.title + " (" + err.toString() + ")");
      }
    } else {
      // to help fix locked boards without opening AppsScripts,
      // disabling pre-requisites should force unlock the board
      unlock(PREREQUISITES_LOCK_PREFIX + board.id);
    }
  }
  if (errors.length) {
    throw new AggregateError(errors, errorBoards.join(", "));
  }
}

function runPrerequisiteUpdatesForBoard(boardId, errorIfLocked) {
  if (lock(PREREQUISITES_LOCK_PREFIX + boardId)) {
    var processed = null;
    try {
      var state = loadPrerequisiteState(boardId);
      var changes = updatePrerequisiteState(boardId, state);
      var now = formatDateTasks(new Date());
      if (changes || (!!state.nextDatePrerequisite && state.nextDatePrerequisite < now)) {
        processed = processPrerequisiteState(boardId, state);
      }
      storePrerequisiteState(boardId, state);
    }
    finally {
      unlock(PREREQUISITES_LOCK_PREFIX + boardId);
    }
    return processed;
  } else if (errorIfLocked) {
    throw Error("Cannot run prerequisite updates for locked board: " + boardId);
  }
}

function unlockAllPrerequisiteUpdates() {
  for (const board of listBoards()) {
    unlock(PREREQUISITES_LOCK_PREFIX + board.id);
  }
}

function runPrerequisiteUpdatesForTask(boardId, task) {
  // lock not required because we aren't changing the prerequisite state
  // instead we just shortcut to check if *this* task is ready
  // but not for duplicate tasks or missing tasks, as these could depend on other tasks (if we detect that, we assume not ready)
  // technically 'ready' might also be wrong if a task has recently changed been uncompleted, but this seems like a very minor edge case
  if (!!task.due) return; // due date already set
  /* from: updatePrerequisiteState() */
  var prerequisiteNames = task.notes?.match(/(?<=\{).+?(?=\})/g);
  if (!prerequisiteNames || !prerequisiteNames.length) return; // no prerequisites to check
  var state = loadPrerequisiteState(boardId);
  /* from: processPrerequisiteState() */
  // create lookups
  var completedByName = {};
  var duplicateNames = [];
  for (const id in state.taskStateById) {
    const taskState = state.taskStateById[id];
    if (completedByName[taskState.name] != null) {
      duplicateNames.push(taskState.name);
    }
    completedByName[taskState.name] = taskState.completed;
  }
  // check if tasks are ready to action
  var now = new Date();
  var ready = true;
  var missing = [];
  var duplicates = [];
  for (const prerequisiteName of prerequisiteNames) {
    var completed = completedByName[prerequisiteName];
    if (duplicateNames.includes(prerequisiteName)) {
      duplicates.push(prerequisiteName);
    } else if (completed == null) {
      var possible_date = Date.parse(prerequisiteName + " "); // without the space, a date without a time will be parsed in GMT rather than local time zone
      if (!isNaN(possible_date)) {
        var d = new Date(possible_date);
        if (d > now) {
          // waiting on future date
          ready = false;
        }
      } else {
        missing.push(prerequisiteName);
      }
    } else if (!completed) {
      ready = false;
    }
  }
  if (ready && duplicates.length == 0 && missing.length == 0) {
    // setTaskDueWithMessage() won't call a task read because we already have it
    return setTaskDueWithMessage(boardId, task.id, "Prerequisite tasks complete: " + prerequisiteNames.join(", "), task);
  }
}

function processPrerequisiteState(boardId, state) {
  var processed = [];
  // create lookups
  var completedByName = {};
  var unusedCompletedIdsByName = {};
  var deletedTaskIds = [];
  var duplicateNames = [];
  for (const id in state.taskStateById) {
    const taskState = state.taskStateById[id];
    if (completedByName[taskState.name] != null) {
      duplicateNames.push(taskState.name);
    }
    completedByName[taskState.name] = taskState.completed;
    if (taskState.completed) {
      unusedCompletedIdsByName[taskState.name] = id;
    }
  }
  // check if tasks are ready to action
  var now = new Date();
  var nextDate = null;
  for (const id in state.taskStateById) {
    const taskState = state.taskStateById[id];
    if (!taskState.prerequisiteNames.length) continue;
    var ready = true;
    var missing = [];
    var duplicates = [];
    for (const prerequisiteName of taskState.prerequisiteNames) {
      delete unusedCompletedIdsByName[prerequisiteName];
      var completed = completedByName[prerequisiteName];
      if (duplicateNames.includes(prerequisiteName)) {
        duplicates.push(prerequisiteName);
      } else if (completed == null) {
        var possible_date = Date.parse(prerequisiteName + " "); // without the space, a date without a time will be parsed in GMT rather than local time zone
        if (!isNaN(possible_date)) {
          var d = new Date(possible_date);
          if (d > now) {
            // waiting on future date
            ready = false;
            if (!nextDate || nextDate > d) {
              nextDate = d;
            }
          }
        } else {
          missing.push(prerequisiteName);
        }
      } else if (!completed) {
        ready = false;
      }
    }
    state.nextDatePrerequisite = !nextDate ? null : formatDateTasks(nextDate);
    if (!taskState.due) {
      // getTaskOrAddToList() calls a task read, therefore only call if it might actually be useful
      if (duplicates.length > 0) {
        var task = getTaskOrAddToList(boardId, id, deletedTaskIds);
        if (task) processed.push(setTaskDueWithMessage(boardId, id, "Prerequisite tasks have duplicate names: " + duplicates.join(", "), task));
      } else if (missing.length > 0) {
        var task = getTaskOrAddToList(boardId, id, deletedTaskIds);
        if (task) processed.push(setTaskDueWithMessage(boardId, id, "Could not find prerequisite tasks: " + missing.join(", "), task));
      } else if (ready) {
        var task = getTaskOrAddToList(boardId, id, deletedTaskIds);
        if (task) processed.push(setTaskDueWithMessage(boardId, id, "Prerequisite tasks complete: " + taskState.prerequisiteNames.join(", "), task));
      }
    }
  }
  // remove unreferenced completed tasks
  for (const name in unusedCompletedIdsByName) {
    const id = unusedCompletedIdsByName[name];
    delete state.taskStateById[id];
  }
  // remove deleted tasks
  for (const id in deletedTaskIds) {
    delete state.taskStateById[id];
  }
  return processed;
}

const MAX_NOTES_LENGTH = 8000;

function getTaskOrAddToList(boardId, taskId, listOfFailedTaskIds) {
  try {
    return Tasks.Tasks.get(boardId, taskId);
  } catch (err) {
    listOfFailedTaskIds.push(taskId);
  }
}

function setTaskDueWithMessage(boardId, taskId, message, already_up_to_date_task) {
  var t = already_up_to_date_task ?? Tasks.Tasks.get(boardId, taskId);
  if (!t.due) {
    var changes = { due: formatDateTasks(new Date()) };
    var new_notes = message + "\n///\n" + t.notes;
    if (new_notes.length <= MAX_NOTES_LENGTH) {
      changes.notes = new_notes; // only add to notes if it fits within max length
    }
    return Tasks.Tasks.patch(changes, boardId, taskId);
  }
}

function updatePrerequisiteState(boardId, state) {
  var changes = false;
  var startTime = timestamp();
  var result = {};
  do {
    result = Tasks.Tasks.list(boardId, {showHidden: true, showDeleted: true, maxResults: 100, updatedMin: state.lastUpdated, pageToken: result.nextPageToken});
    if(!result || !result.items || !result.items.length) break;
    for (const t of result.items) {
      if (t.deleted) {
        if (state.taskStateById[t.id]) {
          delete state.taskStateById[t.id];
          changes = true;
        }
      } else {
        var taskState = state.taskStateById[t.id];
        if (!taskState) {
          taskState = newTaskState();
          state.taskStateById[t.id] = taskState;
        }
        changes |= updateTaskState(taskState, t);
      }
    }
  } while (result.nextPageToken);
  state.lastUpdated = startTime;
  return changes;
}

function updateTaskState(state, task) {
  var changes = false;
  extractListFromName(task); // remove list from task title
  var name = removeLabels(task.title);
  if (state.name != name) {
    state.name = name;
    changes = true;
  }
  if (state.completed != !!task.completed) {
    state.completed = !!task.completed;
    changes = true;
  }
  if (state.due != !!task.due) {
    state.due = !!task.due;
    changes = true;
  }
  var prerequisiteNames = task.notes?.match(/(?<=\{).+?(?=\})/g);
  if (!prerequisiteNames) prerequisiteNames = [];
  if (JSON.stringify(state.prerequisiteNames) != JSON.stringify(prerequisiteNames)) {
    state.prerequisiteNames = prerequisiteNames;
    changes = true;
  }
  return changes;
}