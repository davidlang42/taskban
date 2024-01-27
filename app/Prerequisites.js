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
  return { lastUpdated: null, taskStateById: {} };
}

function newTaskState() {
  return { name: "", completed: false, due: false, prerequisiteNames: [] };
}

//TRIGGER: every 5 minutes (could probably handle every 1 min if needed)
function runPrerequisiteUpdates() {
  for (const board of listBoards()) {
    loadBoardProperties(board);
    if (board.properties.enable_prerequisites) {
      var state = loadPrerequisiteState(board.id);
      var changes = updatePrerequisiteState(board.id, state);
      if (changes) {
        processPrerequisiteState(board.id, state);
      }
      storePrerequisiteState(board.id, state);
    }
  }
}

function processPrerequisiteState(boardId, state) {
  // create lookups
  var completedByName = {};
  var unusedCompletedIdsByName = {};
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
        missing.push(prerequisiteName);
      } else if (!completed) {
        ready = false;
      }
    }
    if (!taskState.due) {
      // setTaskDueWithMessage() calls a task read, therefore only call if it might actually be useful
      if (duplicates.length > 0) {
        setTaskDueWithMessage(boardId, id, "Prerequisite tasks have duplicate names: " + duplicates.join(", "));
      } else if (missing.length > 0) {
        setTaskDueWithMessage(boardId, id, "Could not find prerequisite tasks: " + missing.join(", "));
      } else if (ready) {
        setTaskDueWithMessage(boardId, id, "Prerequisite tasks complete: " + taskState.prerequisiteNames.join(", "));
      }
    }
  }
  // remove unreferenced completed tasks
  for (const name in unusedCompletedIdsByName) {
    const id = unusedCompletedIdsByName[name];
    delete state.taskStateById[id];
  }
}

const MAX_NOTES_LENGTH = 8000;

function setTaskDueWithMessage(boardId, taskId, message) {
  var t = Tasks.Tasks.get(boardId, taskId);
  if (!t.due) {
    var changes = { due: formatDateTasks(new Date()) };
    var new_notes = message + "\n///\n" + t.notes;
    if (new_notes.length <= MAX_NOTES_LENGTH) {
      changes.notes = new_notes; // only add to notes if it fits within max length
    }
    Tasks.Tasks.patch(changes, boardId, taskId);
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