// Module contains all the code for importing and exporting a full board of tasks from/to CSV

//client call
function exportToCsv(boardId) {
  var table = [];
  table.push(headerRow(false));
  var tasks = Tasks.Tasks.list(boardId, { showDeleted: true, showHidden: true });
  while (true) {
    for (const task of tasks.getItems()) {
      table.push(exportRow(task));
    }
    const token = tasks.getNextPageToken();
    if (!token) {
      break;
    }
    tasks = Tasks.Tasks.list(boardId, { showDeleted: true, showHidden: true, pageToken: token });
  }
  return toCSV(table);
}

//client call
function importFromCsv(boardId, csvFile) {
  // load csv
  var warnings = [];
  if (!csvFile.length) throw Error("CSV file was empty");
  var table = fromCSV(csvFile);
  if (table.length < 2) throw Error("CSV file only contained a header row");
  if (!table[0].length) throw Error("CSV file did not contain any columns");
  // parse headers
  var invalid = invalidHeaders(table[0]);
  if (invalid.length == table[0].length) throw Error("CSV did not contain any matching column headers");
  if (invalid.length) {
    warnings.push("Invalid columns have been ignored (" + invalid.join(", ") + ")");
  }
  var map = headerMap(table[0]);
  // parse tasks
  var tasks = [];
  for (var i=1; i < table.length; i++) {
    if (table[i].length == map.length) {
      var task = importRow(table[i], map);
      task.status = task.completed ? "completed" : "needsAction";
      tasks.push(task);
    }
  }
  // add/update tasks
  var count_updated = 0;
  var count_added = 0;
  for (const task of tasks) {
    if (task.id) {
      var result = Tasks.Tasks.patch(task, boardId, task.id);
      count_updated += 1;
      if (task.parent != result.parent)
        Tasks.Tasks.move(boardId, task.id, {parent: task.parent});
    } else {
      Tasks.Tasks.insert(task, boardId, {parent: task.parent});
      count_added += 1;
    }
  }
  // send response
  var response = "Successfully ";
  if (count_added > 0) {
    if (count_updated > 0) {
      response += "added " + count_added + " and updated " + count_updated;
    } else {
      response += "added " + count_added
    }
  } else {
    response += "updated " + count_updated
  }
  response += " tasks";
  if (warnings.length) {
    response += ", with " + warnings.length + " warnings:\n- " + warnings.join("\n- ");
  } else {
    response += ".";
  }
  return response;
}

const ROW_LENGTH = 11; // irrelevant fields not included: kind, etag, selfLink

function exportRow(task) {
  var o = new Array(ROW_LENGTH);
  var i=0;
  o[i++]=task.parent;
  o[i++]=task.position;
  o[i++]=task.title;
  o[i++]=task.id;
  o[i++]=task.notes;
  o[i++]=formatCsvDate(task.due);
  o[i++]=task.updated;
  o[i++]=task.completed;
  o[i++]=task.deleted ?? false;
  o[i++]=task.hidden ?? false;
  var links = task.links;
  if (links.length == 0) {
    links = "";
  } else {
    links = JSON.stringify(links);
  }
  o[i++]=links;
  if (i != ROW_LENGTH) {
    throw new Error('Export row was the wrong length (' + i + ' != ' + ROW_LENGTH + ')');
  }
  return o;
}

function importRow(o, map) {
  var task = {};
  var i=0;
  processMappedColumn(o, i++, map, task, 'parent');
  processMappedColumn(o, i++, map, task, 'position');
  processMappedColumn(o, i++, map, task, 'title');
  processMappedColumn(o, i++, map, task, 'id');
  processMappedColumn(o, i++, map, task, 'notes');
  if (processMappedColumn(o, i++, map, task, 'due')) {
    task.due = unformatCsvDate(task.due);
  }
  processMappedColumn(o, i++, map, task, 'updated');
  processMappedColumn(o, i++, map, task, 'completed');
  processMappedColumn(o, i++, map, task, 'deleted');
  processMappedColumn(o, i++, map, task, 'hidden');
  processMappedColumn(o, i++, map, task, 'links');
  if (i != ROW_LENGTH) {
    throw new Error('Import row was the wrong length (' + i + ' != ' + ROW_LENGTH + ')');
  }
  return task;
}

function headerRow(exclude_read_only) {
  var o = new Array(ROW_LENGTH);
  var i=0;
  o[i++]='ParentId';
  o[i++]=exclude_read_only ? "" : 'Position'; // could support setting this in the future, but it has to be set by calling move()
  o[i++]='Title';
  o[i++]='Id';
  o[i++]='Notes';
  o[i++]="DateDue";
  o[i++]=exclude_read_only ? "" : "UpdatedTimestamp";
  o[i++]="DateCompleted";
  o[i++]="IsDeleted";
  o[i++]=exclude_read_only ? "" : "IsHidden";
  o[i++]=exclude_read_only ? "" : "Links";
  if (i != ROW_LENGTH) {
    throw new Error('Header row was the wrong length (' + i + ' != ' + ROW_LENGTH + ')');
  }
  return o;
}

function processMappedColumn(o, expected_index, map, task, field) {
  var actual_index = map[expected_index];
  if (actual_index != -1) {
    var value = o[actual_index];
    if (value.length) {
      task[field] = value;
    } else {
      task[field] = null;
    }
    return true;
  }
  return false;
}

function headerMap(header) {
  var map_from_expected_column_index_to_actual_column_index = [];
  var i = 0;
  for (const expected of headerRow(true)) {
    map_from_expected_column_index_to_actual_column_index[i++] = expected ? header.indexOf(expected) : -1;
  }
  return map_from_expected_column_index_to_actual_column_index;
}

function invalidHeaders(header) {
  var invalid = [];
  var expected = headerRow();
  for (const actual of header) {
    if (!expected.includes(actual)) {
      invalid.push(actual);
    }
  }
  return invalid;
}

function formatCsvDate(task_date) {
  if (!task_date) return null;
  return formatDateForm(task_date);
}

function unformatCsvDate(csv) {
  if (!csv) return null;
  var timestamp = Date.parse(csv);
  if (isNaN(timestamp)) {
    throw Error("Invalid date: " + csv);
  }
  var d = new Date(timestamp);
  return formatDateTasks(d);
}

// source: https://stackoverflow.com/questions/46637955/write-a-string-containing-commas-and-double-quotes-to-csv
function toCSV(table) {
    return table
        .map(row =>
            row
                .map(cell => {
                    if (cell == null) return "";
                    cell = cell.toString();
                    // We remove blanks and check if the column contains
                    // other whitespace,`,` or `"`.
                    // In that case, we need to quote the column.
                    if (cell.replace(/ /g, '').match(/[\s,"]/)) {
                        return '"' + cell.replace(/"/g, '""') + '"';
                    }
                    return cell;
                })
                .join(',')
        )
        .join('\n');
}

// source: https://stackoverflow.com/questions/8493195/how-can-i-parse-a-csv-string-with-javascript-which-contains-comma-in-data
function fromCSV(text) {
    let p = '', row = [''], ret = [row], i = 0, r = 0, s = !0, l;
    for (l of text) {
        if ('"' === l) {
            if (s && l === p) row[i] += l;
            s = !s;
        } else if (',' === l && s) l = row[++i] = '';
        else if ('\n' === l && s) {
            if ('\r' === p) row[i] = row[i].slice(0, -1);
            row = ret[++r] = [l = '']; i = 0;
        } else row[i] += l;
        p = l;
    }
    return ret;
}